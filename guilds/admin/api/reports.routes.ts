import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';
import { buildFacilityFilter } from './helpers.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

function parseDateRange(query: Record<string, unknown>): { dateFrom: Date; dateTo: Date } {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFrom = query.dateFrom ? new Date(String(query.dateFrom)) : thirtyDaysAgo;
  const dateTo = query.dateTo ? new Date(String(query.dateTo)) : now;
  return { dateFrom, dateTo };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function generateDateRange(dateFrom: Date, dateTo: Date): string[] {
  const dates: string[] = [];
  const current = new Date(dateFrom);
  current.setHours(0, 0, 0, 0);
  const end = new Date(dateTo);
  end.setHours(23, 59, 59, 999);
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// GET /communication-volume
reportsRouter.get('/communication-volume', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const facilityFilter = buildFacilityFilter(user);
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const facilityIdParam = req.query.facilityId ? String(req.query.facilityId) : undefined;

    const voiceWhere: Record<string, unknown> = {
      startedAt: { gte: dateFrom, lte: dateTo },
      ...(facilityIdParam ? { facilityId: facilityIdParam } : facilityFilter),
    };

    const videoWhere: Record<string, unknown> = {
      scheduledStart: { gte: dateFrom, lte: dateTo },
      ...(facilityIdParam ? { facilityId: facilityIdParam } : facilityFilter),
    };

    const messageWhere: Record<string, unknown> = {
      createdAt: { gte: dateFrom, lte: dateTo },
      conversation: {
        incarceratedPerson: facilityIdParam
          ? { facilityId: facilityIdParam }
          : facilityFilter,
      },
    };

    const [voiceCalls, videoCalls, messages, voiceByDay, videoByDay, messagesByDay] =
      await Promise.all([
        prisma.voiceCall.count({ where: voiceWhere }),
        prisma.videoCall.count({ where: videoWhere }),
        prisma.message.count({ where: messageWhere }),
        prisma.voiceCall.groupBy({
          by: ['startedAt'],
          where: voiceWhere,
          _count: true,
        }),
        prisma.videoCall.groupBy({
          by: ['scheduledStart'],
          where: videoWhere,
          _count: true,
        }),
        prisma.message.groupBy({
          by: ['createdAt'],
          where: messageWhere,
          _count: true,
        }),
      ]);

    // Aggregate by date
    const dates = generateDateRange(dateFrom, dateTo);
    const voiceMap = new Map<string, number>();
    const videoMap = new Map<string, number>();
    const msgMap = new Map<string, number>();

    for (const row of voiceByDay) {
      const d = formatDate(new Date(row.startedAt));
      voiceMap.set(d, (voiceMap.get(d) || 0) + row._count);
    }
    for (const row of videoByDay) {
      const d = formatDate(new Date(row.scheduledStart));
      videoMap.set(d, (videoMap.get(d) || 0) + row._count);
    }
    for (const row of messagesByDay) {
      const d = formatDate(new Date(row.createdAt));
      msgMap.set(d, (msgMap.get(d) || 0) + row._count);
    }

    const daily = dates.map((date) => ({
      date,
      voice: voiceMap.get(date) || 0,
      video: videoMap.get(date) || 0,
      messages: msgMap.get(date) || 0,
    }));

    res.json(createSuccessResponse({
      voiceCalls,
      videoCalls,
      messages,
      daily,
    }));
  } catch (error) {
    console.error('Error fetching communication volume:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch communication volume report',
    }));
  }
});

