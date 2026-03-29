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

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { prisma } from '../utils/prisma';
import { cleanupExpiredAspectCooldowns } from './aspect-cooldown-job';
import { generateDailyForecast, getPersonalDailyHoroscope } from './forecast';

// ─── helpers ────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().split('T')[0]; // "2026-03-14"
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── ensure table exists (runs once at startup) ──────────────────────────────

export async function ensureDailyForecastTable(): Promise<void> {
  try {
    await prisma.$executeRaw`
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
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS daily_forecasts_date_idx ON daily_forecasts(date)
    `;
    console.log('[ForecastCron] daily_forecasts table ready');
  } catch (err) {
    console.error('[ForecastCron] Failed to ensure table:', err);
  }
}

// ─── DB read / write ─────────────────────────────────────────────────────────

export async function getStoredForecast(userId: string, date: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{
      horoscope: any;
      forecast: any;
    }>>`
      SELECT horoscope, forecast
      FROM   daily_forecasts
      WHERE  user_id = ${userId}
      AND    date    = ${date}
      LIMIT  1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function storeForecast(
  userId: string,
  date: string,
  horoscope: any | null,
  forecast: any | null,
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO daily_forecasts (id, user_id, date, horoscope, forecast, generated_at)
      VALUES (gen_random_uuid()::text, ${userId}, ${date}, ${horoscope}::jsonb, ${forecast}::jsonb, now())
      ON CONFLICT (user_id, date) DO UPDATE
        SET horoscope    = EXCLUDED.horoscope,
            forecast     = EXCLUDED.forecast,
            generated_at = now()
    `;
  } catch (err) {
    console.error(`[ForecastCron] Failed to store forecast for ${userId}:`, err);
  }
}

// ─── DB queries for date ranges (used by best-days endpoint) ────────────────

export async function getStoredForecasts(
  userId: string,
  dateFrom: string,
  dateTo: string,
): Promise<Array<{ date: string; horoscope: any; forecast: any }>> {
  try {
    return await prisma.$queryRaw<Array<{ date: string; horoscope: any; forecast: any }>>`
      SELECT date, horoscope, forecast
      FROM   daily_forecasts
      WHERE  user_id = ${userId}
      AND    date >= ${dateFrom}
      AND    date <= ${dateTo}
      ORDER BY date ASC
    `;
  } catch {
    return [];
  }
}

// ─── helpers (date arithmetic) ───────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── generate for a single user ──────────────────────────────────────────────

type CronUser = {
  id: string;
  language: string;
  tier?: string;
  birthProfile: {
    birthDate: Date;
    birthTime: string | null;
    latitude: number;
    longitude: number;
    timezone: string;
  } | null;
};

function toBirthData(user: CronUser) {
  if (!user.birthProfile) return null;
  const birthDate = new Date(user.birthProfile.birthDate);
  const [hour, minute] = (user.birthProfile.birthTime || '12:00').split(':').map(Number);
  return {
    year: birthDate.getFullYear(),
    month: birthDate.getMonth() + 1,
    day: birthDate.getDate(),
    hour: hour || 12,
    minute: minute || 0,
    latitude: user.birthProfile.latitude,
    longitude: user.birthProfile.longitude,
    timezone: user.birthProfile.timezone || 'UTC',
  };
}

