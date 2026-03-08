/**
 * Auth Controller - Handles authentication operations
 * US-01: User Registration
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Register a new user
 * POST /api/v1/auth/register
 *
 * Acceptance Criteria:
 * - User can register with email, password, and optional name
 * - Email validation ensures proper format
 * - Password must meet security requirements (8+ chars, 1 uppercase, 1 number)
 * - Duplicate email addresses are rejected with clear error message
 * - Confirmation email is sent for email verification
 * - User is automatically assigned Free tier upon registration
 * - Account creation triggers default preferences (Bulgarian language, basic notifications)
 */
export declare function register(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Login user
 * POST /api/v1/auth/login
 *
 * US-02: User Login
 * Acceptance Criteria:
 * - User can log in with email and password
 * - Invalid credentials show generic error message (no email/password hints)
 * - Successful login returns JWT token with 7-day expiration
 * - Token is stored securely (httpOnly cookie recommended)
 * - User session persists across browser refresh
 * - Login activity is logged for security monitoring
 */
export declare function login(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 *
 * SECURITY FIX: Read refresh token from httpOnly cookie
 */
export declare function refresh(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Logout user
 * POST /api/v1/auth/logout
 *
 * SECURITY FIX: Clear refresh token cookie
 */
export declare function logout(req: Request, res: Response): Promise<void>;
/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 *
 * US-03: Password Reset
 * Acceptance Criteria:
 * - User can request password reset via email
 * - Reset link expires after 24 hours
 * - Reset link is single-use (invalidated after use)
 */
export declare function forgotPassword(req: Request, res: Response): Promise<void>;
/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 *
 * US-03: Password Reset
 * Acceptance Criteria:
 * - Validate reset token
 * - Check token not expired
 * - Validate new password (8+ chars, 1 uppercase, 1 number)
 * - Confirm passwords match
 * - Update password in database
 * - Invalidate token (single-use)
 * - Invalidate all user sessions
 * - Send confirmation email
 */
export declare function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void>;
declare const _default: {
    register: typeof register;
    login: typeof login;
    refresh: typeof refresh;
    logout: typeof logout;
    forgotPassword: typeof forgotPassword;
};
export default _default;
//# sourceMappingURL=authController.d.ts.map