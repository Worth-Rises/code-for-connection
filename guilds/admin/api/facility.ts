import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  requireFacilityAccess,
  createSuccessResponse,
  createErrorResponse,
  prisma,
  getPagination,
  createPaginationInfo,
} from '@openconnect/shared';

export const facilityRouter = Router();

facilityRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// GET / - list facilities
facilityRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const facilities = await prisma.facility.findMany({
      select: {
        id: true,
        name: true,
        agencyId: true,
      },
    });

    res.json(createSuccessResponse(facilities));
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch facilities',
    }));
  }
});

// GET /:facilityId - single facility with agency and housing units
facilityRouter.get('/:facilityId', requireFacilityAccess(), async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.params;

    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        agency: true,
        housingUnits: {
          include: { unitType: true },
        },
      },
    });

    if (!facility) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Facility not found',
      }));
      return;
    }

    res.json(createSuccessResponse(facility));
  } catch (error) {
    console.error('Error fetching facility:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch facility',
    }));
  }
});

// PATCH /:facilityId - update facility announcements
facilityRouter.patch('/:facilityId', requireFacilityAccess(), async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.params;
    const { announcementText, announcementAudioUrl } = req.body;

    const facility = await prisma.facility.update({
      where: { id: facilityId },
      data: {
        ...(announcementText !== undefined ? { announcementText } : {}),
        ...(announcementAudioUrl !== undefined ? { announcementAudioUrl } : {}),
      },
    });

    res.json(createSuccessResponse(facility));
  } catch (error) {
    console.error('Error updating facility:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update facility',
    }));
  }
});

// GET /:facilityId/residents - paginated residents list
facilityRouter.get('/:facilityId/residents', requireFacilityAccess(), async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.params;
    const { status, search } = req.query;
    const { skip, take, page, pageSize } = getPagination({
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.pageSize) || undefined,
    });

    const where: Record<string, unknown> = { facilityId };
    if (status) {
      where.status = String(status);
    }
    if (search) {
      const term = String(search);
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { externalId: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [residents, total] = await Promise.all([
      prisma.incarceratedPerson.findMany({
        where,
        skip,
        take,
        include: {
          housingUnit: true,
        },
        orderBy: { lastName: 'asc' },
      }),
      prisma.incarceratedPerson.count({ where }),
    ]);

    res.json(createSuccessResponse({
      data: residents,
      pagination: createPaginationInfo(page, pageSize, total),
    }));
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch residents',
    }));
  }
});
