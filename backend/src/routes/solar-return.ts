/**
 * Solar Return Chart Routes
 * PIX-175 / FEAT-09a: Solar Return chart REST endpoint
 * PIX-176 / FEAT-09b: Solar Return streaming annual report
 *
 * GET /api/v1/solar-return/chart?year={year}  — PREMIUM only
 * GET /api/v1/solar-return/report?year={year} — PREMIUM only, SSE streaming
 */

import { Router, Request, Response } from 'express';
import { AstrologyClient } from '@astro-api/astroapi-typescript';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { redisClient } from '../utils/redis';

const router = Router();

router.use(authMiddleware);

const CHART_OPTIONS = {
    house_system: 'P' as const,
    zodiac_type: 'Tropic' as const,
    active_points: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
                    'Uranus', 'Neptune', 'Pluto', 'True_Node', 'Chiron'],
};

const TTL_365_DAYS = 365 * 24 * 60 * 60;
const TTL_30_DAYS  = 30  * 24 * 60 * 60;

// --------------------------------------------------------------------------
// Shared: compute or fetch Solar Return chart data
// --------------------------------------------------------------------------
async function getSolarReturnChartData(userId: string, year: number): Promise<any> {
    const chartCacheKey = `solar_return:chart:${userId}:${year}`;

    // Try chart cache first (set by /chart endpoint)
    try {
        const cached = await redisClient.get(chartCacheKey);
        if (cached) return JSON.parse(cached);
    } catch { /* cache unavailable — proceed */ }

    // Compute fresh
    const birthProfile = await prisma.birthProfile.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    if (!birthProfile) return null;

    const birthDate = new Date(birthProfile.birthDate);
    const [hour = 12, minute = 0] = (birthProfile.birthTime || '12:00').split(':').map(Number);

    const subject = {
        name: 'subject',
        birth_data: {
            year:      birthDate.getFullYear(),
            month:     birthDate.getMonth() + 1,
            day:       birthDate.getDate(),
            hour,
            minute,
            second:    0,
            latitude:  birthProfile.latitude,
            longitude: birthProfile.longitude,
            timezone:  birthProfile.timezone,
        },
    };

    const returnLocation = {
        year,
        month:     birthDate.getMonth() + 1,
        day:       birthDate.getDate(),
        hour,
        minute,
        latitude:  birthProfile.latitude,
        longitude: birthProfile.longitude,
        timezone:  birthProfile.timezone,
    };

    const client = new AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
    const chart = await client.charts.getSolarReturnChart({
        subject,
        return_year: year,
        return_location: returnLocation,
        options: CHART_OPTIONS,
    });

    const chartData = { chart, year, cached: false };

    // Populate chart cache so future /chart calls also benefit
    try {
        await redisClient.setEx(chartCacheKey, TTL_365_DAYS, JSON.stringify(chartData));
    } catch { /* non-fatal */ }

    return chartData;
}

