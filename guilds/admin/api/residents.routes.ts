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

export const residentsRouter = Router();
residentsRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// GET / - Paginated list with search, status, riskLevel, housingUnitId filters
residentsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, status, riskLevel, housingUnitId } = req.query;
    const { skip, take, page, pageSize } = getPagination({
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.pageSize) || undefined,
    });

    const facilityFilter = buildFacilityFilter(req.user!);
    const where: Record<string, unknown> = {
      ...facilityFilter,
    };

    if (status) {
      where.status = String(status);
    }
    if (riskLevel) {
      where.riskLevel = String(riskLevel);
    }
    if (housingUnitId) {
      where.housingUnitId = String(housingUnitId);
    }
    if (search) {
      const searchStr = String(search);
      where.OR = [
        { firstName: { contains: searchStr, mode: 'insensitive' } },
        { lastName: { contains: searchStr, mode: 'insensitive' } },
        { externalId: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    const [residents, total] = await Promise.all([
      prisma.incarceratedPerson.findMany({
        where,
        skip,
        take,
        include: {
          facility: true,
          housingUnit: true,
        },
        orderBy: { createdAt: 'desc' },
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

// GET /:id - Full profile
residentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const facilityFilter = buildFacilityFilter(req.user!);

    const person = await prisma.incarceratedPerson.findFirst({
      where: { id, ...facilityFilter },
      include: {
        facility: true,
        housingUnit: true,
        approvedContacts: {
          include: { familyMember: true },
        },
        visitorLinks: {
          include: { visitor: true },
        },
      },
    });

    if (!person) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Resident not found',
      }));
      return;
    }

    res.json(createSuccessResponse(person));
  } catch (error) {
    console.error('Error fetching resident:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch resident',
    }));
  }
});

// PATCH /:id/status - Change status
residentsRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const facilityFilter = buildFacilityFilter(req.user!);

    const person = await prisma.incarceratedPerson.findFirst({
      where: { id, ...facilityFilter },
    });
    if (!person) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }

    const updated = await prisma.incarceratedPerson.update({
      where: { id },
      data: { status },
    });

    await auditLog(req.user!.id, 'update_resident_status', 'IncarceratedPerson', id, {
      oldStatus: person.status,
      newStatus: status,
    }, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error updating resident status:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update resident status',
    }));
  }
});

// PATCH /:id/profile - Edit resident profile (name, externalId)
residentsRouter.patch('/:id/profile', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const facilityFilter = buildFacilityFilter(req.user!);

    const person = await prisma.incarceratedPerson.findFirst({
      where: { id, ...facilityFilter },
    });
    if (!person) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }

    const allowedFields = ['firstName', 'lastName', 'externalId'];
    const updateData: Record<string, unknown> = {};
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
        changes.push({
          field,
          oldValue: (person as Record<string, unknown>)[field],
          newValue: req.body[field],
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'No valid fields to update. Allowed: firstName, lastName, externalId',
      }));
      return;
    }

    const updated = await prisma.incarceratedPerson.update({
      where: { id },
      data: updateData,
    });

    for (const change of changes) {
      await prisma.entityHistory.create({
        data: {
          entityType: 'IncarceratedPerson',
          entityId: id,
          field: change.field,
          oldValue: change.oldValue != null ? String(change.oldValue) : null,
          newValue: String(change.newValue),
          changedBy: req.user!.id,
        },
      });
    }

    await auditLog(req.user!.id, 'update_resident_profile', 'IncarceratedPerson', id,
      updateData, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error updating resident profile:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update resident profile',
    }));
  }
});

// POST /:id/pin - Assign or reset PIN
residentsRouter.post('/:id/pin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const facilityFilter = buildFacilityFilter(req.user!);

    const person = await prisma.incarceratedPerson.findFirst({
      where: { id, ...facilityFilter },
    });
    if (!person) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }

    // Generate a random 4-digit PIN if none provided
    const newPin = pin || String(Math.floor(1000 + Math.random() * 9000));

    const updated = await prisma.incarceratedPerson.update({
      where: { id },
      data: { pin: newPin },
    });

    await auditLog(req.user!.id, 'reset_pin', 'IncarceratedPerson', id, {
      generated: !pin,
    }, getClientIp(req));

    res.json(createSuccessResponse({ id: updated.id, pin: newPin }));
  } catch (error) {
    console.error('Error resetting PIN:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to reset PIN',
    }));
  }
});

