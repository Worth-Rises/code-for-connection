import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';
import twilio from 'twilio';

export const voiceAdminRouter = Router();

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

voiceAdminRouter.get('/active-calls', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
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

// ==========================================
// CALL LOGS — with search, filters, pagination
// ==========================================

voiceAdminRouter.get('/call-logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      facilityId, startDate, endDate, userId,
      page = '1', pageSize = '20',
      search, phoneNumber, isLegal, status,
    } = req.query;

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
    if (isLegal !== undefined) {
      where.isLegal = String(isLegal) === 'true';
    }
    if (status) {
      where.status = String(status);
    }
    if (search) {
      const term = String(search);
      where.OR = [
        { incarceratedPerson: { firstName: { contains: term, mode: 'insensitive' } } },
        { incarceratedPerson: { lastName: { contains: term, mode: 'insensitive' } } },
        { familyMember: { firstName: { contains: term, mode: 'insensitive' } } },
        { familyMember: { lastName: { contains: term, mode: 'insensitive' } } },
      ];
    }
    if (phoneNumber) {
      where.familyMember = { phone: { contains: String(phoneNumber) } };
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

// ==========================================
// TERMINATE CALLS — with bugfix: kills individual call legs
// ==========================================

/**
 * POST /terminate-calls — Bulk-terminate active calls.
 * Body: { callIds: string[] }
 * Terminates each call's Twilio conference AND individual call legs, then updates DB.
 */
voiceAdminRouter.post('/terminate-calls', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { callIds } = req.body;

    if (!Array.isArray(callIds) || callIds.length === 0) {
      return res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'callIds must be a non-empty array of strings',
      }));
    }

    // Fetch all requested calls in one query
    const calls = await prisma.voiceCall.findMany({
      where: { id: { in: callIds } },
    });
    type VoiceCallRecord = Awaited<ReturnType<typeof prisma.voiceCall.findMany>>[number];
    const callMap = new Map<string, VoiceCallRecord>();
    for (const c of calls) callMap.set(c.id, c);

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );

    // Determine which calls are eligible and which aren't
    const eligible: VoiceCallRecord[] = [];
    const results: Array<{ callId: string; success: boolean; error?: string }> = [];

    for (const callId of callIds) {
      const call = callMap.get(callId);
      if (!call) {
        results.push({ callId, success: false, error: 'Call not found' });
      } else if (!['ringing', 'connected'].includes(call.status)) {
        results.push({ callId, success: false, error: 'Call is not active' });
      } else {
        eligible.push(call);
      }
    }

    // Process items in batches to respect Twilio rate limits
    const BATCH_SIZE = 20;
    async function processBatch<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
      const results: PromiseSettledResult<R>[] = [];
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(batch.map(fn));
        results.push(...batchResults);
      }
      return results;
    }

    // Terminate Twilio conferences and individual call legs in batches
    const twilioResults = await processBatch(eligible, async (call) => {
      const conferenceName = `call-${call.id}`;

      // Strategy 1: End conference by stored SID + kill individual participant calls
      if (call.conferenceSid) {
        console.log(`[voice] Admin terminate: conference ${call.conferenceSid} terminating`);
        try {
          const participants = await client.conferences(call.conferenceSid).participants.list();
          for (const p of participants) {
            try {
              await client.calls(p.callSid).update({ status: 'completed' });
              console.log(`[voice] Ended participant call ${p.callSid}`);
            } catch { /* participant may already be ended */ }
          }
          await client.conferences(call.conferenceSid).update({ status: 'completed' });
        } catch (confError: any) {
          if (confError?.status === 404) {
            console.log(`[voice] Conference ${call.conferenceSid} already ended (404)`);
          } else {
            throw confError;
          }
        }
      }

      // Strategy 2: Fall back to friendly name lookup (catches conferences not matched by SID)
      try {
        const conferences = await client.conferences.list({
          friendlyName: conferenceName,
          status: 'in-progress',
        });
        for (const conf of conferences) {
          const participants = await client.conferences(conf.sid).participants.list();
          for (const p of participants) {
            try {
              await client.calls(p.callSid).update({ status: 'completed' });
              console.log(`[voice] Ended participant call ${p.callSid} (via friendly name)`);
            } catch { /* already ended */ }
          }
          await conf.update({ status: 'completed' });
          console.log(`[voice] Conference ${conf.sid} terminated (via friendly name)`);
        }
      } catch (nameError) {
        console.error(`[voice] Error looking up conference by name ${conferenceName}:`, nameError);
      }

      return call.id;
    });

    // Log any Twilio failures (but don't block DB update)
    for (const result of twilioResults) {
      if (result.status === 'rejected') {
        console.error('[voice] Twilio conference termination failed:', result.reason);
      }
    }

    // Bulk-update all eligible calls in a single query
    const now = new Date();
    const eligibleIds = eligible.map(c => c.id);
    await prisma.$executeRaw`
      UPDATE voice_calls
      SET status = 'terminated_by_admin',
          ended_at = ${now},
          ended_by = 'admin',
          terminated_by_admin_id = ${req.user!.id},
          duration_seconds = CASE
            WHEN connected_at IS NOT NULL
              THEN EXTRACT(EPOCH FROM (${now}::timestamptz - connected_at))::int
            ELSE 0
          END
      WHERE id = ANY(${eligibleIds})
    `;

    // Mark all eligible as success
    for (const call of eligible) {
      results.push({ callId: call.id, success: true });
    }

    res.json(createSuccessResponse({ results }));
  } catch (error) {
    console.error('Error in terminate-calls:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to terminate calls',
    }));
  }
});