// --------------------------------------------------------------------------
// Prompt builder: extract key solar return data into compact LLM input
// --------------------------------------------------------------------------
function buildReportPrompt(chartData: any, year: number, lang: string): { system: string; user: string } {
    const isBg = lang === 'bg';
    const chart = chartData?.chart ?? chartData;

    // Extract planets summary (position + house)
    const planets: string[] = [];
    const points = chart?.subject?.planets ?? chart?.planets ?? [];
    for (const p of points) {
        if (p?.name && p?.sign) {
            const house = p.house ? ` (House ${p.house})` : '';
            planets.push(`${p.name}: ${p.sign}${house}`);
        }
    }

    // Extract aspects
    const aspects: string[] = [];
    const aspectList = chart?.subject?.aspects ?? chart?.aspects ?? [];
    for (const a of aspectList.slice(0, 15)) {
        if (a?.p1_name && a?.aspect && a?.p2_name) {
            aspects.push(`${a.p1_name} ${a.aspect} ${a.p2_name} (orb ${a.orb?.toFixed(1) ?? '?'}°)`);
        }
    }

    // Ascendant / chart ruler
    const asc = chart?.subject?.houses?.find?.((h: any) => h?.house === 1)?.sign
             ?? chart?.subject?.first_house?.sign
             ?? null;

    const chartSummary = [
        planets.length ? `Planets:\n${planets.join('\n')}` : '',
        aspects.length ? `\nKey Aspects:\n${aspects.join('\n')}` : '',
        asc           ? `\nSolar Return Ascendant: ${asc}`         : '',
    ].filter(Boolean).join('');

    const system = isBg
        ? `Ти си Оракулът — мистичен, прецизен астролог с дълбоко познание. Пишеш на изящен, поетичен български. Тонът е личен, прозорлив и вдъхновяващ. Анализирай слънчевото завръщане задълбочено.`
        : `You are The Oracle — a mystical, precise astrologer with deep knowledge. Write in elegant, poetic English. Tone is personal, insightful, and inspiring. Analyse the Solar Return chart in depth.`;

    const structure = isBg
        ? `Структура на доклада (задължително следвай):
## Тема на годината
(2–3 параграфа: доминиращата енергия, ASC знак и неговото значение, основни планетарни позиции)

## Ключови транзити и аспекти
(3–5 точки за най-важните аспекти и какво предвещават те)

## Месец по месец
(Кратко (2–3 изречения) за всеки от 12-те месеца — ключова тема или период)

## Области на растеж
(2–3 параграфа: уроци, предизвикателства и потенциал за трансформация тази година)`
        : `Report structure (follow exactly):
## Year Theme
(2–3 paragraphs: dominant energy, ASC sign meaning, key planetary positions)

## Key Transits and Aspects
(3–5 bullet points on the most significant aspects and what they herald)

## Month by Month
(2–3 sentences for each of the 12 months — key theme or period)

## Growth Areas
(2–3 paragraphs: lessons, challenges, and transformation potential this year)`;

    const userMsg = isBg
        ? `Слънчево завръщане за ${year} година.\n\n${chartSummary}\n\n${structure}`
        : `Solar Return chart for year ${year}.\n\n${chartSummary}\n\n${structure}`;

    return { system, user: userMsg };
}

// --------------------------------------------------------------------------
// GET /api/v1/solar-return/chart?year={year} — PREMIUM only
// FEAT-09a: Solar Return chart.
// Uses birth location as return_location (REST endpoint has no IP-based current location).
// --------------------------------------------------------------------------
router.get('/chart', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
            });
        }

        // PREMIUM tier gate
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
        if (!user || user.tier !== 'PREMIUM') {
            return res.status(403).json({
                success: false,
                error: { code: 'upgradeRequired', feature: 'solar_return', message: 'Solar Return chart requires a PREMIUM subscription' },
            });
        }

        // Validate year param
        const yearRaw = req.query.year;
        const year = yearRaw ? parseInt(yearRaw as string, 10) : NaN;
        if (isNaN(year) || year < 1900 || year > 2100) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_YEAR', message: 'year must be a valid integer (1900–2100)' },
            });
        }

        // Check Redis cache first
        const cacheKey = `solar_return:chart:${userId}:${year}`;
        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                return res.json({ success: true, data: { ...JSON.parse(cached), cached: true } });
            }
        } catch { /* cache unavailable — proceed */ }

        // Load birth profile
        const birthProfile = await prisma.birthProfile.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        if (!birthProfile) {
            return res.status(400).json({
                success: false,
                error: { code: 'BIRTH_DATA_REQUIRED', message: 'Save your birth data first to calculate a Solar Return chart' },
            });
        }

        const birthDate = new Date(birthProfile.birthDate);
        const [hour = 12, minute = 0] = (birthProfile.birthTime || '12:00').split(':').map(Number);

        const subject = {
            name: 'subject',
            birth_data: {
                year:      birthDate.getFullYear(),
                month:     birthDate.getMonth() + 1,
                day:       birthDate.getDate(),
                hour,
                minute,
                second:    0,
                latitude:  birthProfile.latitude,
                longitude: birthProfile.longitude,
                timezone:  birthProfile.timezone,
            },
        };

        // Return location: birth location (REST endpoint falls back from IP-based Oracle tool)
        const returnLocation = {
            year,
            month:     birthDate.getMonth() + 1,
            day:       birthDate.getDate(),
            hour,
            minute,
            latitude:  birthProfile.latitude,
            longitude: birthProfile.longitude,
            timezone:  birthProfile.timezone,
        };

        const client = new AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
        const chart = await client.charts.getSolarReturnChart({
            subject,
            return_year: year,
            return_location: returnLocation,
            options: CHART_OPTIONS,
        });

        const responseData = {
            chart,
            year,
            locationNote: 'Return location defaults to birth location. The Oracle tool uses your current IP location for greater precision.',
            cached: false,
        };

        // Cache for 365 days — chart is deterministic for a given birth data + year
        try {
            await redisClient.setEx(cacheKey, TTL_365_DAYS, JSON.stringify(responseData));
        } catch { /* cache write failure is non-fatal */ }

        return res.json({ success: true, data: responseData });
    } catch (err) {
        console.error('[SolarReturn] chart error:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'SOLAR_RETURN_ERROR', message: 'Failed to calculate Solar Return chart' },
        });
    }
});

