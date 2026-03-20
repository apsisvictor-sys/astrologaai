/**
 * Cron Routes
 * US-36: Monthly Reset Logic
 * 
 * Endpoints for scheduled jobs (can be called by external cron services)
 */

import { Router, Request, Response } from 'express';
import { resetMonthlyQueryCounters, isResetDay, archiveOldUsageRecords } from '../services/monthly-reset';
import { getCronSecret } from '../utils/cron';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { runLifecycleCron } from '../services/email/lifecycle';
import { revertExpiredTrials } from '../services/streakService';

const router = Router();

/**
 * POST /api/v1/cron/monthly-reset
 * Run monthly query counter reset
 * 
 * This endpoint should be called daily by a cron service.
 * It will only perform the reset on the configured reset day (default: 1st of month)
 * 
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/monthly-reset', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'CRON_NOT_CONFIGURED',
          message: 'Cron secret is not configured on this environment',
        },
      });
    }

    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== configuredSecret) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing cron secret',
        },
      });
    }
    
    // Check if today is reset day
    if (!isResetDay()) {
      return res.json({
        success: true,
        message: 'Not reset day. Skipping.',
        isResetDay: false,
      });
    }
    
    // Run the reset
    const result = await resetMonthlyQueryCounters();
    
    return res.json({
      success: result.success,
      message: result.success 
        ? `Reset completed. ${result.usersProcessed} users processed.`
        : 'Reset failed',
      details: {
        usersProcessed: result.usersProcessed,
        duration: result.duration,
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 5), // First 5 errors only
      },
    });
  } catch (error) {
    console.error('[Cron] Monthly reset error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to run monthly reset',
      },
    });
  }
});

/**
 * POST /api/v1/cron/archive-old-records
 * Archive old usage records (cleanup)
 * 
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/archive-old-records', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'CRON_NOT_CONFIGURED',
          message: 'Cron secret is not configured on this environment',
        },
      });
    }

    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== configuredSecret) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing cron secret',
        },
      });
    }
    
    // Run archive
    const result = await archiveOldUsageRecords(12);
    
    return res.json({
      success: result.success,
      message: `Archived ${result.recordsDeleted} old records`,
      details: {
        recordsDeleted: result.recordsDeleted,
        errorCount: result.errors.length,
      },
    });
  } catch (error) {
    console.error('[Cron] Archive error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to archive old records',
      },
    });
  }
});

/**
 * POST /api/v1/cron/email-lifecycle
 * Run lifecycle email sequence (Day 1–30)
 *
 * Call daily. Each run processes all users who registered ~N hours ago.
 * Security: Requires CRON_SECRET header for authentication.
 */
router.post('/email-lifecycle', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'CRON_NOT_CONFIGURED',
          message: 'Cron secret is not configured on this environment',
        },
      });
    }

    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== configuredSecret) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing cron secret',
        },
      });
    }

    const result = await runLifecycleCron();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Cron] email-lifecycle error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CRON_ERROR',
        message: 'Lifecycle cron failed',
      },
    });
  }
});

/**
 * POST /api/v1/cron/streak-maintenance
 * Daily: revert expired PRO trials from streak rewards
 * Called by Railway cron or external scheduler (once per day)
 */
router.post('/streak-maintenance', adminAuthMiddleware, async (_req: Request, res: Response) => {
  try {
    const reverted = await revertExpiredTrials();
    return res.json({ success: true, data: { trialsReverted: reverted } });
  } catch (error) {
    console.error('[Cron] streak-maintenance error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Streak maintenance failed' } });
  }
});

/**
 * GET /api/v1/cron/status
 * Check cron job status
 */
router.get('/status', adminAuthMiddleware, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      isResetDay: isResetDay(),
      resetDay: parseInt(process.env.FREE_TIER_RESET_DAY || '1'),
      timezone: 'UTC',
    },
  });
});

export default router;
