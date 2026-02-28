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

import { Router } from 'express';
import { register, login, refresh, logout, forgotPassword, resetPassword } from '../controllers/authController';
import { googleLogin, appleLogin, oauthCallback, getOAuthUrl } from '../controllers/oauthController';
import { registrationLimiter, loginLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 * @rate    5 attempts per hour per IP
 */
router.post('/register', registrationLimiter, register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 * @rate    10 attempts per 15 minutes per IP
 */
router.post('/login', loginLimiter, login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', resetPassword);

// ============================================
// US-04: Social Login (Google + Apple)
// ============================================

/**
 * @route   GET /api/v1/auth/google
 * @desc    Initiate Google OAuth login (server-side redirect)
 * @access  Public
 */
router.get('/google', googleLogin);

/**
 * @route   GET /api/v1/auth/apple
 * @desc    Initiate Apple OAuth login (server-side redirect)
 * @access  Public
 */
router.get('/apple', appleLogin);

/**
 * @route   GET /api/v1/auth/oauth-url/:provider
 * @desc    Get OAuth URL for client-side redirect
 * @access  Public
 * @param   provider - 'google' or 'apple'
 */
router.get('/oauth-url/:provider', getOAuthUrl);

/**
 * @route   POST /api/v1/auth/callback
 * @desc    Handle OAuth callback from Supabase
 * @access  Public
 * @body    { code: string, provider: string }
 */
router.post('/callback', oauthCallback);

export default router;
