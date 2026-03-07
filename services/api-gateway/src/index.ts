import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { adminRouter } from '@openconnect/admin';
import { messagingRouter } from '@openconnect/messaging';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/messaging', messagingRouter);

// Guild route mounting (teams will implement these)
// app.use('/api/voice', voiceRouter);
// app.use('/api/video', videoRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