// --------------------------------------------------------------------------
// GET /api/v1/solar-return/report?year={year} — PREMIUM only, SSE streaming
// FEAT-09b: Opus annual report streamed as Server-Sent Events.
// Cache key: solar_return:report:{userId}:{year} — TTL 30 days.
// First call: generate + cache. Subsequent calls: stream from cache.
// --------------------------------------------------------------------------
router.get('/report', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        });
    }

    // PREMIUM tier gate
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true, language: true },
    });
    if (!user || user.tier !== 'PREMIUM') {
        return res.status(403).json({
            success: false,
            error: { code: 'upgradeRequired', feature: 'solar_return_report', message: 'Solar Return annual report requires a PREMIUM subscription' },
        });
    }

    // Validate year param
    const yearRaw = req.query.year;
    const year = yearRaw ? parseInt(yearRaw as string, 10) : NaN;
    if (isNaN(year) || year < 1900 || year > 2100) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_YEAR', message: 'year must be a valid integer (1900–2100)' },
        });
    }

    const lang = user.language ?? 'bg';
    const reportCacheKey = `solar_return:report:${userId}:${year}`;

    // --- SSE headers ---
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Helper: write an SSE event
    const send = (event: string, data: object) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
        // --- Check report cache ---
        let cachedReport: string | null = null;
        try {
            cachedReport = await redisClient.get(reportCacheKey);
        } catch { /* cache unavailable */ }

        if (cachedReport) {
            // Stream cached text in ~200-char chunks to keep SSE cadence consistent
            const CHUNK_SIZE = 200;
            for (let i = 0; i < cachedReport.length; i += CHUNK_SIZE) {
                send('chunk', { content: cachedReport.slice(i, i + CHUNK_SIZE), done: false, fromCache: true });
            }
            send('complete', { hasError: false, fromCache: true });
            res.end();
            return;
        }

        // --- Get Solar Return chart data ---
        send('status', { message: 'Computing Solar Return chart…' });

        let chartData: any;
        try {
            chartData = await getSolarReturnChartData(userId, year);
        } catch (chartErr) {
            console.error('[SolarReturn] report: chart fetch error:', chartErr);
            send('error', { message: 'Failed to retrieve Solar Return chart data' });
            send('complete', { hasError: true });
            res.end();
            return;
        }

        if (!chartData) {
            send('error', { message: 'Save your birth data first to generate a Solar Return report' });
            send('complete', { hasError: true });
            res.end();
            return;
        }

        // --- Build prompt and stream with Opus ---
        const { system, user: userMsg } = buildReportPrompt(chartData, year, lang);

        send('status', { message: 'Generating your annual report…' });

        let fullReport = '';
        let hasError  = false;

        try {
            const result = await streamText({
                model: anthropic('claude-opus-4-6'),
                messages: [
                    { role: 'system', content: system },
                    { role: 'user',   content: userMsg },
                ],
                temperature: 0.75,
                maxTokens: 4096,
            });

            for await (const chunk of result.fullStream) {
                if (chunk.type === 'text-delta') {
                    const text = (chunk as any).textDelta ?? (chunk as any).text ?? '';
                    if (text) {
                        fullReport += text;
                        send('chunk', { content: text, done: false });
                    }
                } else if (chunk.type === 'finish') {
                    send('chunk', { content: '', done: true });
                }
            }
        } catch (streamErr) {
            hasError = true;
            const msg = streamErr instanceof Error ? streamErr.message : 'Streaming error';
            console.error('[SolarReturn] report: stream error:', streamErr);
            send('error', { message: msg });
        }

        // --- Cache the complete report ---
        if (!hasError && fullReport) {
            try {
                await redisClient.setEx(reportCacheKey, TTL_30_DAYS, fullReport);
            } catch { /* cache write failure is non-fatal */ }
        }

        send('complete', { hasError });
        res.end();

    } catch (err) {
        console.error('[SolarReturn] report error:', err);
        try {
            send('error', { message: 'Failed to generate Solar Return report' });
            send('complete', { hasError: true });
        } catch { /* response already closed */ }
        res.end();
    }
});

export default router;