// PATCH /:id/risk-level - Change risk level
residentsRouter.patch('/:id/risk-level', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { riskLevel } = req.body;
    const facilityFilter = buildFacilityFilter(req.user!);

    const person = await prisma.incarceratedPerson.findFirst({
      where: { id, ...facilityFilter },
    });
    if (!person) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }

    const [updated] = await Promise.all([
      prisma.incarceratedPerson.update({
        where: { id },
        data: { riskLevel },
      }),
      prisma.entityHistory.create({
        data: {
          entityType: 'IncarceratedPerson',
          entityId: id,
          field: 'riskLevel',
          oldValue: person.riskLevel,
          newValue: riskLevel,
          changedBy: req.user!.id,
        },
      }),
    ]);

    await auditLog(req.user!.id, 'update_risk_level', 'IncarceratedPerson', id, {
      oldRiskLevel: person.riskLevel,
      newRiskLevel: riskLevel,
    }, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error updating risk level:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update risk level',
    }));
  }
});

// POST /:id/transfer - Move to new housing unit
residentsRouter.post('/:id/transfer', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { housingUnitId } = req.body;
    const facilityFilter = buildFacilityFilter(req.user!);

    const person = await prisma.incarceratedPerson.findFirst({
      where: { id, ...facilityFilter },
    });
    if (!person) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }

    const [updated] = await Promise.all([
      prisma.incarceratedPerson.update({
        where: { id },
        data: { housingUnitId },
        include: { housingUnit: true },
      }),
      prisma.entityHistory.create({
        data: {
          entityType: 'IncarceratedPerson',
          entityId: id,
          field: 'housingUnitId',
          oldValue: person.housingUnitId,
          newValue: housingUnitId,
          changedBy: req.user!.id,
        },
      }),
    ]);

    await auditLog(req.user!.id, 'transfer_resident', 'IncarceratedPerson', id, {
      oldHousingUnitId: person.housingUnitId,
      newHousingUnitId: housingUnitId,
    }, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error transferring resident:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to transfer resident',
    }));
  }
});

// PATCH /:id/notes - Update notes
residentsRouter.patch('/:id/notes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const facilityFilter = buildFacilityFilter(req.user!);

    const person = await prisma.incarceratedPerson.findFirst({
      where: { id, ...facilityFilter },
    });
    if (!person) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }

    const updated = await prisma.incarceratedPerson.update({
      where: { id },
      data: { notes },
    });

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update notes',
    }));
  }
});

// GET /:id/timeline - Chronological activity
residentsRouter.get('/:id/timeline', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const facilityFilter = buildFacilityFilter(req.user!);

    const person = await prisma.incarceratedPerson.findFirst({
      where: { id, ...facilityFilter },
    });
    if (!person) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }

    const [voiceCalls, videoCalls, conversations] = await Promise.all([
      prisma.voiceCall.findMany({
        where: { incarceratedPersonId: id },
        orderBy: { startedAt: 'desc' },
        take: 50,
        include: { familyMember: true },
      }),
      prisma.videoCall.findMany({
        where: { incarceratedPersonId: id },
        orderBy: { scheduledStart: 'desc' },
        take: 50,
        include: { familyMember: true },
      }),
      prisma.conversation.findMany({
        where: { incarceratedPersonId: id },
        include: {
          familyMember: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      }),
    ]);

    const timeline: Array<{
      type: string;
      date: string;
      description: string;
      details: Record<string, unknown>;
    }> = [];

    for (const call of voiceCalls) {
      timeline.push({
        type: 'voice_call',
        date: call.startedAt.toISOString(),
        description: `Voice call with ${call.familyMember.firstName} ${call.familyMember.lastName}`,
        details: {
          status: call.status,
          durationSeconds: call.durationSeconds,
          isLegal: call.isLegal,
        },
      });
    }

    for (const call of videoCalls) {
      timeline.push({
        type: 'video_call',
        date: call.scheduledStart.toISOString(),
        description: `Video call with ${call.familyMember.firstName} ${call.familyMember.lastName}`,
        details: {
          status: call.status,
          durationSeconds: call.durationSeconds,
          isLegal: call.isLegal,
        },
      });
    }

    for (const convo of conversations) {
      for (const msg of convo.messages) {
        timeline.push({
          type: 'message',
          date: msg.createdAt.toISOString(),
          description: `Message ${msg.senderType === 'incarcerated' ? 'to' : 'from'} ${convo.familyMember.firstName} ${convo.familyMember.lastName}`,
          details: {
            status: msg.status,
            senderType: msg.senderType,
          },
        });
      }
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(createSuccessResponse(timeline.slice(0, 100)));
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch timeline',
    }));
  }
});

// GET /:id/history - Entity history (field changes)
residentsRouter.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const history = await prisma.entityHistory.findMany({
      where: {
        entityType: 'IncarceratedPerson',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        changedByAdmin: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json(createSuccessResponse(history));
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch history',
    }));
  }
});
