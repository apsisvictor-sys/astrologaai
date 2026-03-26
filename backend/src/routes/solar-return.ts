/**
 * Solar Return Chart Routes
 * PIX-175 / FEAT-09a: Solar Return chart REST endpoint
 *
 * GET /api/v1/solar-return/chart?year={year} — PREMIUM only
 */

import { Router, Request, Response } from 'express';
import { AstrologyClient } from '@astro-api/astroapi-typescript';
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

/**
 * GET /api/v1/solar-return/chart?year={year}
 * FEAT-09a: Solar Return chart (PREMIUM only).
 * Uses birth location as return_location (REST endpoint has no IP-based current location).
 */
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
                year: birthDate.getFullYear(),
                month: birthDate.getMonth() + 1,
                day: birthDate.getDate(),
                hour,
                minute,
                second: 0,
                latitude: birthProfile.latitude,
                longitude: birthProfile.longitude,
                timezone: birthProfile.timezone,
            },
        };

        // Return location: birth location (REST endpoint falls back from IP-based Oracle tool)
        const returnLocation = {
            year,
            month: birthDate.getMonth() + 1,
            day: birthDate.getDate(),
            hour,
            minute,
            latitude: birthProfile.latitude,
            longitude: birthProfile.longitude,
            timezone: birthProfile.timezone,
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

export default router;
