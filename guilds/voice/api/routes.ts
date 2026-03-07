import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';

export const voiceRouter = Router();

// ==========================================
// INCARCERATED PERSON ENDPOINTS
// ==========================================

/**
 * Get approved contacts for the authenticated incarcerated person
 * Returns contacts with phone numbers they can call
 */
voiceRouter.get('/contacts', requireAuth, requireRole('incarcerated'), async (req: Request, res: Response) => {
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
      orderBy: { familyMember: { firstName: 'asc' } },
    });

    const formattedContacts = contacts.map((contact) => ({
      id: contact.id,
      familyMemberId: contact.familyMember.id,
      firstName: contact.familyMember.firstName,
      lastName: contact.familyMember.lastName,
      phone: contact.familyMember.phone,
      relationship: contact.relationship,
      isAttorney: contact.isAttorney,
    }));

    res.json(createSuccessResponse(formattedContacts));
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch contacts',
    }));
  }
});

/**
 * Initiate an outbound voice call
 * Creates a new call record and returns call details
 */
voiceRouter.post('/calls', requireAuth, requireRole('incarcerated'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { familyMemberId, isLegal = false } = req.body;

    if (!familyMemberId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'familyMemberId is required',
      }));
      return;
    }

    // Get the incarcerated person with facility info
    const incarceratedPerson = await prisma.incarceratedPerson.findUnique({
      where: { id: userId },
      include: {
        housingUnit: { include: { unitType: true } },
        facility: true,
      },
    });

    if (!incarceratedPerson) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'User not found',
      }));
      return;
    }

    // Verify the contact is approved
    const contact = await prisma.approvedContact.findUnique({
      where: {
        incarceratedPersonId_familyMemberId: {
          incarceratedPersonId: userId,
          familyMemberId,
        },
      },
      include: { familyMember: true },
    });

    if (!contact || contact.status !== 'approved') {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Contact is not approved for calls',
      }));
      return;
    }

    // Check if the phone number is blocked
    const blockedNumber = await prisma.blockedNumber.findFirst({
      where: {
        phoneNumber: contact.familyMember.phone,
        OR: [
          { scope: 'agency', agencyId: incarceratedPerson.agencyId },
          { scope: 'facility', facilityId: incarceratedPerson.facilityId },
        ],
      },
    });

    if (blockedNumber) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'This phone number is blocked',
      }));
      return;
    }

    // Check if user already has an active call
    const activeCall = await prisma.voiceCall.findFirst({
      where: {
        incarceratedPersonId: userId,
        status: { in: ['ringing', 'connected'] },
      },
    });

    if (activeCall) {
      res.status(409).json(createErrorResponse({
        code: 'CONFLICT',
        message: 'You already have an active call',
      }));
      return;
    }

    // Get call duration limit from housing unit type
    const callDurationMinutes = incarceratedPerson.housingUnit.unitType.voiceCallDurationMinutes;

    // Create the call record
    const call = await prisma.voiceCall.create({
      data: {
        incarceratedPersonId: userId,
        familyMemberId,
        facilityId: incarceratedPerson.facilityId,
        status: 'ringing',
        isLegal: isLegal || contact.isAttorney,
      },
      include: {
        familyMember: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        facility: {
          select: {
            announcementText: true,
            announcementAudioUrl: true,
          },
        },
      },
    });

    res.status(201).json(createSuccessResponse({
      callId: call.id,
      status: call.status,
      isLegal: call.isLegal,
      callDurationMinutes,
      contact: {
        firstName: call.familyMember.firstName,
        lastName: call.familyMember.lastName,
        phone: call.familyMember.phone,
      },
      facility: {
        announcementText: call.facility.announcementText,
        announcementAudioUrl: call.facility.announcementAudioUrl,
      },
      startedAt: call.startedAt,
    }));
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to initiate call',
    }));
  }
});

/**
 * Get the current active call for the authenticated user
 */
