/**
 * Horoscope Email Service — PIX-133 / FEAT-03
 *
 * Sends daily horoscope emails to opted-in users:
 *   PRO/PREMIUM — full horoscope (general theme, love, career, lucky numbers, power hours)
 *   FREE        — teaser (general theme full + love/career first sentence) + upgrade CTA
 *
 * Foundation for PIX-103 (Morning Briefing / FEAT-13) — shared targeting + dedup infra.
 */

import { render } from '@react-email/render';
import { Resend } from 'resend';
import crypto from 'crypto';
import { prisma } from '../../utils/prisma';
import { redisClient } from '../../utils/redis';
import { HoroscopeProEmail } from '../../emails/HoroscopeProEmail';
import { HoroscopeFreeEmail } from '../../emails/HoroscopeFreeEmail';
import { getStoredForecast } from '../forecast-cron';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://astrologa.bg';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@astrologa.bg';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]; // "2026-03-25"
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

function buildUnsubscribeUrl(token: string, language: string): string {
  const locale = language === 'bg' ? '' : 'en/';
  return `${FRONTEND_URL}/${locale}notifications/unsubscribe?token=${token}&type=dailyHoroscope`;
}

function buildForecastUrl(language: string): string {
  const locale = language === 'bg' ? '' : 'en/';
  return `${FRONTEND_URL}/${locale}forecast?ref=horoscope-email&utm_source=email&utm_medium=daily`;
}

function buildUpgradeUrl(language: string): string {
  const locale = language === 'bg' ? '' : 'en/';
  return `${FRONTEND_URL}/${locale}pricing?ref=horoscope-email&utm_source=email&utm_medium=daily`;
}

// ─── Redis dedup + failure tracking ──────────────────────────────────────────

/** One send per user per date — 48h TTL */
async function checkAndMarkSent(userId: string, date: string): Promise<boolean> {
  const key = `email_horoscope:${userId}:${date}`;
  const existing = await redisClient.get(key);
  if (existing) return false;
  await redisClient.setEx(key, 60 * 60 * 48, '1');
  return true;
}

/** Remove dedup mark so the user can be retried */
async function clearDedup(userId: string, date: string): Promise<void> {
  await redisClient.del(`email_horoscope:${userId}:${date}`);
}

/**
 * Track consecutive send failures.
 * After 3 failures, auto-disable dailyHoroscope preference.
 */
async function handleSendFailure(userId: string): Promise<void> {
  const key = `email_horoscope_fail:${userId}`;
  const current = await redisClient.get(key);
  const count = parseInt(current || '0', 10) + 1;
  await redisClient.setEx(key, 60 * 60 * 24 * 30, String(count)); // 30-day TTL

  if (count >= 3) {
    await prisma.notificationPreference.updateMany({
      where: { userId },
      data: { dailyHoroscope: false },
    });
    await redisClient.del(key);
    console.log(`[HoroscopeEmail] Auto-disabled dailyHoroscope for ${userId} after 3 consecutive failures`);
  }
}

