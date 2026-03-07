import { Router } from 'express';
import {voiceAdminRouter} from "./adminRoutes";
import { voiceContactRouter } from "./contactRoutes";
import { voiceUserRouter } from "./userRoutes";

export const voiceRouter = Router();

voiceRouter.use('/users', voiceUserRouter);
voiceRouter.use('/contacts', voiceContactRouter);
voiceRouter.use('/', voiceAdminRouter);

export default voiceRouter;
