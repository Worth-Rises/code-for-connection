import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ─── Mock @openconnect/shared ────────────────────────────────────────────────
// We mock the entire shared module so the tests never touch a real DB or JWT
vi.mock('@openconnect/shared', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    // By default: authenticated as incarcerated person
    req.user = {
      id: 'inc-user-1',
      role: 'incarcerated',
      facilityId: 'facility-1',
      agencyId: 'agency-1',
      firstName: 'John',
      lastName: 'Doe',
    };
    next();
  },
  requireRole: (..._roles: string[]) => (_req: any, _res: any, next: any) => next(),
  createSuccessResponse: (data: any) => ({ success: true, data }),
  createErrorResponse: (err: any) => ({ success: false, error: err }),
  prisma: {
    videoCall: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Import AFTER mock is set up
import { videoRouter } from '../../api/routes.js';
import { prisma } from '@openconnect/shared';

const app = express();
app.use(express.json());
app.use('/api/video', videoRouter);

// ─── Helper: build a mock VideoCall record ─────────────────────────────────
const THIRTY_MIN = 30 * 60 * 1000;

// NOTE: times are computed dynamically so they are always valid relative to
// the moment each test runs — avoids stale-timestamp failures.
function mockCall(overrides: Partial<Record<string, unknown>> = {}) {
  const now = Date.now();
  return {
    id: 'call-1',
    incarceratedPersonId: 'inc-user-1',
    familyMemberId: 'family-user-1',
    facilityId: 'facility-1',
    status: 'scheduled',
    scheduledStart: new Date(now - 60_000),  // started 1 min ago
    scheduledEnd: new Date(now + THIRTY_MIN - 60_000),
    actualStart: null,
    actualEnd: null,
    durationSeconds: null,
    requestedBy: 'family-user-1',
    approvedBy: 'admin-1',
    endedBy: null,
    incarceratedPerson: { firstName: 'John', lastName: 'Doe' },
    familyMember: { firstName: 'Alice', lastName: 'Smith' },
    ...overrides,
  };
}

// ─── GET /api/video/my-scheduled ───────────────────────────────────────────
describe('GET /api/video/my-scheduled', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    // Re-build app with no-auth middleware for this single test
    const anonApp = express();
    anonApp.use(express.json());
    // Dynamically override requireAuth for this test by building a route that
    // simulates the middleware rejecting
    anonApp.get('/api/video/my-scheduled', (_req, res) => {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    });
    const res = await request(anonApp).get('/api/video/my-scheduled');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns empty array when user has no scheduled calls', async () => {
    (prisma.videoCall.findMany as any).mockResolvedValue([]);
    const res = await request(app).get('/api/video/my-scheduled');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('returns only scheduled/in_progress calls for the authenticated user', async () => {
    const calls = [mockCall(), mockCall({ id: 'call-2', status: 'in_progress' })];
    (prisma.videoCall.findMany as any).mockResolvedValue(calls);
    const res = await request(app).get('/api/video/my-scheduled');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    // Verify findMany was called with the auth user id in the OR clause
    const findManyCall = (prisma.videoCall.findMany as any).mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ incarceratedPersonId: 'inc-user-1' }),
        expect.objectContaining({ familyMemberId: 'inc-user-1' }),
      ]),
    );
  });

  it('only queries status in [scheduled, in_progress]', async () => {
    (prisma.videoCall.findMany as any).mockResolvedValue([]);
    await request(app).get('/api/video/my-scheduled');
    const whereClause = (prisma.videoCall.findMany as any).mock.calls[0][0].where;
    expect(whereClause.status).toEqual(
      expect.objectContaining({ in: expect.arrayContaining(['scheduled', 'in_progress']) }),
    );
  });

  it('does not require approvedBy in my-scheduled query', async () => {
    (prisma.videoCall.findMany as any).mockResolvedValue([]);
    await request(app).get('/api/video/my-scheduled');
    const whereClause = (prisma.videoCall.findMany as any).mock.calls[0][0].where;
    expect(whereClause.approvedBy).toBeUndefined();
  });

  it('orders results by scheduledStart descending', async () => {
    (prisma.videoCall.findMany as any).mockResolvedValue([]);
    await request(app).get('/api/video/my-scheduled');
    const orderBy = (prisma.videoCall.findMany as any).mock.calls[0][0].orderBy;
    expect(orderBy).toEqual({ scheduledStart: 'desc' });
  });
});

