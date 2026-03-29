import { Router, Request, Response } from 'express';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

import { getCurrentEvents } from '../config/astrological-events';
import { authMiddleware } from '../middleware/auth';
import { getModelIdForTier } from '../services/llm';
import {
  calculateActiveTransits,
  getTransitForecastById,
  getUpcomingTransitForecasts,
} from '../services/transit-engine';
import { getActiveTransitsForUser } from '../services/transits';
import { prisma } from '../utils/prisma';
import { redisClient } from '../utils/redis';

const router = Router();

// GET /api/v1/transits/current-events
router.get('/current-events', async (req: Request, res: Response) => {
  try {
    const cacheKey = `transits:current_events:${new Date().toISOString().split('T')[0]}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const events = getCurrentEvents();
    await redisClient.setEx(cacheKey, 60 * 60, JSON.stringify(events));
    return res.json({ success: true, data: events });
  } catch (err) {
    console.error('[Transits] current-events error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to get current events' } });
  }
});

// GET /api/v1/transits/active
router.get('/active', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }

    const activeTransits = await calculateActiveTransits(userId);
    return res.json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        transits: activeTransits,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CHART_NOT_FOUND') {
      return res.status(400).json({
        success: false,
        error: { code: 'CHART_NOT_FOUND', message: 'Natal chart not computed yet. Save your birth data first.' },
      });
    }

    console.error('[Transits] active error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'TRANSITS_ERROR', message: 'Failed to get active transits' },
    });
  }
});

// GET /api/v1/transits/upcoming
router.get('/upcoming', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }

    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 50) : 20;
    const forecasts = await getUpcomingTransitForecasts(userId, limit);

    return res.json({
      success: true,
      data: {
        count: forecasts.length,
        forecasts,
      },
    });
  } catch (error) {
    console.error('[Transits] upcoming error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'TRANSIT_FORECAST_ERROR', message: 'Failed to get upcoming transit forecasts' },
    });
  }
});

/**
 * GET /api/v1/transits/commentary
 * FUTURE-07: Oracle daily transit commentary card.
 * Returns { headline, body, significantAspects[], generatedAt }.
 * Cached per user per day (26h TTL). Tier-gated: FREE=Haiku, PRO=Sonnet, PREMIUM=Opus.
 */
router.get('/commentary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }

    const tier = req.user?.tier ?? 'FREE';
    const lang = req.user?.language ?? 'bg';
    const dateStr = new Date().toISOString().split('T')[0];
    const cacheKey = `transit:commentary:${userId}:${dateStr}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: JSON.parse(cached) });
      }
    } catch {
      // cache unavailable — proceed
    }

    const birthChart = await prisma.birthChart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!birthChart?.chartData) {
      return res.status(400).json({
        success: false,
        error: { code: 'CHART_NOT_FOUND', message: 'Natal chart not computed yet. Save your birth data first.' },
      });
    }

    const { aspectsToNatal } = await getActiveTransitsForUser(birthChart.chartData);

    const PLANET_RANK: Record<string, number> = {
      pluto: 0,
      neptune: 1,
      uranus: 2,
      chiron: 3,
      saturn: 4,
      jupiter: 5,
      mars: 6,
      venus: 7,
      mercury: 8,
      sun: 9,
      moon: 10,
      northNode: 11,
      southNode: 12,
    };

    const ranked = [...aspectsToNatal].sort((a, b) => {
      const rankDiff = (PLANET_RANK[a.transitPlanet] ?? 99) - (PLANET_RANK[b.transitPlanet] ?? 99);
      if (rankDiff !== 0) return rankDiff;
      return a.orb - b.orb;
    });

    const topCount = tier === 'FREE' ? 3 : tier === 'PRO' ? 5 : ranked.length;
    const topAspects = ranked.slice(0, topCount);

    const isBg = lang === 'bg';
    const depthInstruction = tier === 'PREMIUM'
      ? (isBg ? 'Напиши задълбочен анализ в 3-4 параграфа, покривайки всички активни транзити.' : 'Write a deep analysis in 3-4 paragraphs covering all active transits.')
      : (isBg ? 'Напиши кратко тълкуване в 2 параграфа.' : 'Write a concise interpretation in 2 paragraphs.');

    const aspectLines = topAspects.map(a =>
      `${a.transitPlanetBg} ${a.aspectBg} natal ${a.natalPlanetBg} (orb ${a.orb}°, ${a.influence})`,
    ).join('\n');

    const systemPrompt = isBg
      ? 'Ти си Оракулът — мистичен, прецизен астролог с дълбоко познание. Пишеш на изящен български. Тонът е поетичен, личен и прозорлив.'
      : 'You are The Oracle — a mystical, precise astrologer with deep knowledge. Write in elegant English. Tone is poetic, personal, and insightful.';

    const userPrompt = isBg
      ? `Активни планетарни транзити към natal картата за ${dateStr}:\n${aspectLines}\n\n${depthInstruction}\n\nВърни САМО валиден JSON (без markdown):\n{"headline":"<1 ред, завладяващо резюме>","body":"<основен текст>","significantAspects":["<кратко описание на аспект>","..."]}`
      : `Active planetary transits to natal chart for ${dateStr}:\n${aspectLines}\n\n${depthInstruction}\n\nReturn ONLY valid JSON (no markdown):\n{"headline":"<1-line compelling summary>","body":"<main text>","significantAspects":["<brief aspect description>","..."]}`;

    const modelId = getModelIdForTier(tier);
    const model = modelId.startsWith('claude-') ? anthropic(modelId) : anthropic('claude-haiku-4-5-20251001');

    const result = await generateText({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const text = result.text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('[Commentary] No JSON in LLM response');

    const parsed = JSON.parse(match[0]);
    const commentary = {
      headline: parsed.headline ?? '',
      body: parsed.body ?? '',
      significantAspects: Array.isArray(parsed.significantAspects) ? parsed.significantAspects : [],
      generatedAt: new Date().toISOString(),
    };

    try {
      await redisClient.setEx(cacheKey, 26 * 60 * 60, JSON.stringify(commentary));
    } catch {
      // cache write failure is non-fatal
    }

    return res.json({ success: true, data: commentary });
  } catch (err) {
    console.error('[Transits] Commentary error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'COMMENTARY_ERROR', message: 'Failed to generate transit commentary' },
    });
  }
});

// GET /api/v1/transits/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }

    const forecast = await getTransitForecastById(userId, req.params.id);
    if (!forecast) {
      return res.status(404).json({
        success: false,
        error: { code: 'TRANSIT_FORECAST_NOT_FOUND', message: 'Transit forecast not found' },
      });
    }

    return res.json({ success: true, data: forecast });
  } catch (error) {
    console.error('[Transits] detail error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'TRANSIT_FORECAST_ERROR', message: 'Failed to get transit forecast' },
    });
  }
});

export default router;
