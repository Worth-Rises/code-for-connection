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

export const contactsRouter = Router();

contactsRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// GET / - paginated contact list
contactsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, facilityId } = req.query;
    const { skip, take, page, pageSize } = getPagination({
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.pageSize) || undefined,
    });

    const facilityFilter = buildFacilityFilter(req.user!);
    const where: Record<string, unknown> = {
      incarceratedPerson: {
        ...facilityFilter,
        ...(facilityId ? { facilityId: String(facilityId) } : {}),
      },
    };
    if (status) {
      where.status = String(status);
    }

    const [contacts, total] = await Promise.all([
      prisma.approvedContact.findMany({
        where,
        skip,
        take,
        include: {
          incarceratedPerson: true,
          familyMember: true,
        },
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.approvedContact.count({ where }),
    ]);

    res.json(createSuccessResponse({
      data: contacts,
      pagination: createPaginationInfo(page, pageSize, total),
    }));
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch contacts',
    }));
  }
});

// GET /check - check contact approval status (must be before /:param routes)
contactsRouter.get('/check', async (req: Request, res: Response) => {
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

// GET /:incarceratedPersonId - approved contacts for an incarcerated person
contactsRouter.get('/:incarceratedPersonId', async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId } = req.params;

    const contacts = await prisma.approvedContact.findMany({
      where: {
        incarceratedPersonId,
        status: 'approved',
      },
      include: {
        familyMember: true,
      },
    });

    res.json(createSuccessResponse(contacts));
  } catch (error) {
    console.error('Error fetching contacts for person:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch contacts',
    }));
  }
});

// PATCH /:contactId/approve
contactsRouter.patch('/:contactId/approve', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const contact = await prisma.approvedContact.findUnique({ where: { id: contactId } });
    if (!contact) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Contact not found' }));
      return;
    }
    if (contact.status !== 'pending') {
      res.status(400).json(createErrorResponse({ code: 'VALIDATION_ERROR', message: 'Contact is not pending' }));
      return;
    }

    const updated = await prisma.approvedContact.update({
      where: { id: contactId },
      data: {
        status: 'approved',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error approving contact:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to approve contact',
    }));
  }
});

// PATCH /:contactId/deny
contactsRouter.patch('/:contactId/deny', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const contact = await prisma.approvedContact.findUnique({ where: { id: contactId } });
    if (!contact) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Contact not found' }));
      return;
    }
    if (contact.status !== 'pending') {
      res.status(400).json(createErrorResponse({ code: 'VALIDATION_ERROR', message: 'Contact is not pending' }));
      return;
    }

    const updated = await prisma.approvedContact.update({
      where: { id: contactId },
      data: {
        status: 'denied',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error denying contact:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to deny contact',
    }));
  }
});

// PATCH /:contactId/remove
contactsRouter.patch('/:contactId/remove', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const contact = await prisma.approvedContact.findUnique({ where: { id: contactId } });
    if (!contact) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Contact not found' }));
      return;
    }
    if (contact.status !== 'approved') {
      res.status(400).json(createErrorResponse({ code: 'VALIDATION_ERROR', message: 'Contact is not approved' }));
      return;
    }

    const updated = await prisma.approvedContact.update({
      where: { id: contactId },
      data: {
        status: 'removed',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error removing contact:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to remove contact',
    }));
  }
});
