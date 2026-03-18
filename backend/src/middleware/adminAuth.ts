/**
 * Admin Authorization Middleware
 * SECURITY: Requires authenticated user with admin role
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

if (!process.env.ADMIN_EMAILS) {
  console.warn('[STARTUP] WARNING: ADMIN_EMAILS is not set — admin panel will be inaccessible to all users');
}

/**
 * Check if user has admin privileges
 * SECURITY FIX: Protects admin-only endpoints
 * 
 * Note: For now, we check if user tier is 'PRO' or if they have a custom admin flag
 * In production, you should have a proper role-based access control (RBAC) system
 */
export async function adminAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // For now, check if user has admin email or is in admin list
    // In production, implement proper RBAC with admin role in database
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const isAdmin = adminEmails.includes(req.user.email);

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[Admin Auth] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authorization check failed',
      },
    });
  }
}

export default adminAuthMiddleware;
