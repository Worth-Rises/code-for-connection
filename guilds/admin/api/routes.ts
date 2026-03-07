import { Router, Request, Response } from 'express';
import {
  requireAuth,
  createSuccessResponse,
  createErrorResponse,
  prisma,
} from '@openconnect/shared';
import { contactsRouter } from './contacts.js';
import { blockedNumbersRouter } from './blocked-numbers.js';
import { facilityRouter } from './facility.js';
import { usersRouter } from './users.js';
import { dashboardRouter } from './dashboard.js';
import { monitoringRouter } from './monitoring.routes.js';
import { residentsRouter } from './residents.routes.js';
import { visitorsRouter } from './visitors.routes.js';
import { housingRouter } from './housing.routes.js';
import { searchRouter } from './search.routes.js';
import { auditRouter } from './audit.routes.js';
import { reportsRouter } from './reports.routes.js';
import { settingsRouter } from './settings.routes.js';

export const adminRouter = Router();

adminRouter.use('/contacts', contactsRouter);
adminRouter.use('/blocked-numbers', blockedNumbersRouter);
adminRouter.use('/facilities', facilityRouter);
adminRouter.use('/facility', facilityRouter);
adminRouter.use('/users', usersRouter);
adminRouter.use('/user', usersRouter);
adminRouter.use('/dashboard', dashboardRouter);
adminRouter.use('/monitoring', monitoringRouter);
adminRouter.use('/residents', residentsRouter);
adminRouter.use('/visitors', visitorsRouter);
adminRouter.use('/housing', housingRouter);
adminRouter.use('/search', searchRouter);
adminRouter.use('/audit-log', auditRouter);
adminRouter.use('/reports', reportsRouter);
adminRouter.use('/settings', settingsRouter);

adminRouter.get('/housing-unit-type/:unitTypeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { unitTypeId } = req.params;

    const unitType = await prisma.housingUnitType.findUnique({
      where: { id: unitTypeId },
    });

    if (!unitType) {
      res.status(404).json(createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Housing unit type not found',
      }));
      return;
    }

    res.json(createSuccessResponse(unitType));
  } catch (error) {
    console.error('Error fetching housing unit type:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch housing unit type',
    }));
  }
});

export default adminRouter;
