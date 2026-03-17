"use strict";
/**
 * Time Sensitivity Controller
 * US-30: View Birth Time Sensitivity
 *
 * Calculates how small changes in birth time affect the chart,
 * showing Rising sign and house placements sensitivity.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeSensitivity = getTimeSensitivity;
exports.getTimeSensitivitySummary = getTimeSensitivitySummary;
const client_1 = require("@prisma/client");
const astrology_1 = require("../services/astrology");
const prisma = new client_1.PrismaClient();
// ============================================
// Helper Functions
// ============================================
/**
 * Parse birth time to hours and minutes
 */
function parseBirthTime(time) {
    if (!time)
        return { hour: 12, minute: 0 }; // Default to noon if unknown
    const [h, m] = time.split(':').map(Number);
    return { hour: h || 12, minute: m || 0 };
}
/**
 * Format time offset to HH:MM
 */
function formatTimeOffset(baseHour, baseMinute, offsetMinutes) {
    const totalMinutes = baseHour * 60 + baseMinute + offsetMinutes;
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
/**
 * Calculate house changes between two charts
 */
function calculateHouseChanges(originalHouses, newHouses) {
    return newHouses.map((house, index) => {
        const originalHouse = originalHouses[index];
        const changed = house.sign !== originalHouse.sign;
        return {
            house: house.number,
            sign: house.sign,
            signBg: house.signBg,
            changed,
        };
    });
}
/**
 * Calculate planet house shifts between two charts
 */
function calculatePlanetShifts(originalChart, newChart) {
    const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    return planets.map(planet => {
        const originalPlanet = originalChart[planet];
        const newPlanet = newChart[planet];
        const changed = originalPlanet.house !== newPlanet.house;
        return {
            planet,
            originalHouse: originalPlanet.house,
            newHouse: newPlanet.house,
            changed,
        };
    });
}
/**
 * Calculate rising sign changes across data points
 */
function calculateRisingSignSensitivity(dataPoints) {
    const signs = new Set(dataPoints.map(d => d.rising.sign));
    const signChanges = signs.size - 1;
    const stable = signChanges === 0;
    // Stability score based on number of sign changes
    // 0 changes = 100, 1 change = 70, 2+ changes = lower
    const stabilityScore = Math.max(0, 100 - signChanges * 30);
    return { stable, signChanges, stabilityScore };
}
/**
 * Calculate house sensitivity across data points
 */
function calculateHouseSensitivity(dataPoints) {
    if (dataPoints.length === 0) {
        return { stableHouses: 12, changingHouses: [], stabilityScore: 100 };
    }
    const houseChanges = new Map();
    // Initialize all houses
    for (let i = 1; i <= 12; i++) {
        houseChanges.set(i, 0);
    }
    // Count changes for each house
    dataPoints.forEach(point => {
        point.houseChanges.forEach(hc => {
            if (hc.changed) {
                houseChanges.set(hc.house, (houseChanges.get(hc.house) || 0) + 1);
            }
        });
    });
    // A house is considered stable if it changed in less than 30% of data points
    const changingHouses = [];
    const threshold = Math.ceil(dataPoints.length * 0.3);
    houseChanges.forEach((changes, house) => {
        if (changes >= threshold) {
            changingHouses.push(house);
        }
    });
    const stableHouses = 12 - changingHouses.length;
    const stabilityScore = Math.round((stableHouses / 12) * 100);
    return { stableHouses, changingHouses, stabilityScore };
}
/**
 * Generate summary text based on sensitivity analysis
 */
function generateSummary(risingSensitivity, houseSensitivity, overallStability, isUnknownTime, language) {
    if (language === 'bg') {
        const stabilityText = overallStability >= 80
            ? 'Вашата карта е силно стабилна'
            : overallStability >= 50
                ? 'Вашата карта има умерена чувствителност към времето'
                : 'Вашата карта е чувствителна към промени във времето';
        const risingText = risingSensitivity.stable
            ? 'Асцендентът остава стабилен в целия времеви диапазон'
            : `Асцендентът се променя ${risingSensitivity.signChanges} пъти в рамките на ±30 минути`;
        const houseText = houseSensitivity.stableHouses === 12
            ? 'Всички домове остават стабилни'
            : `${12 - houseSensitivity.stableHouses} домове променят знаци при вариации във времето`;
        const unknownTimeNote = isUnknownTime
            ? ' Тъй като точният час е неизвестен, използваме обяд (12:00) като референция.'
            : '';
        return {
            en: `${stabilityText}. ${risingText}. ${houseText}.${unknownTimeNote}`,
            bg: `${stabilityText}. ${risingText}. ${houseText}.${unknownTimeNote}`,
        };
    }
    const stabilityText = overallStability >= 80
        ? 'Your chart is highly stable'
        : overallStability >= 50
            ? 'Your chart has moderate time sensitivity'
            : 'Your chart is sensitive to time changes';
    const risingText = risingSensitivity.stable
        ? 'The Rising sign remains stable across the entire time range'
        : `The Rising sign changes ${risingSensitivity.signChanges} times within ±30 minutes`;
    const houseText = houseSensitivity.stableHouses === 12
        ? 'All houses remain stable'
        : `${12 - houseSensitivity.stableHouses} houses change signs with time variations`;
    const unknownTimeNote = isUnknownTime
        ? ' Since exact time is unknown, we use noon (12:00) as reference.'
        : '';
    return {
        en: `${stabilityText}. ${risingText}. ${houseText}.${unknownTimeNote}`,
        bg: `${stabilityText}. ${risingText}. ${houseText}.${unknownTimeNote}`,
    };
}
// ============================================
// Controller Functions
// ============================================
/**
 * GET /api/v1/birth-chart/:profileId/time-sensitivity
 * Calculate and return time sensitivity data
 */
async function getTimeSensitivity(req, res) {
    try {
        const { profileId } = req.params;
        const userId = req.user?.id;
        // Query parameters
        const timeRange = parseInt(req.query.timeRange) || 30; // Default ±30 minutes
        const interval = parseInt(req.query.interval) || 5; // Default 5-minute intervals
        const lang = req.query.lang || 'bg';
        // Validate parameters
        if (timeRange < 5 || timeRange > 120) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_TIME_RANGE',
                    message: 'Time range must be between 5 and 120 minutes',
                },
            });
        }
        if (interval < 1 || interval > 30) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INTERVAL',
                    message: 'Interval must be between 1 and 30 minutes',
                },
            });
        }
        // Hard cap: max 20 data points to prevent runaway API usage
        // e.g. timeRange=120, interval=1 would otherwise make 241 API calls
        const totalPoints = Math.ceil((timeRange * 2) / interval) + 1;
        if (totalPoints > 20) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TOO_MANY_POINTS',
                    message: `Request would generate ${totalPoints} API calls. Reduce timeRange or increase interval.`,
                },
            });
        }
        // Fetch birth profile with stored chart
        const profile = await prisma.birthProfile.findFirst({
            where: {
                id: profileId,
                userId,
            },
            include: { birthChart: { select: { chartData: true } } },
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'PROFILE_NOT_FOUND',
                    message: 'Birth profile not found',
                },
            });
        }
        // Parse birth data
        const birthDate = new Date(profile.birthDate);
        const { hour, minute } = parseBirthTime(profile.birthTime);
        const isUnknownTime = profile.isUnknownTime;
        // Calculate original chart
        const originalBirthData = {
            year: birthDate.getFullYear(),
            month: birthDate.getMonth() + 1,
            day: birthDate.getDate(),
            hour,
            minute,
            latitude: profile.latitude,
            longitude: profile.longitude,
            timezone: profile.timezone,
        };
        // Use stored chart if available (avoids an API call for the base chart)
        const originalChart = profile.birthChart?.chartData
            ?? await (0, astrology_1.calculateNatalChart)(originalBirthData);
        // Generate data points for time range
        const dataPoints = [];
        const offsets = [];
        // Create array of time offsets (e.g., -30, -25, -20, ..., 0, ..., 25, 30)
        for (let offset = -timeRange; offset <= timeRange; offset += interval) {
            offsets.push(offset);
        }
        // Calculate chart for each time offset
        for (const offset of offsets) {
            const newHour = Math.floor((hour * 60 + minute + offset) / 60) % 24;
            const newMinute = (hour * 60 + minute + offset) % 60;
            const adjustedBirthData = {
                ...originalBirthData,
                hour: newHour < 0 ? newHour + 24 : newHour,
                minute: Math.abs(newMinute),
            };
            const adjustedChart = await (0, astrology_1.calculateNatalChart)(adjustedBirthData);
            dataPoints.push({
                timeOffset: offset,
                birthTime: formatTimeOffset(hour, minute, offset),
                rising: {
                    sign: adjustedChart.rising.sign,
                    signBg: adjustedChart.rising.signBg,
                    degree: adjustedChart.rising.degree,
                    changed: adjustedChart.rising.sign !== originalChart.rising.sign,
                },
                houseChanges: calculateHouseChanges(originalChart.houses, adjustedChart.houses),
                planetShifts: calculatePlanetShifts(originalChart, adjustedChart),
            });
        }
        // Calculate sensitivity metrics
        const risingSensitivity = calculateRisingSignSensitivity(dataPoints);
        const houseSensitivity = calculateHouseSensitivity(dataPoints);
        const overallStability = Math.round((risingSensitivity.stabilityScore * 0.6 + houseSensitivity.stabilityScore * 0.4));
        // Determine confidence level
        let confidenceLevel;
        if (isUnknownTime) {
            confidenceLevel = 'low';
        }
        else if (overallStability >= 80) {
            confidenceLevel = 'high';
        }
        else if (overallStability >= 50) {
            confidenceLevel = 'medium';
        }
        else {
            confidenceLevel = 'low';
        }
        // Generate summary
        const summary = generateSummary(risingSensitivity, houseSensitivity, overallStability, isUnknownTime, lang);
        const response = {
            profileId,
            profileName: profile.name,
            originalTime: {
                time: profile.birthTime || '12:00',
                isUnknown: isUnknownTime,
            },
            sensitivity: {
                risingSign: risingSensitivity,
                houses: houseSensitivity,
                overallStability,
                confidenceLevel,
            },
            timeRange: {
                start: formatTimeOffset(hour, minute, -timeRange),
                end: formatTimeOffset(hour, minute, timeRange),
                interval,
            },
            dataPoints,
            summary,
        };
        return res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error('[Time Sensitivity] Error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'CALCULATION_ERROR',
                message: 'Failed to calculate time sensitivity',
                details: error instanceof Error ? error.message : undefined,
            },
        });
    }
}
/**
 * GET /api/v1/birth-chart/:profileId/time-sensitivity/summary
 * Get just the summary without full data points
 */
