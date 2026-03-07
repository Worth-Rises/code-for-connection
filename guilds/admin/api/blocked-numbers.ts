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

export const blockedNumbersRouter = Router();

blockedNumbersRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// GET / - paginated blocked numbers list
blockedNumbersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;
    const { skip, take, page, pageSize } = getPagination({
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.pageSize) || undefined,
    });

    const user = req.user!;
    let where: Record<string, unknown> = { agencyId: user.agencyId };

    if (user.role === 'facility_admin') {
      // Facility admins see agency-wide blocks + their own facility blocks
      where.OR = [
        { scope: 'agency' },
        { scope: 'facility', facilityId: user.facilityId },
      ];
    } else if (facilityId) {
      where.facilityId = String(facilityId);
    }

    const [blockedNumbers, total] = await Promise.all([
      prisma.blockedNumber.findMany({
        where,
        skip,
        take,
        include: {
          facility: true,
          admin: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blockedNumber.count({ where }),
    ]);

    res.json(createSuccessResponse({
      data: blockedNumbers,
      pagination: createPaginationInfo(page, pageSize, total),
    }));
  } catch (error) {
    console.error('Error fetching blocked numbers:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch blocked numbers',
    }));
  }
});

// POST / - block a phone number
blockedNumbersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, scope, facilityId, reason } = req.body;
    const user = req.user!;

    if (!phoneNumber || !scope) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'phoneNumber and scope are required',
      }));
      return;
    }

    // Facility admins can only create facility-scoped blocks for their facility
    if (user.role === 'facility_admin') {
      if (scope !== 'facility') {
        res.status(403).json(createErrorResponse({
          code: 'FORBIDDEN',
          message: 'Facility admins can only create facility-scoped blocks',
        }));
        return;
      }
      if (facilityId && facilityId !== user.facilityId) {
        res.status(403).json(createErrorResponse({
          code: 'FORBIDDEN',
          message: 'Cannot block numbers for other facilities',
        }));
        return;
      }
    }

    const blockedNumber = await prisma.blockedNumber.create({
      data: {
        phoneNumber,
        scope,
        facilityId: scope === 'facility' ? (facilityId || user.facilityId) : null,
        agencyId: user.agencyId!,
        reason: reason || null,
        blockedBy: user.id,
      },
    });

    res.status(201).json(createSuccessResponse(blockedNumber));
  } catch (error) {
    console.error('Error blocking number:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to block number',
    }));
  }
});

// DELETE /:id - unblock a phone number
blockedNumbersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const blockedNumber = await prisma.blockedNumber.findUnique({ where: { id } });
    if (!blockedNumber) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Blocked number not found' }));
      return;
    }

    // Facility admins can only delete facility-scoped blocks at their facility
    if (user.role === 'facility_admin') {
      if (blockedNumber.scope !== 'facility' || blockedNumber.facilityId !== user.facilityId) {
        res.status(403).json(createErrorResponse({
          code: 'FORBIDDEN',
          message: 'Cannot delete this blocked number',
        }));
        return;
      }
    }

    await prisma.blockedNumber.delete({ where: { id } });
    res.json(createSuccessResponse({ deleted: true }));
  } catch (error) {
    console.error('Error deleting blocked number:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete blocked number',
    }));
  }
});

// GET /check - check if a number is blocked
blockedNumbersRouter.get('/check', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, facilityId } = req.query;

    if (!phoneNumber) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'phoneNumber is required',
      }));
      return;
    }

    const blockedNumber = await prisma.blockedNumber.findFirst({
      where: {
        phoneNumber: String(phoneNumber),
        OR: [
          { scope: 'agency' },
          { scope: 'facility', facilityId: facilityId ? String(facilityId) : undefined },
        ],
      },
    });

    res.json(createSuccessResponse({
      blocked: !!blockedNumber,
      scope: blockedNumber?.scope ?? null,
    }));
  } catch (error) {
    console.error('Error checking blocked number:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to check blocked number',
    }));
  }
});
