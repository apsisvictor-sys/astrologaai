/**
 * Forecast Service
 * US-15: Daily Forecast
 *
 * Generates personalized daily forecasts based on user's natal chart
 * and current planetary transits
 */
import { BirthDataInput } from './astrology';
export interface Transit {
    planet: string;
    planetBg: string;
    sign: string;
    signBg: string;
    degree: number;
    aspectToNatal?: {
        natalPlanet: string;
        aspect: string;
        aspectBg: string;
        orb: number;
        influence: 'positive' | 'challenging' | 'neutral';
        description: string;
    };
}
export interface DailyForecast {
    date: string;
    userId: string;
    overallTheme: string;
    overallThemeBg: string;
    mood: string;
    moodBg: string;
    energy: 'high' | 'medium' | 'low';
    transits: Transit[];
    moonPhase: {
        phase: string;
        phaseBg: string;
        illumination: number;
        sign: string;
        signBg: string;
    };
    horoscope: {
        general: string;
        generalBg: string;
        love: string;
        loveBg: string;
        career: string;
        careerBg: string;
        health: string;
        healthBg: string;
        luckyNumbers: number[];
        powerHours: string[];
    };
    recommendations: string[];
    recommendationsBg: string[];
    generatedAt: string;
    cached: boolean;
}
export interface WeeklyForecast {
    weekStart: string;
    weekEnd: string;
    overview: string;
    overviewBg: string;
    dailyBreakdown: {
        date: string;
        dayName: string;
        dayNameBg: string;
        theme: string;
        themeBg: string;
        highlight: string;
        highlightBg: string;
    }[];
    majorTransits: {
        date: string;
        event: string;
        eventBg: string;
        significance: string;
        significanceBg: string;
    }[];
    bestDays: {
        career: string;
        love: string;
        decisions: string;
        selfCare: string;
    };
    generatedAt: string;
}
/**
 * Generate daily forecast for a user
 */
export declare function generateDailyForecast(userId: string, birthData: BirthDataInput, userLanguage?: string): Promise<DailyForecast>;
/**
 * Get daily forecast (from cache or generate)
 */
export declare function getDailyForecast(userId: string, birthData: BirthDataInput, userLanguage?: string): Promise<DailyForecast>;
/**
 * Generate weekly forecast
 */
export declare function generateWeeklyForecast(userId: string, birthData: BirthDataInput, userLanguage?: string): Promise<WeeklyForecast>;
/**
 * Get weekly forecast
 */
export declare function getWeeklyForecast(userId: string, birthData: BirthDataInput, userLanguage?: string): Promise<WeeklyForecast>;
//# sourceMappingURL=forecast.d.ts.map