async function getTimeSensitivitySummary(req, res) {
    try {
        const { profileId } = req.params;
        const userId = req.user?.id;
        const lang = req.query.lang || 'bg';
        // Fetch birth profile
        const profile = await prisma.birthProfile.findFirst({
            where: {
                id: profileId,
                userId,
            },
        });
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'PROFILE_NOT_FOUND',
                    message: 'Birth profile not found',
                },
            });
        }
        // Parse birth data
        const birthDate = new Date(profile.birthDate);
        const { hour, minute } = parseBirthTime(profile.birthTime);
        const isUnknownTime = profile.isUnknownTime;
        // Calculate only a few key points (start, middle, end)
        const keyPoints = [-30, 0, 30];
        const charts = [];
        for (const offset of keyPoints) {
            const newHour = Math.floor((hour * 60 + minute + offset) / 60) % 24;
            const newMinute = (hour * 60 + minute + offset) % 60;
            const adjustedBirthData = {
                year: birthDate.getFullYear(),
                month: birthDate.getMonth() + 1,
                day: birthDate.getDate(),
                hour: newHour < 0 ? newHour + 24 : newHour,
                minute: Math.abs(newMinute),
                latitude: profile.latitude,
                longitude: profile.longitude,
                timezone: profile.timezone,
            };
            charts.push(await (0, astrology_1.calculateNatalChart)(adjustedBirthData));
        }
        // Quick sensitivity check
        const risingSigns = new Set(charts.map(c => c.rising.sign));
        const risingChanges = risingSigns.size - 1;
        const overallStability = Math.max(0, 100 - risingChanges * 30);
        let confidenceLevel;
        if (isUnknownTime) {
            confidenceLevel = 'low';
        }
        else if (overallStability >= 80) {
            confidenceLevel = 'high';
        }
        else if (overallStability >= 50) {
            confidenceLevel = 'medium';
        }
        else {
            confidenceLevel = 'low';
        }
        return res.json({
            success: true,
            data: {
                profileId,
                profileName: profile.name,
                originalTime: {
                    time: profile.birthTime || '12:00',
                    isUnknown: isUnknownTime,
                },
                sensitivity: {
                    risingSignChanges: risingChanges,
                    overallStability,
                    confidenceLevel,
                },
                summary: {
                    en: overallStability >= 80
                        ? 'Your chart is stable across the ±30 minute range.'
                        : overallStability >= 50
                            ? 'Your chart shows some sensitivity to birth time variations.'
                            : 'Your chart is highly sensitive to birth time changes.',
                    bg: overallStability >= 80
                        ? 'Вашата карта е стабилна в диапазона ±30 минути.'
                        : overallStability >= 50
                            ? 'Вашата карта показва известна чувствителност към вариации във времето.'
                            : 'Вашата карта е силно чувствителна към промени във времето.',
                },
            },
        });
    }
    catch (error) {
        console.error('[Time Sensitivity Summary] Error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'CALCULATION_ERROR',
                message: 'Failed to calculate time sensitivity summary',
            },
        });
    }
}
exports.default = {
    getTimeSensitivity,
    getTimeSensitivitySummary,
};
//# sourceMappingURL=timeSensitivityController.js.map