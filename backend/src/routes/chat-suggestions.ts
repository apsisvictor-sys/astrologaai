/**
 * Chat Suggestions Route — PIX-285 / FUTURE-06
 *
 * GET /api/v1/chat/suggestions — personalized, transit-aware Oracle prompts
 *
 * Generates 3 questions via Haiku, cached per-user-per-day in Redis.
 * Tier rules:
 *   FREE    — no partner/synastry questions
 *   PRO     — no composite chart questions
 *   PREMIUM — all topics allowed
 */

import { Router, Request, Response } from 'express';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { redisClient } from '../utils/redis';
import { getActiveTransitsForUser } from '../services/transits';
import { generateChartSummary } from '../services/llm-helpers';

const router = Router();
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// Topic restrictions by tier
const TIER_RESTRICTIONS: Record<string, string> = {
  FREE: 'Do NOT suggest questions about partner charts, synastry, relationship compatibility, or composite charts.',
  PRO: 'Do NOT suggest questions about composite charts. Synastry and partner topics are allowed.',
  PREMIUM: 'All topics are allowed, including synastry, composite, and advanced techniques.',
};

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    // Check Redis cache — fast path
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cacheKey = `chat_suggestions:${userId}:${today}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: JSON.parse(cached) });
      }
    } catch { /* cache unavailable — proceed */ }

    // Fetch user + birth chart
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tier: true,
        language: true,
        birthProfiles: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { birthChart: { select: { chartData: true } } },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    const tier = user.tier || 'FREE';
    const lang = user.language === 'bg' ? 'bg' : 'en';
    const birthChart = user.birthProfiles[0]?.birthChart;

    // Build chart summary (compact text for prompt)
    let chartSummary = '';
    if (birthChart?.chartData) {
      try {
        chartSummary = generateChartSummary(birthChart.chartData as any, lang as 'bg' | 'en');
      } catch { /* best effort */ }
    }

    // Get active transits for personalization
    let transitSummary = '';
    if (birthChart?.chartData) {
      try {
        const { aspectsToNatal } = await getActiveTransitsForUser(birthChart.chartData);
        const topAspects = aspectsToNatal.slice(0, 5);
        if (topAspects.length > 0) {
          transitSummary = topAspects
            .map(a => `${a.transitPlanet} ${a.aspect} ${a.natalPlanet} (${a.influence})`)
            .join('\n');
        }
      } catch { /* non-fatal — skip transit context */ }
    }

    const isBg = lang === 'bg';

    const systemPrompt = `You generate 3 short, personalized astrology questions for a user to ask their Oracle (AI astrologer).
Each question must be under 12 words. Make them specific to the user's chart and current transits.
${TIER_RESTRICTIONS[tier] || TIER_RESTRICTIONS.FREE}
Return ONLY a JSON array of 3 strings. No markdown, no explanation.
${isBg ? 'Write the questions in Bulgarian.' : 'Write the questions in English.'}`;

    const userPrompt = chartSummary
      ? `Chart:\n${chartSummary}\n\nCurrent transits:\n${transitSummary || 'None available'}\n\nGenerate 3 personalized questions.`
      : `Generate 3 general astrology questions for a new user without birth data yet.`;

    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      maxTokens: 200,
    });

    // Parse the response — expect JSON array
    let suggestions: string[] = [];
    try {
      const text = result.text.trim();
      // Strip markdown code fences if present
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        suggestions = parsed.slice(0, 3).map(s => String(s).trim()).filter(Boolean);
      }
    } catch {
      // If parsing fails, try splitting by newlines
      suggestions = result.text.split('\n').map(s => s.replace(/^[\d.)\-*\s]+/, '').trim()).filter(Boolean).slice(0, 3);
    }

    // Ensure we always return exactly 3 suggestions
    const defaults = isBg
      ? ['Какво ми подсказват звездите днес?', 'Разкажи ми за луната ми', 'Какво виждам в картата си?']
      : ['What do the stars say about today?', 'Tell me about my moon sign', 'What stands out in my chart?'];

    while (suggestions.length < 3) {
      suggestions.push(defaults[suggestions.length] || defaults[0]);
    }

    const responseData = { suggestions };

    // Cache for 24h
    try {
      await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(responseData));
    } catch { /* non-fatal */ }

    return res.json({ success: true, data: responseData });
  } catch (err) {
    console.error('[ChatSuggestions] error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SUGGESTIONS_ERROR', message: 'Failed to generate suggestions' },
    });
  }
});

export default router;
