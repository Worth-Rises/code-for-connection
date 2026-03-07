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


// ==========================================
// CONVERSATION & SEND/RECEIVE ROUTES
// ==========================================

// Get or create a conversation between an incarcerated person and family member
messagingRouter.post('/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId, familyMemberId } = req.body;

    if (!incarceratedPersonId || !familyMemberId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'incarceratedPersonId and familyMemberId are required',
      }));
      return;
    }

    const conversation = await prisma.conversation.upsert({
      where: {
        incarceratedPersonId_familyMemberId: { incarceratedPersonId, familyMemberId },
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
    console.error('Error getting/creating conversation:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to get conversation',
    }));
  }
});

// List all conversations for the authenticated user
messagingRouter.get('/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const where =
      user.role === 'incarcerated'
        ? { incarceratedPersonId: user.id }
        : { familyMemberId: user.id };

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        incarceratedPerson: true,
        familyMember: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(createSuccessResponse(conversations));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch conversations',
    }));
  }
});

// Get messages in a conversation
messagingRouter.get('/conversations/:conversationId/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { page = '1', pageSize = '20' } = req.query;
    const skip = (parseInt(String(page)) - 1) * parseInt(String(pageSize));
    const take = parseInt(String(pageSize));

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
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
    console.error('Error fetching messages:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch messages',
    }));
  }
});

// Send a message (incarcerated person or family member)
messagingRouter.post('/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const { conversationId, body } = req.body;
    const user = req.user!;

    if (!conversationId || !body) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'conversationId and body are required',
      }));
      return;
    }

    // Verify conversation exists and user belongs to it
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      }));
      return;
    }

    if (conversation.isBlocked) {
      res.status(403).json(createErrorResponse({
        code: 'CONVERSATION_BLOCKED',
        message: 'This conversation has been blocked',
      }));
      return;
    }

    const isParticipant =
      (user.role === 'incarcerated' && conversation.incarceratedPersonId === user.id) ||
      (user.role === 'family' && conversation.familyMemberId === user.id);

    if (!isParticipant) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'You are not a participant in this conversation',
      }));
      return;
    }

    const senderType = user.role === 'incarcerated' ? 'incarcerated' : 'family';

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderType,
        senderId: user.id,
        body,
        status: 'pending_review', // all messages require admin review
      },
    });

    res.status(201).json(createSuccessResponse(message));
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to send message',
    }));
  }
});

export default messagingRouter;
