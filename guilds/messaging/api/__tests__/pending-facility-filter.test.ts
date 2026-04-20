import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@openconnect/shared', async () => {
  const actual = await vi.importActual('@openconnect/shared');
  return {
    ...actual,
    requireAuth: (_req: any, _res: any, next: any) => next(),
    requireRole: (..._roles: string[]) => (_req: any, _res: any, next: any) => next(),
    prisma: {
      message: {
        findMany: vi.fn(),
      },
    },
  };
});

import { prisma } from '@openconnect/shared';
import { messagingRouter } from '../routes.js';

const mockedPrisma = vi.mocked(prisma);

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { id: 'admin-1', role: 'facility_admin', agencyId: 'agency-1', facilityId: 'facility-1' };
    next();
  });
  app.use('/api/messaging', messagingRouter);
  return app;
}

describe('GET /api/messaging/pending facility filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters by facilityId when provided', async () => {
    mockedPrisma.message.findMany.mockResolvedValue([]);

    const app = buildApp();
    const res = await request(app).get('/api/messaging/pending?facilityId=facility-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const call = mockedPrisma.message.findMany.mock.calls[0][0];
    expect(call?.where).toMatchObject({
      status: 'pending_review',
      conversation: {
        incarceratedPerson: { facilityId: 'facility-1' },
      },
    });
  });

  it('returns all pending messages when facilityId is omitted', async () => {
    mockedPrisma.message.findMany.mockResolvedValue([]);

    const app = buildApp();
    const res = await request(app).get('/api/messaging/pending');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const call = mockedPrisma.message.findMany.mock.calls[0][0];
    expect(call?.where).toMatchObject({
      status: 'pending_review',
    });
    // Should not have a conversation filter
    expect(call?.where).not.toHaveProperty('conversation');
  });
});
