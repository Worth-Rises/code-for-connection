import { Router, Request, Response } from "express";
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from "@openconnect/shared";
import twilio from "twilio";

export const voiceUserRouter = Router();

// In-memory map of callId -> Twilio SID (hackathon workaround since we can't modify the Prisma schema)
const twilioSidMap = new Map<string, string>();

// ==========================================
// INCARCERATED USER ENDPOINTS
// ==========================================

/**
 * GET /contacts — Approved contacts for the logged-in incarcerated person
 */
voiceUserRouter.get(
  "/contacts",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const contacts = await prisma.approvedContact.findMany({
        where: {
          incarceratedPersonId: userId,
          status: "approved",
        },
        include: {
          familyMember: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: { requestedAt: "desc" },
      });

      res.json(createSuccessResponse(contacts));
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch contacts",
        }),
      );
    }
  },
);

/**
 * POST /initiate-call — Place an outbound Twilio call to an approved contact
 * Body: { contactId: string }
 */
voiceUserRouter.post(
  "/initiate-call",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { contactId } = req.body;

      if (!contactId) {
        return res.status(400).json(
          createErrorResponse({
            code: "VALIDATION_ERROR",
            message: "contactId is required",
          }),
        );
      }

      // Verify the contact is approved for this user
      const contact = await prisma.approvedContact.findFirst({
        where: {
          id: contactId,
          incarceratedPersonId: userId,
          status: "approved",
        },
        include: {
          familyMember: true,
          incarceratedPerson: true,
        },
      });

      if (!contact) {
        return res.status(404).json(
          createErrorResponse({
            code: "NOT_FOUND",
            message: "Approved contact not found",
          }),
        );
      }

      // Check if number is blocked
      const blocked = await prisma.blockedNumber.findFirst({
        where: {
          phoneNumber: contact.familyMember.phone,
          OR: [
            { scope: "agency", agencyId: contact.incarceratedPerson.agencyId },
            {
              scope: "facility",
              facilityId: contact.incarceratedPerson.facilityId,
            },
          ],
        },
      });

      if (blocked) {
        return res.status(403).json(
          createErrorResponse({
            code: "BLOCKED",
            message: "This number has been blocked by administration",
          }),
        );
      }

      // Create DB record
      const voiceCall = await prisma.voiceCall.create({
        data: {
          incarceratedPersonId: userId,
          familyMemberId: contact.familyMemberId,
          facilityId: contact.incarceratedPerson.facilityId,
          status: "ringing",
          isLegal: contact.isAttorney,
        },
      });

      // Place Twilio call
      try {
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
        );

        const twilioCall = await client.calls.create({
          to: contact.familyMember.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          twiml: `<Response><Say voice="alice">You have an incoming call from ${contact.incarceratedPerson.firstName} ${contact.incarceratedPerson.lastName}. Press any key to accept.</Say><Pause length="30"/></Response>`,
        });

        // Store the mapping
        twilioSidMap.set(voiceCall.id, twilioCall.sid);

        // Update call as connected
        const updatedCall = await prisma.voiceCall.update({
          where: { id: voiceCall.id },
          data: {
            status: "connected",
            connectedAt: new Date(),
          },
          include: {
            familyMember: {
              select: { firstName: true, lastName: true, phone: true },
            },
          },
        });

        res.json(createSuccessResponse(updatedCall));
      } catch (twilioError: unknown) {
        // Twilio failed — update DB to missed, but still return useful info
        console.error("Twilio error:", twilioError);
        await prisma.voiceCall.update({
          where: { id: voiceCall.id },
          data: { status: "missed", endedAt: new Date() },
        });

        const errorMessage =
          twilioError instanceof Error
            ? twilioError.message
            : "Failed to connect call via Twilio";
        return res.status(502).json(
          createErrorResponse({
            code: "TWILIO_ERROR",
            message: errorMessage,
          }),
        );
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to initiate call",
        }),
      );
    }
  },
);

/**
 * POST /end-call/:callId — Hang up an active call
 */
voiceUserRouter.post(
  "/end-call/:callId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;

      const call = await prisma.voiceCall.findUnique({ where: { id: callId } });

      if (!call) {
        return res.status(404).json(
          createErrorResponse({
            code: "NOT_FOUND",
            message: "Call not found",
          }),
        );
      }

      if (!["ringing", "connected"].includes(call.status)) {
        return res.status(400).json(
          createErrorResponse({
            code: "INVALID_STATE",
            message: "Call is not active",
          }),
        );
      }

      // Try to end the Twilio call
      const twilioSid = twilioSidMap.get(callId);
      if (twilioSid) {
        try {
          const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN,
          );
          await client.calls(twilioSid).update({ status: "completed" });
        } catch (twilioError) {
          console.error("Error ending Twilio call:", twilioError);
          // Continue to update DB even if Twilio fails
        }
        twilioSidMap.delete(callId);
      }

      const durationSeconds = call.connectedAt
        ? Math.floor((Date.now() - call.connectedAt.getTime()) / 1000)
        : 0;

      const updatedCall = await prisma.voiceCall.update({
        where: { id: callId },
        data: {
          status: "completed",
          endedAt: new Date(),
          endedBy: "caller",
          durationSeconds,
        },
        include: {
          familyMember: {
            select: { firstName: true, lastName: true, phone: true },
          },
        },
      });

      res.json(createSuccessResponse(updatedCall));
    } catch (error) {
      console.error("Error ending call:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to end call",
        }),
      );
    }
  },
);

export default voiceUserRouter;
