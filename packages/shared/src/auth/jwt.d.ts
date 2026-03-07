import type { AuthUser, JwtPayload, UserRole } from '../types/auth.js';
export declare function generateToken(user: AuthUser): string;
export declare function verifyToken(token: string): JwtPayload | null;
export declare function decodeToken(token: string): JwtPayload | null;
export declare function extractTokenFromHeader(authHeader?: string): string | null;
export declare function isTokenExpired(payload: JwtPayload): boolean;
export declare function getUserRoleFromPayload(payload: JwtPayload): UserRole;
//# sourceMappingURL=jwt.d.ts.map