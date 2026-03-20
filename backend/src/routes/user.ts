/**
 * User Routes
 * Handles user profile and preferences
 * 
 * US-26: Auto-Detect User Language
 * US-28: Edit Profile (Avatar upload, Email verification)
 * US-29: Notification Preferences
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { redisClient } from '../utils/redis';
import { getStreakInfo } from '../services/streakService';
import {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
  detectLanguage,
} from '../controllers/userPreferencesController';
import {
  deleteAccount,
} from '../controllers/deleteAccountController';
import {
  requestExport,
  getExportStatus,
  downloadExport,
  listExports,
  exportDataSync,
} from '../controllers/exportController';
import {
  uploadAvatar,
  deleteAvatar,
  sendEmailVerification,
  confirmEmailChange,
  cancelEmailChange,
} from '../controllers/avatarController';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  unsubscribeFromNotifications,
  regenerateUnsubscribeToken,
  getSmsStatus,
} from '../controllers/notificationPreferencesController';

const router = Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'tmp'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG images are allowed'));
    }
  },
});

/**
 * @route   POST /api/v1/user/preferences/detect
 * @desc    Detect language from Accept-Language header (public)
 * @access  Public
 */
router.post('/preferences/detect', detectLanguage);

/**
 * @route   GET /api/v1/user/preferences
 * @desc    Get current user preferences (language, notifications)
 * @access  Private
 */
router.get('/preferences', authMiddleware, getPreferences);

/**
 * @route   PUT /api/v1/user/preferences
 * @desc    Update user preferences (language, notifications)
 * @access  Private
 */
router.put('/preferences', authMiddleware, updatePreferences);

/**
 * @route   GET /api/v1/user/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, getProfile);

/**
 * @route   PUT /api/v1/user/profile
 * @desc    Update user profile (name, email, avatar)
 * @access  Private
 */
router.put('/profile', authMiddleware, updateProfile);

/**
 * @route   POST /api/v1/user/avatar
 * @desc    Upload profile picture
 * @access  Private
 * @body    multipart form data with 'avatar' field
 */
router.post('/avatar', authMiddleware, upload.single('avatar'), uploadAvatar);

/**
 * @route   DELETE /api/v1/user/avatar
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/avatar', authMiddleware, deleteAvatar);

/**
 * @route   POST /api/v1/user/verify-email
 * @desc    Send email verification for pending email change
 * @access  Private
 * @body    { email: string }
 */
router.post('/verify-email', authMiddleware, sendEmailVerification);

/**
 * @route   POST /api/v1/user/confirm-email
 * @desc    Confirm pending email change
 * @access  Public
 * @body    { token: string, userId: string }
 */
router.post('/confirm-email', confirmEmailChange);

/**
 * @route   POST /api/v1/user/cancel-email-change
 * @desc    Cancel pending email change
 * @access  Private
 */
router.post('/cancel-email-change', authMiddleware, cancelEmailChange);

// ============================================
// US-32: Export User Data (GDPR Data Portability)
// ============================================

/**
 * @route   GET /api/v1/user/export/download
 * @desc    Immediately download all user data in JSON format (synchronous)
 * @access  Private
 */
router.get('/export/download', authMiddleware, exportDataSync);

/**
 * @route   POST /api/v1/user/export
 * @desc    Request a data export (JSON or PDF format, async)
 * @access  Private
 * @body    { format: 'json' | 'pdf' }
 */
router.post('/export', authMiddleware, requestExport);

/**
 * @route   GET /api/v1/user/export
 * @desc    List user's recent export history
 * @access  Private
 */
router.get('/export/list', authMiddleware, listExports);

/**
 * @route   GET /api/v1/user/export/:id
 * @desc    Get export status
 * @access  Private
 */
router.get('/export/:id', authMiddleware, getExportStatus);

/**
 * @route   GET /api/v1/user/export/:id/download
 * @desc    Download exported data
 * @access  Private
 */
router.get('/export/:id/download', authMiddleware, downloadExport);

// ============================================
// US-29: Notification Preferences
// ============================================

/**
 * @route   GET /api/v1/user/notifications
 * @desc    Get user's notification preferences
 * @access  Private
 */
