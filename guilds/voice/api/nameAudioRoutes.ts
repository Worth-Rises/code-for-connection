import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';

/** Max decoded audio size: 2MB (short name recording) */
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

/** Allowed MIME types for name audio */
const ALLOWED_CONTENT_TYPES = ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg'];

export const nameAudioRouter = Router();

/**
 * POST /name-audio
 * Record and store the incarcerated person's name (short audio).
 * Called on first login when needsNameRecording is true.
 * Facility approval flag exists but is auto-approved for now.
 */
nameAudioRouter.post(
  '/',
  requireAuth,
  requireRole('incarcerated'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { audioBase64, contentType } = req.body as { audioBase64?: string; contentType?: string };

      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json(
          createErrorResponse({
            code: 'VALIDATION_ERROR',
            message: 'audioBase64 is required and must be a string',
          })
        );
        return;
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(audioBase64, 'base64');
      } catch {
        res.status(400).json(
          createErrorResponse({
            code: 'VALIDATION_ERROR',
            message: 'audioBase64 must be valid base64',
          })
        );
        return;
      }

      if (buffer.length > MAX_AUDIO_BYTES) {
        res.status(400).json(
          createErrorResponse({
            code: 'VALIDATION_ERROR',
            message: `Audio must be at most ${MAX_AUDIO_BYTES / 1024}KB`,
          })
        );
        return;
      }

      const type = contentType && typeof contentType === 'string' ? contentType.trim() : 'audio/webm';
      if (type && !ALLOWED_CONTENT_TYPES.includes(type)) {
        res.status(400).json(
          createErrorResponse({
            code: 'VALIDATION_ERROR',
            message: `contentType must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
          })
        );
        return;
      }

      await prisma.incarceratedPerson.update({
        where: { id: userId },
        data: {
          nameAudioBytes: buffer,
          nameAudioContentType: type || undefined,
          nameAudioApproved: true, // Auto-approve for now; facility staff approval can gate later
        } as Parameters<typeof prisma.incarceratedPerson.update>[0]['data'],
      });

      res.json(
        createSuccessResponse({
          message: 'Name audio saved and approved',
          hasNameAudio: true,
        })
      );
    } catch (error) {
      console.error('Name audio upload error:', error);
      res.status(500).json(
        createErrorResponse({
          code: 'INTERNAL_ERROR',
          message: 'Failed to save name audio',
        })
      );
    }
  }
);

/**
 * GET /name-audio/status
 * Returns whether the current incarcerated person has recorded name audio and its approval status.
 */
nameAudioRouter.get(
  '/status',
  requireAuth,
  requireRole('incarcerated'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const person = await prisma.incarceratedPerson.findUnique({
        where: { id: userId },
      });

      if (!person) {
        res.status(404).json(
          createErrorResponse({ code: 'NOT_FOUND', message: 'User not found' })
        );
        return;
      }

      const record = person as typeof person & {
        nameAudioBytes?: Buffer | null;
        nameAudioContentType?: string | null;
        nameAudioApproved?: boolean;
      };
      res.json(
        createSuccessResponse({
          hasNameAudio: record.nameAudioBytes != null && record.nameAudioBytes.length > 0,
          nameAudioApproved: record.nameAudioApproved ?? false,
          contentType: record.nameAudioContentType ?? undefined,
        })
      );
    } catch (error) {
      console.error('Name audio status error:', error);
      res.status(500).json(
        createErrorResponse({
          code: 'INTERNAL_ERROR',
          message: 'Failed to get name audio status',
        })
      );
    }
  }
);