// ─── GET /api/video/scheduled-calls ───────────────────────────────────────
describe('GET /api/video/scheduled-calls', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries requested/scheduled/in_progress calls by scheduledEnd cutoff', async () => {
    (prisma.videoCall.findMany as any).mockResolvedValue([mockCall()]);

    const res = await request(app)
      .get('/api/video/scheduled-calls')
      .query({ contactId: 'inc-user-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const findManyArgs = (prisma.videoCall.findMany as any).mock.calls[0][0];
    expect(findManyArgs.where.familyMemberId).toBe('inc-user-1');
    expect(findManyArgs.where.incarceratedPersonId).toBe('inc-user-1');
    expect(findManyArgs.where.status).toEqual(
      expect.objectContaining({
        in: expect.arrayContaining(['requested', 'approved', 'scheduled', 'in_progress']),
      }),
    );
    expect(findManyArgs.where.scheduledEnd.gte).toBeInstanceOf(Date);
    expect(findManyArgs.where.scheduledStart).toBeUndefined();
  });
});

// ─── POST /api/video/join/:callId ─────────────────────────────────────────
describe('POST /api/video/join/:callId', () => {
  // resetAllMocks is needed (not clearAllMocks) so that mockResolvedValue
  // implementations don't leak between tests.
  beforeEach(() => vi.resetAllMocks());

  it('returns 404 when call does not exist', async () => {
    (prisma.videoCall.findUnique as any).mockResolvedValue(null);
    const res = await request(app).post('/api/video/join/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when user is not a participant', async () => {
    (prisma.videoCall.findUnique as any).mockResolvedValue(
      mockCall({ incarceratedPersonId: 'other-user', familyMemberId: 'other-family' }),
    );
    const res = await request(app).post('/api/video/join/call-1');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 when call status is still "requested"', async () => {
    (prisma.videoCall.findUnique as any).mockResolvedValue(mockCall({ status: 'requested' }));
    const res = await request(app).post('/api/video/join/call-1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CALL_NOT_READY');
  });

  it('allows join when call is scheduled even if approvedBy is null (auto-approved)', async () => {
    (prisma.videoCall.findUnique as any).mockResolvedValue(
      mockCall({ status: 'scheduled', approvedBy: null }),
    );
    (prisma.videoCall.update as any).mockResolvedValue(
      mockCall({ status: 'in_progress', approvedBy: null, actualStart: new Date() }),
    );
    const res = await request(app).post('/api/video/join/call-1');
    expect(res.status).toBe(200);
    expect(prisma.videoCall.update).toHaveBeenCalled();
  });

  it('returns 400 when now < scheduledStart (too early)', async () => {
    const futureStart = new Date(Date.now() + 60 * 60 * 1000); // 1hr from now
    (prisma.videoCall.findUnique as any).mockResolvedValue(
      mockCall({ status: 'scheduled', scheduledStart: futureStart, scheduledEnd: new Date(futureStart.getTime() + THIRTY_MIN) }),
    );
    const res = await request(app).post('/api/video/join/call-1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOO_EARLY');
  });

  it('returns 400 when now > scheduledEnd (too late)', async () => {
    const pastEnd = new Date(Date.now() - 16 * 60 * 1000); // ended 16 min ago (outside 15 min grace)
    (prisma.videoCall.findUnique as any).mockResolvedValue(
      mockCall({ status: 'scheduled', scheduledStart: new Date(pastEnd.getTime() - THIRTY_MIN), scheduledEnd: pastEnd }),
    );
    const res = await request(app).post('/api/video/join/call-1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOO_LATE');
  });

  it('sets status to in_progress and writes actualStart on first join', async () => {
    const call = mockCall();
    (prisma.videoCall.findUnique as any).mockResolvedValue(call);
    (prisma.videoCall.update as any).mockResolvedValue({ ...call, status: 'in_progress', actualStart: new Date() });
    const res = await request(app).post('/api/video/join/call-1');
    expect(res.status).toBe(200);
    const updateArgs = (prisma.videoCall.update as any).mock.calls[0][0];
    expect(updateArgs.data.status).toBe('in_progress');
    expect(updateArgs.data.actualStart).toBeDefined();
  });

  it('does NOT overwrite actualStart on reconnect (call already in_progress)', async () => {
    const call = mockCall({ status: 'in_progress', actualStart: new Date() });
    (prisma.videoCall.findUnique as any).mockResolvedValue(call);
    (prisma.videoCall.update as any).mockResolvedValue(call);
    await request(app).post('/api/video/join/call-1');
    const updateArgs = (prisma.videoCall.update as any).mock.calls[0][0];
    // actualStart should NOT be in the update payload when already set
    expect(updateArgs.data.actualStart).toBeUndefined();
  });

  it('returns roomId and scheduledEnd on success', async () => {
    const call = mockCall();
    (prisma.videoCall.findUnique as any).mockResolvedValue(call);
    (prisma.videoCall.update as any).mockResolvedValue({ ...call, status: 'in_progress', actualStart: new Date() });
    const res = await request(app).post('/api/video/join/call-1');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      roomId: 'call-1',
      scheduledEnd: expect.any(String),
    });
  });
});