async function generateForUser(user: CronUser): Promise<void> {
  if (!user.birthProfile) return;

  const date = todayString();
  const existing = await getStoredForecast(user.id, date);
  if (existing?.horoscope && existing?.forecast) {
    // Already generated today — but check if PREMIUM needs oracleInsight added
    if (user.tier === 'PREMIUM') {
      const existingForecast = existing.forecast as any;
      if (!existingForecast?.oracleInsight) {
        const insight = await generateOracleInsight(existingForecast, user.language);
        if (insight) {
          await storeForecast(user.id, date, existing.horoscope, { ...existingForecast, oracleInsight: insight });
        }
      }
    }
    return;
  }

  const birthData = toBirthData(user)!;

  let horoscope: any = null;
  let forecast: any = null;

  try {
    horoscope = await getPersonalDailyHoroscope(user.id, birthData);
  } catch (err) {
    console.warn(`[ForecastCron] Horoscope failed for ${user.id}:`, err);
  }

  try {
    forecast = await generateDailyForecast(user.id, birthData, user.language);
  } catch (err) {
    console.warn(`[ForecastCron] Forecast failed for ${user.id}:`, err);
  }

  // PREMIUM: generate a one-sentence Oracle Insight using Claude Haiku (~€0.002/user/day)
  if (user.tier === 'PREMIUM' && forecast) {
    try {
      const insight = await generateOracleInsight(forecast, user.language);
      if (insight) forecast = { ...forecast, oracleInsight: insight };
    } catch (err) {
      console.warn(`[ForecastCron] Oracle Insight failed for ${user.id}:`, err);
    }
  }

  if (horoscope || forecast) {
    await storeForecast(user.id, date, horoscope, forecast);
    console.log(`[ForecastCron] Generated for user ${user.id}${user.tier === 'PREMIUM' ? ' (+ Oracle Insight)' : ''}`);
  }
}

// ─── 7-day lookahead (Best Days calendar data) ──────────────────────────────

const LOOKAHEAD_DAYS = 7;

async function generateLookaheadForUser(user: CronUser): Promise<void> {
  if (!user.birthProfile) return;
  const birthData = toBirthData(user)!;
  const today = todayString();

  for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset++) {
    const dateStr = addDays(today, offset);

    // Skip if already stored
    const existing = await getStoredForecast(user.id, dateStr);
    if (existing?.horoscope) {
      // PREMIUM: ensure oracleCommentary exists
      if (user.tier === 'PREMIUM') {
        const h = existing.horoscope as any;
        if (!h.oracleCommentary) {
          const commentary = await generateOracleCommentary(h, user.language);
          if (commentary) {
            await storeForecast(user.id, dateStr, { ...h, oracleCommentary: commentary }, existing.forecast);
          }
        }
      }
      continue;
    }

    try {
      const horoscope = await getPersonalDailyHoroscope(user.id, birthData, dateStr);

      // PREMIUM: add oracle commentary
      if (user.tier === 'PREMIUM') {
        const commentary = await generateOracleCommentary(horoscope, user.language);
        if (commentary) {
          (horoscope as any).oracleCommentary = commentary;
        }
      }

      await storeForecast(user.id, dateStr, horoscope, null);
      console.log(`[ForecastCron] Lookahead ${dateStr} generated for ${user.id}`);
    } catch (err) {
      console.warn(`[ForecastCron] Lookahead ${dateStr} failed for ${user.id}:`, err);
    }

    // 1-second gap to respect API rate limits
    await delay(1000);
  }
}

/**
 * Generate a one-sentence personalized Oracle Insight using Claude Haiku.
 * Used for PREMIUM tier users in the morning briefing.
 * Cost: ~€0.002/user/day.
 */
async function generateOracleInsight(forecast: any, language: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const moonPhase = forecast?.moonPhase?.phase || forecast?.moonPhase?.phaseBg || 'current moon phase';
  const energy = forecast?.energy || 'moderate';
  const topTransit = forecast?.transits?.[0];
  const transitDesc = topTransit
    ? `${topTransit.planet} in ${topTransit.sign}`
    : 'current transits';

  const prompt = language === 'bg'
    ? `Ти си мъдър астрологичен оракул. Напиши ТОЧНО ЕДНО изречение (максимум 25 думи) — дълбоко, поетично послание за деня, вдъхновено от: луна ${moonPhase}, енергия ${energy}, ${transitDesc}. Само изречението, без встъпление.`
    : `You are a wise astrological Oracle. Write EXACTLY ONE sentence (max 25 words) — a deep, poetic message for today inspired by: ${moonPhase} moon, ${energy} energy, ${transitDesc}. Just the sentence, no preamble.`;

  try {
    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      maxTokens: 80,
    });
    return result.text.trim().replace(/^["']|["']$/g, ''); // strip surrounding quotes if any
  } catch (err) {
    console.warn('[ForecastCron] Oracle Insight generation error:', err);
    return null;
  }
}

/**
 * Generate a 2-3 sentence Oracle-voice commentary for a Best Days calendar entry.
 * Used for PREMIUM tier only. Input: the day's horoscope (with transits + area ratings).
 */
