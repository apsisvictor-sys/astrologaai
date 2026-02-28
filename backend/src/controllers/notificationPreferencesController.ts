/**
 * Notification Preferences Controller
 * US-29: Notification Preferences
 * 
 * Handles user notification preferences for various types and channels:
 * - Types: dailyHoroscope, weeklyForecast, newReading, partnerUpdates, marketing
 * - Channels: email, push, sms
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import prisma from '../utils/prisma';

/**
 * Default notification preferences for new users
 */
const DEFAULT_NOTIFICATION_PREFERENCES = {
  dailyHoroscope: true,
  weeklyForecast: true,
  newReading: true,
  partnerUpdates: false,
  marketing: false,
  emailEnabled: true,
  pushEnabled: false,
  smsEnabled: false,
  phoneNumber: null,
};

/**
 * Generate a secure unsubscribe token
 */
function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get user notification preferences
 * GET /api/v1/user/notifications
 * 
 * Returns user's notification preferences for all types and channels
 */
export async function getNotificationPreferences(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    // Find existing preferences or create default
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: req.user.id },
    });

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: req.user.id,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          unsubscribeToken: generateUnsubscribeToken(),
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        preferences: {
          // Notification types
          types: {
            dailyHoroscope: preferences.dailyHoroscope,
            weeklyForecast: preferences.weeklyForecast,
            newReading: preferences.newReading,
            partnerUpdates: preferences.partnerUpdates,
            marketing: preferences.marketing,
          },
          // Delivery channels
          channels: {
            email: preferences.emailEnabled,
            push: preferences.pushEnabled,
            sms: preferences.smsEnabled,
          },
          // Phone number for SMS (masked for privacy)
          phoneNumber: preferences.phoneNumber
            ? `****${preferences.phoneNumber.slice(-4)}`
            : null,
        },
        // Available options for reference
        availableTypes: [
          {
            id: 'dailyHoroscope',
            name: 'Daily Horoscope',
            nameBg: 'Дневен хороскоп',
            description: 'Get your personalized daily horoscope',
            descriptionBg: 'Получавайте персонализиран дневен хороскоп',
          },
          {
            id: 'weeklyForecast',
            name: 'Weekly Forecast',
            nameBg: 'Седмична прогноза',
            description: 'Weekly astrological forecast based on transits',
            descriptionBg: 'Седмична астрологична прогноза базирана на транзити',
          },
          {
            id: 'newReading',
            name: 'New Reading',
            nameBg: 'Ново четене',
            description: 'Notifications about new chart interpretations',
            descriptionBg: 'Известия за нови тълкувания на карти',
          },
          {
            id: 'partnerUpdates',
            name: 'Partner Updates',
            nameBg: 'Партньорски актуализации',
            description: 'Compatibility alerts and partner insights',
            descriptionBg: 'Известия за съвместимост и партньорски анализи',
          },
          {
            id: 'marketing',
            name: 'Marketing & Promotions',
            nameBg: 'Маркетинг и промоции',
            description: 'Special offers and announcements',
            descriptionBg: 'Специални оферти и съобщения',
          },
        ],
        availableChannels: [
          {
            id: 'email',
            name: 'Email',
            nameBg: 'Имейл',
            icon: '📧',
          },
          {
            id: 'push',
            name: 'Push Notifications',
            nameBg: 'Push известия',
            icon: '🔔',
          },
          {
            id: 'sms',
            name: 'SMS',
            nameBg: 'SMS',
            icon: '📱',
          },
        ],
      },
    });
  } catch (error) {
    console.error('[Notification Preferences] Get error:', error);
    next(error);
  }
}

/**
 * Update user notification preferences
 * PUT /api/v1/user/notifications
 * 
 * Updates notification preferences for types and channels
 */
export async function updateNotificationPreferences(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    const { types, channels, phoneNumber } = req.body;

    // Validate types if provided
    const validTypes = ['dailyHoroscope', 'weeklyForecast', 'newReading', 'partnerUpdates', 'marketing'];
    if (types) {
      for (const key of Object.keys(types)) {
        if (!validTypes.includes(key)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid notification type: ${key}`,
              details: [{
                field: 'types',
                message: `Valid types are: ${validTypes.join(', ')}`,
              }],
            },
          });
          return;
        }
        if (typeof types[key] !== 'boolean') {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Notification type value must be boolean: ${key}`,
              details: [{
                field: `types.${key}`,
                message: 'Value must be true or false',
              }],
            },
          });
          return;
        }
      }
    }

    // Validate channels if provided
    const validChannels = ['email', 'push', 'sms'];
    if (channels) {
      for (const key of Object.keys(channels)) {
        if (!validChannels.includes(key)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid channel: ${key}`,
              details: [{
                field: 'channels',
                message: `Valid channels are: ${validChannels.join(', ')}`,
              }],
            },
          });
          return;
        }
        if (typeof channels[key] !== 'boolean') {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Channel value must be boolean: ${key}`,
              details: [{
                field: `channels.${key}`,
                message: 'Value must be true or false',
              }],
            },
          });
          return;
        }
      }
    }

    // Validate phone number format if provided
    if (phoneNumber !== undefined && phoneNumber !== null) {
      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid phone number format',
            details: [{
              field: 'phoneNumber',
              message: 'Phone number must be in international format (e.g., +359888123456)',
            }],
          },
        });
        return;
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (types) {
      if (types.dailyHoroscope !== undefined) updateData.dailyHoroscope = types.dailyHoroscope;
      if (types.weeklyForecast !== undefined) updateData.weeklyForecast = types.weeklyForecast;
      if (types.newReading !== undefined) updateData.newReading = types.newReading;
      if (types.partnerUpdates !== undefined) updateData.partnerUpdates = types.partnerUpdates;
      if (types.marketing !== undefined) updateData.marketing = types.marketing;
    }

    if (channels) {
      if (channels.email !== undefined) updateData.emailEnabled = channels.email;
      if (channels.push !== undefined) updateData.pushEnabled = channels.push;
      if (channels.sms !== undefined) updateData.smsEnabled = channels.sms;
    }

    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    // Upsert preferences
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: req.user.id },
      update: updateData,
      create: {
        userId: req.user.id,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...updateData,
        unsubscribeToken: generateUnsubscribeToken(),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        preferences: {
          types: {
            dailyHoroscope: preferences.dailyHoroscope,
            weeklyForecast: preferences.weeklyForecast,
            newReading: preferences.newReading,
            partnerUpdates: preferences.partnerUpdates,
            marketing: preferences.marketing,
          },
          channels: {
            email: preferences.emailEnabled,
            push: preferences.pushEnabled,
            sms: preferences.smsEnabled,
          },
          phoneNumber: preferences.phoneNumber
            ? `****${preferences.phoneNumber.slice(-4)}`
            : null,
        },
        message: 'Notification preferences updated successfully',
      },
    });
  } catch (error) {
    console.error('[Notification Preferences] Update error:', error);
    next(error);
  }
}