// GET /moderation
reportsRouter.get('/moderation', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const facilityFilter = buildFacilityFilter(user);
    const { dateFrom, dateTo } = parseDateRange(req.query);

    const messageWhere = {
      createdAt: { gte: dateFrom, lte: dateTo },
      conversation: { incarceratedPerson: facilityFilter },
    };

    const contactWhere = {
      reviewedAt: { gte: dateFrom, lte: dateTo },
      incarceratedPerson: facilityFilter,
    };

    const [
      messagesReviewed,
      messagesBlocked,
      contactsApproved,
      contactsDenied,
    ] = await Promise.all([
      prisma.message.count({
        where: { ...messageWhere, status: { in: ['approved', 'rejected'] } },
      }),
      prisma.message.count({
        where: { ...messageWhere, status: 'rejected' },
      }),
      prisma.approvedContact.count({
        where: { ...contactWhere, status: 'approved' },
      }),
      prisma.approvedContact.count({
        where: { ...contactWhere, status: 'denied' },
      }),
    ]);

    res.json(createSuccessResponse({
      messagesReviewed,
      messagesBlocked,
      contactsApproved,
      contactsDenied,
    }));
  } catch (error) {
    console.error('Error fetching moderation report:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch moderation report',
    }));
  }
});

// GET /flagged-content
reportsRouter.get('/flagged-content', async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);

    const where = {
      createdAt: { gte: dateFrom, lte: dateTo },
    };

    const [byStatus, byReason, bySeverity] = await Promise.all([
      prisma.flaggedContent.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.flaggedContent.groupBy({
        by: ['flagReason'],
        where,
        _count: true,
      }),
      prisma.flaggedContent.findMany({
        where,
        include: { keywordAlert: { select: { severity: true } } },
        select: { id: true, keywordAlert: { select: { severity: true } } },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      pending: 0,
      reviewed: 0,
      escalated: 0,
      dismissed: 0,
    };
    for (const row of byStatus) {
      statusCounts[row.status] = row._count;
    }

    const reasonCounts: Record<string, number> = {};
    for (const row of byReason) {
      reasonCounts[row.flagReason] = row._count;
    }

    const severityCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    for (const item of bySeverity) {
      const sev = item.keywordAlert?.severity || 'medium';
      severityCounts[sev] = (severityCounts[sev] || 0) + 1;
    }

    res.json(createSuccessResponse({
      byStatus: statusCounts,
      byReason: reasonCounts,
      bySeverity: severityCounts,
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    }));
  } catch (error) {
    console.error('Error fetching flagged content report:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch flagged content report',
    }));
  }
});

// GET /visitors
reportsRouter.get('/visitors', async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = parseDateRange(req.query);

    const where = {
      createdAt: { gte: dateFrom, lte: dateTo },
    };

    const [
      applications,
      approved,
      denied,
      suspended,
    ] = await Promise.all([
      prisma.visitor.count({ where }),
      prisma.visitor.count({
        where: { ...where, backgroundCheckStatus: 'passed', isActive: true },
      }),
      prisma.visitor.count({
        where: { ...where, backgroundCheckStatus: 'failed' },
      }),
      prisma.visitor.count({
        where: { ...where, backgroundCheckStatus: 'passed', isActive: false },
      }),
    ]);

    res.json(createSuccessResponse({
      applications,
      approved,
      denied,
      suspended,
    }));
  } catch (error) {
    console.error('Error fetching visitor report:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch visitor report',
    }));
  }
});

