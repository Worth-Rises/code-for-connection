import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
  getPagination,
  createPaginationInfo,
} from '@openconnect/shared';
import { buildFacilityFilter } from './helpers.js';
import { auditLog, getClientIp } from './audit.js';

export const searchRouter = Router();
searchRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// GET /search - Full-text search across entities
searchRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      res.json(createSuccessResponse({
        residents: [],
        contacts: [],
        visitors: [],
        messages: [],
      }));
      return;
    }

    const searchStr = q.trim();
    const facilityFilter = buildFacilityFilter(req.user!);
    const searchTypes = type ? [String(type)] : ['residents', 'contacts', 'visitors', 'messages'];

    const results: Record<string, unknown[]> = {
      residents: [],
      contacts: [],
      visitors: [],
      messages: [],
    };

    const queries: Promise<void>[] = [];

    if (searchTypes.includes('residents')) {
      queries.push(
        prisma.incarceratedPerson.findMany({
          where: {
            ...facilityFilter,
            OR: [
              { firstName: { contains: searchStr, mode: 'insensitive' } },
              { lastName: { contains: searchStr, mode: 'insensitive' } },
              { externalId: { contains: searchStr, mode: 'insensitive' } },
            ],
          },
          take: 10,
          include: { facility: true, housingUnit: true },
          orderBy: { createdAt: 'desc' },
        }).then((data) => { results.residents = data; }),
      );
    }

    if (searchTypes.includes('contacts')) {
      queries.push(
        prisma.familyMember.findMany({
          where: {
            OR: [
              { firstName: { contains: searchStr, mode: 'insensitive' } },
              { lastName: { contains: searchStr, mode: 'insensitive' } },
              { email: { contains: searchStr, mode: 'insensitive' } },
            ],
          },
          take: 10,
          include: {
            approvedContacts: {
              include: { incarceratedPerson: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }).then((data) => { results.contacts = data; }),
      );
    }

    if (searchTypes.includes('visitors')) {
      queries.push(
        prisma.visitor.findMany({
          where: {
            OR: [
              { firstName: { contains: searchStr, mode: 'insensitive' } },
              { lastName: { contains: searchStr, mode: 'insensitive' } },
              { email: { contains: searchStr, mode: 'insensitive' } },
            ],
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        }).then((data) => { results.visitors = data; }),
      );
    }

    if (searchTypes.includes('messages')) {
      queries.push(
        prisma.message.findMany({
          where: {
            body: { contains: searchStr, mode: 'insensitive' },
          },
          take: 10,
          include: {
            conversation: {
              include: {
                incarceratedPerson: true,
                familyMember: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }).then((data) => { results.messages = data; }),
      );
    }

    await Promise.all(queries);

    res.json(createSuccessResponse(results));
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to perform search',
    }));
  }
});

// GET /keyword-alerts - List all keyword alerts
searchRouter.get('/keyword-alerts', async (req: Request, res: Response) => {
  try {
    const { facilityId, isActive } = req.query;
    const user = req.user!;

    const where: Record<string, unknown> = {};

    // Scope to user's agency
    if (user.agencyId) {
      where.agencyId = user.agencyId;
    }

    // Facility filter for facility admins
    if (user.role === 'facility_admin' && user.facilityId) {
      where.OR = [
        { facilityId: user.facilityId },
        { facilityId: null },
      ];
    }

    if (facilityId) {
      where.facilityId = String(facilityId);
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const alerts = await prisma.keywordAlert.findMany({
      where,
      include: {
        facility: true,
        createdByAdmin: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { flaggedContent: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(createSuccessResponse(alerts));
  } catch (error) {
    console.error('Error fetching keyword alerts:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch keyword alerts',
    }));
  }
});

// POST /keyword-alerts - Create a keyword alert
searchRouter.post('/keyword-alerts', async (req: Request, res: Response) => {
  try {
    const { keyword, isRegex, severity, facilityId, isActive } = req.body;
    const user = req.user!;

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Keyword is required',
      }));
      return;
    }

    const alert = await prisma.keywordAlert.create({
      data: {
        keyword: keyword.trim(),
        isRegex: isRegex ?? false,
        severity: severity ?? 'medium',
        facilityId: facilityId || null,
        agencyId: user.agencyId!,
        createdBy: user.id,
        isActive: isActive ?? true,
      },
      include: {
        facility: true,
        createdByAdmin: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { flaggedContent: true },
        },
      },
    });

    await auditLog(user.id, 'create_keyword_alert', 'KeywordAlert', alert.id, {
      keyword: alert.keyword,
      severity: alert.severity,
    }, getClientIp(req));

    res.status(201).json(createSuccessResponse(alert));
  } catch (error) {
    console.error('Error creating keyword alert:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create keyword alert',
    }));
  }
});