/**
 * Unsubscribe from email notifications
 * GET /api/v1/user/notifications/unsubscribe
 * 
 * Public endpoint accessed via email link
 * Supports unsubscribing from specific types or all notifications
 */
export async function unsubscribeFromNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, type, all } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Unsubscribe token is required',
        },
      });
      return;
    }

    // Find user by unsubscribe token
    const preferences = await prisma.notificationPreference.findUnique({
      where: { unsubscribeToken: token },
      include: { user: true },
    });

    if (!preferences) {
      res.status(404).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired unsubscribe token',
        },
      });
      return;
    }

    // Determine language for response
    const lang = preferences.user.language === 'en' ? 'en' : 'bg';

    // Unsubscribe from all
    if (all === 'true') {
      await prisma.notificationPreference.update({
        where: { id: preferences.id },
        data: {
          emailEnabled: false,
          dailyHoroscope: false,
          weeklyForecast: false,
          newReading: false,
          partnerUpdates: false,
          marketing: false,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          message: lang === 'bg'
            ? 'Успешно се отписахте от всички имейл известия.'
            : 'You have been successfully unsubscribed from all email notifications.',
          unsubscribedFrom: 'all',
        },
      });
      return;
    }

    // Unsubscribe from specific type
    if (type && typeof type === 'string') {
      const validTypes = ['dailyHoroscope', 'weeklyForecast', 'newReading', 'partnerUpdates', 'marketing'];
      
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: `Invalid notification type: ${type}`,
          },
        });
        return;
      }

      await prisma.notificationPreference.update({
        where: { id: preferences.id },
        data: {
          [type]: false,
        },
      });

      const typeNames: Record<string, { en: string; bg: string }> = {
        dailyHoroscope: { en: 'Daily Horoscope', bg: 'Дневен хороскоп' },
        weeklyForecast: { en: 'Weekly Forecast', bg: 'Седмична прогноза' },
        newReading: { en: 'New Reading', bg: 'Ново четене' },
        partnerUpdates: { en: 'Partner Updates', bg: 'Партньорски актуализации' },
        marketing: { en: 'Marketing', bg: 'Маркетинг' },
      };

      res.status(200).json({
        success: true,
        data: {
          message: lang === 'bg'
            ? `Успешно се отписахте от "${typeNames[type].bg}".`
            : `You have been unsubscribed from "${typeNames[type].en}".`,
          unsubscribedFrom: type,
        },
      });
      return;
    }

    // Default: unsubscribe from marketing only
    await prisma.notificationPreference.update({
      where: { id: preferences.id },
      data: {
        marketing: false,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        message: lang === 'bg'
          ? 'Успешно се отписахте от маркетингови имейли.'
          : 'You have been unsubscribed from marketing emails.',
        unsubscribedFrom: 'marketing',
      },
    });
  } catch (error) {
    console.error('[Notification Preferences] Unsubscribe error:', error);
    next(error);
  }
}

/**
 * Regenerate unsubscribe token
 * POST /api/v1/user/notifications/regenerate-token
 * 
 * Generates a new unsubscribe token (for security purposes)
 */
export async function regenerateUnsubscribeToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    const newToken = generateUnsubscribeToken();

    await prisma.notificationPreference.update({
      where: { userId: req.user.id },
      data: {
        unsubscribeToken: newToken,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Unsubscribe token regenerated successfully',
      },
    });
  } catch (error) {
    console.error('[Notification Preferences] Regenerate token error:', error);
    next(error);
  }
}

/**
 * Check if SMS is available for the user
 * GET /api/v1/user/notifications/sms-status
 */
export async function getSmsStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: req.user.id },
    });

    res.status(200).json({
      success: true,
      data: {
        smsEnabled: preferences?.smsEnabled ?? false,
        hasPhoneNumber: !!preferences?.phoneNumber,
        phoneNumber: preferences?.phoneNumber
          ? `****${preferences.phoneNumber.slice(-4)}`
          : null,
      },
    });
  } catch (error) {
    console.error('[Notification Preferences] SMS status error:', error);
    next(error);
  }
}

export default {
  getNotificationPreferences,
  updateNotificationPreferences,
  unsubscribeFromNotifications,
  regenerateUnsubscribeToken,
  getSmsStatus,
};
