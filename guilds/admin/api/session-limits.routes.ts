import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';

export const sessionLimitsRouter = Router();

type UnitTypeLimits = {
  maxDailyVoiceCalls: number | null;
  maxDailyMessages: number | null;
  maxWeeklyVideoRequests: number | null;
  voiceCallsEnabled: boolean;
  videoCallsEnabled: boolean;
  messagingEnabled: boolean;
};

function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const distanceFromMonday = (day + 6) % 7;

  const start = new Date(date);
  start.setDate(date.getDate() - distanceFromMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getRemaining(limit: number | null, used: number, enabled: boolean): number | null {
  if (!enabled) {
    return 0;
  }

  if (limit === null) {
    return null;
  }

  return Math.max(limit - used, 0);
}

async function getPersonLimitsAndUsage(incarceratedPersonId: string): Promise<{
  personId: string;
  facilityId: string;
  limits: UnitTypeLimits;
  usage: {
    voiceCallCount: number;
    messagesSent: number;
    videoCallCount: number;
  };
  weeklyVideoRequests: number;
} | null> {
  const person = await prisma.incarceratedPerson.findUnique({
    where: { id: incarceratedPersonId },
    include: {
      housingUnit: {
        include: {
          unitType: {
            select: {
              maxDailyVoiceCalls: true,
              maxDailyMessages: true,
              maxWeeklyVideoRequests: true,
              voiceCallsEnabled: true,
              videoCallsEnabled: true,
              messagingEnabled: true,
            },
          },
        },
      },
    },
  });

  if (!person) {
    return null;
  }

  const now = new Date();
  const { start: dayStart } = getDayBounds(now);
  const { start: weekStart, end: weekEnd } = getWeekBounds(now);

  const [dailyUsage, weeklyVideoRequests] = await Promise.all([
    prisma.dailyUsage.findUnique({
      where: {
        incarceratedPersonId_date: {
          incarceratedPersonId,
          date: dayStart,
        },
      },
      select: {
        voiceCallCount: true,
        messagesSent: true,
        videoCallCount: true,
      },
    }),
    prisma.videoCall.count({
      where: {
        incarceratedPersonId,
        scheduledStart: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: {
          not: 'denied',
        },
      },
    }),
  ]);

  return {
    personId: person.id,
    facilityId: person.facilityId,
    limits: {
      maxDailyVoiceCalls: person.housingUnit.unitType.maxDailyVoiceCalls,
      maxDailyMessages: person.housingUnit.unitType.maxDailyMessages,
      maxWeeklyVideoRequests: person.housingUnit.unitType.maxWeeklyVideoRequests,
      voiceCallsEnabled: person.housingUnit.unitType.voiceCallsEnabled,
      videoCallsEnabled: person.housingUnit.unitType.videoCallsEnabled,
      messagingEnabled: person.housingUnit.unitType.messagingEnabled,
    },
    usage: {
      voiceCallCount: dailyUsage?.voiceCallCount ?? 0,
      messagesSent: dailyUsage?.messagesSent ?? 0,
      videoCallCount: dailyUsage?.videoCallCount ?? 0,
    },
    weeklyVideoRequests,
  };
}

// All config fields on HousingUnitType
const allConfigSelect = {
  id: true,
  name: true,
  maxDailyVoiceCalls: true,
  maxDailyMessages: true,
  maxWeeklyVideoRequests: true,
  voiceCallsEnabled: true,
  videoCallsEnabled: true,
  messagingEnabled: true,
  voiceCallDurationMinutes: true,
  videoCallDurationMinutes: true,
  callingHoursStart: true,
  callingHoursEnd: true,
  maxContacts: true,
  videoSlotDurationMinutes: true,
  maxConcurrentVideoCalls: true,
};

// List all unit types for the admin's agency
sessionLimitsRouter.get('/unit-types', requireAuth, requireRole('agency_admin'), async (req: Request, res: Response) => {
  try {
    if (!req.user?.agencyId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Authenticated admin must have an agency',
      }));
      return;
    }

    const unitTypes = await prisma.housingUnitType.findMany({
      where: { agencyId: req.user.agencyId },
      select: {
        ...allConfigSelect,
        _count: { select: { housingUnits: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(createSuccessResponse(unitTypes));
  } catch (error) {
    console.error('Error fetching unit types:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch unit types',
    }));
  }
});

sessionLimitsRouter.get('/unit-types/:unitTypeId/limits', requireAuth, requireRole('agency_admin'), async (req: Request, res: Response) => {
  try {
    const { unitTypeId } = req.params;

    if (!req.user?.agencyId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Authenticated admin must have an agency',
      }));
      return;
    }

    const unitType = await prisma.housingUnitType.findFirst({
      where: {
        id: unitTypeId,
        agencyId: req.user.agencyId,
      },
      select: allConfigSelect,
    });

    if (!unitType) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Housing unit type not found',
      }));
      return;
    }

    res.json(createSuccessResponse(unitType));
  } catch (error) {
    console.error('Error fetching unit type limits:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch unit type limits',
    }));
  }
});

