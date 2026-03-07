import { Router, Request, Response } from "express";
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from "@openconnect/shared";

export const messagingRouter = Router();

async function screenMessage(
  body: string,
  facilityId: string,
): Promise<string | null> {
  const keywords = await prisma.flaggedKeyword.findMany({
    where: { facilityId },
    select: { phrase: true },
  });
  const lower = body.toLowerCase();
  const match = keywords.find((k) => lower.includes(k.phrase.toLowerCase()));
  return match ? match.phrase : null;
}

messagingRouter.post(
  "/send",
  requireAuth,
  requireRole("incarcerated", "family"),
  async (req: Request, res: Response) => {
    try {
      const { conversationId, body } = req.body;

      if (!conversationId || !body?.trim()) {
        res.status(400).json(
          createErrorResponse({
            code: "VALIDATION_ERROR",
            message: "conversationId and body are required",
          }),
        );
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { incarceratedPerson: { select: { facilityId: true } } },
      });

      if (!conversation) {
        res.status(404).json(
          createErrorResponse({
            code: "NOT_FOUND",
            message: "Conversation not found",
          }),
        );
        return;
      }

      if (conversation.isBlocked) {
        res.status(403).json(
          createErrorResponse({
            code: "FORBIDDEN",
            message: "This conversation has been blocked",
          }),
        );
        return;
      }

      const facilityId = conversation.incarceratedPerson.facilityId;
      const matchedKeyword = await screenMessage(body, facilityId);
      const status = matchedKeyword ? "pending_review" : "sent";

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderType: req.user!.role as "incarcerated" | "family",
          senderId: req.user!.id,
          body: body.trim(),
          status,
        },
      });

      res.json(createSuccessResponse({ message, flagged: !!matchedKeyword }));
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to send message",
        }),
      );
    }
  },
);

messagingRouter.get(
  "/keywords",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const facilityId =
        (req.query.facilityId as string) || req.user!.facilityId;

      if (!facilityId) {
        res.status(400).json(
          createErrorResponse({
            code: "VALIDATION_ERROR",
            message: "facilityId is required",
          }),
        );
        return;
      }

      const keywords = await prisma.flaggedKeyword.findMany({
        where: { facilityId },
        orderBy: { createdAt: "asc" },
      });

      res.json(createSuccessResponse(keywords));
    } catch (error) {
      console.error("Error fetching keywords:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch keywords",
        }),
      );
    }
  },
);

messagingRouter.post(
  "/keywords",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { facilityId, phrase } = req.body;
      const resolvedFacilityId = facilityId || req.user!.facilityId;

      if (!resolvedFacilityId || !phrase?.trim()) {
        res.status(400).json(
          createErrorResponse({
            code: "VALIDATION_ERROR",
            message: "facilityId and phrase are required",
          }),
        );
        return;
      }

      const keyword = await prisma.flaggedKeyword.create({
        data: {
          facilityId: resolvedFacilityId,
          phrase: phrase.trim().toLowerCase(),
          createdBy: req.user!.id,
        },
      });

      res.json(createSuccessResponse(keyword));
    } catch (error: any) {
      if (error?.code === "P2002") {
        res.status(409).json(
          createErrorResponse({
            code: "CONFLICT",
            message: "Keyword already exists for this facility",
          }),
        );
        return;
      }
      console.error("Error creating keyword:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to create keyword",
        }),
      );
    }
  },
);

messagingRouter.put(
  "/keywords/:keywordId",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { keywordId } = req.params;
      const { phrase } = req.body;

      if (!phrase?.trim()) {
        res.status(400).json(
          createErrorResponse({
            code: "VALIDATION_ERROR",
            message: "phrase is required",
          }),
        );
        return;
      }

      const keyword = await prisma.flaggedKeyword.update({
        where: { id: keywordId },
        data: { phrase: phrase.trim().toLowerCase() },
      });

      res.json(createSuccessResponse(keyword));
    } catch (error: any) {
      if (error?.code === "P2002") {
        res.status(409).json(
          createErrorResponse({
            code: "CONFLICT",
            message: "Keyword already exists for this facility",
          }),
        );
        return;
      }
      console.error("Error updating keyword:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to update keyword",
        }),
      );
    }
  },
);

messagingRouter.delete(
  "/keywords/:keywordId",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { keywordId } = req.params;

      await prisma.flaggedKeyword.delete({ where: { id: keywordId } });

      res.json(createSuccessResponse({ success: true }));
    } catch (error) {
      console.error("Error deleting keyword:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to delete keyword",
        }),
      );
    }
  },
);

