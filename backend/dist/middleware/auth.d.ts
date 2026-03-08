/**
 * Auth Middleware
 * JWT token verification for protected routes
 */
import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        tier: string;
        language?: string;
    };
}
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                tier: string;
                language?: string;
            };
        }
    }
}
/**
 * Verify JWT token middleware
 */
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Optional auth middleware - doesn't fail if no token
 */
export declare function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export default authMiddleware;
//# sourceMappingURL=auth.d.ts.map