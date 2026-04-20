import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@openconnect/shared', async () => {
  const actual = await vi.importActual('@openconnect/shared');
  return {
    ...actual,
    requireAuth: (_req: any, _res: any, next: any) => next(),
    prisma: {
      approvedContact: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
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

function buildApp(user?: Record<string, any>) {
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
  firstName: 'Jane',
  lastName: 'Admin',
  email: 'jane@facility.com',
  agencyId: 'agency-1',
  facilityId: 'facility-1',
};

const agencyAdmin = {
  id: 'admin-2',
  role: 'agency_admin',
  firstName: 'Bob',
  lastName: 'Agency',
  email: 'bob@agency.com',
  agencyId: 'agency-1',
  facilityId: 'facility-1',
};

const incarceratedUser = {
  id: 'inmate-1',
  role: 'incarcerated',
  firstName: 'Joe',
  lastName: 'Resident',
  agencyId: 'agency-1',
  facilityId: 'facility-1',
};

const mockContact = {
  id: 'contact-1',
  incarceratedPersonId: 'resident-1',
  familyMemberId: 'family-1',
  relationship: 'parent',
  isAttorney: false,
  status: 'pending',
  requestedAt: new Date().toISOString(),
  reviewedAt: null,
  reviewedBy: null,
  incarceratedPerson: {
    id: 'resident-1',
    firstName: 'John',
    lastName: 'Doe',
    externalId: 'EXT-001',
    facilityId: 'facility-1',
    facility: { id: 'facility-1', name: 'Test Facility' },
  },
  familyMember: {
    id: 'family-1',
    firstName: 'Mary',
    lastName: 'Doe',
    phone: '555-1234',
    email: 'mary@example.com',
  },
};

// --- GET /api/admin/contact-requests ---

describe('GET /api/admin/contact-requests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for incarcerated user', async () => {
    const app = buildApp(incarceratedUser);
    const res = await request(app).get('/api/admin/contact-requests');
    expect(res.status).toBe(403);
  });

  it('defaults to pending status when no filter provided', async () => {
    mockedPrisma.approvedContact.findMany.mockResolvedValue([]);

    const app = buildApp(facilityAdmin);
    await request(app).get('/api/admin/contact-requests');

    const call = mockedPrisma.approvedContact.findMany.mock.calls[0][0];
    expect(call?.where).toMatchObject({ status: 'pending' });
  });

  it('filters by status query param', async () => {
    mockedPrisma.approvedContact.findMany.mockResolvedValue([]);

    const app = buildApp(facilityAdmin);
    await request(app).get('/api/admin/contact-requests?status=approved');

    const call = mockedPrisma.approvedContact.findMany.mock.calls[0][0];
    expect(call?.where).toMatchObject({ status: 'approved' });
  });

  it('scopes to facility for facility_admin', async () => {
    mockedPrisma.approvedContact.findMany.mockResolvedValue([]);

    const app = buildApp(facilityAdmin);
    await request(app).get('/api/admin/contact-requests');

    const call = mockedPrisma.approvedContact.findMany.mock.calls[0][0];
    expect(call?.where?.incarceratedPerson).toMatchObject({ facilityId: 'facility-1' });
  });

  it('scopes to agency for agency_admin', async () => {
    mockedPrisma.approvedContact.findMany.mockResolvedValue([]);

    const app = buildApp(agencyAdmin);
    await request(app).get('/api/admin/contact-requests');

    const call = mockedPrisma.approvedContact.findMany.mock.calls[0][0];
    expect(call?.where?.incarceratedPerson).toMatchObject({ agencyId: 'agency-1' });
  });

  it('returns contact requests with resident and family member details', async () => {
    mockedPrisma.approvedContact.findMany.mockResolvedValue([mockContact] as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).get('/api/admin/contact-requests');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].familyMember.firstName).toBe('Mary');
    expect(res.body.data[0].incarceratedPerson.firstName).toBe('John');
  });
});

// --- POST /api/admin/contact-requests/:id/approve ---

