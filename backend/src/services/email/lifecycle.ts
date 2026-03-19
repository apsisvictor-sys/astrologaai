/**
 * Lifecycle email service — FEAT-05
 *
 * Sends Day 0–30 lifecycle emails to users:
 *   Day 0  — Welcome (fired directly from register handler)
 *   Day 1  — Oracle Waiting (if no chat session yet)
 *   Day 3  — Feature Discovery
 *   Day 7  — Re-Engagement (if < 3 sessions)
 *   Day 14 — Soft Upgrade (FREE users only)
 *   Day 30 — Upgrade Offer with promo code (FREE users only)
 */

import { render } from '@react-email/render';
import { Resend } from 'resend';
import { prisma } from '../../utils/prisma';
import { redisClient } from '../../utils/redis';
import { WelcomeEmail } from '../../emails/WelcomeEmail';
import { OracleWaitingEmail } from '../../emails/OracleWaitingEmail';
import { FeatureDiscoveryEmail } from '../../emails/FeatureDiscoveryEmail';
import { ReEngagementEmail } from '../../emails/ReEngagementEmail';
import { SoftUpgradeEmail } from '../../emails/SoftUpgradeEmail';
import { UpgradeOfferEmail } from '../../emails/UpgradeOfferEmail';
import crypto from 'crypto';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://astrologa.bg';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@astrologa.bg';
const PROMO_CODE = process.env.LIFECYCLE_PROMO_CODE || '';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function buildUnsubscribeUrl(token: string, language: string): string {
  const locale = language === 'bg' ? '' : 'en/';
  return `${FRONTEND_URL}/${locale}notifications/unsubscribe?token=${token}&all=true`;
}

function buildChatUrl(language: string): string {
  return `${FRONTEND_URL}/${language === 'bg' ? '' : 'en/'}chat`;
}

function buildPricingUrl(language: string): string {
  return `${FRONTEND_URL}/${language === 'bg' ? '' : 'en/'}pricing`;
}

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

/** Extract sign names from BirthChart.chartData JSON */
function extractSigns(chartData: any): { sunSign?: string; moonSign?: string; risingSign?: string } {
  if (!chartData) return {};
  return {
    sunSign: chartData?.sun?.sign ?? undefined,
    moonSign: chartData?.moon?.sign ?? undefined,
    risingSign: chartData?.rising?.sign ?? undefined,
  };
}

/** Redis dedup key */
function dedupKey(userId: string, day: number): string {
  return `email_lifecycle:${userId}:day${day}`;
}

/**
 * Check dedup and mark as sent.
 * Uses setEx (the only TTL-bearing set available on redisClient).
 * Returns false if already sent.
 */
async function markSent(userId: string, day: number): Promise<boolean> {
  const key = dedupKey(userId, day);
  const existing = await redisClient.get(key);
  if (existing) return false;
  // 400 days TTL — well past any lifecycle window
  await redisClient.setEx(key, 60 * 60 * 24 * 400, '1');
  return true;
}

interface UserForLifecycle {
  id: string;
  email: string;
  fullName?: string | null;
  language: string;
  tier: string;
  notificationPreference: { emailEnabled: boolean } | null;
  birthProfiles: {
    birthChart: { chartData: any } | null;
  }[];
}

async function getUsersInWindow(hoursAgo: number): Promise<UserForLifecycle[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - (hoursAgo + 1) * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() - (hoursAgo - 1) * 60 * 60 * 1000);
  return prisma.user.findMany({
    where: {
      createdAt: { gte: windowStart, lte: windowEnd },
      OR: [
        { notificationPreference: { is: null } },
        { notificationPreference: { emailEnabled: true } },
      ],
    },
    include: {
      notificationPreference: { select: { emailEnabled: true } },
      birthProfiles: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { birthChart: { select: { chartData: true } } },
      },
    },
  });
}

