import { Router, Request, Response } from 'express';
import { requireAuth, requireRole, createSuccessResponse, createErrorResponse } from '@openconnect/shared';
import { auditLog, getClientIp } from './audit.js';

export const monitoringRouter = Router();

monitoringRouter.use(requireAuth, requireRole('facility_admin', 'agency_admin'));

const INTERNAL_API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

async function proxyToGuild(req: Request, guildPath: string): Promise<{ status: number; data: unknown }> {
  const token = req.headers.authorization?.split(' ')[1] || '';
  const url = new URL(guildPath, INTERNAL_API_BASE);
  // Forward query params
  Object.entries(req.query).forEach(([k, v]) => {
    if (typeof v === 'string') url.searchParams.set(k, v);
  });

  const response = await fetch(url.toString(), {
    method: req.method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: ['POST', 'PATCH', 'PUT'].includes(req.method) ? JSON.stringify(req.body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

// Voice monitoring
monitoringRouter.get('/voice/active', async (req, res) => {
  try {
    const result = await proxyToGuild(req, '/api/voice/active-calls');
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach voice service' }));
  }
});

monitoringRouter.get('/voice/history', async (req, res) => {
  try {
    const result = await proxyToGuild(req, '/api/voice/call-logs');
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach voice service' }));
  }
});

monitoringRouter.post('/voice/terminate/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const result = await proxyToGuild(req, `/api/voice/terminate-call/${callId}`);
    if (result.status < 400) {
      await auditLog(req.user!.id, 'terminate_voice_call', 'VoiceCall', callId, undefined, getClientIp(req));
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach voice service' }));
  }
});

// Video monitoring
monitoringRouter.get('/video/pending', async (req, res) => {
  try {
    const result = await proxyToGuild(req, '/api/video/pending-requests');
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach video service' }));
  }
});

monitoringRouter.get('/video/active', async (req, res) => {
  try {
    const result = await proxyToGuild(req, '/api/video/active-calls');
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach video service' }));
  }
});

monitoringRouter.get('/video/history', async (req, res) => {
  try {
    const result = await proxyToGuild(req, '/api/video/call-logs');
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach video service' }));
  }
});

monitoringRouter.post('/video/approve/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const result = await proxyToGuild(req, `/api/video/approve-request/${callId}`);
    if (result.status < 400) {
      await auditLog(req.user!.id, 'approve_video_call', 'VideoCall', callId, undefined, getClientIp(req));
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach video service' }));
  }
});

monitoringRouter.post('/video/deny/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const result = await proxyToGuild(req, `/api/video/deny-request/${callId}`);
    if (result.status < 400) {
      await auditLog(req.user!.id, 'deny_video_call', 'VideoCall', callId, undefined, getClientIp(req));
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach video service' }));
  }
});

monitoringRouter.post('/video/terminate/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const result = await proxyToGuild(req, `/api/video/terminate-call/${callId}`);
    if (result.status < 400) {
      await auditLog(req.user!.id, 'terminate_video_call', 'VideoCall', callId, undefined, getClientIp(req));
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach video service' }));
  }
});

// Messaging monitoring
monitoringRouter.get('/messaging/pending', async (req, res) => {
  try {
    const result = await proxyToGuild(req, '/api/messaging/pending');
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach messaging service' }));
  }
});

monitoringRouter.get('/messaging/logs', async (req, res) => {
  try {
    const result = await proxyToGuild(req, '/api/messaging/logs');
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach messaging service' }));
  }
});

monitoringRouter.post('/messaging/approve/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const result = await proxyToGuild(req, `/api/messaging/approve/${messageId}`);
    if (result.status < 400) {
      await auditLog(req.user!.id, 'approve_message', 'Message', messageId, undefined, getClientIp(req));
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach messaging service' }));
  }
});

monitoringRouter.post('/messaging/block/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const result = await proxyToGuild(req, `/api/messaging/block-conversation/${conversationId}`);
    if (result.status < 400) {
      await auditLog(req.user!.id, 'block_conversation', 'Conversation', conversationId, undefined, getClientIp(req));
    }
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach messaging service' }));
  }
});

// Stats endpoints
monitoringRouter.get('/voice/stats', async (req, res) => {
  try {
    const result = await proxyToGuild(req, '/api/voice/stats');
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach voice service' }));
  }
});

monitoringRouter.get('/video/stats', async (req, res) => {
  try {
    const result = await proxyToGuild(req, '/api/video/stats');
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach video service' }));
  }
});

monitoringRouter.get('/messaging/stats', async (req, res) => {
  try {
    const result = await proxyToGuild(req, '/api/messaging/stats');
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(502).json(createErrorResponse({ code: 'PROXY_ERROR', message: 'Failed to reach messaging service' }));
  }
});