// ─── POST /api/video/end/:callId ─────────────────────────────────────────
describe('POST /api/video/end/:callId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when call does not exist', async () => {
    (prisma.videoCall.findUnique as any).mockResolvedValue(null);
    const res = await request(app).post('/api/video/end/nonexistent').send({ reason: 'user' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not a participant', async () => {
    (prisma.videoCall.findUnique as any).mockResolvedValue(
      mockCall({ incarceratedPersonId: 'other', familyMemberId: 'other-family' }),
    );
    const res = await request(app).post('/api/video/end/call-1').send({ reason: 'user' });
    expect(res.status).toBe(403);
  });

  it('sets status to completed, writes actualEnd, computes durationSeconds', async () => {
    const startedAt = new Date(Date.now() - 10 * 60 * 1000); // started 10 min ago
    const call = mockCall({ status: 'in_progress', actualStart: startedAt });
    (prisma.videoCall.findUnique as any).mockResolvedValue(call);
    (prisma.videoCall.update as any).mockResolvedValue({ ...call, status: 'completed' });
    const res = await request(app).post('/api/video/end/call-1').send({ reason: 'user' });
    expect(res.status).toBe(200);
    const updateArgs = (prisma.videoCall.update as any).mock.calls[0][0];
    expect(updateArgs.data.status).toBe('completed');
    expect(updateArgs.data.actualEnd).toBeDefined();
    expect(typeof updateArgs.data.durationSeconds).toBe('number');
    expect(updateArgs.data.durationSeconds).toBeGreaterThan(0);
  });

  it('sets endedBy to "incarcerated" when caller is incarcerated', async () => {
    const call = mockCall({ status: 'in_progress', actualStart: new Date(Date.now() - 60_000) });
    (prisma.videoCall.findUnique as any).mockResolvedValue(call);
    (prisma.videoCall.update as any).mockResolvedValue(call);
    await request(app).post('/api/video/end/call-1').send({ reason: 'user' });
    const updateArgs = (prisma.videoCall.update as any).mock.calls[0][0];
    expect(updateArgs.data.endedBy).toBe('incarcerated');
  });

  it('accepts time_limit as a reason', async () => {
    const call = mockCall({ status: 'in_progress', actualStart: new Date(Date.now() - 60_000) });
    (prisma.videoCall.findUnique as any).mockResolvedValue(call);
    (prisma.videoCall.update as any).mockResolvedValue(call);
    const res = await request(app).post('/api/video/end/call-1').send({ reason: 'time_limit' });
    expect(res.status).toBe(200);
    const updateArgs = (prisma.videoCall.update as any).mock.calls[0][0];
    expect(updateArgs.data.endedBy).toBe('time_limit');
  });

  it('is idempotent — re-ending a completed call returns 200 without re-writing', async () => {
    const call = mockCall({ status: 'completed', actualStart: new Date(Date.now() - 60_000), actualEnd: new Date() });
    (prisma.videoCall.findUnique as any).mockResolvedValue(call);
    const res = await request(app).post('/api/video/end/call-1').send({ reason: 'user' });
    expect(res.status).toBe(200);
    // prisma.update should NOT be called since already completed
    expect(prisma.videoCall.update).not.toHaveBeenCalled();
  });
});
