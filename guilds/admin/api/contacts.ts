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

export const contactsRouter = Router();

// GET /check - check contact approval status (any authenticated user, for cross-guild consumption)
contactsRouter.get('/check', requireAuth, async (req: Request, res: Response) => {
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

// All routes below require admin role
contactsRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// PATCH /:contactId/attorney-flag - Toggle attorney status
contactsRouter.patch('/:contactId/attorney-flag', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { isAttorney } = req.body;

    const contact = await prisma.approvedContact.findUnique({ where: { id: contactId } });
    if (!contact) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Contact not found' }));
      return;
    }

    const updated = await prisma.approvedContact.update({
      where: { id: contactId },
      data: { isAttorney: Boolean(isAttorney) },
    });

    await auditLog(req.user!.id, 'approve_contact', 'ApprovedContact', contactId, {
      field: 'isAttorney',
      value: isAttorney,
    }, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error updating attorney flag:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update attorney flag',
    }));
  }
});

// GET /:contactId/communication-history - Communication history between pair
contactsRouter.get('/:contactId/communication-history', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { skip, take, page, pageSize } = getPagination({
      page: Number(req.query.page) || undefined,
      pageSize: Number(req.query.pageSize) || undefined,
    });

    const contact = await prisma.approvedContact.findUnique({ where: { id: contactId } });
    if (!contact) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Contact not found' }));
      return;
    }

    const { incarceratedPersonId, familyMemberId } = contact;

    const [voiceCalls, messages] = await Promise.all([
      prisma.voiceCall.findMany({
        where: { incarceratedPersonId, familyMemberId },
        orderBy: { startedAt: 'desc' },
        take: 100,
      }),
      prisma.message.findMany({
        where: {
          conversation: { incarceratedPersonId, familyMemberId },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { conversation: true },
      }),
    ]);

    const combined: Array<{
      type: string;
      date: string;
      details: Record<string, unknown>;
    }> = [];

    for (const call of voiceCalls) {
      combined.push({
        type: 'voice_call',
        date: call.startedAt.toISOString(),
        details: {
          id: call.id,
          status: call.status,
          durationSeconds: call.durationSeconds,
          isLegal: call.isLegal,
        },
      });
    }

    for (const msg of messages) {
      combined.push({
        type: 'message',
        date: msg.createdAt.toISOString(),
        details: {
          id: msg.id,
          senderType: msg.senderType,
          status: msg.status,
          body: msg.body,
        },
      });
    }

    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const paginated = combined.slice(skip, skip + take);
    res.json(createSuccessResponse({
      data: paginated,
      pagination: createPaginationInfo(page, pageSize, combined.length),
    }));
  } catch (error) {
    console.error('Error fetching communication history:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch communication history',
    }));
  }
});

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

// GET /:incarceratedPersonId - approved contacts for an incarcerated person
contactsRouter.get('/:incarceratedPersonId', async (req: Request, res: Response) => {
  try {
    const { incarceratedPersonId } = req.params;
    const facilityFilter = buildFacilityFilter(req.user!);

    const person = await prisma.incarceratedPerson.findFirst({
      where: { id: incarceratedPersonId, ...facilityFilter },
    });
    if (!person) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Person not found' }));
      return;
    }

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
