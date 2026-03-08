import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
  hashPin,
} from '@openconnect/shared';
// Admin guild's keyword-alerts and flagged-content routes are disabled.
// The messaging guild (AmberAbreu/code-for-connection, guild-message branch)
// built a working content moderation system using a simpler FlaggedKeyword model
// with screening wired into POST /messaging/send. These admin routes used a
// different model (KeywordAlert) with tiered severity + regex + pg_trgm fuzzy
// matching that was never integrated into the message pipeline.
// See: doc/explore-content-moderation-guild-conflict.md
//
// import { keywordAlertsRouter } from './keyword-alerts.routes.js';
// import { flaggedContentRouter } from './flagged-content.routes.js';
import { sessionLimitsRouter } from './session-limits.routes.js';

export const adminRouter = Router();

// adminRouter.use('/keyword-alerts', keywordAlertsRouter);
// adminRouter.use('/flagged-content', flaggedContentRouter);
adminRouter.use('/session-limits', sessionLimitsRouter);

adminRouter.get('/contacts/:incarceratedPersonId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId } = req.params;
    
    const contacts = await prisma.approvedContact.findMany({
      where: {
        incarceratedPersonId,
        status: 'approved',
      },
      include: {
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    res.json(createSuccessResponse(contacts));
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch contacts',
    }));
  }
});

adminRouter.get('/contacts/check', requireAuth, async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId, familyMemberId } = req.query;
    
    if (!incarceratedPersonId || !familyMemberId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'incarceratedPersonId and familyMemberId are required',
      }));
      return;
    }

    const contact = await prisma.approvedContact.findUnique({
      where: {
        incarceratedPersonId_familyMemberId: {
          incarceratedPersonId: String(incarceratedPersonId),
          familyMemberId: String(familyMemberId),
        },
      },
    });

    res.json(createSuccessResponse({
      approved: contact?.status === 'approved',
      isAttorney: contact?.isAttorney ?? false,
    }));
  } catch (error) {
    console.error('Error checking contact:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to check contact',
    }));
  }
});

adminRouter.get('/facility/:facilityId', requireAuth, async (req: Request, res: Response) => {
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

adminRouter.get('/facilities', requireAuth, async (_req: Request, res: Response) => {
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

adminRouter.get('/housing-unit-type/:unitTypeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { unitTypeId } = req.params;
    
    const unitType = await prisma.housingUnitType.findUnique({
      where: { id: unitTypeId },
    });

    if (!unitType) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Housing unit type not found',
      }));
      return;
    }

    res.json(createSuccessResponse(unitType));
  } catch (error) {
    console.error('Error fetching housing unit type:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch housing unit type',
    }));
  }
});

adminRouter.get('/user/:userId', requireAuth, async (req: Request, res: Response) => {
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

adminRouter.get('/residents', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const where: any = {};

    if (user.role === 'facility_admin') {
      where.facilityId = user.facilityId;
    } else if (user.role === 'agency_admin') {
      where.agencyId = user.agencyId;
    }

    const status = req.query.status as string | undefined;
    if (status) {
      where.status = status;
    }

    const search = req.query.search as string | undefined;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const residents = await prisma.incarceratedPerson.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        externalId: true,
        status: true,
        admittedAt: true,
        facility: { select: { id: true, name: true } },
        housingUnit: { select: { id: true, name: true } },
      },
      orderBy: { lastName: 'asc' },
    });

    res.json(createSuccessResponse(residents));
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch residents',
    }));
  }
});

adminRouter.get('/residents/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const resident = await prisma.incarceratedPerson.findUnique({
      where: { id: req.params.id },
      include: {
        facility: { select: { id: true, name: true } },
        housingUnit: {
          select: { id: true, name: true, unitType: true },
        },
      },
    });

    if (!resident) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Resident not found',
      }));
      return;
    }

    const user = req.user!;
    if (user.role === 'facility_admin' && user.facilityId !== resident.facilityId) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'No access to this resident',
      }));
      return;
    }

    // Never expose the PIN hash
    const { pin, ...safeResident } = resident;
    res.json(createSuccessResponse(safeResident));
  } catch (error) {
    console.error('Error fetching resident:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch resident',
    }));
  }
});

