import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';
import { buildFacilityFilter } from './helpers.js';
import { auditLog, getClientIp } from './audit.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

const INTERNAL_API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

async function fetchCrossGuildStats(path: string, token: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(`${INTERNAL_API_BASE}${path}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = await response.json() as { success?: boolean; data?: unknown };
    return data.success ? data.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// GET /stats - dashboard aggregates
dashboardRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const facilityFilter = buildFacilityFilter(user);
    const personFilter = { incarceratedPerson: facilityFilter };

    const [
      pendingContacts,
      approvedContacts,
      blockedNumbers,
      activeResidents,
      totalResidents,
      voiceStats,
      videoStats,
      messagingStats,
    ] = await Promise.all([
      prisma.approvedContact.count({ where: { status: 'pending', ...personFilter } }),
      prisma.approvedContact.count({ where: { status: 'approved', ...personFilter } }),
      prisma.blockedNumber.count({
        where: {
          agencyId: user.agencyId,
          ...(user.role === 'facility_admin'
            ? { OR: [{ scope: 'agency' }, { scope: 'facility', facilityId: user.facilityId }] }
            : {}),
        },
      }),
      prisma.incarceratedPerson.count({ where: { status: 'active', ...facilityFilter } }),
      prisma.incarceratedPerson.count({ where: facilityFilter }),
      fetchCrossGuildStats('/api/voice/stats', req.headers.authorization?.split(' ')[1] || ''),
      fetchCrossGuildStats('/api/video/stats', req.headers.authorization?.split(' ')[1] || ''),
      fetchCrossGuildStats('/api/messaging/stats', req.headers.authorization?.split(' ')[1] || ''),
    ]);

    res.json(createSuccessResponse({
      contacts: { pending: pendingContacts, approved: approvedContacts },
      blockedNumbers,
      residents: { active: activeResidents, total: totalResidents },
      voice: voiceStats,
      video: videoStats,
      messaging: messagingStats,
    }));

    // Update lastLoginAt (fire and forget)
    prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch dashboard stats',
    }));
  }
});

// GET /since-last-login - counts of items created since admin's last login
dashboardRouter.get('/since-last-login', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const facilityFilter = buildFacilityFilter(user);

    // Get lastLoginAt from AdminUser
    const admin = await prisma.adminUser.findUnique({ where: { id: user.id } });
    const since = admin?.lastLoginAt || new Date(Date.now() - 24 * 60 * 60 * 1000); // default: 24h ago

    const [newContacts, newMessages, newVoiceCalls, newVideoCalls] = await Promise.all([
      prisma.approvedContact.count({
        where: { requestedAt: { gte: since }, incarceratedPerson: facilityFilter },
      }),
      prisma.message.count({
        where: { createdAt: { gte: since }, conversation: { incarceratedPerson: facilityFilter } },
      }),
      prisma.voiceCall.count({
        where: { startedAt: { gte: since }, ...facilityFilter },
      }),
      prisma.videoCall.count({
        where: { scheduledStart: { gte: since }, ...facilityFilter },
      }),
    ]);

    res.json(createSuccessResponse({
      since: since.toISOString(),
      newContacts,
      newMessages,
      newVoiceCalls,
      newVideoCalls,
    }));
  } catch (error) {
    console.error('Error fetching since-last-login:', error);
    res.status(500).json(createErrorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch since-last-login data' }));
  }
});

// GET /recent-activity - recent audit log entries
dashboardRouter.get('/recent-activity', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const user = req.user!;

    // Agency admins see all; facility admins see only their own actions
    const where = user.role === 'facility_admin' ? { adminUserId: user.id } : {};

    const entries = await prisma.auditLog.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { adminUser: { select: { firstName: true, lastName: true } } },
    });

    res.json(createSuccessResponse(entries));
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json(createErrorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch recent activity' }));
  }
});
