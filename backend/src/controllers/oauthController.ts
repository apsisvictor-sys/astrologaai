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
import { createClient } from '@supabase/supabase-js';
import { Tier } from '@prisma/client';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// SECURITY FIX: Import validated JWT secret (no insecure fallbacks)
import { JWT_SECRET, JWT_CONFIG } from '../utils/jwt';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Generate access token
 */
function generateAccessToken(userId: string, email: string, tier: Tier): string {
  return jwt.sign(
    { sub: userId, email, tier },
    JWT_SECRET,
    { expiresIn: JWT_CONFIG.expiresIn }
  );
}

/**
 * Generate refresh token
 */
function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_CONFIG.refreshExpiresIn }
  );
}

/**
 * Initiate Google OAuth login
 * GET /api/v1/auth/google
 * 
 * Redirects user to Google OAuth consent screen
 */
export async function googleLogin(req: Request, res: Response): Promise<void> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).json({
        success: false,
        error: {
          code: 'OAUTH_NOT_CONFIGURED',
          message: 'OAuth is not configured on the server',
        },
      });
      return;
    }

    // Create Supabase client for OAuth
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${FRONTEND_URL}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[OAuth] Google login error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: error.message,
        },
      });
      return;
    }

    // Redirect to OAuth provider
    res.redirect(data.url);
  } catch (error) {
    console.error('[OAuth] Google login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to initiate Google login',
      },
    });
  }
}

/**
 * Initiate Apple OAuth login
 * GET /api/v1/auth/apple
 * 
 * Redirects user to Apple Sign In
 */
export async function appleLogin(req: Request, res: Response): Promise<void> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).json({
        success: false,
        error: {
          code: 'OAUTH_NOT_CONFIGURED',
          message: 'OAuth is not configured on the server',
        },
      });
      return;
    }

    // Create Supabase client for OAuth
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${FRONTEND_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error('[OAuth] Apple login error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: error.message,
        },
      });
      return;
    }

    // Redirect to OAuth provider
    res.redirect(data.url);
  } catch (error) {
    console.error('[OAuth] Apple login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to initiate Apple login',
      },
    });
  }
}

/**
 * Handle OAuth callback
 * POST /api/v1/auth/callback
 * 
 * Exchanges OAuth code for session and creates/links user in database
 */
export async function oauthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, provider } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CODE',
          message: 'Authorization code is required',
        },
      });
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).json({
        success: false,
        error: {
          code: 'OAUTH_NOT_CONFIGURED',
          message: 'OAuth is not configured on the server',
        },
      });
      return;
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Exchange code for session
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData.session) {
      console.error('[OAuth] Code exchange error:', sessionError);
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CODE',
          message: 'Failed to exchange authorization code',
        },
      });
      return;
    }

    const { user: supabaseUser, session } = sessionData;

    if (!supabaseUser.email) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_EMAIL',
          message: 'Email is required from OAuth provider',
        },
      });
      return;
    }

    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { email: supabaseUser.email },
      include: {
        profile: true,
        subscription: true,
      },
    });

    // If user doesn't exist, create one
    if (!user) {
      // Generate a random password for OAuth users (they won't use it)
      const randomPassword = bcrypt.genSaltSync(32);
      const passwordHash = await bcrypt.hash(randomPassword, 12);

      user = await prisma.user.create({
        data: {
          email: supabaseUser.email,
          passwordHash,
          fullName: supabaseUser.user_metadata?.full_name || 
                    supabaseUser.user_metadata?.name || 
                    null,
          tier: Tier.FREE,
          language: 'bg',
          emailVerified: !!supabaseUser.email_confirmed_at,
          oauthProvider: provider || supabaseUser.app_metadata?.provider || 'unknown',
          oauthId: supabaseUser.id,
          avatarUrl: supabaseUser.user_metadata?.avatar_url || 
                     supabaseUser.user_metadata?.picture || 
                     null,
          // Create profile with default preferences
          profile: {
            create: {
              onboardingComplete: false,
              notificationPrefs: {
                daily: true,
                weekly: true,
                promotions: false,
              },
            },
          },
          // Create subscription record
          subscription: {
            create: {
              tier: Tier.FREE,
              status: 'ACTIVE',
            },
          },
          // Create usage record for current month
          usageRecords: {
            create: {
              month: getCurrentMonth(),
              queryCount: 0,
            },
          },
        },
        include: {
          profile: true,
          subscription: true,
        },
      });

      console.log(`[OAuth] Created new user via ${provider}: ${user.email}`);
    } else {
      // Update OAuth info if not already set
      if (!user.oauthProvider) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            oauthProvider: provider || supabaseUser.app_metadata?.provider || 'unknown',
            oauthId: supabaseUser.id,
            emailVerified: !!supabaseUser.email_confirmed_at,
            avatarUrl: supabaseUser.user_metadata?.avatar_url || 
                       supabaseUser.user_metadata?.picture || 
                       user.avatarUrl,
          },
        });
      }
    }

    // Generate our JWT tokens
    const accessToken = generateAccessToken(user.id, user.email, user.tier);
    const refreshToken = generateRefreshToken(user.id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    console.log(`[OAuth] Successful login for user: ${user.id} via ${provider}`);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          tier: user.tier,
          language: user.language,
          emailVerified: user.emailVerified,
          avatarUrl: user.avatarUrl,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: JWT_CONFIG.expiresIn,
        },
        message: 'Login successful',
      },
    });
  } catch (error) {
    console.error('[OAuth] Callback error:', error);
    next(error);
  }
}

/**
 * Get OAuth login URL (for client-side redirect)
 * GET /api/v1/auth/oauth-url/:provider
 * 
 * Returns the OAuth URL for the specified provider
 */
export async function getOAuthUrl(req: Request, res: Response): Promise<void> {
  try {
    const { provider } = req.params;

    if (!['google', 'apple'].includes(provider)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: 'Provider must be "google" or "apple"',
        },
      });
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).json({
        success: false,
        error: {
          code: 'OAUTH_NOT_CONFIGURED',
          message: 'OAuth is not configured on the server',
        },
      });
      return;
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'google' | 'apple',
      options: {
        redirectTo: `${FRONTEND_URL}/auth/callback`,
        queryParams: provider === 'google' 
          ? { access_type: 'offline', prompt: 'consent' }
          : undefined,
      },
    });

    if (error) {
      console.error(`[OAuth] ${provider} URL error:`, error);
      res.status(400).json({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: error.message,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        url: data.url,
        provider,
      },
    });
  } catch (error) {
    console.error('[OAuth] Get URL error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get OAuth URL',
      },
    });
  }
}

/**
 * Helper: Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default {
  googleLogin,
  appleLogin,
  oauthCallback,
  getOAuthUrl,
};
