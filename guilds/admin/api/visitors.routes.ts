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
import { auditLog, getClientIp } from './audit.js';

export const visitorsRouter = Router();
visitorsRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// GET / - Paginated visitor list with status and type filters
visitorsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, visitorType, search } = req.query;
    const { skip, take, page, pageSize } = getPagination({
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.pageSize) || undefined,
    });

    const where: Record<string, unknown> = {};

    if (status === 'pending') {
      where.backgroundCheckStatus = 'pending';
    } else if (status === 'approved') {
      where.backgroundCheckStatus = 'passed';
      where.isActive = true;
    } else if (status === 'denied') {
      where.backgroundCheckStatus = 'failed';
    } else if (status === 'suspended') {
      where.isActive = false;
      where.backgroundCheckStatus = 'passed';
    }

    if (visitorType) {
      where.visitorType = String(visitorType);
    }

    if (search) {
      const searchStr = String(search);
      where.OR = [
        { firstName: { contains: searchStr, mode: 'insensitive' } },
        { lastName: { contains: searchStr, mode: 'insensitive' } },
        { email: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    const [visitors, total] = await Promise.all([
      prisma.visitor.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { linkedResidents: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.visitor.count({ where }),
    ]);

    res.json(createSuccessResponse({
      data: visitors,
      pagination: createPaginationInfo(page, pageSize, total),
    }));
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch visitors',
    }));
  }
});

// GET /:id - Visitor profile with linked residents
visitorsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.visitor.findUnique({
      where: { id },
      include: {
        linkedResidents: {
          include: {
            incarceratedPerson: true,
            approvedByAdmin: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!visitor) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Visitor not found',
      }));
      return;
    }

    res.json(createSuccessResponse(visitor));
  } catch (error) {
    console.error('Error fetching visitor:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch visitor',
    }));
  }
});

// POST / - Create new visitor
visitorsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, visitorType, governmentIdNumber, notes } = req.body;

    if (!firstName || !lastName || !visitorType) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'firstName, lastName, and visitorType are required',
      }));
      return;
    }

    const visitor = await prisma.visitor.create({
      data: {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        visitorType,
        governmentIdNumber: governmentIdNumber || null,
        notes: notes || null,
      },
    });

    res.status(201).json(createSuccessResponse(visitor));
  } catch (error) {
    console.error('Error creating visitor:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create visitor',
    }));
  }
});

// POST /:id/approve - Approve visitor
visitorsRouter.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.visitor.findUnique({ where: { id } });
    if (!visitor) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Visitor not found' }));
      return;
    }

    const updated = await prisma.visitor.update({
      where: { id },
      data: {
        backgroundCheckStatus: 'passed',
        backgroundCheckDate: new Date(),
        isActive: true,
      },
    });

    await auditLog(req.user!.id, 'approve_visitor', 'Visitor', id, undefined, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error approving visitor:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to approve visitor',
    }));
  }
});

// POST /:id/deny - Deny visitor
visitorsRouter.post('/:id/deny', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.visitor.findUnique({ where: { id } });
    if (!visitor) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Visitor not found' }));
      return;
    }

    const updated = await prisma.visitor.update({
      where: { id },
      data: {
        backgroundCheckStatus: 'failed',
        backgroundCheckDate: new Date(),
        isActive: false,
      },
    });

    await auditLog(req.user!.id, 'deny_visitor', 'Visitor', id, undefined, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error denying visitor:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to deny visitor',
    }));
  }
});

// POST /:id/suspend - Suspend visitor
visitorsRouter.post('/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.visitor.findUnique({ where: { id } });
    if (!visitor) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Visitor not found' }));
      return;
    }

    const updated = await prisma.visitor.update({
      where: { id },
      data: { isActive: false },
    });

    await auditLog(req.user!.id, 'suspend_visitor', 'Visitor', id, undefined, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error suspending visitor:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to suspend visitor',
    }));
  }
});

// POST /:id/reactivate - Reactivate visitor
visitorsRouter.post('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visitor = await prisma.visitor.findUnique({ where: { id } });
    if (!visitor) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Visitor not found' }));
      return;
    }

    const updated = await prisma.visitor.update({
      where: { id },
      data: { isActive: true },
    });

    await auditLog(req.user!.id, 'approve_visitor', 'Visitor', id, undefined, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error reactivating visitor:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to reactivate visitor',
    }));
  }
});

// POST /:id/link-resident - Link visitor to resident
visitorsRouter.post('/:id/link-resident', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { incarceratedPersonId } = req.body;

    if (!incarceratedPersonId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'incarceratedPersonId is required',
      }));
      return;
    }

    const visitor = await prisma.visitor.findUnique({ where: { id } });
    if (!visitor) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Visitor not found' }));
      return;
    }

    const person = await prisma.incarceratedPerson.findUnique({ where: { id: incarceratedPersonId } });
    if (!person) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Resident not found' }));
      return;
    }

    const link = await prisma.visitorResident.create({
      data: {
        visitorId: id,
        incarceratedPersonId,
        status: 'pending',
      },
    });

    res.status(201).json(createSuccessResponse(link));
  } catch (error) {
    console.error('Error linking visitor to resident:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to link visitor to resident',
    }));
  }
});

// DELETE /:id/unlink-resident/:residentId - Unlink visitor from resident
visitorsRouter.delete('/:id/unlink-resident/:residentId', async (req: Request, res: Response) => {
  try {
    const { id, residentId } = req.params;

    const link = await prisma.visitorResident.findUnique({
      where: {
        visitorId_incarceratedPersonId: {
          visitorId: id,
          incarceratedPersonId: residentId,
        },
      },
    });

    if (!link) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Link not found' }));
      return;
    }

    await prisma.visitorResident.delete({
      where: { id: link.id },
    });

    res.json(createSuccessResponse({ message: 'Link removed successfully' }));
  } catch (error) {
    console.error('Error unlinking visitor from resident:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to unlink visitor from resident',
    }));
  }
});