sessionLimitsRouter.patch('/unit-types/:unitTypeId/limits', requireAuth, requireRole('agency_admin'), async (req: Request, res: Response) => {
  try {
    const { unitTypeId } = req.params;
    const {
      maxDailyVoiceCalls,
      maxDailyMessages,
      maxWeeklyVideoRequests,
      voiceCallsEnabled,
      videoCallsEnabled,
      messagingEnabled,
      voiceCallDurationMinutes,
      videoCallDurationMinutes,
      callingHoursStart,
      callingHoursEnd,
      maxContacts,
      videoSlotDurationMinutes,
      maxConcurrentVideoCalls,
    } = req.body;

    if (!req.user?.agencyId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Authenticated admin must have an agency',
      }));
      return;
    }

    const existing = await prisma.housingUnitType.findFirst({
      where: {
        id: unitTypeId,
        agencyId: req.user.agencyId,
      },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Housing unit type not found',
      }));
      return;
    }

    const updated = await prisma.housingUnitType.update({
      where: { id: unitTypeId },
      data: {
        ...(maxDailyVoiceCalls !== undefined ? { maxDailyVoiceCalls } : {}),
        ...(maxDailyMessages !== undefined ? { maxDailyMessages } : {}),
        ...(maxWeeklyVideoRequests !== undefined ? { maxWeeklyVideoRequests } : {}),
        ...(voiceCallsEnabled !== undefined ? { voiceCallsEnabled: Boolean(voiceCallsEnabled) } : {}),
        ...(videoCallsEnabled !== undefined ? { videoCallsEnabled: Boolean(videoCallsEnabled) } : {}),
        ...(messagingEnabled !== undefined ? { messagingEnabled: Boolean(messagingEnabled) } : {}),
        ...(voiceCallDurationMinutes !== undefined ? { voiceCallDurationMinutes } : {}),
        ...(videoCallDurationMinutes !== undefined ? { videoCallDurationMinutes } : {}),
        ...(callingHoursStart !== undefined ? { callingHoursStart } : {}),
        ...(callingHoursEnd !== undefined ? { callingHoursEnd } : {}),
        ...(maxContacts !== undefined ? { maxContacts } : {}),
        ...(videoSlotDurationMinutes !== undefined ? { videoSlotDurationMinutes } : {}),
        ...(maxConcurrentVideoCalls !== undefined ? { maxConcurrentVideoCalls } : {}),
      },
      select: allConfigSelect,
    });

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error updating unit type limits:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update unit type limits',
    }));
  }
});

sessionLimitsRouter.get('/usage/:incarceratedPersonId', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId } = req.params;
    const summary = await getPersonLimitsAndUsage(incarceratedPersonId);

    if (!summary) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Incarcerated person not found',
      }));
      return;
    }

    if (req.user?.role === 'facility_admin' && req.user.facilityId !== summary.facilityId) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'No access to this incarcerated person',
      }));
      return;
    }

    res.json(createSuccessResponse({
      incarceratedPersonId: summary.personId,
      usage: summary.usage,
      weeklyVideoRequests: summary.weeklyVideoRequests,
      limits: summary.limits,
    }));
  } catch (error) {
    console.error('Error fetching daily usage:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch daily usage',
    }));
  }
});

sessionLimitsRouter.get('/usage/:incarceratedPersonId/check', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId } = req.params;
    const summary = await getPersonLimitsAndUsage(incarceratedPersonId);

    if (!summary) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Incarcerated person not found',
      }));
      return;
    }

    if (req.user?.role === 'facility_admin' && req.user.facilityId !== summary.facilityId) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'No access to this incarcerated person',
      }));
      return;
    }

    const remainingVoiceCalls = getRemaining(
      summary.limits.maxDailyVoiceCalls,
      summary.usage.voiceCallCount,
      summary.limits.voiceCallsEnabled
    );

    const remainingMessages = getRemaining(
      summary.limits.maxDailyMessages,
      summary.usage.messagesSent,
      summary.limits.messagingEnabled
    );

    const canMakeVoiceCall =
      summary.limits.voiceCallsEnabled &&
      (summary.limits.maxDailyVoiceCalls === null || summary.usage.voiceCallCount < summary.limits.maxDailyVoiceCalls);

    const canSendMessage =
      summary.limits.messagingEnabled &&
      (summary.limits.maxDailyMessages === null || summary.usage.messagesSent < summary.limits.maxDailyMessages);

    const canRequestVideo =
      summary.limits.videoCallsEnabled &&
      (summary.limits.maxWeeklyVideoRequests === null || summary.weeklyVideoRequests < summary.limits.maxWeeklyVideoRequests);

    res.json(createSuccessResponse({
      canMakeVoiceCall,
      canSendMessage,
      canRequestVideo,
      remainingVoiceCalls,
      remainingMessages,
    }));
  } catch (error) {
    console.error('Error checking session limits:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to check session limits',
    }));
  }
});

