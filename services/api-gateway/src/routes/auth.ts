import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  prisma,
  generateToken,
  requireAuth,
  createSuccessResponse,
  createErrorResponse,
} from '@openconnect/shared';
import type { AuthUser, AuthResponse } from '@openconnect/shared';

export const authRouter = Router();

authRouter.post('/pin-login', async (req: Request, res: Response) => {
  try {
    const { pin, facilityId } = req.body;

    if (!pin || !facilityId) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'PIN and facility ID are required',
      }));
      return;
    }

    const incarceratedPersons = await prisma.incarceratedPerson.findMany({
      where: {
        facilityId,
        status: 'active',
      },
    });

    let matchedPerson = null;
    for (const person of incarceratedPersons) {
      const isMatch = await bcrypt.compare(pin, person.pin);
      if (isMatch) {
        matchedPerson = person;
        break;
      }
    }

    if (!matchedPerson) {
      res.status(401).json(createErrorResponse({
        code: 'INVALID_PIN',
        message: 'Invalid PIN',
      }));
      return;
    }

    const user: AuthUser = {
      id: matchedPerson.id,
      role: 'incarcerated',
      firstName: matchedPerson.firstName,
      lastName: matchedPerson.lastName,
      agencyId: matchedPerson.agencyId,
      facilityId: matchedPerson.facilityId,
      housingUnitId: matchedPerson.housingUnitId,
    };

    const token = generateToken(user);

    const response: AuthResponse = { token, user };
    res.json(createSuccessResponse(response));
  } catch (error) {
    console.error('PIN login error:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Login failed',
    }));
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      }));
      return;
    }

    const familyMember = await prisma.familyMember.findUnique({
      where: { email },
    });

    if (familyMember) {
      const isValidPassword = await bcrypt.compare(password, familyMember.passwordHash);
      if (!isValidPassword) {
        res.status(401).json(createErrorResponse({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }));
        return;
      }

      if (familyMember.isBlockedAgencyWide) {
        res.status(403).json(createErrorResponse({
          code: 'ACCOUNT_BLOCKED',
          message: 'Your account has been blocked',
        }));
        return;
      }

      const user: AuthUser = {
        id: familyMember.id,
        role: 'family',
        email: familyMember.email,
        firstName: familyMember.firstName,
        lastName: familyMember.lastName,
      };

      const token = generateToken(user);
      const response: AuthResponse = { token, user };
      res.json(createSuccessResponse(response));
      return;
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (adminUser) {
      const isValidPassword = await bcrypt.compare(password, adminUser.passwordHash);
      if (!isValidPassword) {
        res.status(401).json(createErrorResponse({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }));
        return;
      }

      const user: AuthUser = {
        id: adminUser.id,
        role: adminUser.role === 'agency_admin' ? 'agency_admin' : 'facility_admin',
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        agencyId: adminUser.agencyId,
        facilityId: adminUser.facilityId ?? undefined,
      };

      const token = generateToken(user);
      const response: AuthResponse = { token, user };
      res.json(createSuccessResponse(response));
      return;
    }

    res.status(401).json(createErrorResponse({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    }));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Login failed',
    }));
  }
});

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName || !phone) {
      res.status(400).json(createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'All fields are required',
      }));
      return;
    }

    const existingUser = await prisma.familyMember.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json(createErrorResponse({
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists',
      }));
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const familyMember = await prisma.familyMember.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
      },
    });

    const user: AuthUser = {
      id: familyMember.id,
      role: 'family',
      email: familyMember.email,
      firstName: familyMember.firstName,
      lastName: familyMember.lastName,
    };

    const token = generateToken(user);
    const response: AuthResponse = { token, user };
    res.status(201).json(createSuccessResponse(response));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Registration failed',
    }));
  }
});

authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json(createSuccessResponse(req.user));
});

authRouter.post('/logout', requireAuth, (_req: Request, res: Response) => {
  res.json(createSuccessResponse({ message: 'Logged out successfully' }));
});
