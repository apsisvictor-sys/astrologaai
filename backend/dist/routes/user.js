"use strict";
/**
 * User Routes
 * Handles user profile and preferences
 *
 * US-26: Auto-Detect User Language
 * US-28: Edit Profile (Avatar upload, Email verification)
 * US-29: Notification Preferences
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const userPreferencesController_1 = require("../controllers/userPreferencesController");
const deleteAccountController_1 = require("../controllers/deleteAccountController");
const exportController_1 = require("../controllers/exportController");
const avatarController_1 = require("../controllers/avatarController");
const notificationPreferencesController_1 = require("../controllers/notificationPreferencesController");
const router = (0, express_1.Router)();
// Configure multer for avatar uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(process.cwd(), 'tmp'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only JPG and PNG images are allowed'));
        }
    },
});
/**
 * @route   POST /api/v1/user/preferences/detect
 * @desc    Detect language from Accept-Language header (public)
 * @access  Public
 */
router.post('/preferences/detect', userPreferencesController_1.detectLanguage);
/**
 * @route   GET /api/v1/user/preferences
 * @desc    Get current user preferences (language, notifications)
 * @access  Private
 */
router.get('/preferences', auth_1.authMiddleware, userPreferencesController_1.getPreferences);
/**
 * @route   PUT /api/v1/user/preferences
 * @desc    Update user preferences (language, notifications)
 * @access  Private
 */
router.put('/preferences', auth_1.authMiddleware, userPreferencesController_1.updatePreferences);
/**
 * @route   GET /api/v1/user/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', auth_1.authMiddleware, userPreferencesController_1.getProfile);
/**
 * @route   PUT /api/v1/user/profile
 * @desc    Update user profile (name, email, avatar)
 * @access  Private
 */
router.put('/profile', auth_1.authMiddleware, userPreferencesController_1.updateProfile);
/**
 * @route   POST /api/v1/user/avatar
 * @desc    Upload profile picture
 * @access  Private
 * @body    multipart form data with 'avatar' field
 */
router.post('/avatar', auth_1.authMiddleware, upload.single('avatar'), avatarController_1.uploadAvatar);
/**
 * @route   DELETE /api/v1/user/avatar
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/avatar', auth_1.authMiddleware, avatarController_1.deleteAvatar);
/**
 * @route   POST /api/v1/user/verify-email
 * @desc    Send email verification for pending email change
 * @access  Private
 * @body    { email: string }
 */
router.post('/verify-email', auth_1.authMiddleware, avatarController_1.sendEmailVerification);
/**
 * @route   POST /api/v1/user/confirm-email
 * @desc    Confirm pending email change
 * @access  Public
 * @body    { token: string, userId: string }
 */
router.post('/confirm-email', avatarController_1.confirmEmailChange);
/**
 * @route   POST /api/v1/user/cancel-email-change
 * @desc    Cancel pending email change
 * @access  Private
 */
router.post('/cancel-email-change', auth_1.authMiddleware, avatarController_1.cancelEmailChange);
// ============================================
// US-32: Export User Data (GDPR Data Portability)
// ============================================
/**
 * @route   GET /api/v1/user/export/download
 * @desc    Immediately download all user data in JSON format (synchronous)
 * @access  Private
 */
router.get('/export/download', auth_1.authMiddleware, exportController_1.exportDataSync);
/**
 * @route   POST /api/v1/user/export
 * @desc    Request a data export (JSON or PDF format, async)
 * @access  Private
 * @body    { format: 'json' | 'pdf' }
 */
router.post('/export', auth_1.authMiddleware, exportController_1.requestExport);
/**
 * @route   GET /api/v1/user/export
 * @desc    List user's recent export history
 * @access  Private
 */
router.get('/export/list', auth_1.authMiddleware, exportController_1.listExports);
/**
 * @route   GET /api/v1/user/export/:id
 * @desc    Get export status
 * @access  Private
 */
router.get('/export/:id', auth_1.authMiddleware, exportController_1.getExportStatus);
/**
 * @route   GET /api/v1/user/export/:id/download
 * @desc    Download exported data
 * @access  Private
 */
router.get('/export/:id/download', auth_1.authMiddleware, exportController_1.downloadExport);
// ============================================
// US-29: Notification Preferences
// ============================================
/**
 * @route   GET /api/v1/user/notifications
 * @desc    Get user's notification preferences
 * @access  Private
 */
router.get('/notifications', auth_1.authMiddleware, notificationPreferencesController_1.getNotificationPreferences);
/**
 * @route   PUT /api/v1/user/notifications
 * @desc    Update user's notification preferences
 * @access  Private
 */
router.put('/notifications', auth_1.authMiddleware, notificationPreferencesController_1.updateNotificationPreferences);
/**
 * @route   GET /api/v1/user/notifications/unsubscribe
 * @desc    Unsubscribe from email notifications (GDPR-compliant)
 * @access  Public (via unsubscribe link in emails)
 * @query   token - Unsubscribe token from email
 * @query   type - Optional specific type to unsubscribe from
 * @query   all - If 'true', unsubscribe from all notifications
 */
router.get('/notifications/unsubscribe', notificationPreferencesController_1.unsubscribeFromNotifications);
/**
 * @route   POST /api/v1/user/notifications/unsubscribe
 * @desc    Unsubscribe from email notifications (POST version for forms)
 * @access  Public
 */
router.post('/notifications/unsubscribe', notificationPreferencesController_1.unsubscribeFromNotifications);
/**
 * @route   POST /api/v1/user/notifications/regenerate-token
 * @desc    Regenerate unsubscribe token for security
 * @access  Private
 */
router.post('/notifications/regenerate-token', auth_1.authMiddleware, notificationPreferencesController_1.regenerateUnsubscribeToken);
/**
 * @route   GET /api/v1/user/notifications/sms-status
 * @desc    Check SMS notification status
 * @access  Private
 */
router.get('/notifications/sms-status', auth_1.authMiddleware, notificationPreferencesController_1.getSmsStatus);
// ============================================
// US-31: Delete Account (GDPR)
// ============================================
/**
 * @route   DELETE /api/v1/user
 * @desc    Permanently delete user account and all associated data
 * @access  Private
 * @body    { password: string }
 */
router.delete('/', auth_1.authMiddleware, deleteAccountController_1.deleteAccount);
exports.default = router;
//# sourceMappingURL=user.js.map