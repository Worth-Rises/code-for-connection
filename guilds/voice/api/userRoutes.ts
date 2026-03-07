import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';
import twilio from "twilio";

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

export const voiceUserRouter = Router();

// In-memory map of callId -> { twilioSids, conferenceName }
const callMetadata = new Map<string, { clientSid?: string; phoneSid?: string; conferenceName: string }>();


// ==========================================
// TWILIO VOICE SDK — TOKEN
// ==========================================

/**
 * GET /token — Generate Twilio Access Token for the browser Voice SDK.
 * The token allows the browser Device to receive incoming conference calls.
 * No TwiML App required — we add participants via the Conference Participants API.
 */
voiceUserRouter.get('/token', requireAuth, async (req: Request, res: Response) => {
  try {
    const identity = req.user!.id;

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_API_KEY_SID!,
      process.env.TWILIO_API_KEY_SECRET!,
      { identity }
    );

    const voiceGrant = new VoiceGrant({
      incomingAllow: true,
    });
    token.addGrant(voiceGrant);

    res.json(createSuccessResponse({ token: token.toJwt(), identity }));
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate voice token',
    }));
  }
});

// ==========================================
// CALL STATUS POLLING
// ==========================================

/**
 * GET /call-status/:callId — Check if the phone participant has answered.
 * Polls the Twilio REST API directly — no webhook/ngrok needed.
 */
voiceUserRouter.get('/call-status/:callId', requireAuth, async (req: Request, res: Response) => {
  const { callId } = req.params;
  const metadata = callMetadata.get(callId);

  if (!metadata?.phoneSid) {
    return res.json(createSuccessResponse({ phoneAnswered: false }));
  }

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    const call = await client.calls(metadata.phoneSid).fetch();
    // 'in-progress' means the phone was answered and is connected
    const phoneAnswered = call.status === 'in-progress';
    res.json(createSuccessResponse({ phoneAnswered }));
  } catch (error) {
    console.error('[voice] Error checking call status:', error);
    res.json(createSuccessResponse({ phoneAnswered: false }));
  }
});

// ==========================================
// INCARCERATED USER ENDPOINTS
// ==========================================

/**
 * GET /contacts — Approved contacts for the logged-in incarcerated person
 */
voiceUserRouter.get('/contacts', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const contacts = await prisma.approvedContact.findMany({
      where: {
        incarceratedPersonId: userId,
        status: 'approved',
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
      orderBy: { requestedAt: 'desc' },
    });

    res.json(createSuccessResponse(contacts));
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch contacts',
    }));
  }
});

/**
 * POST /initiate-call — Start a conference call with an approved contact.
 *
 * Flow:
 * 1. Validate contact is approved & not blocked
 * 2. Create VoiceCall DB record
 * 3. Create a conference and add the tablet user as a client participant
 * 4. Add the contact's phone number as a participant
 * 5. The tablet's Twilio Device receives an incoming call → auto-accept → both in conference
 *
 * Body: { contactId: string }
 */
