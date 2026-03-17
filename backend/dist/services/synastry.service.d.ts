/**
 * Synastry Chart Service
 * US-19: Synastry Chart Generation
 *
 * Calculates relationship compatibility between two birth charts
 * Computes inter-planetary aspects and composite interpretations
 */
import { BirthDataInput, PlanetPosition } from './astrology';
export interface SynastryChart {
    userChart: {
        sun: PlanetPosition;
        moon: PlanetPosition;
        rising: PlanetPosition;
        [key: string]: PlanetPosition;
    };
    partnerChart: {
        sun: PlanetPosition;
        moon: PlanetPosition;
        rising: PlanetPosition;
        [key: string]: PlanetPosition;
    };
    interAspects: InterPlanetaryAspect[];
    compatibilityScore: number;
    strengths: RelationshipStrength[];
    challenges: RelationshipChallenge[];
    summary: {
        en: string;
        bg: string;
    };
    calculatedAt: string;
}
export interface InterPlanetaryAspect {
    userPlanet: string;
    userSign: string;
    userDegree: number;
    partnerPlanet: string;
    partnerSign: string;
    partnerDegree: number;
    aspect: string;
    aspectBg: string;
    orb: number;
    nature: 'harmonious' | 'challenging' | 'neutral';
    interpretation: {
        en: string;
        bg: string;
    };
}
export interface RelationshipStrength {
    title: {
        en: string;
        bg: string;
    };
    description: {
        en: string;
        bg: string;
    };
    planets: string[];
}
export interface RelationshipChallenge {
    title: {
        en: string;
        bg: string;
    };
    description: {
        en: string;
        bg: string;
    };
    planets: string[];
}
/**
 * Calculate synastry chart between user and partner
 */
export declare function calculateSynastryChart(userBirthData: BirthDataInput, partnerBirthData: BirthDataInput, userId: string, partnerId: string): Promise<SynastryChart>;
/** @deprecated Redis cache removed */
export declare function getCachedSynastry(_userId: string, _partnerId: string): Promise<SynastryChart | null>;
/** @deprecated Redis cache removed — no-op */
export declare function invalidateSynastryCache(_userId: string, _partnerId: string): Promise<void>;
export type { SynastryChart as SynastryChartType };
//# sourceMappingURL=synastry.service.d.ts.map