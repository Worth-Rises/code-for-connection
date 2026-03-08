import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';

export const videoRouter = Router();

const TEST_MODE = process.env.TEST_MODE === 'true';
const ADMIN_APPROVAL_REQUIRED = process.env.ADMIN_APPROVAL_REQUIRED === 'true';

// ─── TEST ENDPOINT (only available when TEST_MODE=true) ──────────────────────
if (TEST_MODE) {
  videoRouter.post('/test/create-call', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;

      if (role !== 'family') {
        res.status(400).json(createErrorResponse({ code: 'BAD_REQUEST', message: 'Only family members can create test calls' }));
        return;
      }

      const { incarceratedPersonId } = req.body;

      const contact = await prisma.approvedContact.findFirst({
        where: { familyMemberId: userId, incarceratedPersonId, status: 'approved' },
        include: { incarceratedPerson: { include: { housingUnit: { include: { unitType: true } } } } },
      });

      if (!contact) {
        res.status(403).json(createErrorResponse({ code: 'FORBIDDEN', message: 'Not an approved contact' }));
        return;
      }

      const now = new Date();
      const durationMs = (contact.incarceratedPerson.housingUnit?.unitType?.videoCallDurationMinutes ?? 30) * 60 * 1000;
      const end = new Date(now.getTime() + durationMs);

      const call = await prisma.videoCall.create({
        data: {
          incarceratedPersonId,
          familyMemberId: userId,
          facilityId: contact.incarceratedPerson.facilityId,
          status: 'scheduled',
          isLegal: false,
          scheduledStart: now,
          scheduledEnd: end,
          requestedBy: userId,
        },
        include: { incarceratedPerson: true, familyMember: true },
      });

      res.status(201).json(createSuccessResponse(call));
    } catch (error) {
      console.error('Error creating test call:', error);
      res.status(500).json(createErrorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create test call' }));
    }
  });
}

videoRouter.get('/active-calls', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;
    const now = new Date();

    // Auto-transition scheduled calls that are within their time window to in_progress
    await prisma.videoCall.updateMany({
      where: {
        status: 'scheduled',
        scheduledStart: { lte: now },
        scheduledEnd: { gt: now },
        ...(facilityId ? { facilityId: String(facilityId) } : {}),
      },
      data: {
        status: 'in_progress',
      },
    });
    
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
    const now = new Date();

    // Auto-complete any in_progress or scheduled calls that have passed their scheduled end time
    await prisma.videoCall.updateMany({
      where: {
        status: { in: ['in_progress', 'scheduled'] },
        scheduledEnd: { lt: now },
      },
      data: {
        status: 'completed',
        actualEnd: now,
        endedBy: 'time_limit',
      },
    });
    
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
        approvedBy: req.user!.id,
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

// GET /api/video/call-status/:callId — check current call status (for polling)
videoRouter.get('/call-status/:callId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.id;

    const call = await prisma.videoCall.findUnique({
      where: { id: callId },
      select: {
        id: true,
        status: true,
        endedBy: true,
        terminatedByAdminId: true,
      },
    });

    if (!call) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Call not found' }));
      return;
    }

    // Verify user is a participant
    const fullCall = await prisma.videoCall.findUnique({
      where: { id: callId },
      select: { incarceratedPersonId: true, familyMemberId: true },
    });

    if (fullCall && fullCall.incarceratedPersonId !== userId && fullCall.familyMemberId !== userId) {
      res.status(403).json(createErrorResponse({ code: 'FORBIDDEN', message: 'Not a participant in this call' }));
      return;
    }

    res.json(createSuccessResponse(call));
  } catch (error) {
    console.error('Error fetching call status:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch call status',
    }));
  }
});

// ─── GET /api/video/my-scheduled ──────────────────────────────────────────
videoRouter.get('/my-scheduled', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    // Auto-complete any in_progress or scheduled calls that have passed their scheduled end time
    await prisma.videoCall.updateMany({
      where: {
        OR: [
          { incarceratedPersonId: userId },
          { familyMemberId: userId },
        ],
        status: { in: ['in_progress', 'scheduled'] },
        scheduledEnd: { lt: now },
      },
      data: {
        status: 'completed',
        actualEnd: now,
        endedBy: 'time_limit',
      },
    });

    const where: Record<string, unknown> = {
      OR: [
        { incarceratedPersonId: userId },
        { familyMemberId: userId },
      ],
      status: { in: ['scheduled', 'in_progress'] },
    };

    const calls = await prisma.videoCall.findMany({
      where,
      include: {
        incarceratedPerson: true,
        familyMember: true,
      },
      orderBy: { scheduledStart: 'desc' },
    });

    res.json(createSuccessResponse(calls));
  } catch (error) {
    console.error('Error fetching scheduled calls:', error);
    res.status(500).json(createErrorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch scheduled calls' }));
  }
});

