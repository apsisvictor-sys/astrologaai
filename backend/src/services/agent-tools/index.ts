import { tool } from 'ai';
import { z } from 'zod';
import { getAstrologyOrchestrator } from '../astrology/astrology-orchestrator';
import {
    ProgressionData,
    SolarReturnData,
    RelocationData,
    CompositeData,
    VenusReturnData
} from '../astrology/astrology-provider.interface';

// Initialize the orchestrator to access robust API providers (astrology-api.io)
const orchestrator = getAstrologyOrchestrator();

// ============================================
// Schemas
// ============================================

const natalChartSchema = z.object({
    year: z.number().describe('Birth year (e.g., 1990)'),
    month: z.number().min(1).max(12).describe('Birth month (1-12)'),
    day: z.number().min(1).max(31).describe('Birth day (1-31)'),
    hour: z.number().min(0).max(23).describe('Birth hour in 24h format (0-23)'),
    minute: z.number().min(0).max(59).describe('Birth minute (0-59)'),
    latitude: z.number().describe('Birth location latitude'),
    longitude: z.number().describe('Birth location longitude'),
    timezone: z.string().optional().describe('Timezone (e.g., UTC, Europe/Sofia)'),
});

const transitsSchema = z.object({
    date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).describe('The date for transits in YYYY-MM-DD format'),
    latitude: z.number().optional().describe('Optional latitude for location-specific transits'),
    longitude: z.number().optional().describe('Optional longitude for location-specific transits'),
});

const synastrySchema = z.object({
    person1: z.object({
        year: z.number(), month: z.number(), day: z.number(),
        hour: z.number(), minute: z.number(),
        latitude: z.number(), longitude: z.number()
    }).describe("First person's birth data(usually the user)"),
    person2: z.object({
        year: z.number(), month: z.number(), day: z.number(),
        hour: z.number(), minute: z.number(),
        latitude: z.number(), longitude: z.number()
    }).describe("Second person's birth data(partner)")
});

const progressionsSchema = z.object({
    birthData: z.object({
        year: z.number(), month: z.number(), day: z.number(),
        hour: z.number(), minute: z.number(),
        latitude: z.number(), longitude: z.number()
    }).describe("User's original birth data"),
    targetDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).describe('The target date for the progression in YYYY-MM-DD format (usually current date)'),
});

const solarReturnSchema = z.object({
    birthData: z.object({
        year: z.number(), month: z.number(), day: z.number(),
        hour: z.number(), minute: z.number(),
        latitude: z.number(), longitude: z.number()
    }).describe("User's original birth data"),
    year: z.number().describe('The target year for the solar return (e.g., 2025)'),
});

const relocationSchema = z.object({
    birthData: z.object({
        year: z.number(), month: z.number(), day: z.number(),
        hour: z.number(), minute: z.number(),
        latitude: z.number(), longitude: z.number()
    }).describe("User's original birth data"),
    targetLocation: z.object({
        latitude: z.number(), longitude: z.number(),
    }).describe('Coordinates of the target city/location to check'),
});

const compositeSchema = z.object({
    person1: z.object({
        year: z.number(), month: z.number(), day: z.number(),
        hour: z.number(), minute: z.number(),
        latitude: z.number(), longitude: z.number()
    }).describe("First person's birth data"),
    person2: z.object({
        year: z.number(), month: z.number(), day: z.number(),
        hour: z.number(), minute: z.number(),
        latitude: z.number(), longitude: z.number()
    }).describe("Second person's birth data")
});

const venusReturnSchema = z.object({
    birthData: z.object({
        year: z.number(), month: z.number(), day: z.number(),
        hour: z.number(), minute: z.number(),
        latitude: z.number(), longitude: z.number()
    }).describe("User's original birth data"),
    year: z.number().describe('The target year to calculate the romance peak (e.g., 2025)'),
});


/**
 * Tool: Calculate Natal Chart
 * Description: Fetches the natal chart data containing planet positions, houses, and aspects.
 */
export const calculateNatalChartTool: any = tool({
    description: "Calculates the exact position, house, and aspects of planets in the user's birth chart.Use this to find specific placements like Chiron, Midheaven, or basic sign positions mentioned by the user.",
    parameters: natalChartSchema,
    // @ts-ignore
    execute: async (args) => {
        try {
            console.log(`[Agent Tool Triggered] calculateNatalChartTool`, args);
            const chart = await orchestrator.calculateNatalChart(args);

            // We return a simplified subset to the LLM to save tokens, focusing on key elements.
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
                aspects: chart.aspects.slice(0, 10), // Limit aspects to most important
            };
        } catch (error) {
            console.error('[Agent Tool Error] calculateNatalChartTool:', error);
            throw new Error('Failed to calculate natal chart due to API error.');
        }
    },
});

/**
 * Tool: Analyze Transits
 * Description: Fetches current planetary transits for a specific date against a natal chart location.
 */
export const analyzeTransitsTool: any = tool({
    description: 'Fetches the planetary transits for a specific date. ONLY call this tool if the user asks questions about upcoming events, current feelings triggered by the cosmos, or timing (e.g., "What is happening to me next month?").',
    parameters: transitsSchema,
    // @ts-ignore
    execute: async (args) => {
        try {
            console.log(`[Agent Tool Triggered] analyzeTransitsTool for ${args.date}`);
            const transits = await orchestrator.getTransits(args.date, { latitude: args.latitude, longitude: args.longitude });
            return transits;
        } catch (error) {
            console.error('[Agent Tool Error] analyzeTransitsTool:', error);
            throw new Error('Failed to retrieve transits due to API error.');
        }
    },
});

