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
// ADMIN ENDPOINTS (existing)
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

voiceAdminRouter.get('/call-logs', requireAuth, async (req: Request, res: Response) => {
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

/**
 * POST /terminate-calls — Bulk-terminate active calls.
 * Body: { callIds: string[] }
 * Terminates each call's Twilio conference and updates the DB record.
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

    // Terminate Twilio conferences in batches
    const twilioResults = await processBatch(eligible, async (call) => {
      if (!call.conferenceSid) {
        throw new Error(`No conferenceSid stored for call ${call.id}`);
      }
      console.log(`[voice] Admin terminate: conference ${call.conferenceSid} terminating`);
      await client.conferences(call.conferenceSid).update({ status: 'completed' });
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

export default voiceAdminRouter;
