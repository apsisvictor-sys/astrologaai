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

/**
 * Generate refresh token
 */
function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_CONFIG.refreshExpiresIn } as jwt.SignOptions
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

    const { email, password, fullName, language: bodyLanguage, referralSlug } = validationResult.data as RegisterInput & { language?: string; referralSlug?: string };

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
    const refreshToken = generateRefreshToken(user.id);

    // TODO: Send confirmation email via Resend
    // For now, we'll simulate this with a log message
    console.log(`[Auth] Confirmation email should be sent to: ${email}`);

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
          refreshToken,
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

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.tier);
    const refreshToken = generateRefreshToken(user.id);

    // Set refresh token as httpOnly cookie (7-day expiration)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
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
          refreshToken,
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
    // SECURITY FIX: Read refresh token from cookie first, fallback to body for backward compatibility
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required',
        },
      });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { sub: string; type: string };

    if (decoded.type !== 'refresh') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token',
        },
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.id, user.email, user.tier);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        expiresIn: JWT_CONFIG.expiresIn,
      },
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token has expired. Please login again.',
        },
      });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token',
        },
      });
      return;
    }
    if (handleAuthInfraError(error, res)) {
      return;
    }
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
  // Clear the refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  // In a production environment, you would also invalidate the refresh token
  // by adding it to a blacklist in Redis

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

      const emailHtml = language === 'bg'
        ? `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
            <h1 style="color: #FAFAFA; font-size: 28px; margin-bottom: 20px;">Нулиране на паролата</h1>
            <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Получихме заявка за нулиране на вашата парола. Кликнете бутона по-долу, за да създадете нова парола:
            </p>
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
              Нулиране на паролата
            </a>
            <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
              Тази връзка ще изтече след 24 часа. Ако не сте поискали нулиране на паролата, можете да игнорирате този имейл.
            </p>
            <p style="color: #52525B; font-size: 12px; margin-top: 40px;">
              © 2026 AstroLogAI. Всички права запазени.
            </p>
          </div>
        `
        : `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
            <h1 style="color: #FAFAFA; font-size: 28px; margin-bottom: 20px;">Password Reset</h1>
            <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
            <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't request a password reset, you can ignore this email.
            </p>
            <p style="color: #52525B; font-size: 12px; margin-top: 40px;">
              © 2026 AstroLogAI. All rights reserved.
            </p>
          </div>
        `;

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

    // Invalidate all user sessions for security
    await invalidateUserSessions(userId);

    // Send confirmation email
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const emailSubject = language === 'bg'
        ? 'Паролата е променена успешно - AstroLogAI'
        : 'Password Changed Successfully - AstroLogAI';

      const emailHtml = language === 'bg'
        ? `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
            <h1 style="color: #FAFAFA; font-size: 28px; margin-bottom: 20px;">Паролата е променена успешно</h1>
            <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Вашата парола беше успешно променена. Всички активни сесии бяха прекратени за ваша сигурност.
            </p>
            <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
              Ако не сте направили тази промяна, моля свържете се с нас незабавно.
            </p>
            <p style="color: #52525B; font-size: 12px; margin-top: 40px;">
              © 2026 AstroLogAI. Всички права запазени.
            </p>
          </div>
        `
        : `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
            <h1 style="color: #FAFAFA; font-size: 28px; margin-bottom: 20px;">Password Changed Successfully</h1>
            <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Your password has been successfully changed. All active sessions have been terminated for your security.
            </p>
            <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
              If you didn't make this change, please contact us immediately.
            </p>
            <p style="color: #52525B; font-size: 12px; margin-top: 40px;">
              © 2026 AstroLogAI. All rights reserved.
            </p>
          </div>
        `;

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
