"use strict";
/**
 * Cron Routes
 *
 * Endpoints for scheduled jobs (called by Railway cron or external cron services).
 * All endpoints require X-Cron-Secret header for authentication.
 *
 * Schedule (UTC):
 *   01:00 — daily-transits        (warm planetary positions cache)
 *   02:00 — daily-forecasts       (pre-generate PRO/PREMIUM horoscopes)
 *   04:00 — streak-maintenance    (revert expired PRO trials)
 *   07:00 — daily-horoscope-emails (send horoscope emails to opted-in users)
 *   daily  — email-lifecycle      (Day 1–30 lifecycle email sequence)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cron_1 = require("../utils/cron");
const lifecycle_1 = require("../services/email/lifecycle");
const streakService_1 = require("../services/streakService");
const forecast_cron_1 = require("../services/forecast-cron");
const transits_1 = require("../services/transits");
const horoscope_email_1 = require("../services/email/horoscope-email");

const router = (0, express_1.Router)();

/** Shared auth check — returns true if request is authorized */
function authCheck(req, res) {
    const configuredSecret = (0, cron_1.getCronSecret)();
    if (!configuredSecret) {
        res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED', message: 'Cron secret is not configured' } });
        return false;
    }
    if (req.headers['x-cron-secret'] !== configuredSecret) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } });
        return false;
    }
    return true;
}

/**
 * POST /api/v1/cron/email-lifecycle
 * Run lifecycle email sequence (Day 1–30). Call daily.
 */
router.post('/email-lifecycle', async (req, res) => {
    try {
        if (!authCheck(req, res)) return;
        const result = await (0, lifecycle_1.runLifecycleCron)();
        return res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('[Cron] email-lifecycle error:', error);
        return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Lifecycle cron failed' } });
    }
});

/**
 * POST /api/v1/cron/streak-maintenance
 * Revert expired PRO trials from streak rewards. Run daily at 04:00 UTC.
 */
router.post('/streak-maintenance', async (req, res) => {
    try {
        if (!authCheck(req, res)) return;
        const reverted = await (0, streakService_1.revertExpiredTrials)();
        return res.json({ success: true, data: { trialsReverted: reverted } });
    }
    catch (error) {
        console.error('[Cron] streak-maintenance error:', error);
        return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Streak maintenance failed' } });
    }
});

/**
 * POST /api/v1/cron/daily-transits
 * Pre-warm global planetary positions Redis cache. Run at 01:00 UTC.
 */
router.post('/daily-transits', async (req, res) => {
    try {
        if (!authCheck(req, res)) return;
        const result = await (0, transits_1.warmDailyTransitsCache)();
        return res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('[Cron] daily-transits error:', error);
        return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Daily transits warm-up failed' } });
    }
});

/**
 * POST /api/v1/cron/daily-forecasts
 * Pre-generate horoscope + daily forecast for all PRO/PREMIUM users. Run at 02:00 UTC.
 * Fire-and-forget — returns immediately; job runs in background.
 */
router.post('/daily-forecasts', async (req, res) => {
    try {
        if (!authCheck(req, res)) return;
        // Fire-and-forget — job can take several minutes for large user bases
        (0, forecast_cron_1.runNightlyForecastJob)().catch(err => console.error('[Cron] daily-forecasts job error:', err));
        return res.json({ success: true, message: 'Forecast generation started' });
    }
    catch (error) {
        console.error('[Cron] daily-forecasts error:', error);
        return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Daily forecasts cron failed' } });
    }
});

/**
 * POST /api/v1/cron/daily-horoscope-emails
 * Send daily horoscope emails to opted-in users. Run at 07:00 UTC (09:00 Bulgaria time).
 * Runs after daily-forecasts (02:00 UTC) to ensure forecasts are available for PRO/PREMIUM.
 */
router.post('/daily-horoscope-emails', async (req, res) => {
    try {
        if (!authCheck(req, res)) return;
        const result = await (0, horoscope_email_1.sendDailyHoroscopeEmails)();
        return res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('[Cron] daily-horoscope-emails error:', error);
        return res.status(500).json({ success: false, error: { code: 'CRON_ERROR', message: 'Daily horoscope emails cron failed' } });
    }
});

exports.default = router;
//# sourceMappingURL=cron.js.map
