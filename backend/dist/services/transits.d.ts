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
export interface DailyTransits {
    date: string;
    transits: TransitPosition[];
    aspectsToNatal: TransitAspect[];
    moonPhase: MoonPhase;
    generatedAt: string;
}
/**
 * Get daily transit positions
 */
export declare function getDailyTransits(date: Date): Promise<DailyTransits>;
/**
 * Calculate aspects between transits and natal chart
 */
export declare function calculateTransitsToNatal(transits: TransitPosition[], natalChart: any): TransitAspect[];
export type { DailyTransits as DailyTransitsType, TransitAspect as TransitAspectType };
//# sourceMappingURL=transits.d.ts.map