voiceUserRouter.post('/initiate-call', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { contactId } = req.body;

    console.log(`[voice] === INITIATE-CALL REQUEST === userId=${userId} contactId=${contactId}`);

    if (!contactId) {
      return res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'contactId is required',
      }));
    }

    // Check DB for an already active call for this user
    const existingActiveCall = await prisma.voiceCall.findFirst({
      where: {
        incarceratedPersonId: userId,
        status: { in: ['ringing', 'connected'] },
      },
    });
    if (existingActiveCall) {
      // Verify with Twilio whether the conference is actually still running
      const conferenceName = `call-${existingActiveCall.id}`;
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const conferences = await client.conferences.list({
          friendlyName: conferenceName,
          status: 'in-progress',
        });
        if (conferences.length > 0) {
          // Conference is genuinely still active — block the new call
          console.log(`[voice] BLOCKED: User ${userId} has active conference ${conferenceName}`);
          return res.status(409).json(createErrorResponse({
            code: 'ALREADY_IN_CALL',
            message: 'You already have an active call',
          }));
        }
      } catch (err) {
        console.error(`[voice] Error checking Twilio conference ${conferenceName}:`, err);
      }

      // Conference is not active on Twilio — clean up the stale DB record
      console.log(`[voice] Stale call ${existingActiveCall.id} detected, marking as completed`);
      const durationSeconds = existingActiveCall.connectedAt
        ? Math.floor((Date.now() - existingActiveCall.connectedAt.getTime()) / 1000)
        : 0;
      await prisma.voiceCall.update({
        where: { id: existingActiveCall.id },
        data: { status: 'completed', endedAt: new Date(), durationSeconds },
      });
    }

    // Verify the contact is approved for this user
    const contact = await prisma.approvedContact.findFirst({
      where: {
        id: contactId,
        incarceratedPersonId: userId,
        status: 'approved',
      },
      include: {
        familyMember: true,
        incarceratedPerson: true,
      },
    });

    if (!contact) {
      return res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Approved contact not found',
      }));
    }

    // Check if number is blocked
    const blocked = await prisma.blockedNumber.findFirst({
      where: {
        phoneNumber: contact.familyMember.phone,
        OR: [
          { scope: 'agency', agencyId: contact.incarceratedPerson.agencyId },
          { scope: 'facility', facilityId: contact.incarceratedPerson.facilityId },
        ],
      },
    });

    if (blocked) {
      return res.status(403).json(createErrorResponse({
        code: 'BLOCKED',
        message: 'This number has been blocked by administration',
      }));
    }

    // Create DB record
    const voiceCall = await prisma.voiceCall.create({
      data: {
        incarceratedPersonId: userId,
        familyMemberId: contact.familyMemberId,
        facilityId: contact.incarceratedPerson.facilityId,
        status: 'ringing',
        isLegal: contact.isAttorney,
      },
    });

    const conferenceName = `call-${voiceCall.id}`;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER!;

    console.log(`[voice] Created DB record ${voiceCall.id}, conference=${conferenceName}`);

    try {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );

      // Step 1: Add the tablet user (browser Device) to the conference
      console.log(`[voice] Step 1: Adding client:${userId} to conference ${conferenceName}`);
      const clientParticipant = await client.conferences(conferenceName)
        .participants
        .create({
          from: twilioFrom,
          to: `client:${userId}`,
          maxParticipants: 2,
          label: `client:${userId}`,
          startConferenceOnEnter: true,
          endConferenceOnExit: true,
        });
      console.log(`[voice] Step 1 done: clientCallSid=${clientParticipant.callSid} conferenceSid=${clientParticipant.conferenceSid}`);

      // Store metadata immediately so we can clean up even if step 2 fails
      callMetadata.set(voiceCall.id, {
        clientSid: clientParticipant.callSid,
        conferenceName,
      });

      // Step 2: Add the contact's phone number to the conference
      console.log(`[voice] Step 2: Adding ${contact.familyMember.phone} to conference ${conferenceName}`);
      try {
        const phoneParticipant = await client.conferences(conferenceName)
          .participants
          .create({
            from: twilioFrom,
            to: contact.familyMember.phone,
            label: contact.familyMember.phone,
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
            // Status callback: Twilio POSTs here when the phone call ends
            ...(process.env.PUBLIC_URL ? {
              statusCallback: `${process.env.PUBLIC_URL}/api/voice/users/status-callback/${voiceCall.id}`,
              statusCallbackEvent: ['answered', 'completed'],
            } : {}),
          });
        console.log(`[voice] Step 2 done: phoneCallSid=${phoneParticipant.callSid} conferenceSid=${phoneParticipant.conferenceSid}`);

        // Update metadata with phone SID
        callMetadata.set(voiceCall.id, {
          clientSid: clientParticipant.callSid,
          phoneSid: phoneParticipant.callSid,
          conferenceName,
        });
      } catch (phoneError: unknown) {
        // Phone participant failed — clean up the client participant
        console.error('[voice] Phone participant failed:', phoneError);
        try {
          await client.calls(clientParticipant.callSid).update({ status: 'completed' });
        } catch (cleanupErr) {
          console.error('[voice] Failed to clean up client participant:', cleanupErr);
        }
        callMetadata.delete(voiceCall.id);

        await prisma.voiceCall.update({
          where: { id: voiceCall.id },
          data: { status: 'missed', endedAt: new Date() },
        });

        const errorMessage = phoneError instanceof Error ? phoneError.message : 'Failed to call contact';
        return res.status(502).json(createErrorResponse({
          code: 'TWILIO_ERROR',
          message: errorMessage,
        }));
      }

      // Update call status
      const updatedCall = await prisma.voiceCall.update({
        where: { id: voiceCall.id },
        data: {
          status: 'connected',
          connectedAt: new Date(),
        },
        include: {
          familyMember: {
            select: { firstName: true, lastName: true, phone: true },
          },
        },
      });

      res.json(createSuccessResponse({
        ...updatedCall,
        conferenceName,
      }));
    } catch (twilioError: unknown) {
      console.error('[voice] Twilio error (client participant):', twilioError);
      await prisma.voiceCall.update({
        where: { id: voiceCall.id },
        data: { status: 'missed', endedAt: new Date() },
      });

      const errorMessage = twilioError instanceof Error ? twilioError.message : 'Failed to connect call via Twilio';
      return res.status(502).json(createErrorResponse({
        code: 'TWILIO_ERROR',
        message: errorMessage,
      }));
    }
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to initiate call',
    }));
  }
});

