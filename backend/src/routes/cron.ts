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
import { runTransitForecastCron } from '../services/transit-forecast-cron';

const router = Router();

function validateCronSecret(req: Request, res: Response): string | null {
  const configuredSecret = getCronSecret();
  if (!configuredSecret) {
    res.status(503).json({
      success: false,
      error: {
        code: 'CRON_NOT_CONFIGURED',
        message: 'Cron secret is not configured on this environment',
      },
    });
    return null;
  }

  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== configuredSecret) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing cron secret',
      },
    });
    return null;
  }

  return configuredSecret;
}

/**
 * POST /api/v1/cron/email-lifecycle
 * Run lifecycle email sequence (Day 1–30)
 */
router.post('/email-lifecycle', async (req: Request, res: Response) => {
  try {
    if (!validateCronSecret(req, res)) return;
    const result = await runLifecycleCron();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Cron] email-lifecycle error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Lifecycle cron failed' } });
  }
});

/**
 * POST /api/v1/cron/streak-maintenance
 * Daily: revert expired PRO trials from streak rewards
 */
router.post('/streak-maintenance', async (req: Request, res: Response) => {
  try {
    if (!validateCronSecret(req, res)) return;
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
 */
router.post('/daily-transits', async (req: Request, res: Response) => {
  try {
    if (!validateCronSecret(req, res)) return;
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
 */
router.post('/daily-forecasts', async (req: Request, res: Response) => {
  try {
    if (!validateCronSecret(req, res)) return;
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
 */
router.post('/daily-horoscope-emails', async (req: Request, res: Response) => {
  try {
    if (!validateCronSecret(req, res)) return;
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
 */
router.post('/morning-briefing-emails', async (req: Request, res: Response) => {
  try {
    if (!validateCronSecret(req, res)) return;
    const result = await sendMorningBriefingEmails();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Cron] morning-briefing-emails error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Morning briefing emails cron failed' } });
  }
});

/**
 * POST /api/v1/cron/memory-extraction
 * Nightly Haiku memory extraction job.
 */
router.post('/memory-extraction', async (req: Request, res: Response) => {
  try {
    if (!validateCronSecret(req, res)) return;
    runMemoryExtractionJob().catch(err => console.error('[Cron] memory-extraction job error:', err));
    return res.json({ success: true, message: 'Memory extraction started' });
  } catch (error) {
    console.error('[Cron] memory-extraction error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Memory extraction cron failed' } });
  }
});

/**
 * POST /api/v1/cron/transit-forecasts
 * Refresh user transit forecast windows for the next 7 days.
 */
router.post('/transit-forecasts', async (req: Request, res: Response) => {
  try {
    if (!validateCronSecret(req, res)) return;
    const result = await runTransitForecastCron();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Cron] transit-forecasts error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Transit forecast cron failed' } });
  }
});

/**
 * POST /api/v1/cron/solar-return-birthday
 * Send Solar Return birthday emails to users whose birthday is tomorrow.
 */
router.post('/solar-return-birthday', async (req: Request, res: Response) => {
  try {
    if (!validateCronSecret(req, res)) return;
    const result = await sendSolarReturnBirthdayEmails();
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Cron] solar-return-birthday error:', error);
    return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Solar return birthday emails cron failed' } });
  }
});

export default router;
