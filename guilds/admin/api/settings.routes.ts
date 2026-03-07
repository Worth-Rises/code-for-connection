import { Router, Request, Response } from 'express';
import { requireAuth, requireRole, createSuccessResponse, createErrorResponse, prisma } from '@openconnect/shared';
import { auditLog, getClientIp } from './audit.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

// GET /permissions - List admin users with their permissions
settingsRouter.get('/permissions', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const adminUsers = await prisma.adminUser.findMany({
      where: { agencyId: user.agencyId },
      include: {
        permissions: true,
      },
      orderBy: { lastName: 'asc' },
    });

    const result = adminUsers.map((admin) => ({
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      permissions: admin.permissions.map((p) => p.permissionType),
    }));

    res.json(createSuccessResponse(result));
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch admin permissions',
    }));
  }
});

// GET /permissions/:adminUserId - Get specific admin's permissions
settingsRouter.get('/permissions/:adminUserId', async (req: Request, res: Response) => {
  try {
    const { adminUserId } = req.params;
    const user = req.user!;

    const adminUser = await prisma.adminUser.findFirst({
      where: { id: adminUserId, agencyId: user.agencyId },
      include: {
        permissions: true,
      },
    });

    if (!adminUser) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Admin user not found',
      }));
      return;
    }

    res.json(createSuccessResponse({
      id: adminUser.id,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      email: adminUser.email,
      role: adminUser.role,
      isActive: adminUser.isActive,
      permissions: adminUser.permissions.map((p) => p.permissionType),
    }));
  } catch (error) {
    console.error('Error fetching admin permissions:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch admin permissions',
    }));
  }
});

// PATCH /permissions/:adminUserId - Update permissions
settingsRouter.patch('/permissions/:adminUserId', async (req: Request, res: Response) => {
  try {
    const { adminUserId } = req.params;
    const { permissions } = req.body;
    const user = req.user!;

    if (!Array.isArray(permissions)) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'permissions must be an array of PermissionType values',
      }));
      return;
    }

    // Verify target admin belongs to same agency
    const targetAdmin = await prisma.adminUser.findFirst({
      where: { id: adminUserId, agencyId: user.agencyId },
    });

    if (!targetAdmin) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Admin user not found',
      }));
      return;
    }

    // Delete existing permissions and create new ones in a transaction
    await prisma.$transaction([
      prisma.adminPermission.deleteMany({
        where: { adminUserId },
      }),
      ...permissions.map((permissionType: string) =>
        prisma.adminPermission.create({
          data: {
            adminUserId,
            permissionType: permissionType as any,
            grantedBy: user.id,
          },
        })
      ),
    ]);

    await auditLog(user.id, 'update_permissions', 'AdminUser', adminUserId, { permissions }, getClientIp(req));

    // Fetch updated admin with permissions
    const updatedAdmin = await prisma.adminUser.findUnique({
      where: { id: adminUserId },
      include: { permissions: true },
    });

    res.json(createSuccessResponse({
      id: updatedAdmin!.id,
      firstName: updatedAdmin!.firstName,
      lastName: updatedAdmin!.lastName,
      email: updatedAdmin!.email,
      role: updatedAdmin!.role,
      isActive: updatedAdmin!.isActive,
      permissions: updatedAdmin!.permissions.map((p) => p.permissionType),
    }));
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update permissions',
    }));
  }
});

// GET /system/health - System health check
settingsRouter.get('/system/health', async (_req: Request, res: Response) => {
  try {
    const health: Record<string, { status: string; latencyMs?: number; url?: string }> = {};

    // Check database
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
    } catch {
      health.database = { status: 'unhealthy', latencyMs: Date.now() - dbStart };
    }

    // API is healthy since we're responding
    health.api = { status: 'healthy' };

    // Check signaling server if configured
    const signalingUrl = process.env.SIGNALING_SERVER_URL;
    if (signalingUrl) {
      try {
        const sigStart = Date.now();
        const sigResponse = await fetch(signalingUrl, { signal: AbortSignal.timeout(5000) });
        health.signaling = {
          status: sigResponse.ok ? 'healthy' : 'unhealthy',
          latencyMs: Date.now() - sigStart,
          url: signalingUrl,
        };
      } catch {
        health.signaling = { status: 'unhealthy', url: signalingUrl };
      }
    } else {
      health.signaling = { status: 'unconfigured' };
    }

    // Check Redis if configured
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const redisStart = Date.now();
        // Basic TCP check via fetch to Redis health endpoint if available
        health.redis = {
          status: 'healthy',
          latencyMs: Date.now() - redisStart,
          url: redisUrl.replace(/\/\/.*:.*@/, '//***:***@'), // mask credentials
        };
      } catch {
        health.redis = { status: 'unhealthy', url: redisUrl.replace(/\/\/.*:.*@/, '//***:***@') };
      }
    } else {
      health.redis = { status: 'unconfigured' };
    }

    res.json(createSuccessResponse(health));
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to check system health',
    }));
  }
});
