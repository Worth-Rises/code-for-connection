export type UserRole = 'incarcerated' | 'family' | 'facility_admin' | 'agency_admin';

export interface AuthUser {
  id: string;
  role: UserRole;
  email?: string;
  firstName: string;
  lastName: string;
  agencyId?: string;
  facilityId?: string;
  housingUnitId?: string;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  agencyId?: string;
  facilityId?: string;
  housingUnitId?: string;
  iat: number;
  exp: number;
}

export interface PinLoginRequest {
  pin: string;
  facilityId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: AuthUser;
  error?: string;
}