/** Reset failure counter on successful send */
async function resetFailureCounter(userId: string): Promise<void> {
  await redisClient.del(`email_horoscope_fail:${userId}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Ensure user has an unsubscribeToken — generate and persist if missing */
async function ensureUnsubscribeToken(userId: string): Promise<string> {
  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (pref?.unsubscribeToken) return pref.unsubscribeToken;

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.notificationPreference.upsert({
    where: { userId },
    update: { unsubscribeToken: token },
    create: { userId, unsubscribeToken: token },
  });
  return token;
}

/** Format date for display in email */
function formatDateForEmail(language: string): string {
  const now = new Date();
  if (language === 'bg') {
    const bgMonths = [
      'януари', 'февруари', 'март', 'април', 'май', 'юни',
      'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
    ];
    const bgDays = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];
    return `${bgDays[now.getDay()]}, ${now.getDate()} ${bgMonths[now.getMonth()]} ${now.getFullYear()}`;
  }
  return now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Format short date for email subject line */
function formatShortDateForSubject(language: string): string {
  const now = new Date();
  if (language === 'bg') {
    const bgMonths = [
      'яну', 'фев', 'мар', 'апр', 'май', 'юни',
      'юли', 'авг', 'сеп', 'окт', 'ное', 'дек',
    ];
    return `${now.getDate()} ${bgMonths[now.getMonth()]}`;
  }
  return now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

/** Extract sun + moon sign from BirthChart.chartData */
function extractSigns(chartData: any): { sunSign?: string; moonSign?: string } {
  if (!chartData) return {};
  return {
    sunSign: chartData?.sun?.sign ?? undefined,
    moonSign: chartData?.moon?.sign ?? undefined,
  };
}

/** First sentence of a paragraph — used for FREE user teaser */
function firstSentence(text: string): string {
  const match = text.match(/[^.!?]+[.!?]/);
  return match ? match[0].trim() : text;
}

/**
 * Day-seeded static content for FREE users (no LLM cost).
 * 7 variants rotate by day-of-week for mild variety.
 */
function getFreeUserContent(_sunSign: string | undefined): {
  generalTheme: string;
  loveTeaser: string;
  careerTeaser: string;
} {
  const day = new Date().getDay();
  const generalThemes = [
    'Today brings a period of reflection and inner clarity. The cosmic energy supports thoughtful decisions and meaningful conversations.',
    'The stars align to bring opportunities for connection and growth. Stay open to new perspectives today.',
    'A powerful day for setting intentions. The planetary energies support your ambitions and creative impulses.',
    'Balance is the theme today. Take time to nurture both your inner world and your relationships with others.',
    "Today's energy favors patience and steady progress. Small steps lead to significant breakthroughs.",
    'The cosmic currents invite you to trust your intuition. Your instincts are sharper than usual today.',
    'Today is ideal for communication and collaboration. Express yourself clearly and listen actively.',
  ];
  const loveTeasers = [
    'The stars support heartfelt conversations with loved ones today.',
    'An opportunity for deeper emotional connection emerges today.',
    "Today's energy brings warmth to your romantic connections.",
    'Open your heart — the stars support vulnerability and closeness.',
    'A gentle day for love — nurture your most important bonds.',
    'Romantic energy is heightened; trust what your heart tells you.',
    'Connection flows easily today — reach out to those who matter most.',
  ];
  const careerTeasers = [
    'Your professional efforts are noticed today — keep moving forward.',
    'A favorable time for tackling challenging tasks at work.',
    'Today brings clarity on a professional question you have been pondering.',
    'Collaborative efforts shine today — lean into teamwork.',
    'Your creative instincts are an asset in professional settings today.',
    'A steady, focused approach brings the best results today.',
    'Today is well-suited for planning and organizing your professional goals.',
  ];

  return {
    generalTheme: generalThemes[day],
    loveTeaser: loveTeasers[day],
    careerTeaser: careerTeasers[day],
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface HoroscopeEmailResult {
  processed: number;
  sent: number;
  errors: number;
}

/**
 * Send daily horoscope emails to all opted-in users.
 *
 * Targeting rules:
 *   - emailVerified=true, not suspended
 *   - notificationPreference.dailyHoroscope=true AND emailEnabled=true
 *   - PRO/PREMIUM: always included (if above conditions met)
 *   - FREE: only active in last 7 days (lastQueryDate >= 7 days ago)
 *   - Must have a birth chart
 *
 * Redis dedup key: email_horoscope:{userId}:{date} (48h TTL)
 * Rate limit: 2s delay between sends (matches forecast-cron pattern)
 * Auto-disable: after 3 consecutive failures, sets dailyHoroscope=false
 */
export async function sendDailyHoroscopeEmails(): Promise<HoroscopeEmailResult> {
  const date = todayString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      emailVerified: true,
      isSuspended: false,
      notificationPreference: {
        dailyHoroscope: true,
        emailEnabled: true,
      },
      OR: [
        { tier: { in: ['PRO', 'PREMIUM'] } },
        { tier: 'FREE', lastQueryDate: { gte: sevenDaysAgo } },
      ],
      birthChart: { isNot: null },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      language: true,
      tier: true,
      birthChart: { select: { chartData: true } },
    },
  });

  let processed = 0;
  let sent = 0;
  let errors = 0;

  for (const user of users) {
    processed++;

    try {
      const canSend = await checkAndMarkSent(user.id, date);
      if (!canSend) continue;

      const token = await ensureUnsubscribeToken(user.id);
      const lang = user.language || 'bg';
      const unsubUrl = buildUnsubscribeUrl(token, lang);
      const dateStr = formatDateForEmail(lang);
      const shortDate = formatShortDateForSubject(lang);
      const { sunSign, moonSign } = extractSigns(user.birthChart?.chartData);

      const subject =
        lang === 'bg'
          ? `✦ Твоят хороскоп за ${shortDate}`
          : `✦ Your horoscope for ${shortDate}`;

      let html: string;

      if (user.tier === 'PRO' || user.tier === 'PREMIUM') {
        // Read pre-generated forecast from DB
        const stored = await getStoredForecast(user.id, date);
        const forecastData = stored?.forecast as any;

        if (!forecastData?.horoscope) {
          // Forecast cron hasn't run yet or failed — skip and allow retry
          await clearDedup(user.id, date);
          continue;
        }

        html = await render(
          HoroscopeProEmail({
            firstName: user.fullName ?? undefined,
            sunSign,
            moonSign,
            date: dateStr,
            generalTheme: forecastData.horoscope.general || forecastData.overallTheme || '',
            love: forecastData.horoscope.love || '',
            career: forecastData.horoscope.career || '',
            luckyNumbers: forecastData.horoscope.luckyNumbers || [],
            powerHours: forecastData.horoscope.powerHours || [],
            forecastUrl: buildForecastUrl(lang),
            unsubscribeUrl: unsubUrl,
          }),
        );
      } else {
        // FREE user — day-seeded template content (zero LLM cost)
        const { generalTheme, loveTeaser, careerTeaser } = getFreeUserContent(sunSign);

        html = await render(
          HoroscopeFreeEmail({
            firstName: user.fullName ?? undefined,
            sunSign,
            date: dateStr,
            generalTheme,
            loveTeaser,
            careerTeaser,
            upgradeUrl: buildUpgradeUrl(lang),
            unsubscribeUrl: unsubUrl,
          }),
        );
      }

      const resend = getResend();
      await resend.emails.send({ from: FROM_EMAIL, to: user.email, subject, html });

      await resetFailureCounter(user.id);
      sent++;
    } catch (err) {
      errors++;
      console.error(`[HoroscopeEmail] Error sending to user ${user.id}:`, err);
      await handleSendFailure(user.id);
    }

    // 2s gap between sends — matches forecast-cron rate limiting pattern
    await delay(2000);
  }

  console.log(`[HoroscopeEmail] ${date}: processed=${processed}, sent=${sent}, errors=${errors}`);
  return { processed, sent, errors };
}
