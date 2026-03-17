/**
 * Astrology Service
 * US-06: Natal Chart Generation
 *
 * Integrates with astrology-api.io for chart calculations
 * Implements Redis caching with 24h TTL
 */
export interface BirthDataInput {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    latitude: number;
    longitude: number;
    timezone?: string;
    locationName?: string;
}
export interface PlanetPosition {
    name: string;
    sign: string;
    signBg: string;
    degree: number;
    house: number;
    retrograde: boolean;
    symbol: string;
}
export interface HouseCusp {
    number: number;
    sign: string;
    signBg: string;
    degree: number;
}
export interface Aspect {
    planet1: string;
    planet2: string;
    aspect: string;
    aspectBg: string;
    orb: number;
    nature: 'harmonious' | 'challenging' | 'neutral';
}
export interface NatalChart {
    sun: PlanetPosition;
    moon: PlanetPosition;
    rising: PlanetPosition;
    mercury: PlanetPosition;
    venus: PlanetPosition;
    mars: PlanetPosition;
    jupiter: PlanetPosition;
    saturn: PlanetPosition;
    uranus: PlanetPosition;
    neptune: PlanetPosition;
    pluto: PlanetPosition;
    northNode: PlanetPosition;
    southNode: PlanetPosition;
    chiron: PlanetPosition;
    lilith?: PlanetPosition;
    houses: HouseCusp[];
    aspects: Aspect[];
    elements: {
        fire: number;
        earth: number;
        air: number;
        water: number;
    };
    modalities: {
        cardinal: number;
        fixed: number;
        mutable: number;
    };
    calculatedAt: string;
    source: string;
}
/**
 * NEW: Position-based cache key for high cache hit rate
 * Groups charts with identical planetary positions regardless of birth minute
 * Format: Sun:Cap20|Moon:Leo12|Mer:Cap5|Ven:Pis18|...
 */
export declare function generatePositionBasedCacheKey(chart: NatalChart): string;
/**
 * Calculate natal chart from birth data
 * Uses Redis caching with 3-layer strategy:
 * - Layer 1: Aspect-pattern cache (90-day TTL) - highest hit rate
 * - Layer 2: Position-based cache (30-day TTL) - medium hit rate
 * - Layer 3: Legacy exact birth data (24h TTL) - backward compatibility
 */
export declare function calculateNatalChart(birthData: BirthDataInput): Promise<NatalChart>;
/** @deprecated Redis cache removed — charts are stored in BirthChart table */
export declare function getCachedChart(_birthData: BirthDataInput): Promise<NatalChart | null>;
/** @deprecated Redis cache removed — no-op */
export declare function invalidateChartCache(_birthData: BirthDataInput): Promise<void>;
/**
 * Check if astrology API is available
 */
export declare function checkAstrologyApiHealth(): Promise<boolean>;
export type { NatalChart as NatalChartType, PlanetPosition as PlanetPositionType };
//# sourceMappingURL=astrology.d.ts.map