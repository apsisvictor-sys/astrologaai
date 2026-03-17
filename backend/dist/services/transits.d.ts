/**
 * Transit Calculation Service
 * US-15: Daily Forecast - Transit calculations
 *
 * Calculates current planetary positions and their aspects to natal chart
 */
export interface TransitPosition {
    planet: string;
    planetBg: string;
    sign: string;
    signBg: string;
    degree: number;
    retrograde: boolean;
}
export interface TransitAspect {
    transitPlanet: string;
    transitPlanetBg: string;
    natalPlanet: string;
    natalPlanetBg: string;
    aspect: string;
    aspectBg: string;
    orb: number;
    influence: 'positive' | 'challenging' | 'neutral';
    description: string;
}
export interface MoonPhase {
    phase: string;
    phaseBg: string;
    illumination: number;
    moonSign: string;
    moonSignBg: string;
}
/**
 * Calculate aspects between transits and natal chart
 */
export declare function calculateTransitsToNatal(transits: TransitPosition[], natalChart: any): TransitAspect[];
/**
 * Get active transit-to-natal aspects for a user's chart.
 * Fetches today's sky from astrology-api.io via SDK (cached 24h, one call per day for all users),
 * then computes which transiting planets are aspecting the user's natal planets.
 *
 * @param natalChart - The user's natal chart object (birthChart.chartData from DB)
 * @returns { skyPositions, aspectsToNatal, moonPhase, generatedAt }
 */
export declare function getActiveTransitsForUser(natalChart: any): Promise<{
    skyPositions: TransitPosition[];
    aspectsToNatal: TransitAspect[];
    moonPhase: MoonPhase;
    generatedAt: string;
}>;
/**
 * Given today's sky positions and the user's natal house cusps,
 * returns which natal house each transiting planet occupies.
 */
export declare function computeTransitHouses(skyPositions: TransitPosition[], natalHouses: Array<{
    number: number;
    sign: string;
    degree: number;
}>): Record<string, number>;
export type { TransitAspect as TransitAspectType };
//# sourceMappingURL=transits.d.ts.map