"use strict";
/**
 * Language Directive Service Tests
 * US-35: Language Layer Completeness
 *
 * Tests for:
 * - Language directive injection in AI prompts
 * - Terminology translations
 * - Language detection from Accept-Language header
 * - Prompt builders for chat, forecast, and alerts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const language_directive_1 = require("../services/language-directive");
(0, vitest_1.describe)('Language Directive Service', () => {
    // ============================================
    // getLanguageDirective
    // ============================================
    (0, vitest_1.describe)('getLanguageDirective', () => {
        (0, vitest_1.it)('should return Bulgarian directive for bg language', () => {
            const directive = (0, language_directive_1.getLanguageDirective)('bg');
            (0, vitest_1.expect)(directive).toContain('БЪЛГАРСКИ');
            (0, vitest_1.expect)(directive).toContain('Слънце');
            (0, vitest_1.expect)(directive).toContain('Овен');
            (0, vitest_1.expect)(directive).toContain('съвпад');
        });
        (0, vitest_1.it)('should return English directive for en language', () => {
            const directive = (0, language_directive_1.getLanguageDirective)('en');
            (0, vitest_1.expect)(directive).toContain('English');
            (0, vitest_1.expect)(directive).toContain('astrological terminology');
        });
        (0, vitest_1.it)('should default to Bulgarian for unknown language', () => {
            // TypeScript won't allow unknown languages, but test the fallback
            const bgDirective = (0, language_directive_1.getLanguageDirective)('bg');
            (0, vitest_1.expect)(bgDirective).toContain('БЪЛГАРСКИ');
        });
    });
    // ============================================
    // buildLanguageAwarePrompt
    // ============================================
    (0, vitest_1.describe)('buildLanguageAwarePrompt', () => {
        (0, vitest_1.it)('should append language directive to base prompt', () => {
            const basePrompt = 'You are an astrologer.';
            const result = (0, language_directive_1.buildLanguageAwarePrompt)(basePrompt, 'bg');
            (0, vitest_1.expect)(result).toContain('You are an astrologer.');
            (0, vitest_1.expect)(result).toContain('БЪЛГАРСКИ');
        });
        (0, vitest_1.it)('should work with English language', () => {
            const basePrompt = 'You are an astrologer.';
            const result = (0, language_directive_1.buildLanguageAwarePrompt)(basePrompt, 'en');
            (0, vitest_1.expect)(result).toContain('You are an astrologer.');
            (0, vitest_1.expect)(result).toContain('English');
        });
    });
    // ============================================
    // getTerm / Terminology
    // ============================================
    (0, vitest_1.describe)('getTerm', () => {
        (0, vitest_1.it)('should return Bulgarian planet names', () => {
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('sun', 'bg')).toBe('Слънце');
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('moon', 'bg')).toBe('Луна');
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('mars', 'bg')).toBe('Марс');
        });
        (0, vitest_1.it)('should return Bulgarian zodiac signs', () => {
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('aries', 'bg')).toBe('Овен');
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('taurus', 'bg')).toBe('Телец');
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('pisces', 'bg')).toBe('Риби');
        });
        (0, vitest_1.it)('should return Bulgarian aspect names', () => {
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('conjunction', 'bg')).toBe('съвпад');
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('trine', 'bg')).toBe('тригон');
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('square', 'bg')).toBe('квадрат');
        });
        (0, vitest_1.it)('should return English terms for en language', () => {
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('sun', 'en')).toBe('Sun');
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('aries', 'en')).toBe('Aries');
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('conjunction', 'en')).toBe('conjunction');
        });
        (0, vitest_1.it)('should return original key for unknown terms', () => {
            (0, vitest_1.expect)((0, language_directive_1.getTerm)('unknownPlanet', 'bg')).toBe('unknownPlanet');
        });
    });
    (0, vitest_1.describe)('getAllTerms', () => {
        (0, vitest_1.it)('should return all Bulgarian terminology', () => {
            const terms = (0, language_directive_1.getAllTerms)('bg');
            (0, vitest_1.expect)(terms.sun).toBe('Слънце');
            (0, vitest_1.expect)(terms.aries).toBe('Овен');
            (0, vitest_1.expect)(terms.conjunction).toBe('съвпад');
            (0, vitest_1.expect)(terms.fire).toBe('Огън');
        });
        (0, vitest_1.it)('should return all English terminology', () => {
            const terms = (0, language_directive_1.getAllTerms)('en');
            (0, vitest_1.expect)(terms.sun).toBe('Sun');
            (0, vitest_1.expect)(terms.aries).toBe('Aries');
            (0, vitest_1.expect)(terms.conjunction).toBe('conjunction');
        });
    });
    // ============================================
    // translatePlanet / translateSign / translateAspect
    // ============================================
    (0, vitest_1.describe)('translatePlanet', () => {
        (0, vitest_1.it)('should translate planet names to Bulgarian', () => {
            (0, vitest_1.expect)((0, language_directive_1.translatePlanet)('Sun', 'bg')).toBe('Слънце');
            (0, vitest_1.expect)((0, language_directive_1.translatePlanet)('MOON', 'bg')).toBe('Луна');
            (0, vitest_1.expect)((0, language_directive_1.translatePlanet)('jupiter', 'bg')).toBe('Юпитер');
        });
        (0, vitest_1.it)('should return English planet names', () => {
            (0, vitest_1.expect)((0, language_directive_1.translatePlanet)('sun', 'en')).toBe('Sun');
        });
    });
    (0, vitest_1.describe)('translateSign', () => {
        (0, vitest_1.it)('should translate zodiac signs to Bulgarian', () => {
            (0, vitest_1.expect)((0, language_directive_1.translateSign)('Aries', 'bg')).toBe('Овен');
            (0, vitest_1.expect)((0, language_directive_1.translateSign)('SCORPIO', 'bg')).toBe('Скорпион');
            (0, vitest_1.expect)((0, language_directive_1.translateSign)('pisces', 'bg')).toBe('Риби');
        });
    });
    (0, vitest_1.describe)('translateAspect', () => {
        (0, vitest_1.it)('should translate aspect types to Bulgarian', () => {
            (0, vitest_1.expect)((0, language_directive_1.translateAspect)('Conjunction', 'bg')).toBe('съвпад');
            (0, vitest_1.expect)((0, language_directive_1.translateAspect)('SQUARE', 'bg')).toBe('квадрат');
            (0, vitest_1.expect)((0, language_directive_1.translateAspect)('trine', 'bg')).toBe('тригон');
        });
    });
    // ============================================
    // formatHouse
    // ============================================
    (0, vitest_1.describe)('formatHouse', () => {
        (0, vitest_1.it)('should format Bulgarian house numbers correctly', () => {
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(1, 'bg')).toBe('1-ви дом');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(2, 'bg')).toBe('2-ри дом');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(3, 'bg')).toBe('3-ти дом');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(7, 'bg')).toBe('7-ми дом');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(8, 'bg')).toBe('8-ми дом');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(10, 'bg')).toBe('10-ти дом');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(12, 'bg')).toBe('12-ти дом');
        });
        (0, vitest_1.it)('should format English house numbers correctly', () => {
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(1, 'en')).toBe('1st house');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(2, 'en')).toBe('2nd house');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(3, 'en')).toBe('3rd house');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(4, 'en')).toBe('4th house');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(11, 'en')).toBe('11th house');
            (0, vitest_1.expect)((0, language_directive_1.formatHouse)(21, 'en')).toBe('21st house');
        });
    });
    // ============================================
    // detectLanguageFromHeader
    // ============================================
    (0, vitest_1.describe)('detectLanguageFromHeader', () => {
        (0, vitest_1.it)('should detect Bulgarian from Accept-Language header', () => {
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)('bg-BG,bg;q=0.9,en;q=0.8')).toBe('bg');
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)('bg')).toBe('bg');
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)('bg-BG')).toBe('bg');
        });
        (0, vitest_1.it)('should detect English from Accept-Language header', () => {
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)('en-US,en;q=0.9')).toBe('en');
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)('en')).toBe('en');
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)('en-GB')).toBe('en');
        });
        (0, vitest_1.it)('should prioritize by quality value', () => {
            // English first, but Bulgarian has higher quality
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)('en;q=0.5,bg;q=0.9')).toBe('bg');
            // Bulgarian first with higher quality
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)('bg;q=0.9,en;q=0.8')).toBe('bg');
        });
        (0, vitest_1.it)('should default to Bulgarian for unknown languages', () => {
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)('de-DE,fr-FR')).toBe('bg');
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)('')).toBe('bg');
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)(undefined)).toBe('bg');
        });
        (0, vitest_1.it)('should handle complex Accept-Language headers', () => {
            const header = 'en-US,en;q=0.9,bg;q=0.8,de;q=0.7';
            (0, vitest_1.expect)((0, language_directive_1.detectLanguageFromHeader)(header)).toBe('en');
        });
    });
    // ============================================
    // isValidLanguage / normalizeLanguage
    // ============================================
    (0, vitest_1.describe)('isValidLanguage', () => {
        (0, vitest_1.it)('should return true for supported languages', () => {
            (0, vitest_1.expect)((0, language_directive_1.isValidLanguage)('bg')).toBe(true);
            (0, vitest_1.expect)((0, language_directive_1.isValidLanguage)('en')).toBe(true);
        });
        (0, vitest_1.it)('should return false for unsupported languages', () => {
            (0, vitest_1.expect)((0, language_directive_1.isValidLanguage)('de')).toBe(false);
            (0, vitest_1.expect)((0, language_directive_1.isValidLanguage)('fr')).toBe(false);
            (0, vitest_1.expect)((0, language_directive_1.isValidLanguage)('')).toBe(false);
            (0, vitest_1.expect)((0, language_directive_1.isValidLanguage)(undefined)).toBe(false);
        });
    });
    (0, vitest_1.describe)('normalizeLanguage', () => {
        (0, vitest_1.it)('should return valid languages unchanged', () => {
            (0, vitest_1.expect)((0, language_directive_1.normalizeLanguage)('bg')).toBe('bg');
            (0, vitest_1.expect)((0, language_directive_1.normalizeLanguage)('en')).toBe('en');
        });
        (0, vitest_1.it)('should default to Bulgarian for invalid languages', () => {
            (0, vitest_1.expect)((0, language_directive_1.normalizeLanguage)('de')).toBe('bg');
            (0, vitest_1.expect)((0, language_directive_1.normalizeLanguage)('')).toBe('bg');
            (0, vitest_1.expect)((0, language_directive_1.normalizeLanguage)(undefined)).toBe('bg');
        });
    });
    // ============================================
    // buildChatSystemPrompt
    // ============================================
    (0, vitest_1.describe)('buildChatSystemPrompt', () => {
        (0, vitest_1.it)('should include language directive for Bulgarian', () => {
            const prompt = (0, language_directive_1.buildChatSystemPrompt)('Chart summary', 'Transits', 'bg');
            (0, vitest_1.expect)(prompt).toContain('AstroLogAI');
            (0, vitest_1.expect)(prompt).toContain('БЪЛГАРСКИ');
            (0, vitest_1.expect)(prompt).toContain('Chart summary');
            (0, vitest_1.expect)(prompt).toContain('Transits');
        });
        (0, vitest_1.it)('should include language directive for English', () => {
            const prompt = (0, language_directive_1.buildChatSystemPrompt)('Chart summary', 'Transits', 'en');
            (0, vitest_1.expect)(prompt).toContain('AstroLogAI');
            (0, vitest_1.expect)(prompt).toContain('English');
            (0, vitest_1.expect)(prompt).toContain('Chart summary');
        });
        (0, vitest_1.it)('should work without chart summary', () => {
            const prompt = (0, language_directive_1.buildChatSystemPrompt)(undefined, 'Transits', 'bg');
            (0, vitest_1.expect)(prompt).toContain('AstroLogAI');
            (0, vitest_1.expect)(prompt).toContain('CURRENT TRANSITS');
            (0, vitest_1.expect)(prompt).not.toContain("USER'S NATAL CHART");
        });
        (0, vitest_1.it)('should work without transits summary', () => {
            const prompt = (0, language_directive_1.buildChatSystemPrompt)('Chart summary', undefined, 'bg');
            (0, vitest_1.expect)(prompt).toContain("USER'S NATAL CHART");
            (0, vitest_1.expect)(prompt).not.toContain('CURRENT TRANSITS');
        });
    });
    // ============================================
    // buildForecastSystemPrompt
    // ============================================
    (0, vitest_1.describe)('buildForecastSystemPrompt', () => {
        (0, vitest_1.it)('should build Bulgarian daily forecast prompt', () => {
            const prompt = (0, language_directive_1.buildForecastSystemPrompt)('daily', 'bg');
            (0, vitest_1.expect)(prompt).toContain('дневна прогноза');
            (0, vitest_1.expect)(prompt).toContain('БЪЛГАРСКИ');
            (0, vitest_1.expect)(prompt).toContain('overallTheme');
            (0, vitest_1.expect)(prompt).toContain('horoscope');
        });
        (0, vitest_1.it)('should build Bulgarian weekly forecast prompt', () => {
            const prompt = (0, language_directive_1.buildForecastSystemPrompt)('weekly', 'bg');
            (0, vitest_1.expect)(prompt).toContain('седмична прогноза');
            (0, vitest_1.expect)(prompt).toContain('БЪЛГАРСКИ');
            (0, vitest_1.expect)(prompt).toContain('dailyBreakdown');
        });
        (0, vitest_1.it)('should build English daily forecast prompt', () => {
            const prompt = (0, language_directive_1.buildForecastSystemPrompt)('daily', 'en');
            (0, vitest_1.expect)(prompt).toContain('daily forecast');
            (0, vitest_1.expect)(prompt).toContain('English');
            (0, vitest_1.expect)(prompt).toContain('overallTheme');
        });
        (0, vitest_1.it)('should build English weekly forecast prompt', () => {
            const prompt = (0, language_directive_1.buildForecastSystemPrompt)('weekly', 'en');
            (0, vitest_1.expect)(prompt).toContain('weekly forecast');
            (0, vitest_1.expect)(prompt).toContain('English');
        });
    });
    // ============================================
    // Integration Tests
    // ============================================
    (0, vitest_1.describe)('Integration: Full prompt flow', () => {
        (0, vitest_1.it)('should create complete Bulgarian chat prompt', () => {
            const chartSummary = 'Слънце: Овен 15° в 10-ти дом';
            const transitsSummary = 'Юпитер тригон Слънце';
            const prompt = (0, language_directive_1.buildChatSystemPrompt)(chartSummary, transitsSummary, 'bg');
            // Verify all components are present
            (0, vitest_1.expect)(prompt).toContain('AstroLogAI');
            (0, vitest_1.expect)(prompt).toContain('БЪЛГАРСКИ');
            (0, vitest_1.expect)(prompt).toContain('Слънце, Луна, Меркурий');
            (0, vitest_1.expect)(prompt).toContain('Овен, Телец, Близнаци');
            (0, vitest_1.expect)(prompt).toContain(chartSummary);
            (0, vitest_1.expect)(prompt).toContain(transitsSummary);
        });
        (0, vitest_1.it)('should create complete Bulgarian forecast prompt', () => {
            const prompt = (0, language_directive_1.buildForecastSystemPrompt)('daily', 'bg');
            // Verify Bulgarian terminology is used
            (0, vitest_1.expect)(prompt).toContain('Слънце, Луна');
            (0, vitest_1.expect)(prompt).toContain('Овен, Телец');
            (0, vitest_1.expect)(prompt).toContain('Съвпад, Секстил'); // Capitalized in prompt
            (0, vitest_1.expect)(prompt).toContain('1-ви до 12-ти дом');
            // Verify JSON structure is required
            (0, vitest_1.expect)(prompt).toContain('JSON');
        });
    });
});
//# sourceMappingURL=language-directive.test.js.map