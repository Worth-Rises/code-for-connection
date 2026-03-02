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

    const messages = await prisma.message.findMany({
      where: {},
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
    });

    const total = await prisma.message.count();

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

export default messagingRouter;
