/**
 * Auth Controller - Handles authentication operations
 * US-01: User Registration
 */

import { Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Prisma, Tier } from '@prisma/client';
import prisma from '../utils/prisma';
import { registerSchema, loginSchema, formatZodErrors, RegisterInput } from '../utils/validation';
import { detectLanguageFromHeader, SupportedLanguage } from '../middleware/languageDetection';
// SECURITY FIX: Import validated JWT secret (no insecure fallbacks)
import { JWT_SECRET, JWT_CONFIG } from '../utils/jwt';
import { render } from '@react-email/render';
import { PasswordResetEmail } from '../emails/PasswordResetEmail';
import { PasswordChangedEmail } from '../emails/PasswordChangedEmail';
import { sendWelcomeEmail, sendVerificationEmail } from '../services/email/lifecycle';
import { createRefreshToken, validateAndRotate, revokeToken, revokeUserTokens } from '../utils/refreshTokens';
import { checkTrialExpiry } from '../services/streakService';

/**
 * Generate access token
 */
function generateAccessToken(userId: string, email: string, tier: Tier): string {
  return jwt.sign(
    { sub: userId, email, tier },
    JWT_SECRET,
    { expiresIn: JWT_CONFIG.expiresIn } as jwt.SignOptions
  );
}

function handleAuthInfraError(error: unknown, res: Response): boolean {
  const isPrismaInfraError =
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientInitializationError;

  const message = error instanceof Error ? error.message : String(error);
  const looksLikeInfraFailure = /\b(connect|connection|database|prisma|timeout|pool|P1001|P1002|P1017)\b/i.test(message);

  if (isPrismaInfraError || looksLikeInfraFailure) {
    console.error('[Auth] Infrastructure error:', message);
    res.status(503).json({
      success: false,
      error: {
        code: 'AUTH_SERVICE_UNAVAILABLE',
        message: 'Authentication service temporarily unavailable',
      },
    });
    return true;
  }

  return false;
}

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
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration data',
          details: formatZodErrors(validationResult.error),
        },
      });
      return;
    }

    const { email, password, fullName, language: bodyLanguage, referralSlug } = validationResult.data as RegisterInput & { language?: string };

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
      });
      return;
    }

    // Detect language from Accept-Language header (US-26)
    // Priority: body language > Accept-Language header > default (bg)
    const acceptLanguage = req.headers['accept-language'];
    const detectedLanguage: SupportedLanguage = bodyLanguage || detectLanguageFromHeader(acceptLanguage);

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with detected language
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: fullName || null,
        tier: Tier.FREE,
        language: detectedLanguage, // US-26: Use detected language
        emailVerified: false,
        referredBySlug: referralSlug || null,
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

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.tier);
    const refreshToken = await createRefreshToken(user.id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Fire Day 0 welcome email — fire-and-forget, never block registration
    sendWelcomeEmail(user.id, user.email, user.fullName, detectedLanguage).catch((e) => {
      console.error('[Auth] Failed to send welcome email:', e);
    });

    // BUG-45: Send verification email — fire-and-forget
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationTokenExpiry },
    }).then(() => sendVerificationEmail(user.email, verificationToken, detectedLanguage))
      .catch((e: unknown) => console.error('[Auth] Failed to send verification email:', e));

    // Return success response
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          tier: user.tier,
          language: user.language,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString(),
        },
        tokens: {
          accessToken,
          expiresIn: JWT_CONFIG.expiresIn,
        },
        message: 'Registration successful. Please check your email for verification.',
      },
    });
  } catch (error) {
    if (handleAuthInfraError(error, res)) {
      return;
    }
    console.error('[Auth] Registration error:', error);
    next(error);
  }
}

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
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login data',
          details: formatZodErrors(validationResult.error),
        },
      });
      return;
    }

    const { email, password } = validationResult.data;
    const { deviceInfo } = req.body || {};
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // Find user
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        subscription: true,
      },
    });

    // Generic error message for both invalid email and password (security best practice)
    const invalidCredentialsError = {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    };

    if (!user) {
      // Log failed attempt for security monitoring
      console.log(`[Auth] Failed login attempt for email: ${email} from IP: ${clientIp}`);
      res.status(401).json(invalidCredentialsError);
      return;
    }

    // Verify password (defensive guard for legacy OAuth/incomplete records)
    if (!user.passwordHash) {
      console.log(`[Auth] Failed login attempt for user without password hash: ${user.id} from IP: ${clientIp}`);
      res.status(401).json(invalidCredentialsError);
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Log failed attempt for security monitoring
      console.log(`[Auth] Failed login attempt for user: ${user.id} from IP: ${clientIp}`);
      res.status(401).json(invalidCredentialsError);
      return;
    }

    // ENH-23: Revert any expired PRO trials before generating the access token
    await checkTrialExpiry(user.id).catch(() => {});
    const freshUserTier = await prisma.user.findUnique({ where: { id: user.id }, select: { tier: true } });
    if (freshUserTier) user.tier = freshUserTier.tier;

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.tier);
    const refreshToken = await createRefreshToken(user.id);

    // Set refresh token as httpOnly cookie (90-day rolling window)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Log successful login activity
    console.log(`[Auth] Successful login for user: ${user.id}`, {
      userId: user.id,
      email: user.email,
      ip: clientIp,
      userAgent,
      deviceInfo,
      timestamp: new Date().toISOString(),
    });

    // TODO: Store login activity in database for security monitoring
    // await prisma.loginActivity.create({
    //   data: {
    //     userId: user.id,
    //     ip: clientIp,
    //     userAgent,
    //     deviceInfo: deviceInfo || null,
    //     timestamp: new Date(),
    //   }
    // });

    // Return success response
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
        },
        tokens: {
          accessToken,
          expiresIn: JWT_CONFIG.expiresIn,
        },
      },
    });
  } catch (error) {
    if (handleAuthInfraError(error, res)) {
      return;
    }
    console.error('[Auth] Login error:', error);
    next(error);
  }
}

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 * 
 * SECURITY FIX: Read refresh token from httpOnly cookie
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = req.cookies?.refreshToken;

    if (!raw) {
      res.status(401).json({
        success: false,
        error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token is required' },
      });
      return;
    }

    // ── JWT compatibility shim (remove after 2026-04-20 — 7-day old cookie window) ──
    // Existing users have JWT strings in their cookie. Validate and issue a new opaque token.
    if (raw.startsWith('eyJ')) {
      try {
        const decoded = jwt.verify(raw, JWT_SECRET) as { sub: string; type: string };
        if (decoded.type !== 'refresh') throw new Error('not a refresh token');
        const user = await prisma.user.findUnique({
          where: { id: decoded.sub },
          select: { id: true, email: true, tier: true },
        });
        if (!user) throw new Error('user not found');
        const newToken = await createRefreshToken(user.id);
        const accessToken = generateAccessToken(user.id, user.email, user.tier);
        res.cookie('refreshToken', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 90 * 24 * 60 * 60 * 1000,
          path: '/',
        });
        res.json({ success: true, data: { accessToken, expiresIn: JWT_CONFIG.expiresIn } });
        return;
      } catch {
        res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
        res.status(401).json({ success: false, error: { code: 'SESSION_EXPIRED', message: 'Please log in again.' } });
        return;
      }
    }
    // ── End compatibility shim ──

    const result = await validateAndRotate(raw);
    if (!result) {
      res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Session expired. Please log in again.' },
      });
      return;
    }

    const { userId, email, tier, newToken } = result;
    const accessToken = generateAccessToken(userId, email, tier as Tier);
    res.cookie('refreshToken', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.json({ success: true, data: { accessToken, expiresIn: JWT_CONFIG.expiresIn } });
  } catch (error) {
    if (handleAuthInfraError(error, res)) return;
    console.error('[Auth] Refresh error:', error);
    next(error);
  }
}