// ─── POST /api/video/join/:callId ─────────────────────────────────────────
videoRouter.post('/join/:callId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.id;
    const now = new Date();
    const TOLERANCE_MS = 900_000; // 15-minute clock-drift/early-join tolerance

    const call = await prisma.videoCall.findUnique({
      where: { id: callId },
      include: { incarceratedPerson: true, familyMember: true },
    });

    if (!call) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Call not found' }));
      return;
    }

    // Participant check
    if (call.incarceratedPersonId !== userId && call.familyMemberId !== userId) {
      res.status(403).json(createErrorResponse({ code: 'FORBIDDEN', message: 'You are not a participant in this call' }));
      return;
    }

    // Status check — must be scheduled or in_progress (reconnect)
    if (!['scheduled', 'in_progress'].includes(call.status)) {
      res.status(400).json(createErrorResponse({ code: 'CALL_NOT_READY', message: `Call cannot be joined in status: ${call.status}` }));
      return;
    }

    // Admin approval check — only enforced when facility policy requires it.
    // When ADMIN_APPROVAL_REQUIRED=false, auto-approved scheduled calls may have
    // approvedBy=null and should still be joinable.
    if (ADMIN_APPROVAL_REQUIRED && !call.approvedBy) {
      res.status(400).json(createErrorResponse({
        code: 'CALL_NOT_APPROVED',
        message: 'This call has not been approved by staff yet',
      }));
      return;
    }

    // Timing window check
    const windowStart = new Date(call.scheduledStart.getTime() - TOLERANCE_MS);
    const windowEnd = new Date(call.scheduledEnd.getTime() + TOLERANCE_MS);

    if (now < windowStart) {
      res.status(400).json(createErrorResponse({ code: 'TOO_EARLY', message: 'This call has not started yet' }));
      return;
    }

    if (now > windowEnd) {
      res.status(400).json(createErrorResponse({ code: 'TOO_LATE', message: 'This call window has passed' }));
      return;
    }

    // Waiting-room semantics:
    // - Before scheduledStart (within tolerance): allow join, stay scheduled, phase=waiting
    // - At/after scheduledStart: transition scheduled -> in_progress and set actualStart
    // - Reconnect when already in_progress: phase=active
    let effectiveCall = call;
    let phase: 'waiting' | 'active' = 'active';

    if (call.status === 'scheduled') {
      if (now < call.scheduledStart) {
        phase = 'waiting';
        effectiveCall = await prisma.videoCall.update({
          where: { id: callId },
          data: {
            actualStart: call.actualStart ?? now,
          },
          include: { incarceratedPerson: true, familyMember: true },
        });
      } else {
        effectiveCall = await prisma.videoCall.update({
          where: { id: callId },
          data: {
            status: 'in_progress',
            actualStart: call.actualStart ?? now,
          },
          include: { incarceratedPerson: true, familyMember: true },
        });
        phase = 'active';
      }
    } else {
      phase = 'active';
    }

    res.json(createSuccessResponse({
      roomId: effectiveCall.id,
      scheduledStart: effectiveCall.scheduledStart,
      scheduledEnd: effectiveCall.scheduledEnd,
      phase,
    }));
  } catch (error) {
    console.error('Error joining video call:', error);
    res.status(500).json(createErrorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to join call' }));
  }
});

