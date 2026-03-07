import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';

export const videoRouter = Router();

videoRouter.get('/active-calls', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;
    
    const activeCalls = await prisma.videoCall.findMany({
      where: {
        status: 'in_progress',
        ...(facilityId ? { facilityId: String(facilityId) } : {}),
      },
      include: {
        incarceratedPerson: true,
        familyMember: true,
      },
      orderBy: { actualStart: 'desc' },
    });

    res.json(createSuccessResponse(activeCalls));
  } catch (error) {
    console.error('Error fetching active video calls:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch active calls',
    }));
  }
});

videoRouter.get('/call-logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const { facilityId, startDate, endDate, userId, page = '1', pageSize = '20' } = req.query;
    
    const skip = (parseInt(String(page)) - 1) * parseInt(String(pageSize));
    const take = parseInt(String(pageSize));

    const where: Record<string, unknown> = {};
    if (facilityId) where.facilityId = String(facilityId);
    if (userId) {
      where.OR = [
        { incarceratedPersonId: String(userId) },
        { familyMemberId: String(userId) },
      ];
    }
    if (startDate || endDate) {
      where.scheduledStart = {
        ...(startDate ? { gte: new Date(String(startDate)) } : {}),
        ...(endDate ? { lte: new Date(String(endDate)) } : {}),
      };
    }

    const [calls, total] = await Promise.all([
      prisma.videoCall.findMany({
        where,
        include: {
          incarceratedPerson: true,
          familyMember: true,
        },
        skip,
        take,
        orderBy: { scheduledStart: 'desc' },
      }),
      prisma.videoCall.count({ where }),
    ]);

    res.json({
      success: true,
      data: calls,
      pagination: {
        page: parseInt(String(page)),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Error fetching video call logs:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch call logs',
    }));
  }
});

videoRouter.get('/pending-requests', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;
    
    const pendingRequests = await prisma.videoCall.findMany({
      where: {
        status: 'requested',
        ...(facilityId ? { facilityId: String(facilityId) } : {}),
      },
      include: {
        incarceratedPerson: true,
        familyMember: true,
      },
      orderBy: { scheduledStart: 'asc' },
    });

    res.json(createSuccessResponse(pendingRequests));
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch pending requests',
    }));
  }
});

videoRouter.post('/approve-request/:callId', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    
    const call = await prisma.videoCall.update({
      where: { id: callId },
      data: {
        status: 'scheduled',
        approvedBy: req.user!.id,
      },
    });

    res.json(createSuccessResponse({ success: true, call }));
  } catch (error) {
    console.error('Error approving video call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to approve video call',
    }));
  }
});

videoRouter.post('/terminate-call/:callId', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    
    const call = await prisma.videoCall.update({
      where: { id: callId },
      data: {
        status: 'terminated_by_admin',
        actualEnd: new Date(),
        endedBy: 'admin',
        terminatedByAdminId: req.user!.id,
      },
    });

    res.json(createSuccessResponse({ success: true, call }));
  } catch (error) {
    console.error('Error terminating video call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to terminate call',
    }));
  }
});

videoRouter.get('/stats', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { facilityId, date } = req.query;
    const targetDate = date ? new Date(String(date)) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {};
    if (facilityId) where.facilityId = String(facilityId);

    const [activeCalls, todayTotal, pendingRequests] = await Promise.all([
      prisma.videoCall.count({
        where: { ...where, status: 'in_progress' },
      }),
      prisma.videoCall.count({
        where: {
          ...where,
          scheduledStart: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.videoCall.count({
        where: { ...where, status: 'requested' },
      }),
    ]);

    res.json(createSuccessResponse({ activeCalls, todayTotal, pendingRequests }));
  } catch (error) {
    console.error('Error fetching video stats:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch stats',
    }));
  }
});

// Family-facing: get approved contacts for the authenticated family member
videoRouter.get('/approved-contacts', requireAuth, async (req: Request, res: Response) => {
  try {
    const familyMemberId = req.user!.id;

    const contacts = await prisma.approvedContact.findMany({
      where: {
        familyMemberId,
        status: 'approved',
      },
      include: {
        incarceratedPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            facilityId: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    res.json(createSuccessResponse(contacts));
  } catch (error) {
    console.error('Error fetching approved contacts:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch approved contacts',
    }));
  }
});

// Family-facing: request a video call
videoRouter.post('/request', requireAuth, async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId, scheduledStart, scheduledEnd } = req.body;
    const familyMemberId = req.user!.id;

    if (!incarceratedPersonId || !scheduledStart || !scheduledEnd) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'incarceratedPersonId, scheduledStart, and scheduledEnd are required',
      }));
      return;
    }

    // Validate that the user has an approved contact relationship
    const contact = await prisma.approvedContact.findFirst({
      where: {
        familyMemberId,
        incarceratedPersonId,
        status: 'approved',
      },
      include: {
        incarceratedPerson: {
          select: {
            facilityId: true,
          },
        },
      },
    });

    if (!contact) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'No approved contact relationship found',
      }));
      return;
    }

    // Validate time is in the future
    const startTime = new Date(scheduledStart);
    if (startTime <= new Date()) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Scheduled time must be in the future',
      }));
      return;
    }

    // Create video call request
    const call = await prisma.videoCall.create({
      data: {
        incarceratedPersonId,
        familyMemberId,
        facilityId: contact.incarceratedPerson.facilityId,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        status: 'requested',
        requestedBy: familyMemberId,
      },
      include: {
        incarceratedPerson: true,
        familyMember: true,
      },
    });

    res.json(createSuccessResponse(call));
  } catch (error) {
    console.error('Error creating video call request:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create video call request',
    }));
  }
});

// Family-facing: get scheduled calls for a contact
videoRouter.get('/scheduled-calls', requireAuth, async (req: Request, res: Response) => {
  try {
    const { contactId } = req.query;
    const familyMemberId = req.user!.id;

    const where: any = {
      familyMemberId,
      status: {
        in: ['requested', 'approved', 'scheduled'],
      },
      scheduledStart: {
        gte: new Date(),
      },
    };

    if (contactId) {
      where.incarceratedPersonId = String(contactId);
    }

    const calls = await prisma.videoCall.findMany({
      where,
      include: {
        incarceratedPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    res.json(createSuccessResponse(calls));
  } catch (error) {
    console.error('Error fetching scheduled calls:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch scheduled calls',
    }));
  }
});

export default videoRouter;