describe('POST /api/admin/contact-requests/:id/approve', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for incarcerated user', async () => {
    const app = buildApp(incarceratedUser);
    const res = await request(app).post('/api/admin/contact-requests/contact-1/approve');
    expect(res.status).toBe(403);
  });

  it('returns 404 when contact does not exist', async () => {
    mockedPrisma.approvedContact.findUnique.mockResolvedValue(null);

    const app = buildApp(facilityAdmin);
    const res = await request(app).post('/api/admin/contact-requests/nonexistent/approve');
    expect(res.status).toBe(404);
  });

  it('returns 403 when facility admin tries to approve contact in another facility', async () => {
    mockedPrisma.approvedContact.findUnique.mockResolvedValue({
      ...mockContact,
      incarceratedPerson: { ...mockContact.incarceratedPerson, facilityId: 'other-facility' },
    } as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).post('/api/admin/contact-requests/contact-1/approve');
    expect(res.status).toBe(403);
  });

  it('returns 400 when contact is not pending', async () => {
    mockedPrisma.approvedContact.findUnique.mockResolvedValue({
      ...mockContact,
      status: 'approved',
    } as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).post('/api/admin/contact-requests/contact-1/approve');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('already approved');
  });

  it('approves a pending contact and sets reviewer', async () => {
    mockedPrisma.approvedContact.findUnique.mockResolvedValue(mockContact as any);
    mockedPrisma.approvedContact.update.mockResolvedValue({
      ...mockContact,
      status: 'approved',
      reviewedAt: new Date(),
      reviewedBy: 'admin-1',
    } as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).post('/api/admin/contact-requests/contact-1/approve');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updateCall = mockedPrisma.approvedContact.update.mock.calls[0][0];
    expect(updateCall.data).toMatchObject({
      status: 'approved',
      reviewedBy: 'admin-1',
    });
    expect((updateCall.data as any).reviewedAt).toBeInstanceOf(Date);
  });

  it('allows agency admin to approve contact in any facility', async () => {
    mockedPrisma.approvedContact.findUnique.mockResolvedValue({
      ...mockContact,
      incarceratedPerson: { ...mockContact.incarceratedPerson, facilityId: 'other-facility' },
    } as any);
    mockedPrisma.approvedContact.update.mockResolvedValue({ ...mockContact, status: 'approved' } as any);

    const app = buildApp(agencyAdmin);
    const res = await request(app).post('/api/admin/contact-requests/contact-1/approve');
    expect(res.status).toBe(200);
  });
});

// --- POST /api/admin/contact-requests/:id/deny ---

describe('POST /api/admin/contact-requests/:id/deny', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for incarcerated user', async () => {
    const app = buildApp(incarceratedUser);
    const res = await request(app)
      .post('/api/admin/contact-requests/contact-1/deny')
      .send({ reason: 'test' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when reason is missing', async () => {
    const app = buildApp(facilityAdmin);
    const res = await request(app)
      .post('/api/admin/contact-requests/contact-1/deny')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Reason is required');
  });

  it('returns 400 when reason is empty string', async () => {
    const app = buildApp(facilityAdmin);
    const res = await request(app)
      .post('/api/admin/contact-requests/contact-1/deny')
      .send({ reason: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when contact does not exist', async () => {
    mockedPrisma.approvedContact.findUnique.mockResolvedValue(null);

    const app = buildApp(facilityAdmin);
    const res = await request(app)
      .post('/api/admin/contact-requests/nonexistent/deny')
      .send({ reason: 'Not eligible' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when facility admin tries to deny contact in another facility', async () => {
    mockedPrisma.approvedContact.findUnique.mockResolvedValue({
      ...mockContact,
      incarceratedPerson: { ...mockContact.incarceratedPerson, facilityId: 'other-facility' },
    } as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app)
      .post('/api/admin/contact-requests/contact-1/deny')
      .send({ reason: 'Not eligible' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when contact is not pending', async () => {
    mockedPrisma.approvedContact.findUnique.mockResolvedValue({
      ...mockContact,
      status: 'denied',
    } as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app)
      .post('/api/admin/contact-requests/contact-1/deny')
      .send({ reason: 'Not eligible' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('already denied');
  });

  it('denies a pending contact and sets reviewer', async () => {
    mockedPrisma.approvedContact.findUnique.mockResolvedValue(mockContact as any);
    mockedPrisma.approvedContact.update.mockResolvedValue({
      ...mockContact,
      status: 'denied',
      reviewedAt: new Date(),
      reviewedBy: 'admin-1',
    } as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app)
      .post('/api/admin/contact-requests/contact-1/deny')
      .send({ reason: 'Failed background check' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updateCall = mockedPrisma.approvedContact.update.mock.calls[0][0];
    expect(updateCall.data).toMatchObject({
      status: 'denied',
      reviewedBy: 'admin-1',
    });
    expect((updateCall.data as any).reviewedAt).toBeInstanceOf(Date);
  });
});
