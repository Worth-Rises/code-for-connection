import type { Request, Response, NextFunction } from 'express';
import type { AuthUser, UserRole } from '../types/auth.js';
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requireRole(...roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function requireFacilityAccess(facilityIdParam?: string): (req: Request, res: Response, next: NextFunction) => void;
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=middleware.d.ts.map