import { Router, Request, Response } from 'express';
import {
  requireAuth,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';

export const voiceContactRouter = Router();

// In-memory map of callId -> Twilio SID (hackathon workaround since we can't modify the Prisma schema)
const twilioSidMap = new Map<string, string>();

// ==========================================
// FAMILY MEMBER / LOVED ONE USER ENDPOINTS
// ==========================================

/**
 * GET /contacts — Approved contacts for the logged-in incarcerated person
 */
voiceContactRouter.get('/contacts', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const contacts = await prisma.approvedContact.findMany({
      where: {
        familyMemberId: userId,
        status: 'approved',
      },
      include: {
        familyMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
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
