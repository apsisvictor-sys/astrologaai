/**
 * Forecasts Routes
 * US-15: Daily Forecast
 * US-16: Weekly Forecast
 * 
 * Handles daily/weekly forecasts
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { queryLimitMiddleware } from '../middleware/queryLimit';
import { getDailyForecast, getWeeklyForecast, getPersonalDailyHoroscope } from '../services/forecast';
import { getStoredForecasts } from '../services/forecast-cron';
import { getActiveTransitsForUser } from '../services/transits';
import { prisma } from '../utils/prisma';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Forecast endpoints that consume queries - apply rate limiting
router.get('/daily', queryLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Неоторизиран достъп',
        },
      });
    }
    
    // US-25: Use user's language preference
    const lang = (req.query.lang as string) || req.user?.language || 'bg';
    
    // Get user's primary birth profile
    const profile = await prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BIRTH_DATA_MISSING',
          message: 'Please add your birth data first to get personalized forecasts',
        },
      });
    }

    const birthDate = new Date(profile.birthDate);
    const [bHour, bMin] = (profile.birthTime || '12:00').split(':').map(Number);
    const birthData = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour: bHour || 12,
      minute: bMin || 0,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone || 'UTC',
    };

    // Read precomputed natal chart from DB (avoids redundant API call)
    const storedChart = await prisma.birthChart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { chartData: true },
    });
    const precomputedChart = storedChart?.chartData as any;

    // Get the daily forecast
    const forecast = await getDailyForecast(userId, birthData, lang, precomputedChart);
    
    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    console.error('[Forecast] Daily forecast error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FORECAST_ERROR',
        message: 'Failed to generate daily forecast',
      },
    });
  }
});

/**
 * GET /api/v1/forecasts/weekly
 * Get weekly forecast
 */
router.get('/weekly', queryLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Неоторизиран достъп',
        },
      });
    }
    
    // US-25: Use user's language preference
    const lang = (req.query.lang as string) || req.user?.language || 'bg';
    
    // Get user's primary birth profile
    const profile = await prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BIRTH_DATA_MISSING',
          message: 'Please add your birth data first to get personalized forecasts',
        },
      });
    }

    const birthDate = new Date(profile.birthDate);
    const [bHour, bMin] = (profile.birthTime || '12:00').split(':').map(Number);
    const birthData = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour: bHour || 12,
      minute: bMin || 0,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone || 'UTC',
    };

    // Read precomputed natal chart from DB (avoids redundant API call)
    const storedChart = await prisma.birthChart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { chartData: true },
    });
    const precomputedChart = storedChart?.chartData as any;

    const forecast = await getWeeklyForecast(userId, birthData, lang, precomputedChart);
    
    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    console.error('[Forecast] Weekly forecast error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FORECAST_ERROR',
        message: 'Failed to generate weekly forecast',
      },
    });
  }
});

/**
 * GET /api/v1/forecasts/transits
 * Get current transits for user's chart
 */
router.get('/transits', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Неоторизиран достъп',
        },
      });
    }
    
    const birthChart = await prisma.birthChart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!birthChart?.chartData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CHART_NOT_FOUND',
          message: 'Natal chart not computed yet. Save your birth data first.',
        },
      });
    }

    const transitData = await getActiveTransitsForUser(birthChart.chartData);

    res.json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        skyPositions: transitData.skyPositions,
        aspectsToNatal: transitData.aspectsToNatal,
        moonPhase: transitData.moonPhase,
        generatedAt: transitData.generatedAt,
      },
    });
  } catch (error) {
    console.error('[Forecast] Transits error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSITS_ERROR',
        message: 'Failed to get transits',
      },
    });
  }
});

/**
 * GET /api/v1/forecasts/horoscope
 * Personal daily horoscope via SDK + Oracle voice rewrite.
 * No query quota — this is a data feature, not a chat query.
 * Cached per user per day (24h).
 */
router.get('/horoscope', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }

    const profile = await prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: { code: 'BIRTH_DATA_MISSING', message: 'Add your birth data first to get your daily horoscope' },
      });
    }

    const birthDate = new Date(profile.birthDate);
    const [hour, minute] = (profile.birthTime || '12:00').split(':').map(Number);
    const birthData = {
      year: birthDate.getFullYear(), month: birthDate.getMonth() + 1, day: birthDate.getDate(),
      hour: hour || 12, minute: minute || 0,
      latitude: profile.latitude, longitude: profile.longitude,
      timezone: profile.timezone || 'UTC',
    };

    const horoscope = await getPersonalDailyHoroscope(userId, birthData);
    res.json({ success: true, data: horoscope });
  } catch (error) {
    console.error('[Forecast] Horoscope error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HOROSCOPE_ERROR', message: 'Failed to generate your daily horoscope' },
    });
  }
});