/** Send Day 0 Welcome email — called directly from register handler */
export async function sendWelcomeEmail(
  userId: string,
  email: string,
  fullName: string | null,
  language: string,
  chartData?: any,
): Promise<void> {
  const canSend = await markSent(userId, 0);
  if (!canSend) return;

  const token = await ensureUnsubscribeToken(userId);
  const { sunSign, moonSign, risingSign } = extractSigns(chartData);

  const html = await render(
    WelcomeEmail({
      firstName: fullName || undefined,
      sunSign,
      moonSign,
      risingSign,
      chatUrl: buildChatUrl(language),
      unsubscribeUrl: buildUnsubscribeUrl(token, language),
    }),
  );

  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Your cosmic blueprint is ready ✦ — AstroLogAI',
    html,
  });
}

/** Run daily lifecycle cron — processes days 1, 3, 7, 14, 30 */
export async function runLifecycleCron(): Promise<{ processed: number; sent: number; errors: number }> {
  const days = [
    { day: 1, hoursAgo: 24 },
    { day: 3, hoursAgo: 72 },
    { day: 7, hoursAgo: 168 },
    { day: 14, hoursAgo: 336 },
    { day: 30, hoursAgo: 720 },
  ];

  let processed = 0;
  let sent = 0;
  let errors = 0;

  for (const { day, hoursAgo } of days) {
    const users = await getUsersInWindow(hoursAgo);

    for (const user of users) {
      processed++;
      try {
        const canSend = await markSent(user.id, day);
        if (!canSend) continue;

        const token = await ensureUnsubscribeToken(user.id);
        const chartData = user.birthProfiles[0]?.birthChart?.chartData;
        const { sunSign, moonSign } = extractSigns(chartData);
        const isFree = user.tier === 'FREE';
        const lang = user.language || 'en';
        const unsubUrl = buildUnsubscribeUrl(token, lang);
        const chatUrl = buildChatUrl(lang);
        const pricingUrl = buildPricingUrl(lang);

        // Check session count for days with engagement conditions
        let sessionCount = 0;
        if (day === 1 || day === 7) {
          sessionCount = await prisma.chatSession.count({ where: { userId: user.id } });
        }

        let html: string | null = null;
        let subject = '';

        if (day === 1 && sessionCount === 0) {
          subject = 'The Oracle is waiting for you — AstroLogAI';
          html = await render(
            OracleWaitingEmail({
              firstName: user.fullName ?? undefined,
              sunSign,
              chatUrl,
              unsubscribeUrl: unsubUrl,
            }),
          );
        } else if (day === 3) {
          subject = 'Did you know the Oracle can... — AstroLogAI';
          html = await render(
            FeatureDiscoveryEmail({
              firstName: user.fullName ?? undefined,
              forecastUrl: `${FRONTEND_URL}/${lang === 'bg' ? '' : 'en/'}forecast`,
              partnersUrl: `${FRONTEND_URL}/${lang === 'bg' ? '' : 'en/'}partners`,
              chartUrl: `${FRONTEND_URL}/${lang === 'bg' ? '' : 'en/'}chart`,
              chatUrl,
              unsubscribeUrl: unsubUrl,
            }),
          );
        } else if (day === 7 && sessionCount < 3) {
          subject = 'Your chart has something new to show you — AstroLogAI';
          html = await render(
            ReEngagementEmail({
              firstName: user.fullName ?? undefined,
              sunSign,
              chatUrl,
              unsubscribeUrl: unsubUrl,
            }),
          );
        } else if (day === 14 && isFree) {
          subject = `You're exploring ${sunSign || 'your'} energy deeply — AstroLogAI`;
          html = await render(
            SoftUpgradeEmail({
              firstName: user.fullName ?? undefined,
              sunSign,
              pricingUrl,
              chatUrl,
              unsubscribeUrl: unsubUrl,
            }),
          );
        } else if (day === 30 && isFree) {
          subject = 'A month of cosmic exploration — a gift for you ✦';
          html = await render(
            UpgradeOfferEmail({
              firstName: user.fullName ?? undefined,
              sunSign,
              moonSign,
              promoCode: PROMO_CODE || undefined,
              pricingUrl,
              unsubscribeUrl: unsubUrl,
            }),
          );
        }

        if (!html) continue; // condition not met — skip gracefully

        const resend = getResend();
        await resend.emails.send({ from: FROM_EMAIL, to: user.email, subject, html });
        sent++;
      } catch (err) {
        errors++;
        console.error(`[Lifecycle] Error sending day ${day} to user ${user.id}:`, err);
      }
    }
  }

  return { processed, sent, errors };
}
