/**
 * Language Service
 * US-35: Language Layer Completeness
 *
 * Centralized service for language handling across all AI-generated content.
 * Ensures consistent language directive injection in:
 * - Chat responses
 * - Forecasts (daily, weekly)
 * - Transit alerts
 * - Compatibility reports
 * - Tooltips and explanations
 */
import { SupportedLanguage } from '../middleware/languageDetection';
export interface LanguageContext {
    language: SupportedLanguage;
    source: 'user_preference' | 'header' | 'default';
}
/**
 * Comprehensive Bulgarian astrological terminology
 * Used for validation and ensuring correct translations
 */
export declare const BULGARIAN_ASTROLOGICAL_TERMS: {
    planets: {
        sun: string;
        moon: string;
        mercury: string;
        venus: string;
        mars: string;
        jupiter: string;
        saturn: string;
        uranus: string;
        neptune: string;
        pluto: string;
        northNode: string;
        southNode: string;
        chiron: string;
        rising: string;
    };
    signs: {
        aries: string;
        taurus: string;
        gemini: string;
        cancer: string;
        leo: string;
        virgo: string;
        libra: string;
        scorpio: string;
        sagittarius: string;
        capricorn: string;
        aquarius: string;
        pisces: string;
    };
    aspects: {
        conjunction: string;
        opposition: string;
        trine: string;
        square: string;
        sextile: string;
        quincunx: string;
    };
    houses: {
        singular: string;
        plural: string;
        ordinals: string[];
    };
    elements: {
        fire: string;
        earth: string;
        air: string;
        water: string;
    };
    modalities: {
        cardinal: string;
        fixed: string;
        mutable: string;
    };
    moonPhases: {
        newMoon: string;
        waxingCrescent: string;
        firstQuarter: string;
        waxingGibbous: string;
        fullMoon: string;
        waningGibbous: string;
        lastQuarter: string;
        waningCrescent: string;
    };
    transitTerms: {
        transit: string;
        retrograde: string;
        direct: string;
        orb: string;
        degree: string;
    };
};
/**
 * Get language directive for AI prompts
 * @param language - Target language
 * @returns Language directive string to append to system prompt
 */
export declare function getLanguageDirective(language: SupportedLanguage): string;
/**
 * Get language directive with context
 * Includes additional context based on content type
 */
export declare function getLanguageDirectiveWithContext(language: SupportedLanguage, context: 'chat' | 'forecast' | 'compatibility' | 'alert' | 'tooltip'): string;
/**
 * Detect language from various sources
 * Priority: user preference > Accept-Language header > default
 */
export declare function detectLanguage(userPreference?: string, acceptLanguageHeader?: string): LanguageContext;
/**
 * Check if a language code is supported
 */
export declare function isValidLanguage(code: string): boolean;
/**
 * Normalize language code to supported format
 */
export declare function normalizeLanguage(code: string | undefined): SupportedLanguage;
/**
 * Validate Bulgarian content contains proper astrological terms
 * Returns list of potentially incorrect terms
 */
export declare function validateBulgarianAstrologicalTerms(content: string): {
    isValid: boolean;
    issues: string[];
};
/**
 * Build complete system prompt with language directive
 * Used by chat, forecasts, and other AI-generated content
 */
export declare function buildSystemPromptWithLanguage(basePrompt: string, language: SupportedLanguage, context?: 'chat' | 'forecast' | 'compatibility' | 'alert' | 'tooltip'): string;
declare const _default: {
    getLanguageDirective: typeof getLanguageDirective;
    getLanguageDirectiveWithContext: typeof getLanguageDirectiveWithContext;
    detectLanguage: typeof detectLanguage;
    isValidLanguage: typeof isValidLanguage;
    normalizeLanguage: typeof normalizeLanguage;
    validateBulgarianAstrologicalTerms: typeof validateBulgarianAstrologicalTerms;
    buildSystemPromptWithLanguage: typeof buildSystemPromptWithLanguage;
    BULGARIAN_ASTROLOGICAL_TERMS: {
        planets: {
            sun: string;
            moon: string;
            mercury: string;
            venus: string;
            mars: string;
            jupiter: string;
            saturn: string;
            uranus: string;
            neptune: string;
            pluto: string;
            northNode: string;
            southNode: string;
            chiron: string;
            rising: string;
        };
        signs: {
            aries: string;
            taurus: string;
            gemini: string;
            cancer: string;
            leo: string;
            virgo: string;
            libra: string;
            scorpio: string;
            sagittarius: string;
            capricorn: string;
            aquarius: string;
            pisces: string;
        };
        aspects: {
            conjunction: string;
            opposition: string;
            trine: string;
            square: string;
            sextile: string;
            quincunx: string;
        };
        houses: {
            singular: string;
            plural: string;
            ordinals: string[];
        };
        elements: {
            fire: string;
            earth: string;
            air: string;
            water: string;
        };
        modalities: {
            cardinal: string;
            fixed: string;
            mutable: string;
        };
        moonPhases: {
            newMoon: string;
            waxingCrescent: string;
            firstQuarter: string;
            waxingGibbous: string;
            fullMoon: string;
            waningGibbous: string;
            lastQuarter: string;
            waningCrescent: string;
        };
        transitTerms: {
            transit: string;
            retrograde: string;
            direct: string;
            orb: string;
            degree: string;
        };
    };
};
export default _default;
//# sourceMappingURL=languageService.d.ts.map