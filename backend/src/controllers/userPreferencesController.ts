/**
 * User Preferences Controller
 * US-26: Auto-Detect User Language
 * US-29: Notification Preferences
 * 
 * Handles user language and notification preferences
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { SUPPORTED_LANGUAGES, SupportedLanguage, detectLanguageFromHeader } from '../middleware/languageDetection';

/**
 * Default notification settings
 * US-29: Notification Preferences
 */
const DEFAULT_NOTIFICATION_SETTINGS = {
  email: true,           // Email notifications enabled
  push: false,           // Push notifications disabled by default
  daily: true,           // Daily forecast
  weekly: true,          // Weekly forecast
  transitAlerts: true,   // Transit alerts
  promotions: false,     // Promotional emails
};

/**
 * Get user preferences
 * GET /api/v1/user/preferences
 * 
 * Returns user's language and notification preferences
 */
export async function getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Parse notification preferences with defaults
    const notificationPrefs = (user.profile?.notificationPrefs as Record<string, boolean>) || {};
    const notifications = {
      email: notificationPrefs.email ?? DEFAULT_NOTIFICATION_SETTINGS.email,
      push: notificationPrefs.push ?? DEFAULT_NOTIFICATION_SETTINGS.push,
      daily: notificationPrefs.daily ?? DEFAULT_NOTIFICATION_SETTINGS.daily,
      weekly: notificationPrefs.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weekly,
      transitAlerts: notificationPrefs.transitAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.transitAlerts,
      promotions: notificationPrefs.promotions ?? DEFAULT_NOTIFICATION_SETTINGS.promotions,
    };

    res.status(200).json({
      success: true,
      data: {
        preferences: {
          language: user.language || 'bg',
          notifications,
        },
        supportedLanguages: [
          {
            code: 'bg',
            name: 'Български',
            nativeName: 'Български',
            flag: '🇧🇬',
          },
          {
            code: 'en',
            name: 'English',
            nativeName: 'English',
            flag: '🇬🇧',
          },
        ],
      },
    });
  } catch (error) {
    console.error('[User Preferences] Get preferences error:', error);
    next(error);
  }
}

/**
 * Update user preferences
 * PUT /api/v1/user/preferences
 * 
 * Updates user's language and notification preferences
 */