// PATCH /keyword-alerts/:id - Update a keyword alert
searchRouter.patch('/keyword-alerts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { keyword, isRegex, severity, isActive } = req.body;
    const user = req.user!;

    const existing = await prisma.keywordAlert.findFirst({
      where: { id, agencyId: user.agencyId! },
    });

    if (!existing) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Keyword alert not found',
      }));
      return;
    }

    const data: Record<string, unknown> = {};
    if (keyword !== undefined) data.keyword = keyword.trim();
    if (isRegex !== undefined) data.isRegex = isRegex;
    if (severity !== undefined) data.severity = severity;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.keywordAlert.update({
      where: { id },
      data,
      include: {
        facility: true,
        createdByAdmin: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { flaggedContent: true },
        },
      },
    });

    await auditLog(user.id, 'update_keyword_alert', 'KeywordAlert', id, data, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error updating keyword alert:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update keyword alert',
    }));
  }
});

// DELETE /keyword-alerts/:id - Delete a keyword alert
searchRouter.delete('/keyword-alerts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const existing = await prisma.keywordAlert.findFirst({
      where: { id, agencyId: user.agencyId! },
    });

    if (!existing) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Keyword alert not found',
      }));
      return;
    }

    await prisma.keywordAlert.delete({ where: { id } });

    await auditLog(user.id, 'delete_keyword_alert', 'KeywordAlert', id, {
      keyword: existing.keyword,
    }, getClientIp(req));

    res.json(createSuccessResponse({ deleted: true }));
  } catch (error) {
    console.error('Error deleting keyword alert:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete keyword alert',
    }));
  }
});

// GET /keyword-alerts/:id/matches - Flagged content for an alert
searchRouter.get('/keyword-alerts/:id/matches', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { skip, take, page, pageSize } = getPagination({
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.pageSize) || undefined,
    });

    const alert = await prisma.keywordAlert.findFirst({
      where: { id, agencyId: user.agencyId! },
    });

    if (!alert) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Keyword alert not found',
      }));
      return;
    }

    const where = { keywordAlertId: id };

    const [matches, total] = await Promise.all([
      prisma.flaggedContent.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewedByAdmin: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.flaggedContent.count({ where }),
    ]);

    res.json(createSuccessResponse({
      data: matches,
      pagination: createPaginationInfo(page, pageSize, total),
    }));
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch flagged content',
    }));
  }
});

// PATCH /flagged-content/:id/review - Mark flagged content as reviewed
searchRouter.patch('/flagged-content/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user!;

    const validStatuses = ['reviewed', 'escalated', 'dismissed'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Status must be one of: reviewed, escalated, dismissed',
      }));
      return;
    }

    const existing = await prisma.flaggedContent.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Flagged content not found',
      }));
      return;
    }

    const updated = await prisma.flaggedContent.update({
      where: { id },
      data: {
        status,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
      include: {
        reviewedByAdmin: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await auditLog(user.id, 'review_flagged_content', 'FlaggedContent', id, {
      oldStatus: existing.status,
      newStatus: status,
    }, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error reviewing flagged content:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to review flagged content',
    }));
  }
});
