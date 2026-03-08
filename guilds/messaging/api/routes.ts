import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';

export const messagingRouter = Router();

messagingRouter.get('/logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const { facilityId, startDate, endDate, userId, page = '1', pageSize = '20' } = req.query;
    
    const skip = (parseInt(String(page)) - 1) * parseInt(String(pageSize));
    const take = parseInt(String(pageSize));

    const where: Record<string, unknown> = {};
    if (userId) {
      where.conversation = {
        OR: [
          { incarceratedPersonId: String(userId) },
          { familyMemberId: String(userId) },
        ],
      };
    }
    if (facilityId) {
      where.conversation = {
        ...((where.conversation as Record<string, unknown>) || {}),
        incarceratedPerson: { facilityId: String(facilityId) },
      };
    }
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(String(startDate)) } : {}),
        ...(endDate ? { lte: new Date(String(endDate)) } : {}),
      };
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          conversation: {
            include: {
              incarceratedPerson: true,
              familyMember: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
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
    console.error('Error fetching message logs:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch message logs',
    }));
  }
});

messagingRouter.get('/pending', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;
    
    const pendingMessages = await prisma.message.findMany({
      where: {
        status: 'pending_review',
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
      orderBy: { createdAt: 'asc' },
    });

    res.json(createSuccessResponse(pendingMessages));
  } catch (error) {
    console.error('Error fetching pending messages:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch pending messages',
    }));
  }
});

messagingRouter.post('/approve/:messageId', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    
    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        status: 'approved',
        reviewedBy: req.user!.id,
      },
    });

    res.json(createSuccessResponse({ success: true, message }));
  } catch (error) {
    console.error('Error approving message:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to approve message',
    }));
  }
});

messagingRouter.post('/reject/:messageId', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        status: 'blocked',
        reviewedBy: req.user!.id,
      },
    });

    res.json(createSuccessResponse({ success: true, message }));
  } catch (error) {
    console.error('Error rejecting message:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to reject message',
    }));
  }
});

messagingRouter.post('/block-conversation/:conversationId', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isBlocked: true,
        blockedBy: req.user!.id,
      },
    });

    res.json(createSuccessResponse({ success: true, conversation }));
  } catch (error) {
    console.error('Error blocking conversation:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to block conversation',
    }));
  }
});

messagingRouter.get('/stats', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
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
        where: { status: 'pending_review' },
      }),
    ]);

    res.json(createSuccessResponse({ todayTotal, pendingReview }));
  } catch (error) {
    console.error('Error fetching messaging stats:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch stats',
    }));
  }
});

// Session limit check — can this person send a message?
messagingRouter.get('/check-limit/:incarceratedPersonId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId } = req.params;

    const person = await prisma.incarceratedPerson.findUnique({
      where: { id: incarceratedPersonId },
      include: {
        housingUnit: { include: { unitType: true } },
      },
    });

    if (!person) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Person not found',
      }));
      return;
    }

    const unitType = person.housingUnit.unitType;

    if (!unitType.messagingEnabled) {
      res.json(createSuccessResponse({
        allowed: false,
        reason: 'Messaging is disabled for this housing unit type',
        limits: { messagingEnabled: false, maxDailyMessages: unitType.maxDailyMessages },
      }));
      return;
    }

    if (unitType.maxDailyMessages !== null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usage = await prisma.dailyUsage.findUnique({
        where: {
          incarceratedPersonId_date: {
            incarceratedPersonId,
            date: today,
          },
        },
      });

      const currentCount = usage?.messagesSent ?? 0;
      const remaining = unitType.maxDailyMessages - currentCount;

      if (remaining <= 0) {
        res.json(createSuccessResponse({
          allowed: false,
          reason: `Daily message limit reached (${unitType.maxDailyMessages} per day)`,
          limits: { messagingEnabled: true, maxDailyMessages: unitType.maxDailyMessages, usedToday: currentCount, remaining: 0 },
        }));
        return;
      }

      res.json(createSuccessResponse({
        allowed: true,
        limits: { messagingEnabled: true, maxDailyMessages: unitType.maxDailyMessages, usedToday: currentCount, remaining },
      }));
      return;
    }

    res.json(createSuccessResponse({
      allowed: true,
      limits: { messagingEnabled: true, maxDailyMessages: null },
    }));
  } catch (error) {
    console.error('Error checking message limit:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to check message limit',
    }));
  }
});

// Increment daily message usage
messagingRouter.post('/record-usage/:incarceratedPersonId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.dailyUsage.upsert({
      where: {
        incarceratedPersonId_date: {
          incarceratedPersonId,
          date: today,
        },
      },
      update: {
        messagesSent: { increment: 1 },
      },
      create: {
        incarceratedPersonId,
        date: today,
        messagesSent: 1,
      },
    });

    res.json(createSuccessResponse({ success: true, usage }));
  } catch (error) {
    console.error('Error recording message usage:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to record usage',
    }));
  }
});
export default messagingRouter;
