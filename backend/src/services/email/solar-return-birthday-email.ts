/**
 * Solar Return Birthday Email Service — PIX-178 / FEAT-09d
 *
 * Sends birthday-triggered Solar Return emails to all users whose birthday is tomorrow:
 *   PREMIUM — "Your Solar Return reading is ready" → link to /solar-return
 *   PRO/FREE — "Your Year Ahead is waiting" → upgrade CTA with locked preview
 *
 * Birthday matching: month + day only (year-agnostic).
 * Feb 29 edge case: in non-leap years, Feb 29 birthdays receive email on Feb 28.
 * A/B subject line: split by userId hash parity, variant logged per send.
 * Redis dedup: one email per user per calendar year (TTL 380 days).
 */

import { render } from '@react-email/render';
import { Resend } from 'resend';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { redisClient } from '../../utils/redis';
import { SolarReturnBirthdayEmail } from '../../emails/SolarReturnBirthdayEmail';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://astrologa.bg';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@astrologa.bg';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns tomorrow's month (1-12), day (1-31), and whether to include Feb 29 birthdays.
 * includeLeapDay=true when tomorrow is Feb 28 in a non-leap year.
 */
function getTomorrowBirthdayCriteria(): { month: number; day: number; includeLeapDay: boolean } {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const month = tomorrow.getMonth() + 1;
  const day = tomorrow.getDate();
  const includeLeapDay = month === 2 && day === 28 && !isLeapYear(tomorrow.getFullYear());
  return { month, day, includeLeapDay };
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function buildSolarReturnUrl(language: string): string {
  const locale = language === 'bg' ? '' : 'en/';
  return `${FRONTEND_URL}/${locale}solar-return?ref=birthday-email&utm_source=email&utm_medium=birthday`;
}

function buildUpgradeUrl(language: string): string {
  const locale = language === 'bg' ? '' : 'en/';
  return `${FRONTEND_URL}/${locale}pricing?ref=birthday-email&utm_source=email&utm_medium=birthday`;
}

function buildUnsubscribeUrl(token: string, language: string): string {
  const locale = language === 'bg' ? '' : 'en/';
  return `${FRONTEND_URL}/${locale}notifications/unsubscribe?token=${token}&type=solarReturnBirthday`;
}

// ─── A/B test subject line ────────────────────────────────────────────────────

/**
 * Returns 'A' or 'B' based on userId hash parity.
 * Consistent across retries for the same user.
 */
function getSubjectVariant(userId: string): 'A' | 'B' {
  const hash = crypto.createHash('md5').update(userId).digest();
  return hash[0] % 2 === 0 ? 'A' : 'B';
}

function buildSubject(variant: 'A' | 'B', language: string): string {
  if (language === 'bg') {
    return variant === 'A'
      ? '🎂 Честит рожден ден! Твоята Solar Return карта е готова'
      : '✦ Звездите имат послание за твоята година напред';
  }
  return variant === 'A'
    ? '🎂 Happy Birthday! Your Solar Return chart is ready'
    : '✦ The stars have a message for your year ahead';
}

// ─── Redis dedup ──────────────────────────────────────────────────────────────

/** One send per user per calendar year (TTL 380 days) */
async function checkAndMarkSent(userId: string, year: number): Promise<boolean> {
  const key = `email_solar_return_birthday:${userId}:${year}`;
  const existing = await redisClient.get(key);
  if (existing) return false;
  await redisClient.setEx(key, 60 * 60 * 24 * 380, '1');
  return true;
}

/** Remove dedup mark so the user can be retried */
async function clearDedup(userId: string, year: number): Promise<void> {
  await redisClient.del(`email_solar_return_birthday:${userId}:${year}`);
}

// ─── Unsubscribe token ────────────────────────────────────────────────────────

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

// ─── Extract sun sign ─────────────────────────────────────────────────────────

function extractSunSign(chartData: unknown): string | undefined {
  if (!chartData || typeof chartData !== 'object') return undefined;
  return (chartData as Record<string, any>)?.sun?.sign ?? undefined;
}

// ─── DB query type ────────────────────────────────────────────────────────────

interface BirthdayUser {
  id: string;
  email: string;
  full_name: string | null;
  language: string;
  tier: string;
  chart_data: unknown;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface SolarReturnBirthdayEmailResult {
  processed: number;
  sent: number;
  errors: number;
  skipped: number;
}

/**
 * Send Solar Return birthday emails to users whose birthday is tomorrow.
 *
 * Targeting rules:
 *   - emailVerified=true, not suspended
 *   - emailEnabled=true (or no preference row)
 *   - Must have a birth chart linked to a birth profile with a matching birthday
 *
 * Feb 29 rule: in non-leap years, Feb 29 birthdays receive email on Feb 28.
 * Dedup key: email_solar_return_birthday:{userId}:{year} (380-day TTL)
 * Rate limit: 2s between sends
 */
export async function sendSolarReturnBirthdayEmails(): Promise<SolarReturnBirthdayEmailResult> {
  const { month, day, includeLeapDay } = getTomorrowBirthdayCriteria();
  const year = new Date().getFullYear();

  // Fetch users whose birthday (month+day) matches tomorrow.
  // Uses raw SQL because Prisma ORM cannot filter on EXTRACT(MONTH/DAY FROM date).
  const leapDayCondition = includeLeapDay
    ? Prisma.sql`OR (EXTRACT(MONTH FROM bp.birth_date) = 2 AND EXTRACT(DAY FROM bp.birth_date) = 29)`
    : Prisma.sql``;

  const users = await prisma.$queryRaw<BirthdayUser[]>`
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.language,
      u.tier,
      bc.chart_data
    FROM users u
    INNER JOIN birth_charts bc ON bc.user_id = u.id
    INNER JOIN birth_profiles bp ON bc.birth_profile_id = bp.id
    LEFT JOIN notification_preferences np ON np.user_id = u.id
    WHERE u.email_verified = true
      AND u.is_suspended = false
      AND (np.email_enabled IS NULL OR np.email_enabled = true)
      AND (
        (EXTRACT(MONTH FROM bp.birth_date) = ${month} AND EXTRACT(DAY FROM bp.birth_date) = ${day})
        ${leapDayCondition}
      )
  `;

  let processed = 0;
  let sent = 0;
  let errors = 0;
  let skipped = 0;

  for (const user of users) {
    processed++;

    try {
      const canSend = await checkAndMarkSent(user.id, year);
      if (!canSend) {
        skipped++;
        continue;
      }

      const lang = user.language || 'bg';
      const isPremium = user.tier === 'PREMIUM';
      const token = await ensureUnsubscribeToken(user.id);
      const unsubUrl = buildUnsubscribeUrl(token, lang);
      const ctaUrl = isPremium ? buildSolarReturnUrl(lang) : buildUpgradeUrl(lang);
      const sunSign = extractSunSign(user.chart_data);

      const variant = getSubjectVariant(user.id);
      const subject = buildSubject(variant, lang);

      console.log(`[SolarReturnBirthday] user=${user.id} tier=${user.tier} variant=${variant}`);

      const html = await render(
        SolarReturnBirthdayEmail({
          firstName: user.full_name ?? undefined,
          sunSign,
          isPremium,
          solarReturnUrl: ctaUrl,
          unsubscribeUrl: unsubUrl,
        }),
      );

      const resend = getResend();
      await resend.emails.send({ from: FROM_EMAIL, to: user.email, subject, html });

      sent++;
    } catch (err) {
      errors++;
      // Clear dedup so the run can be retried for this user
      await clearDedup(user.id, year);
      console.error(`[SolarReturnBirthday] Error sending to user ${user.id}:`, err);
    }

    // 2s gap between sends — matches horoscope-email rate-limiting pattern
    await delay(2000);
  }

  console.log(
    `[SolarReturnBirthday] month=${month} day=${day} includeLeapDay=${includeLeapDay}: ` +
    `processed=${processed}, sent=${sent}, skipped=${skipped}, errors=${errors}`,
  );

  return { processed, sent, errors, skipped };
}
