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
        count: vi.fn(),
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

describe('GET /api/messaging/stats facility filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters by facilityId when provided', async () => {
    mockedPrisma.message.count.mockResolvedValue(0);

    const app = buildApp();
    const res = await request(app).get('/api/messaging/stats?facilityId=facility-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Both count calls should include the facility filter
    const calls = mockedPrisma.message.count.mock.calls;
    expect(calls).toHaveLength(2);

    // todayTotal query
    expect(calls[0][0]?.where).toHaveProperty('conversation');
    expect((calls[0][0]?.where as any).conversation).toMatchObject({
      incarceratedPerson: { facilityId: 'facility-1' },
    });

    // pendingReview query
    expect(calls[1][0]?.where).toHaveProperty('conversation');
    expect((calls[1][0]?.where as any).conversation).toMatchObject({
      incarceratedPerson: { facilityId: 'facility-1' },
    });
  });

  it('returns unfiltered stats when facilityId is omitted', async () => {
    mockedPrisma.message.count.mockResolvedValue(5);

    const app = buildApp();
    const res = await request(app).get('/api/messaging/stats');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ todayTotal: 5, pendingReview: 5 });

    // Neither count call should have a conversation filter
    const calls = mockedPrisma.message.count.mock.calls;
    expect(calls[0][0]?.where).not.toHaveProperty('conversation');
    expect(calls[1][0]?.where).not.toHaveProperty('conversation');
  });
});
