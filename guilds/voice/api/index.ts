import { Router } from 'express';
import {voiceAdminRouter} from "./adminRoutes";
import { voiceContactRouter } from "./contactRoutes";
import { voiceUserRouter } from "./userRoutes";
import { nameAudioRouter } from "./nameAudioRoutes";
import { twimlRouter } from "./twimlRoutes";

export const voiceRouter = Router();

voiceRouter.use('/users', voiceUserRouter);
voiceRouter.use('/users/name-audio', nameAudioRouter);
voiceRouter.use('/contacts', voiceContactRouter);
voiceRouter.use('/twiml', twimlRouter);
voiceRouter.use('/', voiceAdminRouter);

export default voiceRouter;