// ==========================================
// STATS — expanded with terminatedToday + avgDurationSeconds
// ==========================================

voiceAdminRouter.get('/stats', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { facilityId, date } = req.query;
    const targetDate = date ? new Date(String(date)) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {};
    if (facilityId) where.facilityId = String(facilityId);

    const [activeCalls, todayTotal, terminatedToday, avgResult] = await Promise.all([
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
      prisma.voiceCall.count({
        where: {
          ...where,
          status: 'terminated_by_admin',
          endedAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.voiceCall.aggregate({
        where: {
          ...where,
          status: 'completed',
          durationSeconds: { not: null },
          startedAt: { gte: startOfDay, lte: endOfDay },
        },
        _avg: { durationSeconds: true },
      }),
    ]);

    res.json(createSuccessResponse({
      activeCalls,
      todayTotal,
      terminatedToday,
      avgDurationSeconds: Math.round(avgResult._avg.durationSeconds ?? 0),
    }));
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch stats',
    }));
  }
});

// ==========================================
// MARK LEGAL — toggle attorney/legal flag on a call
// ==========================================

voiceAdminRouter.patch('/calls/:id/legal', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isLegal } = req.body;

    if (typeof isLegal !== 'boolean') {
      return res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'isLegal must be a boolean',
      }));
    }

    const call = await prisma.voiceCall.findUnique({ where: { id } });
    if (!call) {
      return res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Call not found',
      }));
    }

    const updated = await prisma.voiceCall.update({
      where: { id },
      data: { isLegal },
      include: { incarceratedPerson: true, familyMember: true },
    });

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error updating legal status:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update legal status',
    }));
  }
});

// ==========================================
// CONTACTS — pending list, approve, deny
// ==========================================

voiceAdminRouter.get('/contacts/pending', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;

    const where: Record<string, unknown> = { status: 'pending' };
    if (facilityId) {
      where.incarceratedPerson = { facilityId: String(facilityId) };
    }

    const pending = await prisma.approvedContact.findMany({
      where,
      include: {
        incarceratedPerson: true,
        familyMember: true,
      },
      orderBy: { requestedAt: 'asc' },
    });

    res.json(createSuccessResponse(pending));
  } catch (error) {
    console.error('Error fetching pending contacts:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch pending contacts',
    }));
  }
});

voiceAdminRouter.patch('/contacts/:id/approve', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await prisma.approvedContact.findUnique({ where: { id } });
    if (!contact) {
      return res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Contact not found' }));
    }

    const updated = await prisma.approvedContact.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date(), reviewedBy: req.user!.id },
      include: { incarceratedPerson: true, familyMember: true },
    });

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error approving contact:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to approve contact',
    }));
  }
});

voiceAdminRouter.patch('/contacts/:id/deny', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await prisma.approvedContact.findUnique({ where: { id } });
    if (!contact) {
      return res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Contact not found' }));
    }

    const updated = await prisma.approvedContact.update({
      where: { id },
      data: { status: 'denied', reviewedAt: new Date(), reviewedBy: req.user!.id },
      include: { incarceratedPerson: true, familyMember: true },
    });

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error denying contact:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to deny contact',
    }));
  }
});

// ==========================================
// BLOCKED NUMBERS — CRUD
// ==========================================

voiceAdminRouter.get('/blocked-numbers', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { facilityId, agencyId } = req.query;

    const where: Record<string, unknown> = {};
    if (facilityId) where.facilityId = String(facilityId);
    if (agencyId) where.agencyId = String(agencyId);

    const blocked = await prisma.blockedNumber.findMany({
      where,
      include: { facility: true, agency: true, admin: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(createSuccessResponse(blocked));
  } catch (error) {
    console.error('Error fetching blocked numbers:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch blocked numbers',
    }));
  }
});

voiceAdminRouter.post('/blocked-numbers', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { phoneNumber, scope, facilityId, agencyId, reason } = req.body;

    if (!phoneNumber || !scope || !agencyId) {
      return res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'phoneNumber, scope, and agencyId are required',
      }));
    }

    const blocked = await prisma.blockedNumber.create({
      data: {
        phoneNumber,
        scope,
        facilityId: facilityId || null,
        agencyId,
        reason: reason || null,
        blockedBy: req.user!.id,
      },
      include: { facility: true, agency: true, admin: true },
    });

    res.status(201).json(createSuccessResponse(blocked));
  } catch (error) {
    console.error('Error blocking number:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to block number',
    }));
  }
});

voiceAdminRouter.delete('/blocked-numbers/:id', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.blockedNumber.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Blocked number not found' }));
    }

    await prisma.blockedNumber.delete({ where: { id } });

    res.json(createSuccessResponse({ deleted: true }));
  } catch (error) {
    console.error('Error unblocking number:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to unblock number',
    }));
  }
});

export default voiceAdminRouter;
