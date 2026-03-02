import type { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from './jwt.js';
import type { AuthUser, UserRole, JwtPayload } from '../types/auth.js';
import { prisma } from '../db/index.js';
import { UnauthorizedError, ForbiddenError, createErrorResponse } from '../utils/errors.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

async function getUserFromPayload(payload: JwtPayload): Promise<AuthUser | null> {
  const { sub: id, role, agencyId, facilityId, housingUnitId } = payload;

  let firstName = '';
  let lastName = '';
  let email: string | undefined;

  if (role === 'incarcerated') {
    const person = await prisma.incarceratedPerson.findUnique({
      where: { id },
      select: { firstName: true, lastName: true },
    });
    if (!person) return null;
    firstName = person.firstName;
    lastName = person.lastName;
  } else if (role === 'family') {
    const member = await prisma.familyMember.findUnique({
      where: { id },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!member) return null;
    firstName = member.firstName;
    lastName = member.lastName;
    email = member.email;
  } else {
    const admin = await prisma.adminUser.findUnique({
      where: { id },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!admin) return null;
    firstName = admin.firstName;
    lastName = admin.lastName;
    email = admin.email;
  }

  return {
    id,
    role,
    email,
    firstName,
    lastName,
    agencyId,
    facilityId,
    housingUnitId,
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json(createErrorResponse({
        code: 'UNAUTHORIZED',
        message: 'No token provided',
      }));
      return;
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      res.status(401).json(createErrorResponse({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      }));
      return;
    }

    const user = await getUserFromPayload(payload);
    
    if (!user) {
      res.status(401).json(createErrorResponse({
        code: 'UNAUTHORIZED',
        message: 'User not found',
      }));
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json(createErrorResponse({
      code: 'UNAUTHORIZED',
      message: 'Authentication failed',
    }));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(createErrorResponse({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      }));
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json(createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      }));
      return;
    }

    next();
  };
}

export function requireFacilityAccess(facilityIdParam: string = 'facilityId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(createErrorResponse({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      }));
      return;
    }

    const facilityId = req.params[facilityIdParam] || req.query[facilityIdParam] as string;
    
    if (req.user.role === 'agency_admin') {
      next();
      return;
    }

    if (req.user.role === 'facility_admin' && req.user.facilityId === facilityId) {
      next();
      return;
    }

    if (req.user.role === 'incarcerated' && req.user.facilityId === facilityId) {
      next();
      return;
    }

    res.status(403).json(createErrorResponse({
      code: 'FORBIDDEN',
      message: 'No access to this facility',
    }));
  };
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    next();
    return;
  }

  const payload = verifyToken(token);
  
  if (payload) {
    getUserFromPayload(payload).then(user => {
      if (user) {
        req.user = user;
      }
      next();
    }).catch(() => next());
  } else {
    next();
  }
}
