/**
 * User Preferences Controller
 * US-26: Auto-Detect User Language
 * US-29: Notification Preferences
 *
 * Handles user language and notification preferences
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Get user preferences
 * GET /api/v1/user/preferences
 *
 * Returns user's language and notification preferences
 */
export declare function getPreferences(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Update user preferences
 * PUT /api/v1/user/preferences
 *
 * Updates user's language and notification preferences
 */
export declare function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Detect language from Accept-Language header
 * POST /api/v1/user/preferences/detect
 *
 * Public endpoint for language detection (used before auth)
 */
export declare function detectLanguage(req: Request, res: Response): Promise<void>;
/**
 * Update user profile
 * PUT /api/v1/user/profile
 *
 * Updates user's display name, email, and other profile info
 * Email changes require verification (US-28)
 */
export declare function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Get user profile
 * GET /api/v1/user/profile
 */
export declare function getProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Get notification preferences
 * GET /api/v1/user/notifications
 *
 * US-29: Notification Preferences
 * Returns user's notification settings
 */
export declare function getNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Update notification preferences
 * PUT /api/v1/user/notifications
 *
 * US-29: Notification Preferences
 * Updates user's notification settings with immediate save
 */
export declare function updateNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Unsubscribe from emails (GDPR-compliant)
 * POST /api/v1/user/notifications/unsubscribe
 *
 * US-29: Notification Preferences
 * Public endpoint accessed via unsubscribe link in emails
 *
 * SECURITY FIX: Uses JWT token instead of base64-encoded userId
 */
export declare function unsubscribeFromEmails(req: Request, res: Response, next: NextFunction): Promise<void>;
declare const _default: {
    getPreferences: typeof getPreferences;
    updatePreferences: typeof updatePreferences;
    detectLanguage: typeof detectLanguage;
    updateProfile: typeof updateProfile;
    getProfile: typeof getProfile;
    getNotificationPreferences: typeof getNotificationPreferences;
    updateNotificationPreferences: typeof updateNotificationPreferences;
    unsubscribeFromEmails: typeof unsubscribeFromEmails;
};
export default _default;
//# sourceMappingURL=userPreferencesController.d.ts.map