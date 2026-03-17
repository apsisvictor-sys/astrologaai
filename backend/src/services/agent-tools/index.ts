import { tool } from 'ai';
import { z } from 'zod';
import { AstrologyClient } from '@astro-api/astroapi-typescript';
import { prisma } from '../../utils/prisma';
import geoip from 'geoip-lite';

// ============================================
// Context & Helpers
// ============================================

export interface ToolContext {
    userId: string;
    userIp?: string;
}

const CHART_OPTIONS = {
    house_system: 'P' as const,
    zodiac_type: 'Tropic' as const,
    active_points: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
                    'Uranus', 'Neptune', 'Pluto', 'True_Node', 'Chiron'],
};

function getClient(): AstrologyClient {
    return new AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
}

function toSubject(b: {
    year: number; month: number; day: number;
    hour: number; minute: number;
    latitude: number; longitude: number; timezone?: string;
}) {
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
function resolveIpLocation(ip?: string): { latitude: number; longitude: number; timezone: string } | null {
    if (!ip) return null;
    const cleanIp = ip.replace(/^::ffff:/, ''); // strip IPv4-mapped IPv6 prefix
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) return null;
    const geo = geoip.lookup(cleanIp);
    if (!geo?.ll) return null;
    return { latitude: geo.ll[0], longitude: geo.ll[1], timezone: geo.timezone || 'UTC' };
}

// ============================================
// Schemas
// ============================================

const birthDataSchema = z.object({
    year: z.number(),
    month: z.number().min(1).max(12),
    day: z.number().min(1).max(31),
    hour: z.number().min(0).max(23),
    minute: z.number().min(0).max(59),
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string().optional(),
});

const transitsSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe('Date in YYYY-MM-DD format. Defaults to today if omitted.'),
});

const synastrySchema = z.object({
    partnerId: z.string().describe("The ID of the stored partner to analyze compatibility with. List comes from system context."),
});

const progressionsSchema = z.object({
    birthData: birthDataSchema.describe("User's birth data"),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Target date for progression in YYYY-MM-DD format (usually today)'),
});

const solarReturnSchema = z.object({
    birthData: birthDataSchema.describe("User's birth data"),
    year: z.number().describe('Target year for solar return (e.g., 2026)'),
});

const relocationSchema = z.object({
    birthData: birthDataSchema.describe("User's birth data"),
    targetLocation: z.object({
        latitude: z.number(),
        longitude: z.number(),
    }).describe('Coordinates of the target city/location'),
});

const compositeSchema = z.object({
    partnerId: z.string().describe("The ID of the stored partner to compute the composite chart with."),
});

const lunarReturnSchema = z.object({
    birthData: birthDataSchema.describe("User's birth data"),
    year: z.number().describe('Target year (e.g., 2026)'),
    month: z.number().min(1).max(12).describe('Target month (1-12)'),
});

const solarArcSchema = z.object({
    birthData: birthDataSchema.describe("User's birth data"),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Target date in YYYY-MM-DD format'),
});

// ============================================
// Tool Factory
// ============================================

