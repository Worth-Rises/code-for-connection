import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock prisma before importing routes
vi.mock('@openconnect/shared', async () => {
  const actual = await vi.importActual('@openconnect/shared');
  return {
    ...actual,
    prisma: {
      incarceratedPerson: {
        findUnique: vi.fn(),
        update: vi.fn(),
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

  // Inject a fake user to simulate auth
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

const mockResident = {
  id: 'resident-1',
  facilityId: 'facility-1',
  agencyId: 'agency-1',
  pin: '$2a$10$hashedpinvalue',
  status: 'active',
  firstName: 'John',
  lastName: 'Doe',
};

describe('POST /api/admin/residents/:id/reset-pin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without authentication', async () => {
    const app = buildApp(); // no user
    const res = await request(app).post('/api/admin/residents/resident-1/reset-pin');
    expect(res.status).toBe(401);
  });

  it('returns 404 when resident does not exist', async () => {
    mockedPrisma.incarceratedPerson.findUnique.mockResolvedValue(null);

    const app = buildApp(facilityAdmin);
    const res = await request(app).post('/api/admin/residents/nonexistent/reset-pin');
    expect(res.status).toBe(404);
  });

  it('returns 403 when facility admin tries to reset PIN for resident in another facility', async () => {
    mockedPrisma.incarceratedPerson.findUnique.mockResolvedValue({
      ...mockResident,
      facilityId: 'other-facility',
    } as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).post('/api/admin/residents/resident-1/reset-pin');
    expect(res.status).toBe(403);
  });

  it('returns a new 4-digit PIN on success', async () => {
    mockedPrisma.incarceratedPerson.findUnique.mockResolvedValue(mockResident as any);
    mockedPrisma.incarceratedPerson.update.mockResolvedValue(mockResident as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).post('/api/admin/residents/resident-1/reset-pin');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.newPin).toMatch(/^\d{4}$/);
  });

  it('stores a hashed PIN, not the plaintext', async () => {
    mockedPrisma.incarceratedPerson.findUnique.mockResolvedValue(mockResident as any);
    mockedPrisma.incarceratedPerson.update.mockResolvedValue(mockResident as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).post('/api/admin/residents/resident-1/reset-pin');

    const updateCall = mockedPrisma.incarceratedPerson.update.mock.calls[0][0];
    const storedPin = (updateCall.data as any).pin;

    // The stored value should be a bcrypt hash, not the 4-digit plaintext
    expect(storedPin).not.toMatch(/^\d{4}$/);
    expect(storedPin).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix

    // The returned PIN should be different from the stored hash
    expect(res.body.data.newPin).not.toBe(storedPin);
  });

  it('does not include the PIN value in any field other than newPin', async () => {
    mockedPrisma.incarceratedPerson.findUnique.mockResolvedValue(mockResident as any);
    mockedPrisma.incarceratedPerson.update.mockResolvedValue(mockResident as any);

    const app = buildApp(facilityAdmin);
    const res = await request(app).post('/api/admin/residents/resident-1/reset-pin');

    const newPin = res.body.data.newPin;
    const bodyWithoutPin = JSON.stringify({ ...res.body.data, newPin: undefined });

    // The plaintext PIN should not appear anywhere else in the response
    expect(bodyWithoutPin).not.toContain(newPin);
  });
});