/**
 * Tool: Calculate Synastry (Compatibility)
 * Description: Compares two birth charts for relationship compatibility.
 */
export const calculateSynastryTool: any = tool({
    description: 'Compares two birth charts and returns relationship compatibility data (Synastry). CALL THIS if the user is asking about an interpersonal relationship, love interest, or partner.',
    parameters: synastrySchema,
    // @ts-ignore
    execute: async (args) => {
        try {
            console.log(`[Agent Tool Triggered] calculateSynastryTool`);
            const synastry = await orchestrator.calculateSynastry(args.person1, args.person2);

            return {
                overallCompatibility: synastry.compatibility.overall,
                emotional: synastry.compatibility.emotional,
                communication: synastry.compatibility.communication,
                physical: synastry.compatibility.physical,
                keyAspects: synastry.aspects.slice(0, 10),
            };
        } catch (error) {
            console.error('[Agent Tool Error] calculateSynastryTool:', error);
            throw new Error('Failed to calculate synastry due to API error.');
        }
    },
});

// ============================================
// Advanced Elite Tools (Phase 7 Expansion)
// ============================================

/**
 * Tool: Calculate Progressed Moon & Chart
 * Description: Fetches secondary progressions to determine current internal emotional evolution.
 */
export const calculateProgressionsTool: any = tool({
    description: 'Calculates the secondary progressed chart for a given point in time. CRUCIAL for answering questions about internal emotional shifts, feeling different, or inner evolution (Progressed Moon).',
    parameters: progressionsSchema,
    // @ts-ignore
    execute: async (args) => {
        try {
            console.log(`[Agent Tool Triggered] calculateProgressionsTool`);
            return await orchestrator.getProgressions(args.birthData as any, args.targetDate);
        } catch (error) {
            console.error('[Agent Tool Error] calculateProgressionsTool:', error);
            throw new Error('Failed to calculate progressions due to API error.');
        }
    },
});

/**
 * Tool: Calculate Solar Return
 * Description: Fetches the yearly theme (birthday to birthday).
 */
export const calculateSolarReturnTool: any = tool({
    description: 'Calculates the Solar Return chart. CRUCIAL for questions about the "year ahead", "what will this year bring", or generic annual forecasts.',
    parameters: solarReturnSchema,
    // @ts-ignore
    execute: async (args) => {
        try {
            console.log(`[Agent Tool Triggered] calculateSolarReturnTool`);
            return await orchestrator.getSolarReturn(args.birthData as any, args.year);
        } catch (error) {
            console.error('[Agent Tool Error] calculateSolarReturnTool:', error);
            throw new Error('Failed to calculate solar return due to API error.');
        }
    },
});

/**
 * Tool: Calculate Astrocartography (Relocation)
 * Description: Calculates planetary lines for finding good places to live/travel.
 */
export const calculateRelocationTool: any = tool({
    description: 'Calculates the Astrocartography (relocation) lines for a specific target location. CRUCIAL for answering "Where should I move?", "Is Paris a good city for me?", or questions about travel and geography.',
    parameters: relocationSchema,
    // @ts-ignore
    execute: async (args) => {
        try {
            console.log(`[Agent Tool Triggered] calculateRelocationTool`);
            return await orchestrator.getRelocation(args.birthData as any, args.targetLocation);
        } catch (error) {
            console.error('[Agent Tool Error] calculateRelocationTool:', error);
            throw new Error('Failed to calculate relocation due to API error.');
        }
    },
});

/**
 * Tool: Calculate Composite Chart
 * Description: Merges two charts to show the destiny of a relationship.
 */
export const calculateCompositeTool: any = tool({
    description: 'Calculates a Composite Chart between two people. CRUCIAL for answering "What is the ultimate purpose of this relationship?", "Are we meant to be together forever?", or the destiny/vibe of the couple as a single entity.',
    parameters: compositeSchema,
    // @ts-ignore
    execute: async (args) => {
        try {
            console.log(`[Agent Tool Triggered] calculateCompositeTool`);
            return await orchestrator.getCompositeChart(args.person1 as any, args.person2 as any);
        } catch (error) {
            console.error('[Agent Tool Error] calculateCompositeTool:', error);
            throw new Error('Failed to calculate composite chart due to API error.');
        }
    },
});

/**
 * Tool: Calculate Venus Return
 * Description: Calculates exact romantic timing.
 */
export const calculateVenusReturnTool: any = tool({
    description: 'Calculates the Venus Return chart. CRUCIAL for precise timing on love, asking "When will I meet someone?", "When is the best time for romance this year?", or financial luck timing.',
    parameters: venusReturnSchema,
    // @ts-ignore
    execute: async (args) => {
        try {
            console.log(`[Agent Tool Triggered] calculateVenusReturnTool`);
            return await orchestrator.getVenusReturn(args.birthData as any, args.year);
        } catch (error) {
            console.error('[Agent Tool Error] calculateVenusReturnTool:', error);
            throw new Error('Failed to calculate venus return due to API error.');
        }
    },
});

// Export all tools for injection into the streamText function
export const astrologyTools = {
    get_natal_chart: calculateNatalChartTool,
    get_transits: analyzeTransitsTool,
    get_synastry: calculateSynastryTool,
    get_progressions: calculateProgressionsTool,
    get_solar_return: calculateSolarReturnTool,
    get_relocation: calculateRelocationTool,
    get_composite: calculateCompositeTool,
    get_venus_return: calculateVenusReturnTool,
};
