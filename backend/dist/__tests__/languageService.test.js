"use strict";
/**
 * Language Service Tests
 * US-35: Language Layer Completeness
 *
 * Unit tests for language directive injection and related functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const languageService_1 = require("../services/languageService");
// ============================================
// Language Directive Tests
// ============================================
(0, vitest_1.describe)('getLanguageDirective', () => {
    (0, vitest_1.it)('should return Bulgarian directive for bg language', () => {
        const directive = (0, languageService_1.getLanguageDirective)('bg');
        (0, vitest_1.expect)(directive).toContain('Български');
        (0, vitest_1.expect)(directive).toContain('Слънце');
        (0, vitest_1.expect)(directive).toContain('Луна');
        (0, vitest_1.expect)(directive).toContain('Овен');
        (0, vitest_1.expect)(directive).toContain('Телец');
    });
    (0, vitest_1.it)('should return English directive for en language', () => {
        const directive = (0, languageService_1.getLanguageDirective)('en');
        (0, vitest_1.expect)(directive).toContain('English');
        (0, vitest_1.expect)(directive).not.toContain('Български');
    });
    (0, vitest_1.it)('should return default (Bulgarian) directive for unknown language', () => {
        const directive = (0, languageService_1.getLanguageDirective)('fr');
        // Should fall back to default (Bulgarian)
        (0, vitest_1.expect)(directive).toContain('Български');
    });
});
(0, vitest_1.describe)('getLanguageDirectiveWithContext', () => {
    (0, vitest_1.it)('should add chat-specific instructions for Bulgarian', () => {
        const directive = (0, languageService_1.getLanguageDirectiveWithContext)('bg', 'chat');
        (0, vitest_1.expect)(directive).toContain('наталната карта');
        (0, vitest_1.expect)(directive).toContain('Български');
    });
    (0, vitest_1.it)('should add forecast-specific instructions for Bulgarian', () => {
        const directive = (0, languageService_1.getLanguageDirectiveWithContext)('bg', 'forecast');
        (0, vitest_1.expect)(directive).toContain('прогнозите');
        (0, vitest_1.expect)(directive).toContain('Български');
    });
    (0, vitest_1.it)('should add compatibility-specific instructions for Bulgarian', () => {
        const directive = (0, languageService_1.getLanguageDirectiveWithContext)('bg', 'compatibility');
        (0, vitest_1.expect)(directive).toContain('съвместимостта');
        (0, vitest_1.expect)(directive).toContain('Български');
    });
    (0, vitest_1.it)('should not add context for English (uses base directive)', () => {
        const directive = (0, languageService_1.getLanguageDirectiveWithContext)('en', 'chat');
        (0, vitest_1.expect)(directive).toContain('English');
        (0, vitest_1.expect)(directive).not.toContain('наталната карта');
    });
});
// ============================================
// Language Detection Tests
// ============================================
(0, vitest_1.describe)('detectLanguage', () => {
    (0, vitest_1.it)('should prioritize user preference over header', () => {
        const result = (0, languageService_1.detectLanguage)('en', 'bg-BG,bg;q=0.9');
        (0, vitest_1.expect)(result.language).toBe('en');
        (0, vitest_1.expect)(result.source).toBe('user_preference');
    });
    (0, vitest_1.it)('should use header when no user preference', () => {
        const result = (0, languageService_1.detectLanguage)(undefined, 'bg-BG,bg;q=0.9,en;q=0.8');
        (0, vitest_1.expect)(result.language).toBe('bg');
        (0, vitest_1.expect)(result.source).toBe('header');
    });
    (0, vitest_1.it)('should detect English from Accept-Language header', () => {
        const result = (0, languageService_1.detectLanguage)(undefined, 'en-US,en;q=0.9,bg;q=0.8');
        (0, vitest_1.expect)(result.language).toBe('en');
        (0, vitest_1.expect)(result.source).toBe('header');
    });
    (0, vitest_1.it)('should default to Bulgarian when no preference or header', () => {
        const result = (0, languageService_1.detectLanguage)(undefined, undefined);
        (0, vitest_1.expect)(result.language).toBe('bg');
        (0, vitest_1.expect)(result.source).toBe('default');
    });
    (0, vitest_1.it)('should handle complex Accept-Language headers', () => {
        const result = (0, languageService_1.detectLanguage)(undefined, 'en-US,en;q=0.9,fr;q=0.8,de;q=0.7');
        (0, vitest_1.expect)(result.language).toBe('en');
    });
    (0, vitest_1.it)('should ignore invalid user preference and use header', () => {
        const result = (0, languageService_1.detectLanguage)('invalid', 'en-US');
        (0, vitest_1.expect)(result.language).toBe('en');
        (0, vitest_1.expect)(result.source).toBe('header');
    });
});
// ============================================
// Language Validation Tests
// ============================================
(0, vitest_1.describe)('isValidLanguage', () => {
    (0, vitest_1.it)('should return true for supported languages', () => {
        (0, vitest_1.expect)((0, languageService_1.isValidLanguage)('bg')).toBe(true);
        (0, vitest_1.expect)((0, languageService_1.isValidLanguage)('en')).toBe(true);
    });
    (0, vitest_1.it)('should return false for unsupported languages', () => {
        (0, vitest_1.expect)((0, languageService_1.isValidLanguage)('fr')).toBe(false);
        (0, vitest_1.expect)((0, languageService_1.isValidLanguage)('de')).toBe(false);
        (0, vitest_1.expect)((0, languageService_1.isValidLanguage)('')).toBe(false);
        (0, vitest_1.expect)((0, languageService_1.isValidLanguage)('BG')).toBe(false); // Case sensitive
    });
});
(0, vitest_1.describe)('normalizeLanguage', () => {
    (0, vitest_1.it)('should normalize language codes', () => {
        (0, vitest_1.expect)((0, languageService_1.normalizeLanguage)('bg')).toBe('bg');
        (0, vitest_1.expect)((0, languageService_1.normalizeLanguage)('bg-BG')).toBe('bg');
        (0, vitest_1.expect)((0, languageService_1.normalizeLanguage)('en-US')).toBe('en');
        (0, vitest_1.expect)((0, languageService_1.normalizeLanguage)('EN')).toBe('en');
    });
    (0, vitest_1.it)('should return default for invalid codes', () => {
        (0, vitest_1.expect)((0, languageService_1.normalizeLanguage)('fr')).toBe('bg');
        (0, vitest_1.expect)((0, languageService_1.normalizeLanguage)(undefined)).toBe('bg');
        (0, vitest_1.expect)((0, languageService_1.normalizeLanguage)('')).toBe('bg');
    });
});
// ============================================
// Bulgarian Terminology Validation Tests
// ============================================
(0, vitest_1.describe)('validateBulgarianAstrologicalTerms', () => {
    (0, vitest_1.it)('should pass for correct Bulgarian content', () => {
        const content = 'Слънцето е в Телец и Луната е в Скорпион.';
        const result = (0, languageService_1.validateBulgarianAstrologicalTerms)(content);
        (0, vitest_1.expect)(result.isValid).toBe(true);
        (0, vitest_1.expect)(result.issues).toHaveLength(0);
    });
    (0, vitest_1.it)('should detect English planet names', () => {
        const content = 'Your Sun is in Taurus and Moon is in Scorpio.';
        const result = (0, languageService_1.validateBulgarianAstrologicalTerms)(content);
        (0, vitest_1.expect)(result.isValid).toBe(false);
        (0, vitest_1.expect)(result.issues.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.issues.some(i => i.toLowerCase().includes('sun'))).toBe(true);
        (0, vitest_1.expect)(result.issues.some(i => i.toLowerCase().includes('moon'))).toBe(true);
    });
    (0, vitest_1.it)('should detect English sign names', () => {
        const content = 'The Sun in Aries brings energy.';
        const result = (0, languageService_1.validateBulgarianAstrologicalTerms)(content);
        (0, vitest_1.expect)(result.isValid).toBe(false);
        (0, vitest_1.expect)(result.issues.some(i => i.toLowerCase().includes('aries'))).toBe(true);
    });
    (0, vitest_1.it)('should be case-insensitive for detection', () => {
        const content = 'SUN in TAURUS brings energy.';
        const result = (0, languageService_1.validateBulgarianAstrologicalTerms)(content);
        (0, vitest_1.expect)(result.isValid).toBe(false);
        (0, vitest_1.expect)(result.issues.some(i => i.toLowerCase().includes('sun'))).toBe(true);
        (0, vitest_1.expect)(result.issues.some(i => i.toLowerCase().includes('taurus'))).toBe(true);
    });
});
// ============================================
// System Prompt Builder Tests
// ============================================
(0, vitest_1.describe)('buildSystemPromptWithLanguage', () => {
    (0, vitest_1.it)('should append language directive to base prompt', () => {
        const basePrompt = 'You are an astrologer.';
        const result = (0, languageService_1.buildSystemPromptWithLanguage)(basePrompt, 'bg');
        (0, vitest_1.expect)(result).toContain('You are an astrologer.');
        (0, vitest_1.expect)(result).toContain('Български');
    });
    (0, vitest_1.it)('should include context-specific instructions when provided', () => {
        const basePrompt = 'You are an astrologer.';
        const result = (0, languageService_1.buildSystemPromptWithLanguage)(basePrompt, 'bg', 'forecast');
        (0, vitest_1.expect)(result).toContain('прогнозите');
    });
    (0, vitest_1.it)('should work with English', () => {
        const basePrompt = 'You are an astrologer.';
        const result = (0, languageService_1.buildSystemPromptWithLanguage)(basePrompt, 'en');
        (0, vitest_1.expect)(result).toContain('You are an astrologer.');
        (0, vitest_1.expect)(result).toContain('English');
    });
});
// ============================================
// Bulgarian Terminology Constants Tests
// ============================================
(0, vitest_1.describe)('BULGARIAN_ASTROLOGICAL_TERMS', () => {
    (0, vitest_1.it)('should have all 12 zodiac signs', () => {
        const signs = Object.keys(languageService_1.BULGARIAN_ASTROLOGICAL_TERMS.signs);
        (0, vitest_1.expect)(signs).toHaveLength(12);
    });
    (0, vitest_1.it)('should have all major planets', () => {
        const planets = Object.keys(languageService_1.BULGARIAN_ASTROLOGICAL_TERMS.planets);
        (0, vitest_1.expect)(planets).toContain('sun');
        (0, vitest_1.expect)(planets).toContain('moon');
        (0, vitest_1.expect)(planets).toContain('mercury');
        (0, vitest_1.expect)(planets).toContain('venus');
        (0, vitest_1.expect)(planets).toContain('mars');
        (0, vitest_1.expect)(planets).toContain('jupiter');
        (0, vitest_1.expect)(planets).toContain('saturn');
    });
    (0, vitest_1.it)('should have all major aspects', () => {
        const aspects = Object.keys(languageService_1.BULGARIAN_ASTROLOGICAL_TERMS.aspects);
        (0, vitest_1.expect)(aspects).toContain('conjunction');
        (0, vitest_1.expect)(aspects).toContain('opposition');
        (0, vitest_1.expect)(aspects).toContain('trine');
        (0, vitest_1.expect)(aspects).toContain('square');
        (0, vitest_1.expect)(aspects).toContain('sextile');
    });
    (0, vitest_1.it)('should have all 12 house ordinals in Bulgarian', () => {
        const ordinals = languageService_1.BULGARIAN_ASTROLOGICAL_TERMS.houses.ordinals;
        (0, vitest_1.expect)(ordinals).toHaveLength(12);
        (0, vitest_1.expect)(ordinals[0]).toBe('Първи');
        (0, vitest_1.expect)(ordinals[11]).toBe('Дванадесети');
    });
    (0, vitest_1.it)('should have all 8 moon phases', () => {
        const phases = Object.keys(languageService_1.BULGARIAN_ASTROLOGICAL_TERMS.moonPhases);
        (0, vitest_1.expect)(phases).toHaveLength(8);
        (0, vitest_1.expect)(languageService_1.BULGARIAN_ASTROLOGICAL_TERMS.moonPhases.newMoon).toBe('Новолуние');
        (0, vitest_1.expect)(languageService_1.BULGARIAN_ASTROLOGICAL_TERMS.moonPhases.fullMoon).toBe('Пълнолуние');
    });
});
// ============================================
// Integration Tests
// ============================================
(0, vitest_1.describe)('Language Service Integration', () => {
    (0, vitest_1.it)('should produce consistent language directive across all contexts', () => {
        const contexts = ['chat', 'forecast', 'compatibility', 'alert', 'tooltip'];
        for (const context of contexts) {
            const directive = (0, languageService_1.getLanguageDirectiveWithContext)('bg', context);
            // All should contain the base Bulgarian directive
            (0, vitest_1.expect)(directive).toContain('Български');
            (0, vitest_1.expect)(directive).toContain('Слънце');
            (0, vitest_1.expect)(directive).toContain('Луна');
        }
    });
    (0, vitest_1.it)('should handle edge cases in language detection', () => {
        // Empty string header
        (0, vitest_1.expect)((0, languageService_1.detectLanguage)(undefined, '').language).toBe('bg');
        // Malformed header
        (0, vitest_1.expect)((0, languageService_1.detectLanguage)(undefined, 'invalid-format').language).toBe('bg');
        // Header with only unsupported languages
        (0, vitest_1.expect)((0, languageService_1.detectLanguage)(undefined, 'fr,de,es').language).toBe('bg');
    });
});
//# sourceMappingURL=languageService.test.js.map