adminRouter.post('/residents/:id/reset-pin', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json(createErrorResponse({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      }));
      return;
    }

    if (req.user.role !== 'facility_admin' && req.user.role !== 'agency_admin') {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      }));
      return;
    }

    const resident = await prisma.incarceratedPerson.findUnique({
      where: { id: req.params.id },
    });

    if (!resident) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Resident not found',
      }));
      return;
    }

    if (req.user.role === 'facility_admin' && req.user.facilityId !== resident.facilityId) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'No access to this resident',
      }));
      return;
    }

    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    const hashedPin = await hashPin(newPin);

    await prisma.incarceratedPerson.update({
      where: { id: resident.id },
      data: { pin: hashedPin },
    });

    res.json(createSuccessResponse({ newPin }));
  } catch (error) {
    console.error('Error resetting PIN:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to reset PIN',
    }));
  }
});

function requireResidentAdmin(req: Request, res: Response, next: () => void): void {
  if (!req.user) {
    res.status(401).json(createErrorResponse({ code: 'UNAUTHORIZED', message: 'Not authenticated' }));
    return;
  }
  if (req.user.role !== 'facility_admin' && req.user.role !== 'agency_admin') {
    res.status(403).json(createErrorResponse({ code: 'FORBIDDEN', message: 'Insufficient permissions' }));
    return;
  }
  next();
}

adminRouter.post('/residents/:id/release', requireAuth, requireResidentAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as { reason?: string; releaseDate?: string };
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      res.status(400).json(createErrorResponse({ code: 'VALIDATION_ERROR', message: 'Reason is required' }));
      return;
    }

    const resident = await prisma.incarceratedPerson.findUnique({
      where: { id },
      include: { facility: { select: { id: true, name: true } }, housingUnit: { select: { id: true, name: true, unitType: true } } },
    });
    if (!resident) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }
    if (resident.status === 'released') {
      res.status(400).json(createErrorResponse({ code: 'VALIDATION_ERROR', message: 'Resident is already released' }));
      return;
    }

    const user = req.user!;
    if (user.role === 'facility_admin' && user.facilityId !== resident.facilityId) {
      res.status(403).json(createErrorResponse({ code: 'FORBIDDEN', message: 'No access to this resident' }));
      return;
    }

    const releaseDate = body.releaseDate ? new Date(body.releaseDate) : new Date();
    const _previousStatus = resident.status;

    const updated = await prisma.incarceratedPerson.update({
      where: { id },
      data: { status: 'released', releasedAt: releaseDate },
      include: { facility: { select: { id: true, name: true } }, housingUnit: { select: { id: true, name: true, unitType: true } } },
    });
    const { pin: _pin, ...safeResident } = updated;

    // TODO: when AuditLog exists: prisma.auditLog.create({ data: { adminUserId: user.id, action: 'resident_status_changed', entityType: 'incarcerated_person', entityId: id, details: { reason, releaseDate, previousStatus: _previousStatus } } })

    res.json(createSuccessResponse(safeResident));
  } catch (error) {
    console.error('Error releasing resident:', error);
    res.status(500).json(createErrorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to release resident' }));
  }
});

adminRouter.post('/residents/:id/deactivate', requireAuth, requireResidentAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as { reason?: string };
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      res.status(400).json(createErrorResponse({ code: 'VALIDATION_ERROR', message: 'Reason is required' }));
      return;
    }

    const resident = await prisma.incarceratedPerson.findUnique({
      where: { id },
      include: { facility: { select: { id: true, name: true } }, housingUnit: { select: { id: true, name: true, unitType: true } } },
    });
    if (!resident) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }
    if (resident.status === 'deactivated') {
      res.status(400).json(createErrorResponse({ code: 'VALIDATION_ERROR', message: 'Resident is already deactivated' }));
      return;
    }

    const user = req.user!;
    if (user.role === 'facility_admin' && user.facilityId !== resident.facilityId) {
      res.status(403).json(createErrorResponse({ code: 'FORBIDDEN', message: 'No access to this resident' }));
      return;
    }

    const _previousStatus = resident.status;

    const updated = await prisma.incarceratedPerson.update({
      where: { id },
      data: { status: 'deactivated' },
      include: { facility: { select: { id: true, name: true } }, housingUnit: { select: { id: true, name: true, unitType: true } } },
    });
    const { pin: _pin, ...safeResident } = updated;

    // TODO: when AuditLog exists: prisma.auditLog.create({ data: { adminUserId: user.id, action: 'resident_status_changed', entityType: 'incarcerated_person', entityId: id, details: { reason, previousStatus: _previousStatus } } })

    res.json(createSuccessResponse(safeResident));
  } catch (error) {
    console.error('Error deactivating resident:', error);
    res.status(500).json(createErrorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to deactivate resident' }));
  }
});

adminRouter.get('/blocked-numbers/check', requireAuth, async (req: Request, res: Response) => {
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
      scope: blockedNumber?.scope,
    }));
  } catch (error) {
    console.error('Error checking blocked number:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to check blocked number',
    }));
  }
});

export default adminRouter;
