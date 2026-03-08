import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@openconnect/shared', async () => {
  const actual = await vi.importActual('@openconnect/shared');
  return {
    ...actual,
    // Pass through to next() so injected req.user is used; the no-user
    // test simply doesn't inject one, so the handler sees req.user undefined.
    requireAuth: (_req: any, _res: any, next: any) => next(),
    requireRole: (..._roles: string[]) => (_req: any, _res: any, next: any) => next(),
    prisma: {
      incarceratedPerson: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    },
  };
});

import { prisma } from '@openconnect/shared';
import { adminRouter } from '../routes.js';

const mockedPrisma = vi.mocked(prisma);

function buildApp(user?: { id: string; role: string; agencyId: string; facilityId: string }) {
  const app = express();
  app.use(express.json());

  if (user) {
    app.use((req, _res, next) => {
      (req as any).user = user;
      next();
    });
  }

  app.use('/api/admin', adminRouter);
  return app;
}

const facilityAdmin = {
  id: 'admin-1',
  role: 'facility_admin',
  agencyId: 'agency-1',
  facilityId: 'facility-1',
};

const agencyAdmin = {
  id: 'admin-2',
  role: 'agency_admin',
  agencyId: 'agency-1',
  facilityId: 'facility-1',
};

const mockResident = {
  id: 'resident-1',
  firstName: 'John',
  lastName: 'Doe',
  externalId: 'EXT-001',
  status: 'active',
  admittedAt: new Date().toISOString(),
  releasedAt: null,
  createdAt: new Date().toISOString(),
  facilityId: 'facility-1',
  agencyId: 'agency-1',
  housingUnitId: 'unit-1',
  pin: '$2a$10$hashedpinvalue',
  facility: { id: 'facility-1', name: 'Test Facility' },
  housingUnit: { id: 'unit-1', name: 'Unit A', unitType: { id: 'type-1', name: 'General' } },
};

describe('GET /api/admin/residents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Auth coverage (401) is verified in routes.test.ts via middleware wiring checks.

  it('returns a list of residents for facility admin', async () => {
    mockedPrisma.incarceratedPerson.findMany.mockResolvedValue([mockResident] as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).get('/api/admin/residents');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].firstName).toBe('John');
  });

  it('scopes query to facility for facility_admin', async () => {
    mockedPrisma.incarceratedPerson.findMany.mockResolvedValue([]);

    const app = buildApp(facilityAdmin);
    await request(app).get('/api/admin/residents');

    const call = mockedPrisma.incarceratedPerson.findMany.mock.calls[0][0];
    expect(call?.where).toMatchObject({ facilityId: 'facility-1' });
  });

  it('scopes query to agency for agency_admin', async () => {
    mockedPrisma.incarceratedPerson.findMany.mockResolvedValue([]);

    const app = buildApp(agencyAdmin);
    await request(app).get('/api/admin/residents');

    const call = mockedPrisma.incarceratedPerson.findMany.mock.calls[0][0];
    expect(call?.where).toMatchObject({ agencyId: 'agency-1' });
  });

  it('filters by status when query param provided', async () => {
    mockedPrisma.incarceratedPerson.findMany.mockResolvedValue([]);

    const app = buildApp(facilityAdmin);
    await request(app).get('/api/admin/residents?status=released');

    const call = mockedPrisma.incarceratedPerson.findMany.mock.calls[0][0];
    expect(call?.where).toMatchObject({ status: 'released' });
  });

  it('filters by search term across name and externalId', async () => {
    mockedPrisma.incarceratedPerson.findMany.mockResolvedValue([]);

    const app = buildApp(facilityAdmin);
    await request(app).get('/api/admin/residents?search=doe');

    const call = mockedPrisma.incarceratedPerson.findMany.mock.calls[0][0];
    expect(call?.where?.OR).toEqual([
      { firstName: { contains: 'doe', mode: 'insensitive' } },
      { lastName: { contains: 'doe', mode: 'insensitive' } },
      { externalId: { contains: 'doe', mode: 'insensitive' } },
    ]);
  });
});

describe('GET /api/admin/residents/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when resident does not exist', async () => {
    mockedPrisma.incarceratedPerson.findUnique.mockResolvedValue(null);

    const app = buildApp(facilityAdmin);
    const res = await request(app).get('/api/admin/residents/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 403 when facility admin accesses resident in another facility', async () => {
    mockedPrisma.incarceratedPerson.findUnique.mockResolvedValue({
      ...mockResident,
      facilityId: 'other-facility',
    } as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).get('/api/admin/residents/resident-1');
    expect(res.status).toBe(403);
  });

  it('returns resident details on success', async () => {
    mockedPrisma.incarceratedPerson.findUnique.mockResolvedValue(mockResident as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).get('/api/admin/residents/resident-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('John');
    expect(res.body.data.facility.name).toBe('Test Facility');
    expect(res.body.data.housingUnit.name).toBe('Unit A');
  });

  it('never exposes the PIN hash', async () => {
    mockedPrisma.incarceratedPerson.findUnique.mockResolvedValue(mockResident as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).get('/api/admin/residents/resident-1');

    expect(res.body.data.pin).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('hashedpinvalue');
  });

  it('allows agency admin to access any resident in their agency', async () => {
    mockedPrisma.incarceratedPerson.findUnique.mockResolvedValue({
      ...mockResident,
      facilityId: 'other-facility',
    } as any);

    const app = buildApp(agencyAdmin);
    const res = await request(app).get('/api/admin/residents/resident-1');
    expect(res.status).toBe(200);
  });
});
