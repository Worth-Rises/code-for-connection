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

export const housingRouter = Router();
housingRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// GET /units - All units with occupancy counts
housingRouter.get('/units', async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.query;
    const facilityFilter = buildFacilityFilter(req.user!);

    const where: Record<string, unknown> = {
      ...facilityFilter,
    };
    if (facilityId) {
      where.facilityId = String(facilityId);
    }

    const units = await prisma.housingUnit.findMany({
      where,
      include: {
        unitType: true,
        _count: {
          select: {
            incarceratedPersons: {
              where: { status: 'active' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(createSuccessResponse(units));
  } catch (error) {
    console.error('Error fetching housing units:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch housing units',
    }));
  }
});

// GET /units/:unitId/roster - Residents in a unit
housingRouter.get('/units/:unitId/roster', async (req: Request, res: Response) => {
  try {
    const { unitId } = req.params;
    const { skip, take, page, pageSize } = getPagination({
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.pageSize) || undefined,
    });

    const facilityFilter = buildFacilityFilter(req.user!);

    const unit = await prisma.housingUnit.findFirst({
      where: { id: unitId, ...facilityFilter },
      include: { unitType: true },
    });

    if (!unit) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Housing unit not found',
      }));
      return;
    }

    const where = {
      housingUnitId: unitId,
      status: 'active' as const,
      ...facilityFilter,
    };

    const [residents, total] = await Promise.all([
      prisma.incarceratedPerson.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          externalId: true,
          status: true,
          riskLevel: true,
          admittedAt: true,
        },
        orderBy: { lastName: 'asc' },
      }),
      prisma.incarceratedPerson.count({ where }),
    ]);

    res.json(createSuccessResponse({
      unit,
      data: residents,
      pagination: createPaginationInfo(page, pageSize, total),
    }));
  } catch (error) {
    console.error('Error fetching unit roster:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch unit roster',
    }));
  }
});

// POST /move - Move resident between units
housingRouter.post('/move', async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId, housingUnitId } = req.body;

    if (!incarceratedPersonId || !housingUnitId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'incarceratedPersonId and housingUnitId are required',
      }));
      return;
    }

    const person = await prisma.incarceratedPerson.findUnique({
      where: { id: incarceratedPersonId },
    });
    if (!person) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }

    const targetUnit = await prisma.housingUnit.findUnique({
      where: { id: housingUnitId },
    });
    if (!targetUnit) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Target housing unit not found' }));
      return;
    }

    const oldUnitId = person.housingUnitId;

    const updated = await prisma.incarceratedPerson.update({
      where: { id: incarceratedPersonId },
      data: { housingUnitId },
    });

    await prisma.entityHistory.create({
      data: {
        entityType: 'IncarceratedPerson',
        entityId: incarceratedPersonId,
        field: 'housingUnitId',
        oldValue: oldUnitId,
        newValue: housingUnitId,
        changedBy: req.user!.id,
      },
    });

    await auditLog(
      req.user!.id,
      'move_resident',
      'IncarceratedPerson',
      incarceratedPersonId,
      { oldUnitId, newUnitId: housingUnitId },
      getClientIp(req),
    );

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error moving resident:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to move resident',
    }));
  }
});

// GET /unit-types - List unit types for agency
housingRouter.get('/unit-types', async (req: Request, res: Response) => {
  try {
    const agencyId = req.user!.agencyId;

    const unitTypes = await prisma.housingUnitType.findMany({
      where: { agencyId },
      orderBy: { name: 'asc' },
    });

    res.json(createSuccessResponse(unitTypes));
  } catch (error) {
    console.error('Error fetching unit types:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch unit types',
    }));
  }
});

// GET /unit-types/:typeId - Get specific unit type
housingRouter.get('/unit-types/:typeId', async (req: Request, res: Response) => {
  try {
    const { typeId } = req.params;

    const unitType = await prisma.housingUnitType.findUnique({
      where: { id: typeId },
    });

    if (!unitType) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Unit type not found',
      }));
      return;
    }

    res.json(createSuccessResponse(unitType));
  } catch (error) {
    console.error('Error fetching unit type:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch unit type',
    }));
  }
});

// PATCH /unit-types/:typeId - Update unit type settings
housingRouter.patch('/unit-types/:typeId', async (req: Request, res: Response) => {
  try {
    const { typeId } = req.params;

    const unitType = await prisma.housingUnitType.findUnique({
      where: { id: typeId },
    });

    if (!unitType) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Unit type not found',
      }));
      return;
    }

    const allowedFields = [
      'name',
      'voiceCallDurationMinutes',
      'videoCallDurationMinutes',
      'callingHoursStart',
      'callingHoursEnd',
      'maxContacts',
      'videoSlotDurationMinutes',
      'maxConcurrentVideoCalls',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updated = await prisma.housingUnitType.update({
      where: { id: typeId },
      data: updateData,
    });

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error updating unit type:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update unit type',
    }));
  }
});
