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

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// GET / - paginated user search
usersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { type, search, facilityId } = req.query;
    const { skip, take, page, pageSize } = getPagination({
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.pageSize) || undefined,
    });

    const searchTerm = search ? String(search) : undefined;
    const searchFilter = searchTerm ? [
      { firstName: { contains: searchTerm, mode: 'insensitive' as const } },
      { lastName: { contains: searchTerm, mode: 'insensitive' as const } },
    ] : undefined;

    if (type === 'incarcerated') {
      const facilityFilter = buildFacilityFilter(req.user!);
      const where: Record<string, unknown> = {
        ...facilityFilter,
        ...(facilityId ? { facilityId: String(facilityId) } : {}),
      };
      if (searchFilter) {
        where.OR = [...searchFilter, { externalId: { contains: searchTerm, mode: 'insensitive' } }];
      }

      const [users, total] = await Promise.all([
        prisma.incarceratedPerson.findMany({ where, skip, take, include: { facility: true, housingUnit: true }, orderBy: { lastName: 'asc' } }),
        prisma.incarceratedPerson.count({ where }),
      ]);

      res.json(createSuccessResponse({
        data: users.map(u => ({ type: 'incarcerated', user: u })),
        pagination: createPaginationInfo(page, pageSize, total),
      }));
      return;
    }

    if (type === 'family') {
      const where: Record<string, unknown> = {};
      if (searchFilter) {
        where.OR = [...searchFilter, { email: { contains: searchTerm, mode: 'insensitive' } }];
      }

      const [users, total] = await Promise.all([
        prisma.familyMember.findMany({ where, skip, take, orderBy: { lastName: 'asc' } }),
        prisma.familyMember.count({ where }),
      ]);

      res.json(createSuccessResponse({
        data: users.map(({ passwordHash, ...u }) => ({ type: 'family', user: u })),
        pagination: createPaginationInfo(page, pageSize, total),
      }));
      return;
    }

    res.status(400).json(createErrorResponse({
      code: 'VALIDATION_ERROR',
      message: 'type query parameter is required (incarcerated or family)',
    }));
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to search users',
    }));
  }
});

// GET /:userId - lookup a single user
usersRouter.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const incarceratedPerson = await prisma.incarceratedPerson.findUnique({
      where: { id: userId },
      include: {
        facility: true,
        housingUnit: { include: { unitType: true } },
      },
    });

    if (incarceratedPerson) {
      res.json(createSuccessResponse({ type: 'incarcerated', user: incarceratedPerson }));
      return;
    }

    const familyMember = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (familyMember) {
      const { passwordHash, ...safeUser } = familyMember;
      res.json(createSuccessResponse({ type: 'family', user: safeUser }));
      return;
    }

    res.status(404).json(createErrorResponse({
      code: 'NOT_FOUND',
      message: 'User not found',
    }));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch user',
    }));
  }
});
