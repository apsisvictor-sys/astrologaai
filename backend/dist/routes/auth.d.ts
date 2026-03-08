/**
 * Auth Routes
 * Handles authentication endpoints
 *
 * US-01: User Registration
 * POST /api/v1/auth/register - Register a new user
 *
 * US-02: User Login
 * POST /api/v1/auth/login - Login user
 *
 * US-03: Password Reset
 * POST /api/v1/auth/forgot-password - Request password reset
 * POST /api/v1/auth/reset-password - Reset password with token
 *
 * US-04: Social Login (Google + Apple)
 * GET /api/v1/auth/google - Initiate Google OAuth login
 * GET /api/v1/auth/apple - Initiate Apple OAuth login
 * GET /api/v1/auth/oauth-url/:provider - Get OAuth URL for client-side redirect
 * POST /api/v1/auth/callback - Handle OAuth callback
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=auth.d.ts.map