async function generateOracleCommentary(horoscope: any, language: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const areas = (horoscope?.lifeAreas ?? [])
    .map((a: any) => `${a.area}: ${a.rating}/5`)
    .join(', ');
  const topInfluence = horoscope?.planetaryInfluences?.[0];
  const transitDesc = topInfluence
    ? `${topInfluence.planet} ${topInfluence.aspectType} ${topInfluence.natalPlanet}`
    : 'current transits';

  const prompt = language === 'bg'
    ? `Ти си мъдър астрологичен оракул. Напиши 2-3 кратки изречения (макс 50 думи) — поетично послание за деня. Области: ${areas}. Ключов транзит: ${transitDesc}. Само текста, без встъпление.`
    : `You are a wise astrological Oracle. Write 2-3 short sentences (max 50 words) — a poetic daily message. Areas: ${areas}. Key transit: ${transitDesc}. Just the text, no preamble.`;

  try {
    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      maxTokens: 120,
    });
    return result.text.trim().replace(/^["']|["']$/g, '');
  } catch (err) {
    console.warn('[ForecastCron] Oracle Commentary generation error:', err);
    return null;
  }
}

// ─── nightly job ─────────────────────────────────────────────────────────────

let lastRunDate = '';

export async function runNightlyForecastJob(): Promise<void> {
  await cleanupExpiredAspectCooldowns();

  const date = todayString();
  if (lastRunDate === date) {
    console.log('[ForecastCron] Already ran today, skipping');
    return;
  }

  console.log(`[ForecastCron] Starting nightly generation for ${date}`);
  lastRunDate = date;

  let users: Array<{
    id: string;
    language: string;
    tier: string;
    birthProfile: {
      birthDate: Date;
      birthTime: string | null;
      latitude: number;
      longitude: number;
      timezone: string;
    } | null;
  }>;

  try {
    const rawUsers = await prisma.user.findMany({
      where: {
        tier: { in: ['PRO', 'PREMIUM'] },
        birthProfiles: { some: {} },
        isSuspended: false,
      },
      select: {
        id: true,
        language: true,
        tier: true,
        birthProfiles: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { birthDate: true, birthTime: true, latitude: true, longitude: true, timezone: true },
        },
      },
    });
    users = rawUsers.map(u => ({
      id: u.id,
      language: u.language,
      tier: u.tier,
      birthProfile: u.birthProfiles[0] ?? null,
    }));
  } catch (err) {
    console.error('[ForecastCron] Failed to fetch users:', err);
    lastRunDate = ''; // allow retry
    return;
  }

  console.log(`[ForecastCron] Processing ${users.length} paid users`);

  for (const user of users) {
    try {
      await generateForUser(user);
    } catch (err) {
      console.error(`[ForecastCron] Unexpected error for user ${user.id}:`, err);
    }
    // 2-second gap between users to avoid hammering LLM rate limits
    await delay(2000);
  }

  // ── 7-day lookahead for Best Days calendar ──
  console.log(`[ForecastCron] Starting 7-day lookahead for ${users.length} users`);
  for (const user of users) {
    try {
      await generateLookaheadForUser(user);
    } catch (err) {
      console.error(`[ForecastCron] Lookahead error for user ${user.id}:`, err);
    }
    await delay(2000);
  }

  console.log(`[ForecastCron] Done for ${date} (today + ${LOOKAHEAD_DAYS}-day lookahead)`);
}

// ─── scheduler ───────────────────────────────────────────────────────────────

/**
 * Start the nightly cron.  Checks every hour whether it is 02:00 UTC and
 * whether the job has already run today.  If both conditions are met, runs.
 */
export function startForecastCron(): void {
  console.log('[ForecastCron] Scheduler started — will run daily at 02:00 UTC');

  const checkAndRun = () => {
    const now = new Date();
    const hourUtc = now.getUTCHours();
    if (hourUtc === 2) {
      runNightlyForecastJob().catch(err =>
        console.error('[ForecastCron] Job error:', err),
      );
    }
  };

  // Run check every hour
  setInterval(checkAndRun, 60 * 60 * 1000);

  // Also run once on startup — useful if server restarts after 2am
  checkAndRun();
}
