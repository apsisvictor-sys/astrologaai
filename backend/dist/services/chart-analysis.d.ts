/**
 * Chart Analysis Service
 * US-13: Understand Chart Components
 *
 * Provides detailed interpretations for planets, signs, houses, and aspects
 * Supports Bulgarian (bg) and English (en) languages
 */
import { NatalChart } from './astrology';
export interface PlanetInterpretation {
    planet: string;
    planetName: string;
    planetNameBg: string;
    sign: string;
    signBg: string;
    degree: number;
    house: number;
    retrograde: boolean;
    symbol: string;
    basic: string;
    basicBg: string;
    intermediate: string;
    intermediateBg: string;
    advanced: string;
    advancedBg: string;
    keywords: string[];
    keywordsBg: string[];
}
export interface HouseInterpretation {
    number: number;
    sign: string;
    signBg: string;
    degree: number;
    basic: string;
    basicBg: string;
    intermediate: string;
    intermediateBg: string;
    advanced: string;
    advancedBg: string;
    keywords: string[];
    keywordsBg: string[];
}
export interface AspectInterpretation {
    planet1: string;
    planet2: string;
    aspect: string;
    aspectBg: string;
    orb: number;
    nature: 'harmonious' | 'challenging' | 'neutral';
    basic: string;
    basicBg: string;
    intermediate: string;
    intermediateBg: string;
    advanced: string;
    advancedBg: string;
    keywords: string[];
    keywordsBg: string[];
}
export interface ChartAnalysis {
    planets: PlanetInterpretation[];
    houses: HouseInterpretation[];
    aspects: AspectInterpretation[];
    bigThree: {
        sun: PlanetInterpretation;
        moon: PlanetInterpretation;
        rising: PlanetInterpretation;
    };
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
}
/**
 * Generate comprehensive chart analysis
 */
export declare function analyzeChart(chart: NatalChart): ChartAnalysis;
export type { ChartAnalysis as ChartAnalysisType };
//# sourceMappingURL=chart-analysis.d.ts.map