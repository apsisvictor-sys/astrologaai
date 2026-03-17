"use strict";
/**
 * Forecast Cron Service
 *
 * Runs a nightly job at 02:00 UTC to pre-generate horoscopes and daily
 * forecasts for every PRO/PREMIUM user who has birth data.
 *
 * Results are stored in the `daily_forecasts` DB table.  API endpoints
 * read from that table — zero LLM calls happen on page load.
 *
 * Mid-day new signups: the API endpoint falls back to on-demand generation
 * and stores the result so it's only ever called once per user per day.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDailyForecastTable = ensureDailyForecastTable;
exports.getStoredForecast = getStoredForecast;
exports.storeForecast = storeForecast;
exports.runNightlyForecastJob = runNightlyForecastJob;
exports.startForecastCron = startForecastCron;
const prisma_1 = require("../utils/prisma");
const forecast_1 = require("./forecast");
// ─── helpers ────────────────────────────────────────────────────────────────
function todayString() {
    return new Date().toISOString().split('T')[0]; // "2026-03-14"
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// ─── ensure table exists (runs once at startup) ──────────────────────────────
async function ensureDailyForecastTable() {
    try {
        await prisma_1.prisma.$executeRaw `
      CREATE TABLE IF NOT EXISTS daily_forecasts (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date         TEXT NOT NULL,
        horoscope    JSONB,
        forecast     JSONB,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id, date)
      )
    `;
        await prisma_1.prisma.$executeRaw `
      CREATE INDEX IF NOT EXISTS daily_forecasts_date_idx ON daily_forecasts(date)
    `;
        console.log('[ForecastCron] daily_forecasts table ready');
    }
    catch (err) {
        console.error('[ForecastCron] Failed to ensure table:', err);
    }
}
// ─── DB read / write ─────────────────────────────────────────────────────────
async function getStoredForecast(userId, date) {
    try {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT horoscope, forecast
      FROM   daily_forecasts
      WHERE  user_id = ${userId}
      AND    date    = ${date}
      LIMIT  1
    `;
        return rows[0] ?? null;
    }
    catch {
        return null;
    }
}
async function storeForecast(userId, date, horoscope, forecast) {
    try {
        await prisma_1.prisma.$executeRaw `
      INSERT INTO daily_forecasts (id, user_id, date, horoscope, forecast, generated_at)
      VALUES (gen_random_uuid()::text, ${userId}, ${date}, ${horoscope}::jsonb, ${forecast}::jsonb, now())
      ON CONFLICT (user_id, date) DO UPDATE
        SET horoscope    = EXCLUDED.horoscope,
            forecast     = EXCLUDED.forecast,
            generated_at = now()
    `;
    }
    catch (err) {
        console.error(`[ForecastCron] Failed to store forecast for ${userId}:`, err);
    }
}
// ─── generate for a single user ──────────────────────────────────────────────
async function generateForUser(user) {
    if (!user.birthData)
        return;
    const date = todayString();
    const existing = await getStoredForecast(user.id, date);
    if (existing?.horoscope && existing?.forecast) {
        // Already generated today — skip
        return;
    }
    const birthDate = new Date(user.birthData.date);
    const [hour, minute] = (user.birthData.time || '12:00').split(':').map(Number);
    const birthData = {
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        day: birthDate.getDate(),
        hour: hour || 12,
        minute: minute || 0,
        latitude: user.birthData.latitude,
        longitude: user.birthData.longitude,
        timezone: user.birthData.timezone || 'UTC',
    };
    let horoscope = null;
    let forecast = null;
    try {
        horoscope = await (0, forecast_1.getPersonalDailyHoroscope)(user.id, birthData);
    }
    catch (err) {
        console.warn(`[ForecastCron] Horoscope failed for ${user.id}:`, err);
    }
    try {
        forecast = await (0, forecast_1.generateDailyForecast)(user.id, birthData, user.language);
    }
    catch (err) {
        console.warn(`[ForecastCron] Forecast failed for ${user.id}:`, err);
    }
    if (horoscope || forecast) {
        await storeForecast(user.id, date, horoscope, forecast);
        console.log(`[ForecastCron] Generated for user ${user.id}`);
    }
}
// ─── nightly job ─────────────────────────────────────────────────────────────
let lastRunDate = '';
async function runNightlyForecastJob() {
    const date = todayString();
    if (lastRunDate === date) {
        console.log('[ForecastCron] Already ran today, skipping');
        return;
    }
    console.log(`[ForecastCron] Starting nightly generation for ${date}`);
    lastRunDate = date;
    let users;
    try {
        users = await prisma_1.prisma.user.findMany({
            where: {
                tier: { in: ['PRO', 'PREMIUM'] },
                birthData: { isNot: null },
                isSuspended: false,
            },
            select: {
                id: true,
                language: true,
                birthData: {
                    select: { date: true, time: true, latitude: true, longitude: true, timezone: true },
                },
            },
        });
    }
    catch (err) {
        console.error('[ForecastCron] Failed to fetch users:', err);
        lastRunDate = ''; // allow retry
        return;
    }
    console.log(`[ForecastCron] Processing ${users.length} paid users`);
    for (const user of users) {
        try {
            await generateForUser(user);
        }
        catch (err) {
            console.error(`[ForecastCron] Unexpected error for user ${user.id}:`, err);
        }
        // 2-second gap between users to avoid hammering LLM rate limits
        await delay(2000);
    }
    console.log(`[ForecastCron] Done for ${date}`);
}
// ─── scheduler ───────────────────────────────────────────────────────────────
/**
 * Start the nightly cron.  Checks every hour whether it is 02:00 UTC and
 * whether the job has already run today.  If both conditions are met, runs.
 */
function startForecastCron() {
    console.log('[ForecastCron] Scheduler started — will run daily at 02:00 UTC');
    const checkAndRun = () => {
        const now = new Date();
        const hourUtc = now.getUTCHours();
        if (hourUtc === 2) {
            runNightlyForecastJob().catch(err => console.error('[ForecastCron] Job error:', err));
        }
    };
    // Run check every hour
    setInterval(checkAndRun, 60 * 60 * 1000);
    // Also run once on startup — useful if server restarts after 2am
    checkAndRun();
}
//# sourceMappingURL=forecast-cron.js.map