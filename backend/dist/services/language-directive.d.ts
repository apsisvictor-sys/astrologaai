/**
 * Language Directive Service
 * US-35: Language Layer Completeness
 *
 * Ensures language directive is properly injected in all AI-generated content.
 * This service provides language-aware prompts for:
 * - Chat responses
 * - Forecasts (daily, weekly)
 * - Transit alerts
 * - Compatibility reports
 * - Chart interpretations
 */
export type SupportedLanguage = 'bg' | 'en';
/**
 * Get the language directive for AI prompts
 *
 * @param language - Target language
 * @returns Language directive string to append to system prompt
 */
export declare function getLanguageDirective(language: SupportedLanguage): string;
/**
 * Build a language-aware system prompt for AI responses
 *
 * @param basePrompt - Base system prompt content
 * @param language - Target language
 * @returns Complete system prompt with language directive
 */
export declare function buildLanguageAwarePrompt(basePrompt: string, language: SupportedLanguage): string;
/**
 * Get terminology translation for a given key
 *
 * @param key - Terminology key (e.g., 'sun', 'aries', 'conjunction')
 * @param language - Target language
 * @returns Translated term or original key if not found
 */
export declare function getTerm(key: string, language: SupportedLanguage): string;
/**
 * Get all terminology for a language
 *
 * @param language - Target language
 * @returns Complete terminology map for the language
 */
export declare function getAllTerms(language: SupportedLanguage): Record<string, string>;
/**
 * Translate a planet name
 */
export declare function translatePlanet(planet: string, language: SupportedLanguage): string;
/**
 * Translate a zodiac sign
 */
export declare function translateSign(sign: string, language: SupportedLanguage): string;
/**
 * Translate an aspect type
 */
export declare function translateAspect(aspect: string, language: SupportedLanguage): string;
/**
 * Format a house number in the target language
 */
export declare function formatHouse(houseNumber: number, language: SupportedLanguage): string;
/**
 * Detect language from Accept-Language header
 *
 * @param acceptLanguage - Accept-Language header value
 * @returns Detected supported language (defaults to 'bg')
 */
export declare function detectLanguageFromHeader(acceptLanguage: string | undefined): SupportedLanguage;
/**
 * Validate that a language is supported
 */
export declare function isValidLanguage(lang: string | undefined): lang is SupportedLanguage;
/**
 * Normalize language string to supported language
 * Defaults to 'bg' if invalid or missing
 */
export declare function normalizeLanguage(lang: string | undefined): SupportedLanguage;
/**
 * Build chat system prompt with language directive
 */
export declare function buildChatSystemPrompt(chartSummary: string | undefined, transitsSummary: string | undefined, language: SupportedLanguage): string;
/**
 * Build forecast system prompt with language directive
 */
export declare function buildForecastSystemPrompt(type: 'daily' | 'weekly', language: SupportedLanguage): string;
/**
 * Build transit alert prompt with language directive
 */
export declare function buildTransitAlertPrompt(transit: {
    planet: string;
    aspect: string;
    natalPlanet: string;
    exactDate: string;
    influence: 'positive' | 'challenging' | 'neutral';
}, language: SupportedLanguage): string;
declare const _default: {
    getLanguageDirective: typeof getLanguageDirective;
    buildLanguageAwarePrompt: typeof buildLanguageAwarePrompt;
    getTerm: typeof getTerm;
    getAllTerms: typeof getAllTerms;
    translatePlanet: typeof translatePlanet;
    translateSign: typeof translateSign;
    translateAspect: typeof translateAspect;
    formatHouse: typeof formatHouse;
    detectLanguageFromHeader: typeof detectLanguageFromHeader;
    isValidLanguage: typeof isValidLanguage;
    normalizeLanguage: typeof normalizeLanguage;
    buildChatSystemPrompt: typeof buildChatSystemPrompt;
    buildForecastSystemPrompt: typeof buildForecastSystemPrompt;
    buildTransitAlertPrompt: typeof buildTransitAlertPrompt;
};
export default _default;
//# sourceMappingURL=language-directive.d.ts.map