/**
 * Logout user
 * POST /api/v1/auth/logout
 * 
 * SECURITY FIX: Clear refresh token cookie
 */
export async function logout(req: Request, res: Response): Promise<void> {
  // Revoke the opaque refresh token in DB (not applicable to JWT compat tokens)
  const raw = req.cookies?.refreshToken;
  if (raw && !raw.startsWith('eyJ')) {
    await revokeToken(raw).catch(() => {});
  }

  // Clear the refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
}

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
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, language = 'bg' } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email?.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      res.status(200).json({
        success: true,
        data: {
          message: 'If an account with that email exists, a password reset link has been sent.',
        },
      });
      return;
    }

    // Generate secure reset token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store token in Redis with 24-hour TTL
    const { storeResetToken } = await import('../utils/redis');
    await storeResetToken(resetToken, user.id);

    // Send reset email via Resend
    const resetUrl = `${process.env.FRONTEND_URL}/${language === 'bg' ? '' : 'en/'}reset-password?token=${resetToken}`;
    
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const emailSubject = language === 'bg' 
        ? 'Нулиране на паролата - AstroLogAI'
        : 'Password Reset - AstroLogAI';

      // Function-call form — no JSX needed in a .ts file
      const emailHtml = await render(PasswordResetEmail({ resetUrl, language }));

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@astrologaai.com',
        to: user.email,
        subject: emailSubject,
        html: emailHtml,
      });

      console.log(`[Auth] Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error('[Auth] Failed to send password reset email:', emailError);
      // Continue - don't reveal email sending errors to user
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
    });
  } catch (error) {
    console.error('[Auth] Forgot password error:', error);
    // Still return success to prevent email enumeration
    res.status(200).json({
      success: true,
      data: {
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
    });
  }
}

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
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword, confirmPassword, language = 'bg' } = req.body;

    // Validate token exists
    if (!token) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Reset token is required',
        },
      });
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Passwords do not match',
          details: [
            {
              field: 'confirmPassword',
              message: 'Passwords do not match',
            },
          ],
        },
      });
      return;
    }

    // Validate password strength (8+ chars, 1 uppercase, 1 number)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password does not meet requirements',
          details: [
            {
              field: 'newPassword',
              message: 'Password must be at least 8 characters with 1 uppercase letter and 1 number',
            },
          ],
        },
      });
      return;
    }

    // Validate reset token
    const { getResetToken, invalidateResetToken, invalidateUserSessions } = await import('../utils/redis');
    const userId = await getResetToken(token);

    if (!userId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
        },
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    // Invalidate reset token (single-use)
    await invalidateResetToken(token);

    // Invalidate all user sessions (Redis chat contexts + DB refresh tokens)
    await Promise.all([
      invalidateUserSessions(userId),
      revokeUserTokens(userId),
    ]);

    // Send confirmation email
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const emailSubject = language === 'bg'
        ? 'Паролата е променена успешно - AstroLogAI'
        : 'Password Changed Successfully - AstroLogAI';

      // Function-call form — no JSX needed in a .ts file
      const emailHtml = await render(PasswordChangedEmail({ language }));

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@astrologaai.com',
        to: user.email,
        subject: emailSubject,
        html: emailHtml,
      });

      console.log(`[Auth] Password change confirmation email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('[Auth] Failed to send confirmation email:', emailError);
      // Continue - password was still updated successfully
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Password updated successfully',
      },
    });
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    next(error);
  }
}

/**
 * Verify email address — BUG-45
 * GET /api/v1/auth/verify-email?token=...
 * Public — no auth required
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.query as { token: string };
  if (!token) {
    res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN' } });
    return;
  }
  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationTokenExpiry: { gt: new Date() },
      emailVerified: false,
    },
  });
  if (!user) {
    res.status(400).json({ success: false, error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Verification link is invalid or has expired.' } });
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null, verificationTokenExpiry: null },
  });
  res.json({ success: true, data: { message: 'Email verified successfully.' } });
}

/**
 * Resend verification email — BUG-45
 * POST /api/v1/auth/resend-verification
 * Auth required
 */
export async function resendVerification(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;
  if (!userId) { res.status(401).json({ success: false }); return; }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerified) {
    res.status(400).json({ success: false, error: { code: 'ALREADY_VERIFIED' } });
    return;
  }
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: { verificationToken, verificationTokenExpiry },
  });
  await sendVerificationEmail(user.email, verificationToken, user.language || 'en');
  res.json({ success: true, data: { message: 'Verification email sent.' } });
}

/**
 * Helper: Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
};
