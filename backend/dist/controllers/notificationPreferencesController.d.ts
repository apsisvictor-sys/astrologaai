/**
 * Notification Preferences Controller
 * US-29: Notification Preferences
 *
 * Handles user notification preferences for various types and channels:
 * - Types: dailyHoroscope, weeklyForecast, newReading, partnerUpdates, marketing
 * - Channels: email, push, sms
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Get user notification preferences
 * GET /api/v1/user/notifications
 *
 * Returns user's notification preferences for all types and channels
 */
export declare function getNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Update user notification preferences
 * PUT /api/v1/user/notifications
 *
 * Updates notification preferences for types and channels
 */
export declare function updateNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Unsubscribe from email notifications
 * GET /api/v1/user/notifications/unsubscribe
 *
 * Public endpoint accessed via email link
 * Supports unsubscribing from specific types or all notifications
 */
export declare function unsubscribeFromNotifications(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Regenerate unsubscribe token
 * POST /api/v1/user/notifications/regenerate-token
 *
 * Generates a new unsubscribe token (for security purposes)
 */
export declare function regenerateUnsubscribeToken(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Check if SMS is available for the user
 * GET /api/v1/user/notifications/sms-status
 */
export declare function getSmsStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
declare const _default: {
    getNotificationPreferences: typeof getNotificationPreferences;
    updateNotificationPreferences: typeof updateNotificationPreferences;
    unsubscribeFromNotifications: typeof unsubscribeFromNotifications;
    regenerateUnsubscribeToken: typeof regenerateUnsubscribeToken;
    getSmsStatus: typeof getSmsStatus;
};
export default _default;
//# sourceMappingURL=notificationPreferencesController.d.ts.map