// ─── POST /api/video/end/:callId ──────────────────────────────────────────
videoRouter.post('/end/:callId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const userId = req.user!.id;
    const { reason } = req.body as { reason?: string };
    const now = new Date();

    const call = await prisma.videoCall.findUnique({ where: { id: callId } });

    if (!call) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Call not found' }));
      return;
    }

    if (call.incarceratedPersonId !== userId && call.familyMemberId !== userId) {
      res.status(403).json(createErrorResponse({ code: 'FORBIDDEN', message: 'You are not a participant in this call' }));
      return;
    }

    // Idempotent — already completed, do nothing
    if (call.status === 'completed' || call.status === 'terminated_by_admin') {
      res.json(createSuccessResponse({ message: 'Call already ended' }));
      return;
    }

    // Determine endedBy
    let endedBy: 'incarcerated' | 'family' | 'time_limit';
    if (reason === 'time_limit') {
      endedBy = 'time_limit';
    } else {
      endedBy = userId === call.incarceratedPersonId ? 'incarcerated' : 'family';
    }

    // Compute duration from actualStart if available
    const durationSeconds = call.actualStart
      ? Math.round((now.getTime() - new Date(call.actualStart).getTime()) / 1000)
      : null;

    const updated = await prisma.videoCall.update({
      where: { id: callId },
      data: {
        status: 'completed',
        actualEnd: now,
        endedBy,
        ...(durationSeconds !== null ? { durationSeconds } : {}),
      },
    });

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error ending video call:', error);
    res.status(500).json(createErrorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to end call' }));
  }
});

// ─── GET /api/video/stats ─────────────────────────────────────────────────
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

// GET /api/video/time-slots — available time slots for a facility, filtered by availability
videoRouter.get('/time-slots', requireAuth, async (req: Request, res: Response) => {
  try {
    const { facilityId, date } = req.query;

    if (!facilityId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'facilityId is required',
      }));
      return;
    }

    const slots = await prisma.videoCallTimeSlot.findMany({
      where: { facilityId: String(facilityId) },
      include: { housingUnitType: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    if (!date) {
      res.json(createSuccessResponse(slots));
      return;
    }

    // When a specific date is provided, check concurrency for each slot
    const targetDate = new Date(String(date));
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday

    const slotsForDay = slots.filter((s: { dayOfWeek: number; }) => s.dayOfWeek === dayOfWeek);

    const slotsWithAvailability = await Promise.all(
      slotsForDay.map(async (slot: any) => {
        // Build the absolute DateTime for the slot's start/end on the target date
        const [startHour, startMin] = slot.startTime.split(':').map(Number);
        const [endHour, endMin] = slot.endTime.split(':').map(Number);

        const slotStart = new Date(targetDate);
        slotStart.setHours(startHour, startMin, 0, 0);
        const slotEnd = new Date(targetDate);
        slotEnd.setHours(endHour, endMin, 0, 0);

        const concurrentBookings = await prisma.videoCall.count({
          where: {
            facilityId: String(facilityId),
            status: { in: ['requested', 'scheduled', 'in_progress'] },
            scheduledStart: { lt: slotEnd },
            scheduledEnd: { gt: slotStart },
          },
        });

        return {
          ...slot,
          available: concurrentBookings < slot.maxConcurrent,
          remaining: Math.max(0, slot.maxConcurrent - concurrentBookings),
        };
      }),
    );

    res.json(createSuccessResponse(slotsWithAvailability));
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch time slots',
    }));
  }
});

