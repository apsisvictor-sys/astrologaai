/**
 * Compatibility Report Service
 * US-20: Generate detailed compatibility analysis reports
 *
 * Uses synastry data and LLM to generate comprehensive
 * compatibility reports with caching
 */
import type { BirthDataInput } from './astrology';
export interface CompatibilityReport {
    partnerId: string;
    partnerName: string;
    overallScore: number;
    categories: {
        emotional: CategoryScore;
        communication: CategoryScore;
        physical: CategoryScore;
        longTerm: CategoryScore;
    };
    keyAspects: KeyAspect[];
    strengths: string[];
    challenges: string[];
    advice: string;
    generatedAt: string;
    language: 'bg' | 'en';
}
export interface CategoryScore {
    score: number;
    label: string;
    labelBg: string;
    analysis: string;
}
export interface KeyAspect {
    userPlanet: string;
    partnerPlanet: string;
    aspect: string;
    aspectBg: string;
    description: string;
    nature: 'harmonious' | 'challenging' | 'neutral';
}
export declare function generateCompatibilityReport(userBirthData: BirthDataInput, partnerBirthData: BirthDataInput, partnerId: string, partnerName: string, userId: string, language?: 'bg' | 'en'): Promise<CompatibilityReport>;
/**
 * Get cached compatibility report
 */
export declare function getCachedReport(userId: string, partnerId: string, language: 'bg' | 'en'): Promise<CompatibilityReport | null>;
/**
 * Invalidate report cache
 */
export declare function invalidateReportCache(userId: string, partnerId: string): Promise<void>;
//# sourceMappingURL=compatibility-report.service.d.ts.map