export async function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { language, notifications: notificationUpdates } = req.body;

    // Validate language if provided
    if (language !== undefined) {
      if (!SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid language code',
            details: [
              {
                field: 'language',
                message: `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
              },
            ],
          },
        });
        return;
      }
    }

    // Update user language
    if (language !== undefined) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          language: language as SupportedLanguage,
          updatedAt: new Date(),
        },
      });
    }

    // Update notification preferences
    if (notificationUpdates !== undefined) {
      const currentProfile = await prisma.profile.findUnique({
        where: { userId: req.user.id },
      });

      const currentPrefs = (currentProfile?.notificationPrefs as Record<string, boolean>) || {};

      const mergedPrefs = {
        ...currentPrefs,
        ...notificationUpdates,
      };

      await prisma.profile.upsert({
        where: { userId: req.user.id },
        update: {
          notificationPrefs: mergedPrefs,
          updatedAt: new Date(),
        },
        create: {
          userId: req.user.id,
          notificationPrefs: mergedPrefs,
        },
      });
    }

    // Fetch updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
      },
    });

    const finalPrefs = (updatedUser?.profile?.notificationPrefs as Record<string, boolean>) || {};
    const notifications = {
      email: finalPrefs.email ?? DEFAULT_NOTIFICATION_SETTINGS.email,
      push: finalPrefs.push ?? DEFAULT_NOTIFICATION_SETTINGS.push,
      daily: finalPrefs.daily ?? DEFAULT_NOTIFICATION_SETTINGS.daily,
      weekly: finalPrefs.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weekly,
      transitAlerts: finalPrefs.transitAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.transitAlerts,
      promotions: finalPrefs.promotions ?? DEFAULT_NOTIFICATION_SETTINGS.promotions,
    };

    res.status(200).json({
      success: true,
      data: {
        preferences: {
          language: updatedUser?.language || 'bg',
          notifications,
        },
        message: 'Preferences updated successfully',
      },
    });
  } catch (error) {
    console.error('[User Preferences] Update preferences error:', error);
    next(error);
  }
}

/**
 * Detect language from Accept-Language header
 * POST /api/v1/user/preferences/detect
 * 
 * Public endpoint for language detection (used before auth)
 */
export async function detectLanguage(req: Request, res: Response): Promise<void> {
  const acceptLanguage = req.headers['accept-language'];
  const detectedLanguage = detectLanguageFromHeader(acceptLanguage);

  res.status(200).json({
    success: true,
    data: {
      detectedLanguage,
      supportedLanguages: [
        {
          code: 'bg',
          name: 'Български',
          nativeName: 'Български',
          flag: '🇧🇬',
        },
        {
          code: 'en',
          name: 'English',
          nativeName: 'English',
          flag: '🇬🇧',
        },
      ],
      defaultLanguage: 'bg',
    },
  });
}

/**
 * Update user profile
 * PUT /api/v1/user/profile
 * 
 * Updates user's display name, email, and other profile info
 * Email changes require verification (US-28)
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { fullName, email, timezone, avatarUrl } = req.body;
    let emailVerificationSent = false;

    // Validate email format if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
            details: [
              {
                field: 'email',
                message: 'Please provide a valid email address',
              },
            ],
          },
        });
        return;
      }

      // Get current user to check if email is actually changing
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { email: true, pendingEmail: true },
      });

      const newEmail = email.toLowerCase();
      
      // If email is not actually changing, skip
      if (currentUser?.email === newEmail) {
        // Email not changing, clear any pending
        if (currentUser?.pendingEmail) {
          await prisma.user.update({
            where: { id: req.user.id },
            data: { pendingEmail: null, pendingEmailToken: null },
          });
        }
      } else if (currentUser) {
        // Email is changing - check for duplicate
        const existingUser = await prisma.user.findFirst({
          where: {
            email: newEmail,
            id: { not: req.user.id },
          },
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

        // Send verification email instead of directly changing
        const { randomBytes } = await import('crypto');
        const verificationToken = randomBytes(32).toString('hex');

        await prisma.user.update({
          where: { id: req.user.id },
          data: {
            pendingEmail: newEmail,
            pendingEmailToken: verificationToken,
            updatedAt: new Date(),
          },
        });

        // Send verification email
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);

          const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&userId=${req.user.id}`;

          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@astrologaai.com',
            to: newEmail,
            subject: 'Потвърдете новия си имейл адрес / Confirm your new email address',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #7C3AED;">AstroLogAI</h1>
                <p>Получихме заявка за промяна на имейл адреса ви.</p>
                <p>За да потвърдите новия си имейл, моля, кликнете върху бутона по-долу:</p>
                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; margin: 20px 0;">
                  Потвърди имейл
                </a>
                <p>Ако не сте направили тази заявка, можете да игнорирате този имейл.</p>
                <hr style="border: none; border-top: 1px solid #252532; margin: 20px 0;">
                <p style="color: #71717A; font-size: 12px;">
                  We received a request to change your email address.<br>
                  To confirm your new email, please click the button above.
                </p>
              </div>
            `,
          });
          emailVerificationSent = true;
        } catch (emailError) {
          console.error('[Profile Update] Failed to send verification email:', emailError);
        }
      }
    }

    // Build update data for non-email fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (fullName !== undefined) updateData.fullName = fullName;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    // Update user (excluding email - handled separately above)
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          tier: updatedUser.tier,
          language: updatedUser.language,
          avatarUrl: updatedUser.avatarUrl,
          emailVerified: updatedUser.emailVerified,
          pendingEmail: updatedUser.pendingEmail,
          updatedAt: updatedUser.updatedAt,
        },
        message: emailVerificationSent 
          ? 'Profile updated. Please check your new email to verify the change.'
          : 'Profile updated successfully',
      },
    });
  } catch (error) {
    console.error('[User Preferences] Update profile error:', error);
    next(error);
  }
}

/**
 * Get user profile
 * GET /api/v1/user/profile
 */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        subscription: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          tier: user.tier,
          language: user.language,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          pendingEmail: user.pendingEmail,
          createdAt: user.createdAt,
          lastActive: user.updatedAt,
        },
        subscription: user.subscription ? {
          tier: user.subscription.tier,
          status: user.subscription.status,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
        } : null,
      },
    });
  } catch (error) {
    console.error('[User Preferences] Get profile error:', error);
    next(error);
  }
}

/**
 * Get notification preferences
 * GET /api/v1/user/notifications
 * 
 * US-29: Notification Preferences
 * Returns user's notification settings
 */
export async function getNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    });

    const notificationPrefs = (profile?.notificationPrefs as Record<string, boolean>) || {};
    const notifications = {
      email: notificationPrefs.email ?? DEFAULT_NOTIFICATION_SETTINGS.email,
      push: notificationPrefs.push ?? DEFAULT_NOTIFICATION_SETTINGS.push,
      daily: notificationPrefs.daily ?? DEFAULT_NOTIFICATION_SETTINGS.daily,
      weekly: notificationPrefs.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weekly,
      transitAlerts: notificationPrefs.transitAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.transitAlerts,
      promotions: notificationPrefs.promotions ?? DEFAULT_NOTIFICATION_SETTINGS.promotions,
    };

    res.status(200).json({
      success: true,
      data: {
        notifications,
      },
    });
  } catch (error) {
    console.error('[User Notifications] Get preferences error:', error);
    next(error);
  }
}

/**
 * Update notification preferences
 * PUT /api/v1/user/notifications
 * 
 * US-29: Notification Preferences
 * Updates user's notification settings with immediate save
 */
export async function updateNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { email, push, daily, weekly, transitAlerts, promotions } = req.body;

    // Validate boolean fields
    const booleanFields = { email, push, daily, weekly, transitAlerts, promotions };
    for (const [key, value] of Object.entries(booleanFields)) {
      if (value !== undefined && typeof value !== 'boolean') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid value for ${key}`,
            details: [
              {
                field: key,
                message: `${key} must be a boolean`,
              },
            ],
          },
        });
        return;
      }
    }

    // Get current preferences
    const currentProfile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    });

    const currentPrefs = (currentProfile?.notificationPrefs as Record<string, boolean>) || {};

    // Merge with new values
    const updatedPrefs = {
      ...currentPrefs,
      ...(email !== undefined && { email }),
      ...(push !== undefined && { push }),
      ...(daily !== undefined && { daily }),
      ...(weekly !== undefined && { weekly }),
      ...(transitAlerts !== undefined && { transitAlerts }),
      ...(promotions !== undefined && { promotions }),
    };

    // Update profile
    await prisma.profile.upsert({
      where: { userId: req.user.id },
      update: {
        notificationPrefs: updatedPrefs,
        updatedAt: new Date(),
      },
      create: {
        userId: req.user.id,
        notificationPrefs: updatedPrefs,
      },
    });

    // Return updated preferences
    const notifications = {
      email: updatedPrefs.email ?? DEFAULT_NOTIFICATION_SETTINGS.email,
      push: updatedPrefs.push ?? DEFAULT_NOTIFICATION_SETTINGS.push,
      daily: updatedPrefs.daily ?? DEFAULT_NOTIFICATION_SETTINGS.daily,
      weekly: updatedPrefs.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weekly,
      transitAlerts: updatedPrefs.transitAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.transitAlerts,
      promotions: updatedPrefs.promotions ?? DEFAULT_NOTIFICATION_SETTINGS.promotions,
    };

    res.status(200).json({
      success: true,
      data: {
        notifications,
        message: 'Notification preferences updated successfully',
      },
    });
  } catch (error) {
    console.error('[User Notifications] Update preferences error:', error);
    next(error);
  }
}

