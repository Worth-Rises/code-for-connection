import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';

export const flaggedContentRouter = Router();

flaggedContentRouter.get('/', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { status, severity, contentType } = req.query;

    if (!req.user?.agencyId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Authenticated admin must have an agency',
      }));
      return;
    }

    const where: Record<string, unknown> = {
      ...(status ? { status: String(status) } : {}),
      ...(severity ? { severity: String(severity) } : {}),
      ...(contentType ? { contentType: String(contentType) } : {}),
    };

    if (req.user.role === 'facility_admin' && req.user.facilityId) {
      where.OR = [
        { keywordAlertId: null },
        {
          keywordAlert: {
            agencyId: req.user.agencyId,
            OR: [{ facilityId: null }, { facilityId: req.user.facilityId }],
          },
        },
      ];
    } else {
      where.OR = [
        { keywordAlertId: null },
        { keywordAlert: { agencyId: req.user.agencyId } },
      ];
    }

    const flaggedContent = await prisma.flaggedContent.findMany({
      where,
      include: {
        keywordAlert: true,
        assignedAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(createSuccessResponse(flaggedContent));
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch flagged content',
    }));
  }
});

flaggedContentRouter.patch('/:id/review', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    if (!req.user?.id || !req.user.agencyId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Authenticated admin context is invalid',
      }));
      return;
    }

    if (!status) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'status is required',
      }));
      return;
    }

    const existing = await prisma.flaggedContent.findFirst({
      where: {
        id,
        OR: [
          { keywordAlertId: null },
          { keywordAlert: { agencyId: req.user.agencyId } },
        ],
      },
      include: {
        keywordAlert: true,
      },
    });

    if (!existing) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Flagged content not found',
      }));
      return;
    }

    if (
      req.user.role === 'facility_admin' &&
      existing.keywordAlert?.facilityId &&
      existing.keywordAlert.facilityId !== req.user.facilityId
    ) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Facility admins can only review content from their facility',
      }));
      return;
    }

    const reviewed = await prisma.flaggedContent.update({
      where: { id },
      data: {
        status,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        ...(resolutionNotes !== undefined ? { resolutionNotes: String(resolutionNotes) } : {}),
      },
    });

    res.json(createSuccessResponse(reviewed));
  } catch (error) {
    console.error('Error reviewing flagged content:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to review flagged content',
    }));
  }
});

flaggedContentRouter.post('/:id/escalate', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo, notes } = req.body;

    if (!req.user?.agencyId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Authenticated admin must have an agency',
      }));
      return;
    }

    if (!assignedTo) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'assignedTo is required',
      }));
      return;
    }

    const assignee = await prisma.adminUser.findFirst({
      where: {
        id: String(assignedTo),
        agencyId: req.user.agencyId,
      },
    });

    if (!assignee) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Assignee admin not found',
      }));
      return;
    }

    const current = await prisma.flaggedContent.findFirst({
      where: {
        id,
        OR: [
          { keywordAlertId: null },
          { keywordAlert: { agencyId: req.user.agencyId } },
        ],
      },
      include: {
        keywordAlert: true,
      },
    });

    if (!current) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Flagged content not found',
      }));
      return;
    }

    if (
      req.user.role === 'facility_admin' &&
      current.keywordAlert?.facilityId &&
      current.keywordAlert.facilityId !== req.user.facilityId
    ) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Facility admins can only escalate content from their facility',
      }));
      return;
    }

    const appendedNotes = notes
      ? current.resolutionNotes
        ? `${current.resolutionNotes}\n${String(notes)}`
        : String(notes)
      : current.resolutionNotes;

    const escalated = await prisma.flaggedContent.update({
      where: { id },
      data: {
        assignedTo: String(assignedTo),
        status: 'escalated',
        resolutionNotes: appendedNotes,
      },
    });

    res.json(createSuccessResponse(escalated));
  } catch (error) {
    console.error('Error escalating flagged content:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to escalate flagged content',
    }));
  }
});

flaggedContentRouter.post('/', requireAuth, requireRole('facility_admin', 'agency_admin'), async (req: Request, res: Response) => {
  try {
    const { contentType, contentId, flagReason, severity, notes } = req.body;

    if (!contentType || !contentId || !severity) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'contentType, contentId, and severity are required',
      }));
      return;
    }

    const flagged = await prisma.flaggedContent.create({
      data: {
        contentType,
        contentId: String(contentId),
        flagReason: flagReason ?? 'manual',
        severity,
        resolutionNotes: notes ? String(notes) : null,
      },
    });

    res.status(201).json(createSuccessResponse(flagged));
  } catch (error) {
    console.error('Error creating manual flag:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create manual flag',
    }));
  }
});

export default flaggedContentRouter;
