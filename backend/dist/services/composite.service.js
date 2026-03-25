"use strict";
/**
 * Composite Chart Service
 * FEAT-11: Composite chart (PREMIUM)
 *
 * Calculates the midpoint composite chart between two people.
 * Uses AstrologyClient directly (same pattern as agent-tools get_composite tool).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCompositeChart = calculateCompositeChart;
const astroapi_typescript_1 = require("@astro-api/astroapi-typescript");
// ============================================
// Helpers
// ============================================
const CHART_OPTIONS = {
    house_system: 'P',
    zodiac_type: 'Tropic',
    active_points: [
        'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
        'Uranus', 'Neptune', 'Pluto', 'True_Node', 'Chiron',
    ],
};
function getClient() {
    return new astroapi_typescript_1.AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
}
function toSubject(b) {
    return {
        name: 'subject',
        birth_data: {
            year: b.year, month: b.month, day: b.day,
            hour: b.hour, minute: b.minute, second: 0,
            latitude: b.latitude, longitude: b.longitude, timezone: b.timezone,
        },
    };
}
// ============================================
// Main Service Function
// ============================================
/**
 * Calculate composite chart between two people using AstrologyClient directly.
 */
async function calculateCompositeChart(userBirth, partnerBirth) {
    const client = getClient();
    return await client.charts.getCompositeChart({
        subject1: toSubject(userBirth),
        subject2: toSubject(partnerBirth),
        options: CHART_OPTIONS,
    });
}
//# sourceMappingURL=composite.service.js.map