export function createAstrologyTools(context: ToolContext) {
    const { userId, userIp } = context;

    /**
     * get_natal_chart — Reads the stored natal chart from DB.
     * No API call — chart is computed once on birth data save.
     */
    const calculateNatalChartTool = tool({
        description: "Returns the user's natal chart data (planet positions, houses, aspects). Use for specific placements like Chiron, Midheaven, or any placement not visible in the pre-loaded context.",
        inputSchema: z.object({}),
        execute: async () => {
            console.log(`[Agent Tool] get_natal_chart — reading from DB for userId ${userId}`);
            const record = await prisma.birthProfile.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                include: { birthChart: true },
            });
            if (!record?.birthChart?.chartData) {
                throw new Error('Natal chart not found in database. The user may not have saved birth data yet.');
            }
            const chart = record.birthChart.chartData as any;
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
    const analyzeTransitsTool = tool({
        description: "Returns today's planetary sky positions. Only call if the user asks about current transits beyond what is already in your context.",
        inputSchema: transitsSchema,
        execute: async () => {
            console.log(`[Agent Tool] get_transits`);
            const { getActiveTransitsForUser } = await import('../transits');
            const record = await prisma.birthProfile.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
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
     * If the user has multiple partners, ask them to specify first.
     */
    const calculateSynastryTool = tool({
        description: "Compares the user's birth chart with a stored partner's chart. CALL THIS for relationship compatibility questions. If multiple partners are stored, first ask the user which one to analyze.",
        inputSchema: synastrySchema,
        execute: async (args: z.infer<typeof synastrySchema>) => {
            console.log(`[Agent Tool] get_synastry — partnerId ${args.partnerId}`);
            const [userProfile, partner] = await Promise.all([
                prisma.birthProfile.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
                prisma.partner.findFirst({ where: { id: args.partnerId, userId } }),
            ]);
            if (!userProfile) throw new Error('User birth data not found in database.');
            if (!partner) throw new Error(`Partner with ID "${args.partnerId}" not found.`);

            const client = getClient();
            const [userHour, userMin] = (userProfile.birthTime || '12:00').split(':').map(Number);
            const [partHour, partMin] = (partner.birthTime || '12:00').split(':').map(Number);
            const userBirth = new Date(userProfile.birthDate);
            const partBirth = new Date(partner.birthDate);

            const result = await client.charts.getSynastryChart({
                subject1: toSubject({ year: userBirth.getFullYear(), month: userBirth.getMonth() + 1, day: userBirth.getDate(), hour: userHour, minute: userMin, latitude: userProfile.latitude, longitude: userProfile.longitude, timezone: userProfile.timezone }),
                subject2: toSubject({ year: partBirth.getFullYear(), month: partBirth.getMonth() + 1, day: partBirth.getDate(), hour: partHour, minute: partMin, latitude: partner.latitude, longitude: partner.longitude, timezone: partner.timezone }),
                options: CHART_OPTIONS,
            });
            return result;
        },
    });

    /**
     * get_progressions — Secondary progressions: inner psychological evolution.
     * Frame as slow inner growth, not external events.
     */
    const calculateProgressionsTool = tool({
        description: "Calculates secondary progressions — slow inner psychological evolution (~1 day = 1 year of life). Use for questions about internal emotional shifts, identity changes, or feeling fundamentally different. Frame as inner growth themes, not external events.",
        inputSchema: progressionsSchema,
        execute: async (args: z.infer<typeof progressionsSchema>) => {
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
    const calculateSolarReturnTool = tool({
        description: "Calculates the Solar Return chart — the year-ahead theme from birthday to birthday. Use for 'what does my year ahead look like?' or annual forecasts.",
        inputSchema: solarReturnSchema,
        execute: async (args: z.infer<typeof solarReturnSchema>) => {
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
     * Shows how house positions and angles shift at a new location.
     */
    const calculateRelocationTool = tool({
        description: "Calculates the relocated natal chart for a target city. Shows how house cusps and angular placements shift — use for 'Is Paris a good city for me?' or relocation questions. Returns text analysis only (no map).",
        inputSchema: relocationSchema,
        execute: async (args: z.infer<typeof relocationSchema>) => {
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
     * Shows the relationship itself as its own entity.
     */
    const calculateCompositeTool = tool({
        description: "Calculates the Composite Chart — the relationship as its own entity. Use for 'what is the ultimate purpose of this relationship?' or destiny/compatibility questions.",
        inputSchema: compositeSchema,
        execute: async (args: z.infer<typeof compositeSchema>) => {
            console.log(`[Agent Tool] get_composite — partnerId ${args.partnerId}`);
            const [userProfile, partner] = await Promise.all([
                prisma.birthProfile.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
                prisma.partner.findFirst({ where: { id: args.partnerId, userId } }),
            ]);
            if (!userProfile) throw new Error('User birth data not found in database.');
            if (!partner) throw new Error(`Partner with ID "${args.partnerId}" not found.`);

            const client = getClient();
            const [userHour, userMin] = (userProfile.birthTime || '12:00').split(':').map(Number);
            const [partHour, partMin] = (partner.birthTime || '12:00').split(':').map(Number);
            const userBirth = new Date(userProfile.birthDate);
            const partBirth = new Date(partner.birthDate);

            return await client.charts.getCompositeChart({
                subject1: toSubject({ year: userBirth.getFullYear(), month: userBirth.getMonth() + 1, day: userBirth.getDate(), hour: userHour, minute: userMin, latitude: userProfile.latitude, longitude: userProfile.longitude, timezone: userProfile.timezone }),
                subject2: toSubject({ year: partBirth.getFullYear(), month: partBirth.getMonth() + 1, day: partBirth.getDate(), hour: partHour, minute: partMin, latitude: partner.latitude, longitude: partner.longitude, timezone: partner.timezone }),
                options: CHART_OPTIONS,
            });
        },
    });

    /**
     * get_lunar_return — Monthly emotional cycle chart.
     * Uses user's current location from IP for return_location if available.
     */
    const calculateLunarReturnTool = tool({
        description: "Calculates the Lunar Return chart for a specific month — the monthly emotional cycle. Use for 'what does this month hold for me?' questions.",
        inputSchema: lunarReturnSchema,
        execute: async (args: z.infer<typeof lunarReturnSchema>) => {
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
     * For deep timing questions and major life chapter shifts.
     */
    const calculateSolarArcTool = tool({
        description: "Calculates Solar Arc Directions for a target date. Each planet moves ~1° per year. Use for 'why is this life theme emerging now?' or major life chapter questions. Complements secondary progressions.",
        inputSchema: solarArcSchema,
        execute: async (args: z.infer<typeof solarArcSchema>) => {
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
export const astrologyTools = createAstrologyTools({ userId: '' });
