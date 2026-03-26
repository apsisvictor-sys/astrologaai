/**
 * Cron Routes
 * US-36: Monthly Reset Logic
 * 
 * Endpoints for scheduled jobs (can be called by external cron services)
 */

import { Router, Request, Response } from 'express';
import { getCronSecret } from '../utils/cron';
import { runLifecycleCron } from '../services/email/lifecycle';
import { revertExpiredTrials } from '../services/streakService';
import { runNightlyForecastJob } from '../services/forecast-cron';
import { warmDailyTransitsCache } from '../services/transits';
import { sendDailyHoroscopeEmails } from '../services/email/horoscope-email';
import { sendMorningBriefingEmails } from '../services/email/morning-briefing-email';
import { runMemoryExtractionJob } from '../services/memory-extraction-cron';
import { sendSolarReturnBirthdayEmails } from '../services/email/solar-return-birthday-email';
import { runGiftExpirySweep } from '../services/gift-expiry-cron';

const router = Router();

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
 * Called by Railway cron (once per day at 04:00 UTC)
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/streak-maintenance', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'Cron secret is not configured' } });
    }
    if (req.headers['x-cron-secret'] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } });
    }

    const reverted = await revertExpiredTrials();
    return res.json({ success: true, data: { trialsReverted: reverted } });
  } catch (error) {
    console.error('[Cron] streak-maintenance error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Streak maintenance failed' } });
  }
});

/**
 * POST /api/v1/cron/daily-transits
 * Pre-warm global planetary positions Redis cache for today.
 * Run at 01:00 UTC — before forecasts — so the first Oracle request of the day
 * doesn't pay the astrology-api.io latency cost.
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/daily-transits', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'Cron secret is not configured' } });
    }
    if (req.headers['x-cron-secret'] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } });
    }

    const result = await warmDailyTransitsCache();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Cron] daily-transits error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Daily transits warm-up failed' } });
  }
});

/**
 * POST /api/v1/cron/daily-forecasts
 * Pre-generate horoscope + daily forecast for all PRO/PREMIUM users with birth data.
 * Run at 02:00 UTC (after daily-transits at 01:00).
 * The internal setInterval scheduler in forecast-cron.ts remains as a safety net.
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/daily-forecasts', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'Cron secret is not configured' } });
    }
    if (req.headers['x-cron-secret'] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } });
    }

    // Fire-and-forget — job can take several minutes for large user bases
    runNightlyForecastJob().catch(err => console.error('[Cron] daily-forecasts job error:', err));
    return res.json({ success: true, message: 'Forecast generation started' });
  } catch (error) {
    console.error('[Cron] daily-forecasts error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Daily forecasts cron failed' } });
  }
});

/**
 * POST /api/v1/cron/daily-horoscope-emails
 * Send daily horoscope emails to opted-in users.
 * Schedule: 07:00 UTC (09:00 Bulgaria time) — runs after daily-forecasts cron (02:00 UTC).
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/daily-horoscope-emails', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'Cron secret is not configured' } });
    }
    if (req.headers['x-cron-secret'] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } });
    }

    const result = await sendDailyHoroscopeEmails();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Cron] daily-horoscope-emails error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Daily horoscope emails cron failed' } });
  }
});

/**
 * POST /api/v1/cron/morning-briefing-emails
 * Send morning briefing emails to users whose local time is 06:00-08:00.
 * Schedule: every hour — 0 * * * * (Railway cron)
 * Each run processes only users currently in their 06:00-08:00 local window.
 * Redis dedup ensures one email per user per day.
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/morning-briefing-emails', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'Cron secret is not configured' } });
    }
    if (req.headers['x-cron-secret'] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } });
    }

    const result = await sendMorningBriefingEmails();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Cron] morning-briefing-emails error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Morning briefing emails cron failed' } });
  }
});

/**
 * POST /api/v1/cron/memory-extraction
 * Nightly Haiku memory extraction — scan last 24h Oracle conversations for
 * PRO/PREMIUM users, extract facts, embed, dedup, and store in user_memories.
 * Schedule: 03:00 UTC (after daily-forecasts at 02:00).
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/memory-extraction', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'Cron secret is not configured' } });
    }
    if (req.headers['x-cron-secret'] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } });
    }

    // Fire-and-forget — job can take several minutes for large user bases
    runMemoryExtractionJob().catch(err => console.error('[Cron] memory-extraction job error:', err));
    return res.json({ success: true, message: 'Memory extraction started' });
  } catch (error) {
    console.error('[Cron] memory-extraction error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Memory extraction cron failed' } });
  }
});

/**
 * POST /api/v1/cron/solar-return-birthday
 * Send Solar Return birthday emails to users whose birthday is tomorrow.
 * Schedule: 09:00 UTC daily (fire ≤24h before solar return date).
 * Feb 29 birthdays receive email on Feb 28 in non-leap years.
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/solar-return-birthday', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'Cron secret is not configured' } });
    }
    if (req.headers['x-cron-secret'] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } });
    }

    const result = await sendSolarReturnBirthdayEmails();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Cron] solar-return-birthday error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Solar return birthday emails cron failed' } });
  }
});

/**
 * POST /api/v1/cron/gift-expiry-sweep
 * Daily: expire gift subscriptions past their end date and mark unclaimed
 * gift codes past their 1-year claim window as EXPIRED (FEAT-14-F).
 * Schedule: 05:00 UTC (after streak-maintenance at 04:00).
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/gift-expiry-sweep', async (req: Request, res: Response) => {
  try {
    const configuredSecret = getCronSecret();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'Cron secret is not configured' } });
    }
    if (req.headers['x-cron-secret'] !== configuredSecret) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } });
    }

    const result = await runGiftExpirySweep();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Cron] gift-expiry-sweep error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Gift expiry sweep failed' } });
  }
});

export default router;