// Emergency lockdown — disable or re-enable all comms for every unit type in the agency
sessionLimitsRouter.post('/emergency-lockdown', requireAuth, requireRole('agency_admin'), async (req: Request, res: Response) => {
  try {
    if (!req.user?.agencyId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Authenticated admin must have an agency',
      }));
      return;
    }

    const { enable } = req.body;
    if (typeof enable !== 'boolean') {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Request body must include { enable: boolean }',
      }));
      return;
    }

    const result = await prisma.housingUnitType.updateMany({
      where: { agencyId: req.user.agencyId },
      data: {
        voiceCallsEnabled: enable,
        videoCallsEnabled: enable,
        messagingEnabled: enable,
      },
    });

    res.json(createSuccessResponse({
      action: enable ? 'restored' : 'locked_down',
      unitTypesUpdated: result.count,
    }));
  } catch (error) {
    console.error('Error executing emergency lockdown:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to execute emergency lockdown',
    }));
  }
});

// Video time slot CRUD

sessionLimitsRouter.get('/unit-types/:unitTypeId/time-slots', requireAuth, requireRole('agency_admin'), async (req: Request, res: Response) => {
  try {
    const { unitTypeId } = req.params;

    if (!req.user?.agencyId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Authenticated admin must have an agency',
      }));
      return;
    }

    // Verify unit type belongs to admin's agency
    const unitType = await prisma.housingUnitType.findFirst({
      where: { id: unitTypeId, agencyId: req.user.agencyId },
      select: { id: true },
    });

    if (!unitType) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Housing unit type not found',
      }));
      return;
    }

    const slots = await prisma.videoCallTimeSlot.findMany({
      where: { housingUnitTypeId: unitTypeId },
      include: { facility: { select: { id: true, name: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json(createSuccessResponse(slots));
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch time slots',
    }));
  }
});

sessionLimitsRouter.post('/unit-types/:unitTypeId/time-slots', requireAuth, requireRole('agency_admin'), async (req: Request, res: Response) => {
  try {
    const { unitTypeId } = req.params;
    const { facilityId, dayOfWeek, startTime, endTime, maxConcurrent } = req.body;

    if (!req.user?.agencyId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Authenticated admin must have an agency',
      }));
      return;
    }

    // Verify unit type belongs to admin's agency
    const unitType = await prisma.housingUnitType.findFirst({
      where: { id: unitTypeId, agencyId: req.user.agencyId },
      select: { id: true },
    });

    if (!unitType) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Housing unit type not found',
      }));
      return;
    }

    const slot = await prisma.videoCallTimeSlot.create({
      data: {
        facilityId,
        housingUnitTypeId: unitTypeId,
        dayOfWeek,
        startTime,
        endTime,
        maxConcurrent: maxConcurrent ?? 5,
      },
      include: { facility: { select: { id: true, name: true } } },
    });

    res.status(201).json(createSuccessResponse(slot));
  } catch (error) {
    console.error('Error creating time slot:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create time slot',
    }));
  }
});

sessionLimitsRouter.delete('/time-slots/:slotId', requireAuth, requireRole('agency_admin'), async (req: Request, res: Response) => {
  try {
    const { slotId } = req.params;

    if (!req.user?.agencyId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Authenticated admin must have an agency',
      }));
      return;
    }

    // Verify slot belongs to admin's agency via unit type
    const slot = await prisma.videoCallTimeSlot.findFirst({
      where: {
        id: slotId,
        housingUnitType: { agencyId: req.user.agencyId },
      },
    });

    if (!slot) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Time slot not found',
      }));
      return;
    }

    await prisma.videoCallTimeSlot.delete({ where: { id: slotId } });

    res.json(createSuccessResponse({ deleted: true }));
  } catch (error) {
    console.error('Error deleting time slot:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete time slot',
    }));
  }
});

export default sessionLimitsRouter;
