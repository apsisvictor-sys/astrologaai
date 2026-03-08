/**
 * Admin Authorization Middleware
 * SECURITY: Requires authenticated user with admin role
 */
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
/**
 * Check if user has admin privileges
 * SECURITY FIX: Protects admin-only endpoints
 *
 * Note: For now, we check if user tier is 'PRO' or if they have a custom admin flag
 * In production, you should have a proper role-based access control (RBAC) system
 */
export declare function adminAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
export default adminAuthMiddleware;
//# sourceMappingURL=adminAuth.d.ts.map