voiceRouter.get('/calls/active', requireAuth, requireRole('incarcerated'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const activeCall = await prisma.voiceCall.findFirst({
      where: {
        incarceratedPersonId: userId,
        status: { in: ['ringing', 'connected'] },
      },
      include: {
        familyMember: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!activeCall) {
      res.json(createSuccessResponse(null));
      return;
    }

    // Get call duration limit
    const incarceratedPerson = await prisma.incarceratedPerson.findUnique({
      where: { id: userId },
      include: { housingUnit: { include: { unitType: true } } },
    });

    const callDurationMinutes = incarceratedPerson?.housingUnit.unitType.voiceCallDurationMinutes ?? 30;

    res.json(createSuccessResponse({
      callId: activeCall.id,
      status: activeCall.status,
      isLegal: activeCall.isLegal,
      callDurationMinutes,
      contact: {
        firstName: activeCall.familyMember.firstName,
        lastName: activeCall.familyMember.lastName,
        phone: activeCall.familyMember.phone,
      },
      startedAt: activeCall.startedAt,
      connectedAt: activeCall.connectedAt,
    }));
  } catch (error) {
    console.error('Error fetching active call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch active call',
    }));
  }
});

/**
 * Update call status (connect the call when family member accepts)
 */
voiceRouter.patch('/calls/:callId/connect', requireAuth, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    const call = await prisma.voiceCall.findUnique({
      where: { id: callId },
    });

    if (!call) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Call not found',
      }));
      return;
    }

    if (call.status !== 'ringing') {
      res.status(400).json(createErrorResponse({
        code: 'INVALID_STATE',
        message: 'Call is not in ringing state',
      }));
      return;
    }

    const updatedCall = await prisma.voiceCall.update({
      where: { id: callId },
      data: {
        status: 'connected',
        connectedAt: new Date(),
      },
    });

    res.json(createSuccessResponse(updatedCall));
  } catch (error) {
    console.error('Error connecting call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to connect call',
    }));
  }
});

/**
 * End a call (by caller or receiver)
 */
voiceRouter.patch('/calls/:callId/end', requireAuth, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { endedBy } = req.body;
    const userId = req.user!.id;

    const call = await prisma.voiceCall.findUnique({
      where: { id: callId },
    });

    if (!call) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Call not found',
      }));
      return;
    }

    // Verify user is part of this call
    if (call.incarceratedPersonId !== userId && call.familyMemberId !== userId) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'You are not part of this call',
      }));
      return;
    }

    if (!['ringing', 'connected'].includes(call.status)) {
      res.status(400).json(createErrorResponse({
        code: 'INVALID_STATE',
        message: 'Call is not active',
      }));
      return;
    }

    const endedAt = new Date();
    const durationSeconds = call.connectedAt
      ? Math.floor((endedAt.getTime() - call.connectedAt.getTime()) / 1000)
      : 0;

    const updatedCall = await prisma.voiceCall.update({
      where: { id: callId },
      data: {
        status: call.status === 'ringing' ? 'missed' : 'completed',
        endedAt,
        durationSeconds,
        endedBy: endedBy || (userId === call.incarceratedPersonId ? 'caller' : 'receiver'),
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
 * End call due to time limit (called by frontend timer)
 */
voiceRouter.patch('/calls/:callId/timeout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.id;

    const call = await prisma.voiceCall.findUnique({
      where: { id: callId },
    });

    if (!call) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Call not found',
      }));
      return;
    }

    // Verify user is part of this call
    if (call.incarceratedPersonId !== userId && call.familyMemberId !== userId) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'You are not part of this call',
      }));
      return;
    }

    if (call.status !== 'connected') {
      res.status(400).json(createErrorResponse({
        code: 'INVALID_STATE',
        message: 'Call is not connected',
      }));
      return;
    }

    const endedAt = new Date();
    const durationSeconds = call.connectedAt
      ? Math.floor((endedAt.getTime() - call.connectedAt.getTime()) / 1000)
      : 0;

    const updatedCall = await prisma.voiceCall.update({
      where: { id: callId },
      data: {
        status: 'completed',
        endedAt,
        durationSeconds,
        endedBy: 'time_limit',
      },
    });

    res.json(createSuccessResponse(updatedCall));
  } catch (error) {
    console.error('Error timing out call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to end call due to timeout',
    }));
  }
});

/**
 * Get call history for the authenticated incarcerated person
 */
