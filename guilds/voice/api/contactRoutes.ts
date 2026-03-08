import { Router, Request, Response } from 'express';
import {
  requireAuth,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';

export const voiceContactRouter = Router();

// ==========================================
// FAMILY MEMBER / LOVED ONE USER ENDPOINTS
// ==========================================

/**
 * GET /contacts — Approved contacts for the logged-in contact
 */
voiceContactRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const contacts = await prisma.approvedContact.findMany({
      where: {
        familyMemberId: userId,
        status: 'approved',
      },
      include: {
        incarceratedPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            externalId: true,
            facility: {
              select: {
                name: true,
              },
            }
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
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

export default voiceContactRouter;
