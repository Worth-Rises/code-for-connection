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

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );

    const results: Array<{ callId: string; success: boolean; error?: string }> = [];

    for (const callId of callIds) {
      try {
        const call = await prisma.voiceCall.findUnique({ where: { id: callId } });

        if (!call) {
          results.push({ callId, success: false, error: 'Call not found' });
          continue;
        }

        if (!['ringing', 'connected'].includes(call.status)) {
          results.push({ callId, success: false, error: 'Call is not active' });
          continue;
        }

        // Terminate the Twilio conference
        const conferenceName = `call-${callId}`;
        try {
          const conferences = await client.conferences.list({
            friendlyName: conferenceName,
            status: 'in-progress',
          });
          for (const conf of conferences) {
            await conf.update({ status: 'completed' });
            console.log(`[voice] Admin terminate: conference ${conf.sid} terminated`);
          }
        } catch (twilioError) {
          console.error(`[voice] Error ending Twilio conference for call ${callId}:`, twilioError);
          // Continue to update DB even if Twilio cleanup fails
        }

        // Update the DB record
        const durationSeconds = call.connectedAt
          ? Math.floor((Date.now() - call.connectedAt.getTime()) / 1000)
          : 0;

        await prisma.voiceCall.update({
          where: { id: callId },
          data: {
            status: 'terminated_by_admin',
            endedAt: new Date(),
            endedBy: 'admin',
            terminatedByAdminId: req.user!.id,
            durationSeconds,
          },
        });

        results.push({ callId, success: true });
      } catch (err) {
        console.error(`[voice] Error terminating call ${callId}:`, err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.push({ callId, success: false, error: message });
      }
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