messagingRouter.get(
  "/logs",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const {
        facilityId,
        startDate,
        endDate,
        userId,
        status,
        search,
        page = "1",
        pageSize = "20",
      } = req.query;

      const skip = (parseInt(String(page)) - 1) * parseInt(String(pageSize));
      const take = parseInt(String(pageSize));

      const where: Record<string, unknown> = {};

      if (facilityId) {
        where.conversation = {
          incarceratedPerson: { facilityId: String(facilityId) },
        };
      }
      if (startDate || endDate) {
        where.createdAt = {
          ...(startDate ? { gte: new Date(String(startDate)) } : {}),
          ...(endDate ? { lte: new Date(String(endDate)) } : {}),
        };
      }
      if (userId) {
        where.senderId = String(userId);
      }
      if (status) {
        where.status = String(status);
      }
      if (search) {
        where.body = { contains: String(search), mode: "insensitive" };
      }

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where,
          include: {
            conversation: {
              include: {
                incarceratedPerson: {
                  select: { id: true, firstName: true, lastName: true },
                },
                familyMember: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.message.count({ where }),
      ]);

      res.json({
        success: true,
        data: messages,
        pagination: {
          page: parseInt(String(page)),
          pageSize: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error("Error fetching message logs:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch message logs",
        }),
      );
    }
  },
);

messagingRouter.get(
  "/pending",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { facilityId } = req.query;

      const pendingMessages = await prisma.message.findMany({
        where: {
          status: "pending_review",
        },
        include: {
          conversation: {
            include: {
              incarceratedPerson: true,
              familyMember: true,
            },
          },
          attachments: true,
        },
        orderBy: { createdAt: "asc" },
      });

      res.json(createSuccessResponse(pendingMessages));
    } catch (error) {
      console.error("Error fetching pending messages:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch pending messages",
        }),
      );
    }
  },
);

messagingRouter.post(
  "/approve/:messageId",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;

      const message = await prisma.message.update({
        where: { id: messageId },
        data: {
          status: "approved",
          reviewedBy: req.user!.id,
        },
      });

      res.json(createSuccessResponse({ success: true, message }));
    } catch (error) {
      console.error("Error approving message:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to approve message",
        }),
      );
    }
  },
);

messagingRouter.post(
  "/block-conversation",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { incarceratedPersonId, familyMemberId } = req.body;

      if (!incarceratedPersonId || !familyMemberId) {
        res.status(400).json(
          createErrorResponse({
            code: "VALIDATION_ERROR",
            message: "incarceratedPersonId and familyMemberId are required",
          }),
        );
        return;
      }

      // Block the conversation
      const conversation = await prisma.conversation.upsert({
        where: {
          incarceratedPersonId_familyMemberId: {
            incarceratedPersonId,
            familyMemberId,
          },
        },
        create: {
          incarceratedPersonId,
          familyMemberId,
          isBlocked: true,
          blockedBy: req.user!.id,
        },
        update: { isBlocked: true, blockedBy: req.user!.id },
        include: {
          incarceratedPerson: {
            select: { id: true, firstName: true, lastName: true },
          },
          familyMember: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // Also set the approved_contact status to 'removed'
      await prisma.approvedContact.updateMany({
        where: { incarceratedPersonId, familyMemberId, status: "approved" },
        data: {
          status: "removed",
          reviewedAt: new Date(),
          reviewedBy: req.user!.id,
        },
      });

      res.json(createSuccessResponse({ success: true, conversation }));
    } catch (error) {
      console.error("Error blocking conversation:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to block conversation",
        }),
      );
    }
  },
);

messagingRouter.post(
  "/unblock-conversation/:conversationId",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;

      const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { isBlocked: false, blockedBy: null },
      });

      // Also restore the approved_contact status back to 'approved'
      await prisma.approvedContact.updateMany({
        where: {
          incarceratedPersonId: conversation.incarceratedPersonId,
          familyMemberId: conversation.familyMemberId,
          status: "removed",
        },
        data: {
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy: req.user!.id,
        },
      });

      res.json(createSuccessResponse({ success: true, conversation }));
    } catch (error) {
      console.error("Error unblocking conversation:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to unblock conversation",
        }),
      );
    }
  },
);

messagingRouter.get(
  "/blocked-conversations",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const facilityId =
        (req.query.facilityId as string) || req.user!.facilityId;

      if (!facilityId) {
        res.status(400).json(
          createErrorResponse({
            code: "VALIDATION_ERROR",
            message: "facilityId is required",
          }),
        );
        return;
      }

      const conversations = await prisma.conversation.findMany({
        where: {
          isBlocked: true,
          incarceratedPerson: { facilityId },
        },
        include: {
          incarceratedPerson: {
            select: { id: true, firstName: true, lastName: true },
          },
          familyMember: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(createSuccessResponse(conversations));
    } catch (error) {
      console.error("Error fetching blocked conversations:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch blocked conversations",
        }),
      );
    }
  },
);

messagingRouter.get(
  "/incarcerated-persons",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const facilityId =
        (req.query.facilityId as string) || req.user!.facilityId;

      if (!facilityId) {
        res.status(400).json(
          createErrorResponse({
            code: "VALIDATION_ERROR",
            message: "facilityId is required",
          }),
        );
        return;
      }

      const persons = await prisma.incarceratedPerson.findMany({
        where: { facilityId, status: "active" },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { lastName: "asc" },
      });

      res.json(createSuccessResponse(persons));
    } catch (error) {
      console.error("Error fetching incarcerated persons:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch incarcerated persons",
        }),
      );
    }
  },
);

