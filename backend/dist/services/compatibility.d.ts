/**
 * Compatibility Analysis Service
 * US-20: Compatibility Analysis
 *
 * Provides detailed compatibility analysis between user and partner
 * Includes element compatibility, planetary aspects, and category breakdowns
 *
 * Categories: Love, Communication, Trust, Adventure, Values
 */
export interface CompatibilityAnalysis {
    partnerId: string;
    partnerName: string;
    overallScore: number;
    scoreLevel: 'exceptional' | 'high' | 'moderate' | 'challenging' | 'difficult';
    categories: CategoryScores;
    elementCompatibility: ElementCompatibility;
    planetaryAnalysis: PlanetaryAnalysis;
    keyAspects: KeyAspect[];
    strengths: RelationshipInsight[];
    challenges: RelationshipInsight[];
    advice: {
        en: string;
        bg: string;
    };
    calculatedAt: string;
    cachedAt?: string;
}
export interface CategoryScores {
    love: CategoryScore;
    communication: CategoryScore;
    trust: CategoryScore;
    adventure: CategoryScore;
    values: CategoryScore;
}
export interface CategoryScore {
    score: number;
    level: 'excellent' | 'good' | 'moderate' | 'challenging';
    description: {
        en: string;
        bg: string;
    };
    contributingAspects: string[];
}
export interface ElementCompatibility {
    userElements: {
        fire: number;
        earth: number;
        air: number;
        water: number;
    };
    partnerElements: {
        fire: number;
        earth: number;
        air: number;
        water: number;
    };
    compatibility: {
        score: number;
        analysis: {
            en: string;
            bg: string;
        };
    };
    dominantElement: {
        user: string;
        partner: string;
        harmony: 'harmonious' | 'complementary' | 'challenging';
    };
}
export interface PlanetaryAnalysis {
    sun: PlanetaryComparison;
    moon: PlanetaryComparison;
    rising: PlanetaryComparison;
    venus: PlanetaryComparison;
    mars: PlanetaryComparison;
}
export interface PlanetaryComparison {
    user: {
        sign: string;
        degree: number;
    };
    partner: {
        sign: string;
        degree: number;
    };
    compatibility: number;
    nature: 'harmonious' | 'challenging' | 'neutral';
    interpretation: {
        en: string;
        bg: string;
    };
}
export interface KeyAspect {
    aspect: string;
    aspectBg: string;
    userPlanet: string;
    partnerPlanet: string;
    orb: number;
    nature: 'harmonious' | 'challenging' | 'neutral';
    interpretation: {
        en: string;
        bg: string;
    };
}
export interface RelationshipInsight {
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
 * Calculate comprehensive compatibility analysis
 */
export declare function calculateCompatibility(userId: string, partnerId: string): Promise<CompatibilityAnalysis>;
/**
 * Get cached compatibility analysis
 */
export declare function getCachedCompatibility(userId: string, partnerId: string): Promise<CompatibilityAnalysis | null>;
/**
 * Invalidate compatibility cache
 */
export declare function invalidateCompatibilityCache(userId: string, partnerId: string): Promise<void>;
//# sourceMappingURL=compatibility.d.ts.map