/**
 * POST /end-call/:callId — End an active conference call
 */
voiceUserRouter.post('/end-call/:callId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    const call = await prisma.voiceCall.findUnique({ where: { id: callId } });

    if (!call) {
      return res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Call not found',
      }));
    }

    if (!['ringing', 'connected'].includes(call.status)) {
      return res.status(400).json(createErrorResponse({
        code: 'INVALID_STATE',
        message: 'Call is not active',
      }));
    }

    // End the conference (this terminates ALL participants)
    const metadata = callMetadata.get(callId);
    if (metadata) {
      try {
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
        );

        // Terminate the conference itself — ends all call legs
        console.log(`[voice] Ending conference ${metadata.conferenceName}`);
        const conferences = await client.conferences.list({
          friendlyName: metadata.conferenceName,
          status: 'in-progress',
        });
        for (const conf of conferences) {
          await conf.update({ status: 'completed' });
          console.log(`[voice] Conference ${conf.sid} terminated`);
        }

        // Also explicitly end any individual call legs as fallback
        if (metadata.clientSid) {
          try { await client.calls(metadata.clientSid).update({ status: 'completed' }); } catch { /* may already be ended */ }
        }
        if (metadata.phoneSid) {
          try { await client.calls(metadata.phoneSid).update({ status: 'completed' }); } catch { /* may already be ended */ }
        }
      } catch (twilioError) {
        console.error('[voice] Error ending conference/calls:', twilioError);
      }
      callMetadata.delete(callId);
    }



    const durationSeconds = call.connectedAt
      ? Math.floor((Date.now() - call.connectedAt.getTime()) / 1000)
      : 0;

    const updatedCall = await prisma.voiceCall.update({
      where: { id: callId },
      data: {
        status: 'completed',
        endedAt: new Date(),
        endedBy: 'caller',
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
    console.error('Error ending call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to end call',
    }));
  }
});

/**
 * POST /status-callback/:callId — Twilio calls this when a phone participant's status changes.
 * No auth required — Twilio calls this directly.
 */
voiceUserRouter.post('/status-callback/:callId', async (req: Request, res: Response) => {
  const { callId } = req.params;
  const { CallStatus, CallSid } = req.body;

  console.log(`[voice] Status callback: callId=${callId} CallStatus=${CallStatus} CallSid=${CallSid}`);

  if (CallStatus === 'completed' || CallStatus === 'busy' || CallStatus === 'no-answer' || CallStatus === 'failed' || CallStatus === 'canceled') {
    try {
      const call = await prisma.voiceCall.findUnique({ where: { id: callId } });
      if (call && ['ringing', 'connected'].includes(call.status)) {
        const durationSeconds = call.connectedAt
          ? Math.floor((Date.now() - call.connectedAt.getTime()) / 1000)
          : 0;

        await prisma.voiceCall.update({
          where: { id: callId },
          data: {
            status: CallStatus === 'completed' ? 'completed' : 'missed',
            endedAt: new Date(),
            endedBy: 'receiver',
            durationSeconds,
          },
        });
        console.log(`[voice] Call ${callId} marked as ended by receiver (${CallStatus})`);
      }
    } catch (err) {
      console.error(`[voice] Error processing status callback for call ${callId}:`, err);
    }
  }

  // Twilio expects 200 OK
  res.sendStatus(200);
});

export default voiceUserRouter;