/**
 * GET /api/v1/forecasts/best-days?month=YYYY-MM
 * Best Days personal calendar — aggregated area scores for a month.
 * Tier-gated: FREE=current week + 2 areas, PRO=full month + 4 areas, PREMIUM=+ oracleCommentary.
 */
router.get('/best-days', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const tier = (req.user as any)?.tier ?? 'FREE';

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }

    const month = req.query.month as string;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_MONTH', message: 'Query param "month" required in YYYY-MM format' },
      });
    }

    // Compute date range for the month
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const mon = parseInt(monthStr, 10);
    const firstDay = `${month}-01`;
    const lastDay = new Date(year, mon, 0).toISOString().split('T')[0]; // last day of month

    // Tier gating: FREE users get only current week (7 days from today)
    const today = new Date().toISOString().split('T')[0];
    let dateFrom = firstDay;
    let dateTo = lastDay;
    if (tier === 'FREE') {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      dateFrom = today;
      dateTo = weekEnd.toISOString().split('T')[0];
      // Clamp to requested month
      if (dateFrom < firstDay) dateFrom = firstDay;
      if (dateTo > lastDay) dateTo = lastDay;
      if (dateFrom > lastDay || dateTo < firstDay) {
        return res.json({ success: true, data: { month, days: [] } });
      }
    }

    const forecasts = await getStoredForecasts(userId, dateFrom, dateTo);

    // Build a map of date -> horoscope data
    const forecastMap = new Map<string, any>();
    for (const f of forecasts) {
      forecastMap.set(f.date, f);
    }

    // Generate all days in range
    const days: any[] = [];
    const cursor = new Date(dateFrom + 'T00:00:00Z');
    const end = new Date(dateTo + 'T00:00:00Z');

    while (cursor <= end) {
      const dateStr = cursor.toISOString().split('T')[0];
      const stored = forecastMap.get(dateStr);
      const horoscope = stored?.horoscope;

      if (!horoscope || !horoscope.lifeAreas) {
        // No data for this day
        days.push({
          date: dateStr,
          love: null, career: null, health: null, money: null,
          composite: null, color: null,
          transits: [], oracleCommentary: null,
        });
      } else {
        // Consolidate area scores
        const areaMap = new Map<string, number>();
        for (const a of horoscope.lifeAreas) {
          areaMap.set(a.area, a.rating);
        }

        const love = areaMap.get('love') ?? null;
        const careerRaw = areaMap.get('career');
        const commRaw = areaMap.get('communication');
        const career = careerRaw != null && commRaw != null
          ? (careerRaw + commRaw) / 2
          : careerRaw ?? commRaw ?? null;
        const healthRaw = areaMap.get('health');
        const identityRaw = areaMap.get('identity');
        const health = healthRaw != null && identityRaw != null
          ? (healthRaw + identityRaw) / 2
          : healthRaw ?? identityRaw ?? null;
        const money = areaMap.get('finance') ?? null;

        // Composite = average of 4 areas (only counting non-null)
        const scores = [love, career, health, money].filter((s): s is number => s != null);
        const composite = scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 2) / 2 // round to nearest 0.5
          : null;
        const color = composite == null ? null
          : composite >= 3.5 ? 'green'
          : composite >= 2.5 ? 'yellow'
          : 'red';

        // Transits from horoscope
        const transits = (horoscope.planetaryInfluences ?? []).map((p: any) => ({
          planet: p.planet,
          aspect: p.aspectType,
          natalPlanet: p.natalPlanet,
          influence: p.strength >= 4 ? 'positive' : p.strength <= 2 ? 'challenging' : 'neutral',
          description: p.description,
        }));

        const entry: any = { date: dateStr, composite, color, transits };

        // Tier gating on fields
        if (tier === 'FREE') {
          // FREE: only love + career
          entry.love = love;
          entry.career = career;
          entry.health = null;
          entry.money = null;
          entry.transits = [];
          entry.oracleCommentary = null;
        } else {
          // PRO + PREMIUM: all 4 areas + transits
          entry.love = love;
          entry.career = career;
          entry.health = health;
          entry.money = money;
          if (tier === 'PREMIUM') {
            entry.oracleCommentary = horoscope.oracleCommentary ?? null;
          } else {
            entry.oracleCommentary = null;
          }
        }

        days.push(entry);
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    res.json({ success: true, data: { month, days } });
  } catch (error) {
    console.error('[Forecast] Best-days error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BEST_DAYS_ERROR', message: 'Failed to generate best days calendar' },
    });
  }
});

export default router;