/**
 * Unsubscribe from emails (GDPR-compliant)
 * POST /api/v1/user/notifications/unsubscribe
 * 
 * US-29: Notification Preferences
 * Public endpoint accessed via unsubscribe link in emails
 * 
 * SECURITY FIX: Uses JWT token instead of base64-encoded userId
 */
export async function unsubscribeFromEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, type } = req.body;

    // Validate token
    if (!token) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Unsubscribe token is required',
        },
      });
      return;
    }

    // SECURITY FIX: Verify JWT token instead of decoding base64
    // This prevents token forgery
    const jwt = await import('jsonwebtoken');
    const { JWT_SECRET } = await import('../utils/jwt');
    
    let decoded: { userId: string; type: string; iat: number };
    
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string; iat: number };
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired unsubscribe token',
        },
      });
      return;
    }

    const userId = decoded.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid unsubscribe token',
        },
      });
      return;
    }

    // Get current preferences
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    const currentPrefs = (profile?.notificationPrefs as Record<string, boolean>) || {};

    // Update based on unsubscribe type
    let updatedPrefs = { ...currentPrefs };
    let message = 'Successfully unsubscribed';

    if (type === 'all') {
      // Unsubscribe from all emails
      updatedPrefs = {
        ...updatedPrefs,
        email: false,
        daily: false,
        weekly: false,
        transitAlerts: false,
        promotions: false,
      };
      message = 'Successfully unsubscribed from all email notifications';
    } else if (type === 'promotions') {
      updatedPrefs.promotions = false;
      message = 'Successfully unsubscribed from promotional emails';
    } else if (type === 'daily') {
      updatedPrefs.daily = false;
      message = 'Successfully unsubscribed from daily forecasts';
    } else if (type === 'weekly') {
      updatedPrefs.weekly = false;
      message = 'Successfully unsubscribed from weekly forecasts';
    } else if (type === 'transitAlerts') {
      updatedPrefs.transitAlerts = false;
      message = 'Successfully unsubscribed from transit alerts';
    } else {
      // Default: unsubscribe from the specific type or all marketing
      updatedPrefs.promotions = false;
      message = 'Successfully unsubscribed from promotional emails';
    }

    // Update profile
    await prisma.profile.upsert({
      where: { userId },
      update: {
        notificationPrefs: updatedPrefs,
        updatedAt: new Date(),
      },
      create: {
        userId,
        notificationPrefs: updatedPrefs,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        message,
        preferences: {
          email: updatedPrefs.email ?? DEFAULT_NOTIFICATION_SETTINGS.email,
          push: updatedPrefs.push ?? DEFAULT_NOTIFICATION_SETTINGS.push,
          daily: updatedPrefs.daily ?? DEFAULT_NOTIFICATION_SETTINGS.daily,
          weekly: updatedPrefs.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weekly,
          transitAlerts: updatedPrefs.transitAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.transitAlerts,
          promotions: updatedPrefs.promotions ?? DEFAULT_NOTIFICATION_SETTINGS.promotions,
        },
      },
    });
  } catch (error) {
    console.error('[User Notifications] Unsubscribe error:', error);
    next(error);
  }
}

export default {
  getPreferences,
  updatePreferences,
  detectLanguage,
  updateProfile,
  getProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
  unsubscribeFromEmails,
};