// GET /api/video/my-calls — upcoming scheduled/approved/requested calls for the authenticated user
// Works for incarcerated users too, includes in-progress calls, and uses scheduledEnd as the cutoff so active calls aren't dropped from the list.
videoRouter.get('/my-calls', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const where: Record<string, unknown> = {
      status: { in: ['requested', 'scheduled', 'approved', 'in_progress'] },
      scheduledEnd: { gte: new Date() },
    };

    if (role === 'family') {
      where.familyMemberId = userId;
    } else if (role === 'incarcerated') {
      where.incarceratedPersonId = userId;
    } else {
      // Admins can optionally filter by facilityId
      const { facilityId } = (req as Request).query;
      if (facilityId) where.facilityId = String(facilityId);
    }

    const calls = await prisma.videoCall.findMany({
      where,
      include: {
        incarceratedPerson: {
          select: { id: true, firstName: true, lastName: true },
        },
        familyMember: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    res.json(createSuccessResponse(calls));
  } catch (error) {
    console.error('Error fetching upcoming calls:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch upcoming calls',
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

    // Validate time is in the future (skipped in TEST_MODE)
    const startTime = new Date(scheduledStart);
    if (!TEST_MODE && startTime <= new Date()) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Scheduled time must be in the future',
      }));
      return;
    }

    // Auto-approve if contact is approved and admin approval is not required
    const isAutoApproved = contact.status === 'approved' && !ADMIN_APPROVAL_REQUIRED;

    // Auto-approved calls use scheduled + approvedBy=null as the marker.
    const call = await prisma.videoCall.create({
      data: {
        incarceratedPersonId,
        familyMemberId,
        facilityId: contact.incarceratedPerson.facilityId,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        status: isAutoApproved ? 'scheduled' : 'requested',
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
    const now = new Date();

    // Auto-complete any in_progress calls that have passed their scheduled end time
    await prisma.videoCall.updateMany({
      where: {
        familyMemberId,
        status: 'in_progress',
        scheduledEnd: { lt: now },
      },
      data: {
        status: 'completed',
        actualEnd: now,
        endedBy: 'time_limit',
      },
    });

    const where: any = {
      familyMemberId,
      status: {
        in: ['requested', 'approved', 'scheduled', 'in_progress'],
      },
      // Keep calls visible through their end time so active calls do not disappear at start.
      scheduledEnd: {
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

// Family-facing: reschedule a requested or scheduled video call
videoRouter.post('/reschedule-call/:callId', requireAuth, requireRole('family'), async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { scheduledStart, scheduledEnd } = req.body;
    const familyMemberId = req.user!.id;

    if (!scheduledStart || !scheduledEnd) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'scheduledStart and scheduledEnd are required',
      }));
      return;
    }

    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);

    if (start <= new Date()) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Scheduled time must be in the future',
      }));
      return;
    }

    if (end <= start) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'scheduledEnd must be after scheduledStart',
      }));
      return;
    }

    const existingCall = await prisma.videoCall.findFirst({
      where: {
        id: callId,
        familyMemberId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingCall) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Call not found',
      }));
      return;
    }

    if (!['requested', 'scheduled'].includes(existingCall.status)) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Only requested or scheduled calls can be rescheduled',
      }));
      return;
    }

    const updatedCall = await prisma.videoCall.update({
      where: { id: existingCall.id },
      data: {
        scheduledStart: start,
        scheduledEnd: end,
        // scheduled calls must be re-approved after reschedule.
        // requested calls stay requested.
        status: 'requested',
        approvedBy: null,
      },
      include: {
        incarceratedPerson: true,
        familyMember: true,
      },
    });

    res.json(createSuccessResponse(updatedCall));
  } catch (error) {
    console.error('Error rescheduling video call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to reschedule video call',
    }));
  }
});

// Family-facing: cancel a requested or scheduled video call
videoRouter.post('/cancel-call/:callId', requireAuth, requireRole('family'), async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const familyMemberId = req.user!.id;

    const call = await prisma.videoCall.findFirst({
      where: {
        id: callId,
        familyMemberId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!call) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Call not found',
      }));
      return;
    }

    if (!['requested', 'scheduled'].includes(call.status)) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Only requested or scheduled calls can be canceled',
      }));
      return;
    }

    await prisma.videoCall.delete({
      where: { id: call.id },
    });

    res.json(createSuccessResponse({ success: true }));
  } catch (error) {
    console.error('Error canceling video call:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to cancel video call',
    }));
  }
});

// GET /api/video/past-calls — completed/missed/terminated calls for the authenticated user
videoRouter.get('/past-calls', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { page = '1', pageSize = '20' } = req.query;

    const skip = (parseInt(String(page)) - 1) * parseInt(String(pageSize));
    const take = parseInt(String(pageSize));

    const where: Record<string, unknown> = {
      status: { in: ['completed', 'missed', 'terminated_by_admin'] },
    };

    if (role === 'family') {
      where.familyMemberId = userId;
    } else if (role === 'incarcerated') {
      where.incarceratedPersonId = userId;
    } else {
      const { facilityId } = req.query;
      if (facilityId) where.facilityId = String(facilityId);
    }

    const [calls, total] = await Promise.all([
      prisma.videoCall.findMany({
        where,
        include: {
          incarceratedPerson: {
            select: { id: true, firstName: true, lastName: true },
          },
          familyMember: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { scheduledStart: 'desc' },
        skip,
        take,
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
    console.error('Error fetching past calls:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch past calls',
    }));
  }
});

export default videoRouter;
