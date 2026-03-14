"use strict";
/**
 * Forecasts Routes
 * US-15: Daily Forecast
 * US-16: Weekly Forecast
 *
 * Handles daily/weekly forecasts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const queryLimit_1 = require("../middleware/queryLimit");
const forecast_1 = require("../services/forecast");
const prisma_1 = require("../utils/prisma");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use(auth_1.authMiddleware);
// Forecast endpoints that consume queries - apply rate limiting
router.get('/daily', queryLimit_1.queryLimitMiddleware, async (req, res) => {
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
        const lang = req.query.lang || req.user?.language || 'bg';
        // Get user's birth data
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                birthData: true,
            },
        });
        if (!user || !user.birthData) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BIRTH_DATA_MISSING',
                    message: 'Please add your birth data first to get personalized forecasts',
                },
            });
        }
        // Extract birth data from the stored DateTime
        const birthDate = new Date(user.birthData.date);
        const birthTimeParts = user.birthData.time.split(':');
        // Get birth data for chart calculation
        const birthData = {
            year: birthDate.getFullYear(),
            month: birthDate.getMonth() + 1,
            day: birthDate.getDate(),
            hour: parseInt(birthTimeParts[0]) || 12,
            minute: parseInt(birthTimeParts[1]) || 0,
            latitude: user.birthData.latitude,
            longitude: user.birthData.longitude,
            timezone: user.birthData.timezone || 'Europe/Sofia',
        };
        // Read precomputed natal chart from DB (avoids redundant API call)
        const storedChart = await prisma_1.prisma.birthChart.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { chartData: true },
        });
        const precomputedChart = storedChart?.chartData;
        // Get the daily forecast
        const forecast = await (0, forecast_1.getDailyForecast)(userId, birthData, lang, precomputedChart);
        res.json({
            success: true,
            data: forecast,
        });
    }
    catch (error) {
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
router.get('/weekly', queryLimit_1.queryLimitMiddleware, async (req, res) => {
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
        const lang = req.query.lang || req.user?.language || 'bg';
        // Get user's birth data
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                birthData: true,
            },
        });
        if (!user || !user.birthData) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BIRTH_DATA_MISSING',
                    message: 'Please add your birth data first to get personalized forecasts',
                },
            });
        }
        // Extract birth data from the stored DateTime
        const birthDate = new Date(user.birthData.date);
        const birthTimeParts = user.birthData.time.split(':');
        const birthData = {
            year: birthDate.getFullYear(),
            month: birthDate.getMonth() + 1,
            day: birthDate.getDate(),
            hour: parseInt(birthTimeParts[0]) || 12,
            minute: parseInt(birthTimeParts[1]) || 0,
            latitude: user.birthData.latitude,
            longitude: user.birthData.longitude,
            timezone: user.birthData.timezone || 'Europe/Sofia',
        };
        // Read precomputed natal chart from DB (avoids redundant API call)
        const storedChart = await prisma_1.prisma.birthChart.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { chartData: true },
        });
        const precomputedChart = storedChart?.chartData;
        const forecast = await (0, forecast_1.getWeeklyForecast)(userId, birthData, lang, precomputedChart);
        res.json({
            success: true,
            data: forecast,
        });
    }
    catch (error) {
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
router.get('/transits', async (req, res) => {
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
        const birthChart = await prisma_1.prisma.birthChart.findFirst({
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
        const { getActiveTransitsForUser } = await Promise.resolve().then(() => require('../services/transits'));
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
    }
    catch (error) {
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
// GET /api/v1/forecasts/horoscope — personal daily horoscope, no query quota
router.get('/horoscope', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
        const profile = await prisma_1.prisma.birthData.findUnique({
            where: { userId },
            select: { date: true, time: true, latitude: true, longitude: true, timezone: true },
        });
        if (!profile)
            return res.status(400).json({ success: false, error: { code: 'BIRTH_DATA_MISSING', message: 'Add your birth data first to get your daily horoscope' } });
        const birthDate = new Date(profile.date);
        const [hour, minute] = (profile.time || '12:00').split(':').map(Number);
        const birthData = {
            year: birthDate.getFullYear(), month: birthDate.getMonth() + 1, day: birthDate.getDate(),
            hour: hour || 12, minute: minute || 0,
            latitude: profile.latitude, longitude: profile.longitude,
            timezone: profile.timezone || 'UTC',
        };
        const horoscope = await forecast_1.getPersonalDailyHoroscope(userId, birthData);
        res.json({ success: true, data: horoscope });
    }
    catch (error) {
        console.error('[Forecast] Horoscope error:', error);
        res.status(500).json({ success: false, error: { code: 'HOROSCOPE_ERROR', message: 'Failed to generate your daily horoscope' } });
    }
});
exports.default = router;
//# sourceMappingURL=forecasts.js.map