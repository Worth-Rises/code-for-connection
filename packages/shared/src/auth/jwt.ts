import jwt from 'jsonwebtoken';
import type { AuthUser, JwtPayload, UserRole } from '../types/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hackathon-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function generateToken(user: AuthUser): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    role: user.role,
    agencyId: user.agencyId,
    facilityId: user.facilityId,
    housingUnitId: user.housingUnitId,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function isTokenExpired(payload: JwtPayload): boolean {
  return Date.now() >= payload.exp * 1000;
}

export function getUserRoleFromPayload(payload: JwtPayload): UserRole {
  return payload.role;
}
