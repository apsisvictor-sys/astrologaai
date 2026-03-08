"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const oauthController_1 = require("../controllers/oauthController");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 * @rate    5 attempts per hour per IP
 */
router.post('/register', rateLimiter_1.registrationLimiter, authController_1.register);
/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 * @rate    10 attempts per 15 minutes per IP
 */
router.post('/login', rateLimiter_1.loginLimiter, authController_1.login);
/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', authController_1.refresh);
/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', authController_1.logout);
/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password', authController_1.forgotPassword);
/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authController_1.resetPassword);
// ============================================
// US-04: Social Login (Google + Apple)
// ============================================
/**
 * @route   GET /api/v1/auth/google
 * @desc    Initiate Google OAuth login (server-side redirect)
 * @access  Public
 */
router.get('/google', oauthController_1.googleLogin);
/**
 * @route   GET /api/v1/auth/apple
 * @desc    Initiate Apple OAuth login (server-side redirect)
 * @access  Public
 */
router.get('/apple', oauthController_1.appleLogin);
/**
 * @route   GET /api/v1/auth/oauth-url/:provider
 * @desc    Get OAuth URL for client-side redirect
 * @access  Public
 * @param   provider - 'google' or 'apple'
 */
router.get('/oauth-url/:provider', oauthController_1.getOAuthUrl);
/**
 * @route   POST /api/v1/auth/callback
 * @desc    Handle OAuth callback from Supabase
 * @access  Public
 * @body    { code: string, provider: string }
 */
router.post('/callback', oauthController_1.oauthCallback);
exports.default = router;
//# sourceMappingURL=auth.js.map