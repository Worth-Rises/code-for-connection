import { Request, Response, NextFunction } from 'express';
import { prisma } from '@openconnect/shared';

/**
 * Extract client IP from request, checking x-forwarded-for first.
 */
export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

/**
 * Write an entry to the AuditLog table. Fire-and-forget; never throws.
 */
export async function auditLog(
  adminUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId,
        action: action as any,
        entityType,
        entityId,
        details: details ?? undefined,
        ipAddress,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

/**
 * Express middleware factory that logs successful responses to the audit log.
 *
 * Intercepts res.json() to capture the response, then logs if status < 400.
 * Extracts entityId from req.params.id, req.params[entityType + 'Id'], or
 * the request body's `id` field.
 */
export function withAudit(action: string, entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body?: any) {
      const statusCode = res.statusCode;

      if (statusCode < 400) {
        const entityId =
          req.params?.id ||
          req.params?.[entityType + 'Id'] ||
          req.body?.id ||
          body?.id ||
          'unknown';

        const adminUserId = (req as any).user?.id;
        if (adminUserId) {
          auditLog(adminUserId, action, entityType, entityId, undefined, getClientIp(req));
        }
      }

      return originalJson(body);
    };

    next();
  };
}