router.get('/notifications', authMiddleware, getNotificationPreferences);

/**
 * @route   PUT /api/v1/user/notifications
 * @desc    Update user's notification preferences
 * @access  Private
 */
router.put('/notifications', authMiddleware, updateNotificationPreferences);

/**
 * @route   GET /api/v1/user/notifications/unsubscribe
 * @desc    Unsubscribe from email notifications (GDPR-compliant)
 * @access  Public (via unsubscribe link in emails)
 * @query   token - Unsubscribe token from email
 * @query   type - Optional specific type to unsubscribe from
 * @query   all - If 'true', unsubscribe from all notifications
 */
router.get('/notifications/unsubscribe', unsubscribeFromNotifications);

/**
 * @route   POST /api/v1/user/notifications/unsubscribe
 * @desc    Unsubscribe from email notifications (POST version for forms)
 * @access  Public
 */
router.post('/notifications/unsubscribe', unsubscribeFromNotifications);

/**
 * @route   POST /api/v1/user/notifications/regenerate-token
 * @desc    Regenerate unsubscribe token for security
 * @access  Private
 */
router.post('/notifications/regenerate-token', authMiddleware, regenerateUnsubscribeToken);

/**
 * @route   GET /api/v1/user/notifications/sms-status
 * @desc    Check SMS notification status
 * @access  Private
 */
router.get('/notifications/sms-status', authMiddleware, getSmsStatus);

// ============================================
// US-31: Delete Account (GDPR)
// ============================================

/**
 * @route   DELETE /api/v1/user
 * @desc    Permanently delete user account and all associated data
 * @access  Private
 * @body    { password: string }
 */
router.delete('/', authMiddleware, deleteAccount);

// ============================================
// ENH-18: Shareable Big 3 Card
// ============================================

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

// GET /api/v1/user/share-card — auth required
router.get('/share-card', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const cacheKey = `share_card:${userId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const profile = await prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { birthChart: { select: { chartData: true } } },
    });

    if (!profile?.birthChart?.chartData) {
      return res.status(404).json({ success: false, error: { code: 'NO_CHART', message: 'No birth chart found' } });
    }

    const cd = profile.birthChart.chartData as any;
    const data = {
      userId,
      sunSign: cd?.sun?.sign ?? null,
      moonSign: cd?.moon?.sign ?? null,
      risingSign: cd?.rising?.sign ?? null,
      sunGlyph: ZODIAC_GLYPHS[cd?.sun?.sign] ?? '☉',
      moonGlyph: ZODIAC_GLYPHS[cd?.moon?.sign] ?? '☽',
      risingGlyph: cd?.rising?.sign ? (ZODIAC_GLYPHS[cd.rising.sign] ?? '↑') : null,
    };

    await redisClient.setEx(cacheKey, 60 * 60 * 24, JSON.stringify(data));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[User] share-card error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to get share card data' } });
  }
});

// GET /api/v1/user/share-card/public/:userId — no auth
router.get('/share-card/public/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const cacheKey = `share_card_pub:${userId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const profile = await prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { birthChart: { select: { chartData: true } } },
    });

    if (!profile?.birthChart?.chartData) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Chart not found' } });
    }

    const cd = profile.birthChart.chartData as any;
    const data = {
      sunSign: cd?.sun?.sign ?? null,
      moonSign: cd?.moon?.sign ?? null,
      risingSign: cd?.rising?.sign ?? null,
      sunGlyph: ZODIAC_GLYPHS[cd?.sun?.sign] ?? '☉',
      moonGlyph: ZODIAC_GLYPHS[cd?.moon?.sign] ?? '☽',
      risingGlyph: cd?.rising?.sign ? (ZODIAC_GLYPHS[cd.rising.sign] ?? '↑') : null,
    };

    await redisClient.setEx(cacheKey, 60 * 60 * 24, JSON.stringify(data));
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed' } });
  }
});

// ── GET /api/v1/user/streak ───────────────────────────────────────────────────
// ENH-23: Returns current Oracle streak for the authenticated user

router.get('/streak', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

  try {
    const info = await getStreakInfo(userId);
    return res.json({ success: true, data: info });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR' } });
  }
});

export default router;
