"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.astrologyTools = void 0;
exports.createAstrologyTools = createAstrologyTools;
const ai_1 = require("ai");
const zod_1 = require("zod");
const astroapi_typescript_1 = require("@astro-api/astroapi-typescript");
const prisma_1 = require("../../utils/prisma");
const geoip = require("geoip-lite");
// ============================================
// Context & Helpers
// ============================================
const CHART_OPTIONS = {
    house_system: 'P',
    zodiac_type: 'Tropic',
    active_points: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
        'Uranus', 'Neptune', 'Pluto', 'True_Node', 'Chiron'],
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
/**
 * Resolve user's current location from IP.
 * Returns null if IP is missing, loopback, or lookup fails.
 * Never exposed to the frontend — backend-only for solar/lunar return accuracy.
 */
function resolveIpLocation(ip) {
    if (!ip)
        return null;
    const cleanIp = ip.replace(/^::ffff:/, ''); // strip IPv4-mapped IPv6 prefix
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.'))
        return null;
    const geo = geoip.lookup(cleanIp);
    if (!geo?.ll)
        return null;
    return { latitude: geo.ll[0], longitude: geo.ll[1], timezone: geo.timezone || 'UTC' };
}
// ============================================
// Schemas
// ============================================
const birthDataSchema = zod_1.z.object({
    year: zod_1.z.number(),
    month: zod_1.z.number().min(1).max(12),
    day: zod_1.z.number().min(1).max(31),
    hour: zod_1.z.number().min(0).max(23),
    minute: zod_1.z.number().min(0).max(59),
    latitude: zod_1.z.number(),
    longitude: zod_1.z.number(),
    timezone: zod_1.z.string().optional(),
});
const transitsSchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe('Date in YYYY-MM-DD format. Defaults to today if omitted.'),
});
const synastrySchema = zod_1.z.object({
    partnerId: zod_1.z.string().describe("The ID of the stored partner to analyze compatibility with. List comes from system context."),
});
const progressionsSchema = zod_1.z.object({
    birthData: birthDataSchema.describe("User's birth data"),
    targetDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Target date for progression in YYYY-MM-DD format (usually today)'),
});
const solarReturnSchema = zod_1.z.object({
    birthData: birthDataSchema.describe("User's birth data"),
    year: zod_1.z.number().describe('Target year for solar return (e.g., 2026)'),
});
const relocationSchema = zod_1.z.object({
    birthData: birthDataSchema.describe("User's birth data"),
    targetLocation: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }).describe('Coordinates of the target city/location'),
});
const compositeSchema = zod_1.z.object({
    partnerId: zod_1.z.string().describe("The ID of the stored partner to compute the composite chart with."),
});
const lunarReturnSchema = zod_1.z.object({
    birthData: birthDataSchema.describe("User's birth data"),
    year: zod_1.z.number().describe('Target year (e.g., 2026)'),
    month: zod_1.z.number().min(1).max(12).describe('Target month (1-12)'),
});
const solarArcSchema = zod_1.z.object({
    birthData: birthDataSchema.describe("User's birth data"),
    targetDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Target date in YYYY-MM-DD format'),
});
// ============================================
// Tool Factory
// ============================================
function createAstrologyTools(context) {
    const { userId, userIp } = context;
    /**
     * get_natal_chart — Reads the stored natal chart from DB.
     * No API call — chart is computed once on birth data save.
     */
    const calculateNatalChartTool = (0, ai_1.tool)({
        description: "Returns the user's natal chart data (planet positions, houses, aspects). Use for specific placements like Chiron, Midheaven, or any placement not visible in the pre-loaded context.",
        inputSchema: zod_1.z.object({}),
        execute: async () => {
            console.log(`[Agent Tool] get_natal_chart — reading from DB for userId ${userId}`);
            const record = await prisma_1.prisma.birthData.findUnique({
                where: { userId },
                include: { birthChart: true },
            });
            if (!record?.birthChart?.chartData) {
                throw new Error('Natal chart not found in database. The user may not have saved birth data yet.');
            }
            const chart = record.birthChart.chartData;
            return {
                sun: chart.sun,
                moon: chart.moon,
                rising: chart.rising,
                mercury: chart.mercury,
                venus: chart.venus,
                mars: chart.mars,
                jupiter: chart.jupiter,
                saturn: chart.saturn,
                chiron: chart.chiron,
                northNode: chart.northNode,
                houses: chart.houses,
                aspects: chart.aspects?.slice(0, 15),
            };
        },
    });
    /**
     * get_transits — Today's sky positions (cached 24h, shared across all users).
     */
    const analyzeTransitsTool = (0, ai_1.tool)({
        description: "Returns today's planetary sky positions. Only call if the user asks about current transits beyond what is already in your context.",
        inputSchema: transitsSchema,
        execute: async () => {
            console.log(`[Agent Tool] get_transits`);
            const { getActiveTransitsForUser } = await Promise.resolve().then(() => require('../transits'));
            const record = await prisma_1.prisma.birthData.findUnique({
                where: { userId },
                include: { birthChart: true },
            });
            if (!record?.birthChart?.chartData) {
                throw new Error('Natal chart not found. Cannot compute personal transits.');
            }
            const { skyPositions, aspectsToNatal } = await getActiveTransitsForUser(record.birthChart.chartData);
            return { skyPositions, aspectsToNatal: aspectsToNatal.slice(0, 10) };
        },
    });
    /**
     * get_synastry — Inter-chart aspects between user and a stored partner.
     */
    const calculateSynastryTool = (0, ai_1.tool)({
        description: "Compares the user's birth chart with a stored partner's chart. CALL THIS for relationship compatibility questions. If multiple partners are stored, first ask the user which one to analyze.",
        inputSchema: synastrySchema,
        execute: async (args) => {
            console.log(`[Agent Tool] get_synastry — partnerId ${args.partnerId}`);
            const [userRecord, partner] = await Promise.all([
                prisma_1.prisma.birthData.findUnique({ where: { userId } }),
                prisma_1.prisma.partner.findFirst({ where: { id: args.partnerId, userId } }),
            ]);
            if (!userRecord)
                throw new Error('User birth data not found in database.');
            if (!partner)
                throw new Error(`Partner with ID "${args.partnerId}" not found.`);
            const client = getClient();
            const [userHour, userMin] = (userRecord.time || '12:00').split(':').map(Number);
            const [partHour, partMin] = (partner.birthTime || '12:00').split(':').map(Number);
            const userBirth = new Date(userRecord.date);
            const partBirth = new Date(partner.birthDate);
            const result = await client.charts.getSynastryChart({
                subject1: toSubject({ year: userBirth.getFullYear(), month: userBirth.getMonth() + 1, day: userBirth.getDate(), hour: userHour, minute: userMin, latitude: userRecord.latitude, longitude: userRecord.longitude, timezone: userRecord.timezone }),
                subject2: toSubject({ year: partBirth.getFullYear(), month: partBirth.getMonth() + 1, day: partBirth.getDate(), hour: partHour, minute: partMin, latitude: partner.latitude, longitude: partner.longitude, timezone: partner.timezone }),
                options: CHART_OPTIONS,
            });
            return result;
        },
    });
    /**
     * get_progressions — Secondary progressions: inner psychological evolution.
     */
    const calculateProgressionsTool = (0, ai_1.tool)({
        description: "Calculates secondary progressions — slow inner psychological evolution (~1 day = 1 year of life). Use for questions about internal emotional shifts, identity changes, or feeling fundamentally different. Frame as inner growth themes, not external events.",
        inputSchema: progressionsSchema,
        execute: async (args) => {
            console.log(`[Agent Tool] get_progressions to ${args.targetDate}`);
            const client = getClient();
            return await client.charts.getProgressions({
                subject: toSubject(args.birthData),
                target_date: args.targetDate,
                progression_type: 'secondary',
                options: CHART_OPTIONS,
            });
        },
    });
    /**
     * get_solar_return — Annual theme chart (birthday to birthday).
     * Uses user's current location from IP for return_location if available.
     */
    const calculateSolarReturnTool = (0, ai_1.tool)({
        description: "Calculates the Solar Return chart — the year-ahead theme from birthday to birthday. Use for 'what does my year ahead look like?' or annual forecasts.",
        inputSchema: solarReturnSchema,
        execute: async (args) => {
            console.log(`[Agent Tool] get_solar_return for ${args.year}`);
            const client = getClient();
            const currentLocation = resolveIpLocation(userIp);
            const returnLocation = currentLocation
                ? { year: args.year, month: 1, day: 1, hour: 12, minute: 0, ...currentLocation }
                : undefined;
            return await client.charts.getSolarReturnChart({
                subject: toSubject(args.birthData),
                return_year: args.year,
                return_location: returnLocation,
                options: CHART_OPTIONS,
            });
        },
    });
    /**
     * get_relocation — Relocated natal chart for a target city.
     */
    const calculateRelocationTool = (0, ai_1.tool)({
        description: "Calculates the relocated natal chart for a target city. Shows how house cusps and angular placements shift — use for 'Is Paris a good city for me?' or relocation questions. Returns text analysis only (no map).",
        inputSchema: relocationSchema,
        execute: async (args) => {
            console.log(`[Agent Tool] get_relocation to ${args.targetLocation.latitude},${args.targetLocation.longitude}`);
            const client = getClient();
            return await client.charts.generateRelocationChart({
                subject: toSubject(args.birthData),
                options: {
                    target_location: {
                        latitude: args.targetLocation.latitude,
                        longitude: args.targetLocation.longitude,
                    },
                    show_changes: true,
                    highlight_angular_changes: true,
                    include_aspect_changes: true,
                    orb_tolerance: 2,
                },
            });
        },
    });
    /**
     * get_composite — The composite chart between user and a stored partner.
     */
    const calculateCompositeTool = (0, ai_1.tool)({
        description: "Calculates the Composite Chart — the relationship as its own entity. Use for 'what is the ultimate purpose of this relationship?' or destiny/compatibility questions.",
        inputSchema: compositeSchema,
        execute: async (args) => {
            console.log(`[Agent Tool] get_composite — partnerId ${args.partnerId}`);
            const [userRecord, partner] = await Promise.all([
                prisma_1.prisma.birthData.findUnique({ where: { userId } }),
                prisma_1.prisma.partner.findFirst({ where: { id: args.partnerId, userId } }),
            ]);
            if (!userRecord)
                throw new Error('User birth data not found in database.');
            if (!partner)
                throw new Error(`Partner with ID "${args.partnerId}" not found.`);
            const client = getClient();
            const [userHour, userMin] = (userRecord.time || '12:00').split(':').map(Number);
            const [partHour, partMin] = (partner.birthTime || '12:00').split(':').map(Number);
            const userBirth = new Date(userRecord.date);
            const partBirth = new Date(partner.birthDate);
            return await client.charts.getCompositeChart({
                subject1: toSubject({ year: userBirth.getFullYear(), month: userBirth.getMonth() + 1, day: userBirth.getDate(), hour: userHour, minute: userMin, latitude: userRecord.latitude, longitude: userRecord.longitude, timezone: userRecord.timezone }),
                subject2: toSubject({ year: partBirth.getFullYear(), month: partBirth.getMonth() + 1, day: partBirth.getDate(), hour: partHour, minute: partMin, latitude: partner.latitude, longitude: partner.longitude, timezone: partner.timezone }),
                options: CHART_OPTIONS,
            });
        },
    });
    /**
     * get_lunar_return — Monthly emotional cycle chart.
     * Uses user's current location from IP for return_location if available.
     */
    const calculateLunarReturnTool = (0, ai_1.tool)({
        description: "Calculates the Lunar Return chart for a specific month — the monthly emotional cycle. Use for 'what does this month hold for me?' questions.",
        inputSchema: lunarReturnSchema,
        execute: async (args) => {
            console.log(`[Agent Tool] get_lunar_return for ${args.year}-${String(args.month).padStart(2, '0')}`);
            const client = getClient();
            const currentLocation = resolveIpLocation(userIp);
            const returnLocation = currentLocation
                ? { year: args.year, month: args.month, day: 1, hour: 12, minute: 0, ...currentLocation }
                : undefined;
            return await client.charts.getLunarReturnChart({
                subject: toSubject(args.birthData),
                return_date: `${args.year}-${String(args.month).padStart(2, '0')}-01`,
                return_location: returnLocation,
                options: CHART_OPTIONS,
            });
        },
    });
    /**
     * get_solar_arc — Solar Arc Directions (~1° per year of life).
     */
    const calculateSolarArcTool = (0, ai_1.tool)({
        description: "Calculates Solar Arc Directions for a target date. Each planet moves ~1° per year. Use for 'why is this life theme emerging now?' or major life chapter questions. Complements secondary progressions.",
        inputSchema: solarArcSchema,
        execute: async (args) => {
            console.log(`[Agent Tool] get_solar_arc to ${args.targetDate}`);
            const client = getClient();
            return await client.charts.getDirections({
                subject: toSubject(args.birthData),
                target_date: args.targetDate,
                direction_type: 'solar_arc',
                options: CHART_OPTIONS,
            });
        },
    });
    return {
        get_natal_chart: calculateNatalChartTool,
        get_transits: analyzeTransitsTool,
        get_synastry: calculateSynastryTool,
        get_progressions: calculateProgressionsTool,
        get_solar_return: calculateSolarReturnTool,
        get_relocation: calculateRelocationTool,
        get_composite: calculateCompositeTool,
        get_lunar_return: calculateLunarReturnTool,
        get_solar_arc: calculateSolarArcTool,
    };
}
// Legacy static export for backward compatibility during transition
exports.astrologyTools = createAstrologyTools({ userId: '' });
//# sourceMappingURL=index.js.map
