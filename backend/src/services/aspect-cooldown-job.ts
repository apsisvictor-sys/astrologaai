/**
 * Aspect cooldown extraction and storage.
 *
 * Records the primary aspect featured in the latest Oracle response so future
 * sessions can avoid leading with the same aspect again immediately.
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { prisma } from '../utils/prisma';

const ASPECT_COOLDOWN_DAYS = 14;
const MAX_ACTIVE_COOLDOWNS = 5;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
}

export async function extractPrimaryAspect(lastAssistantMessage: string): Promise<string | null> {
  if (!lastAssistantMessage.trim()) return null;

  const prompt = `You are reviewing the Oracle's final response in an astrology chat.
Extract the SINGLE primary planetary aspect the Oracle led with or emphasized most.

Rules:
- Return one planet-to-planet aspect only, such as "Mars square Saturn" or "Sun trine Venus"
- Prefer the aspect introduced earliest in the response if multiple aspects are discussed
- Ignore signs, houses, generic transits, and non-aspect themes
- If there is no clear aspect, return {"aspectKey":null}
- Return JSON only

Oracle response:
${lastAssistantMessage}`;

  const result = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(result.text.trim()));
  } catch {
    return null;
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'aspectKey' in parsed &&
    (typeof (parsed as any).aspectKey === 'string' || (parsed as any).aspectKey === null)
  ) {
    const aspectKey = (parsed as any).aspectKey;
    return typeof aspectKey === 'string' && aspectKey.trim().length > 0 ? aspectKey.trim() : null;
  }

  return null;
}

export async function saveAspectCooldown(userId: string, aspectKey: string, featuredAt = new Date()): Promise<void> {
  const expiresAt = addDays(featuredAt, ASPECT_COOLDOWN_DAYS);

  await prisma.$executeRaw`
    INSERT INTO aspect_cooldowns (id, user_id, aspect_key, featured_at, expires_at, created_at, updated_at)
    VALUES (
      gen_random_uuid()::text,
      ${userId},
      ${aspectKey},
      ${featuredAt},
      ${expiresAt},
      now(),
      now()
    )
    ON CONFLICT (user_id, aspect_key)
    DO UPDATE SET
      featured_at = EXCLUDED.featured_at,
      expires_at = EXCLUDED.expires_at,
      updated_at = now()
  `;

  const activeRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM aspect_cooldowns
    WHERE user_id = ${userId}
      AND expires_at > now()
    ORDER BY featured_at DESC, created_at DESC
    OFFSET ${MAX_ACTIVE_COOLDOWNS}
  `;

  if (activeRows.length === 0) return;

  const ids = activeRows.map(row => row.id);
  await prisma.$executeRaw`
    DELETE FROM aspect_cooldowns
    WHERE id = ANY(${ids}::text[])
  `;
}

export async function cleanupExpiredAspectCooldowns(now = new Date()): Promise<number> {
  try {
    const deleted = await prisma.$executeRaw`
      DELETE FROM aspect_cooldowns
      WHERE expires_at <= ${now}
    `;
    return Number(deleted ?? 0);
  } catch (error) {
    console.warn('[AspectCooldownJob] Failed to clean expired cooldowns:', error);
    return 0;
  }
}

export async function processSessionAspectCooldown(sessionId: string): Promise<string | null> {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        user: { select: { tier: true } },
        messages: {
          where: { role: 'ASSISTANT' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true },
        },
      },
    });

    if (!session || session.messages.length === 0) return null;
    if (session.user.tier !== 'PREMIUM' && session.user.tier !== 'PRO') return null;

    const lastAssistantMessage = session.messages[0];
    const aspectKey = await extractPrimaryAspect(lastAssistantMessage.content);
    if (!aspectKey) return null;

    await saveAspectCooldown(session.userId, aspectKey, lastAssistantMessage.createdAt);
    return aspectKey;
  } catch (error) {
    console.warn(`[AspectCooldownJob] Failed for session ${sessionId}:`, error);
    return null;
  }
}

export { ASPECT_COOLDOWN_DAYS, MAX_ACTIVE_COOLDOWNS };
