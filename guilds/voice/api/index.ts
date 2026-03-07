import { Router } from 'express';
import {voiceAdminRouter} from "./admin";
import { voiceContactRouter } from "./contacts";
import { voiceUserRouter } from "./users";

export const voiceRouter = Router();

voiceRouter.use('/users', voiceUserRouter);
voiceRouter.use('/contacts', voiceContactRouter);
voiceRouter.use('/', voiceAdminRouter);

export default voiceRouter;
