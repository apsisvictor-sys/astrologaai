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
        // Get the daily forecast
        const forecast = await (0, forecast_1.getDailyForecast)(userId, birthData, lang);
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
        const forecast = await (0, forecast_1.getWeeklyForecast)(userId, birthData, lang);
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
                    message: 'Please add your birth data first',
                },
            });
        }
        // For now, return a placeholder - real implementation would use astrology API
        res.json({
            success: true,
            data: {
                message: 'Transits endpoint - to be implemented with astrology-api.io integration',
                userId,
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
exports.default = router;
//# sourceMappingURL=forecasts.js.map