// GET /export - CSV export
reportsRouter.get('/export', async (req: Request, res: Response) => {
  try {
    const type = String(req.query.type || '');
    const { dateFrom, dateTo } = parseDateRange(req.query);
    const user = req.user!;
    const facilityFilter = buildFacilityFilter(user);

    let csvContent = '';
    const fileName = `report-${type}-${formatDate(new Date())}.csv`;

    if (type === 'communication-volume') {
      const facilityIdParam = req.query.facilityId ? String(req.query.facilityId) : undefined;
      const voiceWhere: Record<string, unknown> = {
        startedAt: { gte: dateFrom, lte: dateTo },
        ...(facilityIdParam ? { facilityId: facilityIdParam } : facilityFilter),
      };
      const videoWhere: Record<string, unknown> = {
        scheduledStart: { gte: dateFrom, lte: dateTo },
        ...(facilityIdParam ? { facilityId: facilityIdParam } : facilityFilter),
      };
      const messageWhere: Record<string, unknown> = {
        createdAt: { gte: dateFrom, lte: dateTo },
        conversation: {
          incarceratedPerson: facilityIdParam
            ? { facilityId: facilityIdParam }
            : facilityFilter,
        },
      };

      const [voiceByDay, videoByDay, messagesByDay] = await Promise.all([
        prisma.voiceCall.groupBy({ by: ['startedAt'], where: voiceWhere, _count: true }),
        prisma.videoCall.groupBy({ by: ['scheduledStart'], where: videoWhere, _count: true }),
        prisma.message.groupBy({ by: ['createdAt'], where: messageWhere, _count: true }),
      ]);

      const dates = generateDateRange(dateFrom, dateTo);
      const voiceMap = new Map<string, number>();
      const videoMap = new Map<string, number>();
      const msgMap = new Map<string, number>();

      for (const row of voiceByDay) {
        const d = formatDate(new Date(row.startedAt));
        voiceMap.set(d, (voiceMap.get(d) || 0) + row._count);
      }
      for (const row of videoByDay) {
        const d = formatDate(new Date(row.scheduledStart));
        videoMap.set(d, (videoMap.get(d) || 0) + row._count);
      }
      for (const row of messagesByDay) {
        const d = formatDate(new Date(row.createdAt));
        msgMap.set(d, (msgMap.get(d) || 0) + row._count);
      }

      const rows = dates.map((date) => {
        const voice = voiceMap.get(date) || 0;
        const video = videoMap.get(date) || 0;
        const msgs = msgMap.get(date) || 0;
        return `${date},${voice},${video},${msgs},${voice + video + msgs}`;
      });
      csvContent = ['Date,Voice Calls,Video Calls,Messages,Total', ...rows].join('\n');

    } else if (type === 'moderation') {
      const messageWhere = {
        createdAt: { gte: dateFrom, lte: dateTo },
        conversation: { incarceratedPerson: facilityFilter },
      };
      const contactWhere = {
        reviewedAt: { gte: dateFrom, lte: dateTo },
        incarceratedPerson: facilityFilter,
      };

      const [messagesReviewed, messagesBlocked, contactsApproved, contactsDenied] =
        await Promise.all([
          prisma.message.count({ where: { ...messageWhere, status: { in: ['approved', 'rejected'] } } }),
          prisma.message.count({ where: { ...messageWhere, status: 'rejected' } }),
          prisma.approvedContact.count({ where: { ...contactWhere, status: 'approved' } }),
          prisma.approvedContact.count({ where: { ...contactWhere, status: 'denied' } }),
        ]);

      csvContent = [
        'Metric,Count',
        `Messages Reviewed,${messagesReviewed}`,
        `Messages Blocked,${messagesBlocked}`,
        `Contacts Approved,${contactsApproved}`,
        `Contacts Denied,${contactsDenied}`,
      ].join('\n');

    } else if (type === 'flagged-content') {
      const where = { createdAt: { gte: dateFrom, lte: dateTo } };
      const byStatus = await prisma.flaggedContent.groupBy({ by: ['status'], where, _count: true });
      const byReason = await prisma.flaggedContent.groupBy({ by: ['flagReason'], where, _count: true });

      csvContent = [
        'Category,Label,Count',
        ...byStatus.map((r) => `Status,${r.status},${r._count}`),
        ...byReason.map((r) => `Reason,${r.flagReason},${r._count}`),
      ].join('\n');

    } else if (type === 'visitors') {
      const where = { createdAt: { gte: dateFrom, lte: dateTo } };
      const [applications, approved, denied, suspended] = await Promise.all([
        prisma.visitor.count({ where }),
        prisma.visitor.count({ where: { ...where, backgroundCheckStatus: 'passed', isActive: true } }),
        prisma.visitor.count({ where: { ...where, backgroundCheckStatus: 'failed' } }),
        prisma.visitor.count({ where: { ...where, backgroundCheckStatus: 'passed', isActive: false } }),
      ]);

      csvContent = [
        'Metric,Count',
        `Applications,${applications}`,
        `Approved,${approved}`,
        `Denied,${denied}`,
        `Suspended,${suspended}`,
      ].join('\n');

    } else {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid report type. Must be one of: communication-volume, moderation, flagged-content, visitors',
      }));
      return;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to export report',
    }));
  }
});
