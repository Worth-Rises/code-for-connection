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

videoRouter.post('/deny-request/:callId', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    const call = await prisma.videoCall.update({
      where: { id: callId },
      data: {
        status: 'denied',
      },
    });

    res.json(createSuccessResponse({ success: true, call }));
  } catch (error) {
    console.error('Error denying video call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to deny video call',
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

videoRouter.get('/check-limit/:incarceratedPersonId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId } = req.params;

    const person = await prisma.incarceratedPerson.findUnique({
      where: { id: incarceratedPersonId },
      include: {
        housingUnit: {
          include: {
            unitType: {
              select: {
                videoCallsEnabled: true,
                maxWeeklyVideoRequests: true,
              },
            },
          },
        },
      },
    });

    if (!person) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Incarcerated person not found',
      }));
      return;
    }

    const { unitType } = person.housingUnit;

    if (!unitType.videoCallsEnabled) {
      res.json(createSuccessResponse({
        allowed: false,
        reason: 'Video calls are disabled for this housing unit type',
        remaining: 0,
      }));
      return;
    }

    if (unitType.maxWeeklyVideoRequests === null) {
      res.json(createSuccessResponse({
        allowed: true,
        reason: null,
        remaining: null,
      }));
      return;
    }

    const now = new Date();
    const day = now.getDay();
    const distanceFromMonday = (day + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - distanceFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weeklyRequests = await prisma.videoCall.count({
      where: {
        incarceratedPersonId,
        scheduledStart: { gte: weekStart, lte: weekEnd },
        status: { not: 'denied' },
      },
    });

    const remaining = Math.max(unitType.maxWeeklyVideoRequests - weeklyRequests, 0);
    const allowed = weeklyRequests < unitType.maxWeeklyVideoRequests;

    res.json(createSuccessResponse({
      allowed,
      reason: allowed ? null : 'Weekly video request limit reached',
      remaining,
    }));
  } catch (error) {
    console.error('Error checking video call limit:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to check video call limit',
    }));
  }
});

videoRouter.post('/record-usage/:incarceratedPersonId', requireAuth, async (req: Request, res: Response) => {
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
        videoCallCount: { increment: 1 },
      },
      create: {
        incarceratedPersonId,
        date: today,
        videoCallCount: 1,
      },
    });

    res.json(createSuccessResponse({ recorded: true, usage }));
  } catch (error) {
    console.error('Error recording video usage:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to record video usage',
    }));
  }
});

export default videoRouter;
