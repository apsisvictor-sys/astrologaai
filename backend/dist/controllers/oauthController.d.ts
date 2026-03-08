/**
 * OAuth Controller
 * US-04: Social Login (Google + Apple)
 *
 * Handles OAuth authentication via Supabase Auth
 *
 * Acceptance Criteria:
 * - Google OAuth login works via Supabase
 * - Apple OAuth login works via Supabase
 * - Social login buttons displayed on login page
 * - New users are created in database with OAuth provider info
 * - Returning OAuth users can log in
 * - OAuth tokens properly handled by Supabase
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Initiate Google OAuth login
 * GET /api/v1/auth/google
 *
 * Redirects user to Google OAuth consent screen
 */
export declare function googleLogin(req: Request, res: Response): Promise<void>;
/**
 * Initiate Apple OAuth login
 * GET /api/v1/auth/apple
 *
 * Redirects user to Apple Sign In
 */
export declare function appleLogin(req: Request, res: Response): Promise<void>;
/**
 * Handle OAuth callback
 * POST /api/v1/auth/callback
 *
 * Exchanges OAuth code for session and creates/links user in database
 */
export declare function oauthCallback(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Get OAuth login URL (for client-side redirect)
 * GET /api/v1/auth/oauth-url/:provider
 *
 * Returns the OAuth URL for the specified provider
 */
export declare function getOAuthUrl(req: Request, res: Response): Promise<void>;
declare const _default: {
    googleLogin: typeof googleLogin;
    appleLogin: typeof appleLogin;
    oauthCallback: typeof oauthCallback;
    getOAuthUrl: typeof getOAuthUrl;
};
export default _default;
//# sourceMappingURL=oauthController.d.ts.map