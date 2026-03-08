/**
 * Horoscope Generation Service
 * US-15: Daily Forecast - Horoscope text generation
 *
 * Generates personalized horoscope texts based on transits and natal chart
 */
import type { TransitAspect } from './transits';
export interface HoroscopeContent {
    general: string;
    love: string;
    career: string;
    health: string;
    luckyNumbers: number[];
    powerHours: string[];
}
/**
 * Generate personalized daily horoscope
 */
export declare function generateDailyHoroscope(sunSign: string, moonSign: string, aspects: TransitAspect[], transits: any[], moonPhase: string, focus?: 'general' | 'love' | 'career' | 'health'): HoroscopeContent;
/**
 * Generate recommended actions based on transits
 */
export declare function generateRecommendedActions(moonPhase: string, aspects: TransitAspect[], dominantInfluence: 'positive' | 'challenging' | 'neutral'): string[];
//# sourceMappingURL=horoscope.d.ts.map