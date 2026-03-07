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

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// GET / - Paginated audit log with filters
auditRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { adminUserId, action, entityType, dateFrom, dateTo } = req.query;
    const { skip, take, page, pageSize } = getPagination({
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.pageSize) || undefined,
    });

    const where: Record<string, unknown> = {};

    // Facility admins can only see their own audit entries
    if (req.user!.role === 'facility_admin') {
      where.adminUserId = req.user!.id;
    } else if (adminUserId) {
      where.adminUserId = String(adminUserId);
    }

    if (action) {
      where.action = String(action);
    }
    if (entityType) {
      where.entityType = String(entityType);
    }

    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) {
        createdAt.gte = new Date(String(dateFrom));
      }
      if (dateTo) {
        createdAt.lte = new Date(String(dateTo));
      }
      where.createdAt = createdAt;
    }

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          adminUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json(createSuccessResponse({
      data: entries,
      pagination: createPaginationInfo(page, pageSize, total),
    }));
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch audit log',
    }));
  }
});

// GET /:entityType/:entityId - Entity-specific audit history
auditRouter.get('/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;

    const where: Record<string, unknown> = {
      entityType,
      entityId,
    };

    // Facility admins can only see their own audit entries
    if (req.user!.role === 'facility_admin') {
      where.adminUserId = req.user!.id;
    }

    const entries = await prisma.auditLog.findMany({
      where,
      include: {
        adminUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(createSuccessResponse(entries));
  } catch (error) {
    console.error('Error fetching entity audit history:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch entity audit history',
    }));
  }
});
