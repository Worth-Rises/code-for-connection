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

// PATCH /:contactId/edit - Edit contact details (relationship, notes)
contactsRouter.patch('/:contactId/edit', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { relationship, notes } = req.body;

    const contact = await prisma.approvedContact.findUnique({
      where: { id: contactId },
      include: { familyMember: true },
    });
    if (!contact) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Contact not found' }));
      return;
    }

    const contactUpdate: Record<string, unknown> = {};
    if (relationship !== undefined) contactUpdate.relationship = relationship;
    if (notes !== undefined) contactUpdate.notes = notes;

    // Update the contact relationship/notes
    const updatedContact = await prisma.approvedContact.update({
      where: { id: contactId },
      data: contactUpdate,
    });

    // Update family member details if provided
    const familyUpdate: Record<string, unknown> = {};
    if (req.body.phone !== undefined) familyUpdate.phone = req.body.phone;
    if (req.body.email !== undefined) familyUpdate.email = req.body.email;
    if (req.body.firstName !== undefined) familyUpdate.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) familyUpdate.lastName = req.body.lastName;

    let updatedFamily = null;
    if (Object.keys(familyUpdate).length > 0) {
      updatedFamily = await prisma.familyMember.update({
        where: { id: contact.familyMemberId },
        data: familyUpdate,
      });
    }

    await auditLog(req.user!.id, 'update_contact', 'ApprovedContact', contactId, {
      contactUpdate,
      familyUpdate: Object.keys(familyUpdate).length > 0 ? familyUpdate : undefined,
    }, getClientIp(req));

    res.json(createSuccessResponse({
      contact: updatedContact,
      familyMember: updatedFamily || contact.familyMember,
    }));
  } catch (error) {
    console.error('Error editing contact:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to edit contact',
    }));
  }
});

// POST /block-person-agency-wide - Block a family member across all facilities
contactsRouter.post('/block-person-agency-wide', async (req: Request, res: Response) => {
  try {
    const { familyMemberId } = req.body;
    const user = req.user!;

    if (user.role !== 'agency_admin') {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Only agency admins can block a person agency-wide',
      }));
      return;
    }

    if (!familyMemberId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'familyMemberId is required',
      }));
      return;
    }

    const familyMember = await prisma.familyMember.findUnique({ where: { id: familyMemberId } });
    if (!familyMember) {
      res.status(404).json(createErrorResponse({ code: 'NOT_FOUND', message: 'Person not found' }));
      return;
    }

    const updated = await prisma.familyMember.update({
      where: { id: familyMemberId },
      data: {
        isBlockedAgencyWide: true,
        blockedAgencyId: user.agencyId,
      },
    });

    await auditLog(user.id, 'block_person_agency_wide', 'FamilyMember', familyMemberId, {
      agencyId: user.agencyId,
    }, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error blocking person agency-wide:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to block person agency-wide',
    }));
  }
});

// DELETE /unblock-person-agency-wide - Unblock a family member
contactsRouter.post('/unblock-person-agency-wide', async (req: Request, res: Response) => {
  try {
    const { familyMemberId } = req.body;
    const user = req.user!;

    if (user.role !== 'agency_admin') {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Only agency admins can unblock a person agency-wide',
      }));
      return;
    }

    const updated = await prisma.familyMember.update({
      where: { id: familyMemberId },
      data: {
        isBlockedAgencyWide: false,
        blockedAgencyId: null,
      },
    });

    await auditLog(user.id, 'unblock_person_agency_wide', 'FamilyMember', familyMemberId, {
      agencyId: user.agencyId,
    }, getClientIp(req));

    res.json(createSuccessResponse(updated));
  } catch (error) {
    console.error('Error unblocking person:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to unblock person',
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