messagingRouter.get(
  "/incarcerated-persons/:personId/contacts",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { personId } = req.params;

      const contacts = await prisma.approvedContact.findMany({
        where: {
          incarceratedPersonId: personId,
          status: "approved",
        },
        include: {
          familyMember: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { requestedAt: "asc" },
      });

      res.json(createSuccessResponse(contacts));
    } catch (error) {
      console.error("Error fetching contacts for person:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch contacts",
        }),
      );
    }
  },
);

messagingRouter.post(
  "/reject/:messageId",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;

      const message = await prisma.message.update({
        where: { id: messageId },
        data: { status: "blocked", reviewedBy: req.user!.id },
      });

      res.json(createSuccessResponse({ success: true, message }));
    } catch (error) {
      console.error("Error rejecting message:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to reject message",
        }),
      );
    }
  },
);

messagingRouter.get(
  "/contact-requests",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const facilityId =
        (req.query.facilityId as string) || req.user!.facilityId;

      if (!facilityId) {
        res.status(400).json(
          createErrorResponse({
            code: "VALIDATION_ERROR",
            message: "facilityId is required",
          }),
        );
        return;
      }

      const requests = await prisma.approvedContact.findMany({
        where: {
          status: "pending",
          incarceratedPerson: { facilityId },
        },
        include: {
          incarceratedPerson: {
            select: { id: true, firstName: true, lastName: true },
          },
          familyMember: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { requestedAt: "asc" },
      });

      res.json(createSuccessResponse(requests));
    } catch (error) {
      console.error("Error fetching contact requests:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch contact requests",
        }),
      );
    }
  },
);

messagingRouter.post(
  "/contact-requests/:requestId/approve",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;

      const request = await prisma.approvedContact.update({
        where: { id: requestId },
        data: {
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy: req.user!.id,
        },
      });

      res.json(createSuccessResponse({ success: true, request }));
    } catch (error) {
      console.error("Error approving contact request:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to approve contact request",
        }),
      );
    }
  },
);

messagingRouter.post(
  "/contact-requests/:requestId/deny",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;

      const request = await prisma.approvedContact.update({
        where: { id: requestId },
        data: {
          status: "denied",
          reviewedAt: new Date(),
          reviewedBy: req.user!.id,
        },
      });

      res.json(createSuccessResponse({ success: true, request }));
    } catch (error) {
      console.error("Error denying contact request:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to deny contact request",
        }),
      );
    }
  },
);

messagingRouter.get(
  "/stats",
  requireAuth,
  requireRole("facility_admin", "agency_admin"),
  async (req: Request, res: Response) => {
    try {
      const { facilityId, date } = req.query;
      const targetDate = date ? new Date(String(date)) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const [todayTotal, pendingReview] = await Promise.all([
        prisma.message.count({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        prisma.message.count({
          where: { status: "pending_review" },
        }),
      ]);

      res.json(createSuccessResponse({ todayTotal, pendingReview }));
    } catch (error) {
      console.error("Error fetching messaging stats:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch stats",
        }),
      );
    }
  },
);

// ==========================================
// CONVERSATION & SEND/RECEIVE ROUTES
// ==========================================

// Get or create a conversation between an incarcerated person and family member
messagingRouter.post(
  "/conversations",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { incarceratedPersonId, familyMemberId } = req.body;

      if (!incarceratedPersonId || !familyMemberId) {
        res.status(400).json(
          createErrorResponse({
            code: "VALIDATION_ERROR",
            message: "incarceratedPersonId and familyMemberId are required",
          }),
        );
        return;
      }

      const conversation = await prisma.conversation.upsert({
        where: {
          incarceratedPersonId_familyMemberId: {
            incarceratedPersonId,
            familyMemberId,
          },
        },
        update: {},
        create: { incarceratedPersonId, familyMemberId },
        include: {
          incarceratedPerson: true,
          familyMember: true,
        },
      });

      res.json(createSuccessResponse(conversation));
    } catch (error) {
      console.error("Error getting/creating conversation:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to get conversation",
        }),
      );
    }
  },
);

// List all conversations for the authenticated user
messagingRouter.get(
  "/conversations",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      const where =
        user.role === "incarcerated"
          ? { incarceratedPersonId: user.id }
          : { familyMemberId: user.id };

      const conversations = await prisma.conversation.findMany({
        where,
        include: {
          incarceratedPerson: true,
          familyMember: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(createSuccessResponse(conversations));
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch conversations",
        }),
      );
    }
  },
);

// Get messages in a conversation
messagingRouter.get(
  "/conversations/:conversationId/messages",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const { page = "1", pageSize = "20" } = req.query;
      const skip = (parseInt(String(page)) - 1) * parseInt(String(pageSize));
      const take = parseInt(String(pageSize));

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "asc" },
          skip,
          take,
        }),
        prisma.message.count({ where: { conversationId } }),
      ]);

      res.json({
        success: true,
        data: messages,
        pagination: {
          page: parseInt(String(page)),
          pageSize: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json(
        createErrorResponse({
          code: "INTERNAL_ERROR",
          message: "Failed to fetch messages",
        }),
      );
    }
  },
);

export default messagingRouter;
//