voiceRouter.get('/calls/history', requireAuth, requireRole('incarcerated'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = '1', pageSize = '20' } = req.query;

    const skip = (parseInt(String(page)) - 1) * parseInt(String(pageSize));
    const take = parseInt(String(pageSize));

    const [calls, total] = await Promise.all([
      prisma.voiceCall.findMany({
        where: { incarceratedPersonId: userId },
        include: {
          familyMember: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        skip,
        take,
        orderBy: { startedAt: 'desc' },
      }),
      prisma.voiceCall.count({ where: { incarceratedPersonId: userId } }),
    ]);

    const formattedCalls = calls.map((call) => ({
      id: call.id,
      contact: {
        firstName: call.familyMember.firstName,
        lastName: call.familyMember.lastName,
        phone: call.familyMember.phone,
      },
      status: call.status,
      isLegal: call.isLegal,
      startedAt: call.startedAt,
      connectedAt: call.connectedAt,
      endedAt: call.endedAt,
      durationSeconds: call.durationSeconds,
      endedBy: call.endedBy,
    }));

    res.json({
      success: true,
      data: formattedCalls,
      pagination: {
        page: parseInt(String(page)),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch call history',
    }));
  }
});

/**
 * Get calling hours and limits for the authenticated user
 */
voiceRouter.get('/settings', requireAuth, requireRole('incarcerated'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const incarceratedPerson = await prisma.incarceratedPerson.findUnique({
      where: { id: userId },
      include: {
        housingUnit: { include: { unitType: true } },
        facility: {
          select: {
            name: true,
            announcementText: true,
          },
        },
      },
    });

    if (!incarceratedPerson) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'User not found',
      }));
      return;
    }

    const unitType = incarceratedPerson.housingUnit.unitType;

    res.json(createSuccessResponse({
      facilityName: incarceratedPerson.facility.name,
      callDurationMinutes: unitType.voiceCallDurationMinutes,
      callingHoursStart: unitType.callingHoursStart,
      callingHoursEnd: unitType.callingHoursEnd,
      maxContacts: unitType.maxContacts,
    }));
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch settings',
    }));
  }
});

// ==========================================
// ADMIN ENDPOINTS (existing)
// ==========================================

voiceRouter.get('/active-calls', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;
    
    const activeCalls = await prisma.voiceCall.findMany({
      where: {
        status: { in: ['ringing', 'connected'] },
        ...(facilityId ? { facilityId: String(facilityId) } : {}),
      },
      include: {
        incarceratedPerson: true,
        familyMember: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    res.json(createSuccessResponse(activeCalls));
  } catch (error) {
    console.error('Error fetching active calls:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch active calls',
    }));
  }
});

voiceRouter.get('/call-logs', requireAuth, async (req: Request, res: Response) => {
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
      where.startedAt = {
        ...(startDate ? { gte: new Date(String(startDate)) } : {}),
        ...(endDate ? { lte: new Date(String(endDate)) } : {}),
      };
    }

    const [calls, total] = await Promise.all([
      prisma.voiceCall.findMany({
        where,
        include: {
          incarceratedPerson: true,
          familyMember: true,
        },
        skip,
        take,
        orderBy: { startedAt: 'desc' },
      }),
      prisma.voiceCall.count({ where }),
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
    console.error('Error fetching call logs:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch call logs',
    }));
  }
});

voiceRouter.post('/terminate-call/:callId', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    
    const call = await prisma.voiceCall.update({
      where: { id: callId },
      data: {
        status: 'terminated_by_admin',
        endedAt: new Date(),
        endedBy: 'admin',
        terminatedByAdminId: req.user!.id,
      },
    });

    res.json(createSuccessResponse({ success: true, call }));
  } catch (error) {
    console.error('Error terminating call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to terminate call',
    }));
  }
});

voiceRouter.get('/stats', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { facilityId, date } = req.query;
    const targetDate = date ? new Date(String(date)) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {};
    if (facilityId) where.facilityId = String(facilityId);

    const [activeCalls, todayTotal] = await Promise.all([
      prisma.voiceCall.count({
        where: {
          ...where,
          status: { in: ['ringing', 'connected'] },
        },
      }),
      prisma.voiceCall.count({
        where: {
          ...where,
          startedAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    res.json(createSuccessResponse({ activeCalls, todayTotal }));
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch stats',
    }));
  }
});

export default voiceRouter;
