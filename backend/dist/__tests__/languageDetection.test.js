"use strict";
/**
 * Language Detection Middleware Tests
 * US-35: Language Layer Completeness
 *
 * Unit tests for Accept-Language header detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const languageDetection_1 = require("../middleware/languageDetection");
// ============================================
// Helper to create mock request/response
// ============================================
function createMockRequest(overrides = {}) {
    return {
        headers: {},
        user: undefined,
        ...overrides,
    };
}
function createMockResponse() {
    const res = {};
    res.status = () => res;
    res.json = () => res;
    return res;
}
// ============================================
// Header Detection Tests
// ============================================
(0, vitest_1.describe)('detectLanguageFromHeader', () => {
    (0, vitest_1.it)('should detect Bulgarian from bg-BG header', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)('bg-BG');
        (0, vitest_1.expect)(result).toBe('bg');
    });
    (0, vitest_1.it)('should detect Bulgarian from simple bg header', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)('bg');
        (0, vitest_1.expect)(result).toBe('bg');
    });
    (0, vitest_1.it)('should detect Bulgarian from complex header with quality', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)('bg-BG,bg;q=0.9,en;q=0.8');
        (0, vitest_1.expect)(result).toBe('bg');
    });
    (0, vitest_1.it)('should detect English from en-US header', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)('en-US');
        (0, vitest_1.expect)(result).toBe('en');
    });
    (0, vitest_1.it)('should detect English from simple en header', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)('en');
        (0, vitest_1.expect)(result).toBe('en');
    });
    (0, vitest_1.it)('should detect English from complex header', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)('en-US,en;q=0.9,bg;q=0.8');
        (0, vitest_1.expect)(result).toBe('en');
    });
    (0, vitest_1.it)('should respect quality values in header', () => {
        // Bulgarian has higher quality
        const result = (0, languageDetection_1.detectLanguageFromHeader)('en;q=0.5,bg;q=0.9');
        (0, vitest_1.expect)(result).toBe('bg');
    });
    (0, vitest_1.it)('should return default for undefined header', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)(undefined);
        (0, vitest_1.expect)(result).toBe(languageDetection_1.DEFAULT_LANGUAGE);
    });
    (0, vitest_1.it)('should return default for empty header', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)('');
        (0, vitest_1.expect)(result).toBe(languageDetection_1.DEFAULT_LANGUAGE);
    });
    (0, vitest_1.it)('should return default for unsupported language', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)('fr-FR,de-DE');
        (0, vitest_1.expect)(result).toBe(languageDetection_1.DEFAULT_LANGUAGE);
    });
    (0, vitest_1.it)('should pick supported language from mixed header', () => {
        // Should pick English from fr,en,de
        const result = (0, languageDetection_1.detectLanguageFromHeader)('fr-FR,en-US;q=0.8,de-DE;q=0.7');
        (0, vitest_1.expect)(result).toBe('en');
    });
    (0, vitest_1.it)('should handle wildcard header', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)('*');
        (0, vitest_1.expect)(result).toBe(languageDetection_1.DEFAULT_LANGUAGE);
    });
});
// ============================================
// Middleware Tests
// ============================================
(0, vitest_1.describe)('languageDetectionMiddleware', () => {
    (0, vitest_1.it)('should set detectedLanguage from user preference when authenticated', () => {
        const req = createMockRequest({
            user: { id: '1', email: 'test@test.com', tier: 'FREE', language: 'en' },
            headers: { 'accept-language': 'bg-BG' },
        });
        const res = createMockResponse();
        let nextCalled = false;
        const next = () => { nextCalled = true; };
        (0, languageDetection_1.languageDetectionMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.detectedLanguage).toBe('en');
        (0, vitest_1.expect)(nextCalled).toBe(true);
    });
    (0, vitest_1.it)('should set detectedLanguage from header when not authenticated', () => {
        const req = createMockRequest({
            headers: { 'accept-language': 'en-US' },
        });
        const res = createMockResponse();
        let nextCalled = false;
        const next = () => { nextCalled = true; };
        (0, languageDetection_1.languageDetectionMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.detectedLanguage).toBe('en');
        (0, vitest_1.expect)(nextCalled).toBe(true);
    });
    (0, vitest_1.it)('should default to Bulgarian when no preference or header', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        let nextCalled = false;
        const next = () => { nextCalled = true; };
        (0, languageDetection_1.languageDetectionMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.detectedLanguage).toBe('bg');
        (0, vitest_1.expect)(nextCalled).toBe(true);
    });
    (0, vitest_1.it)('should prefer user preference over header', () => {
        const req = createMockRequest({
            user: { id: '1', email: 'test@test.com', tier: 'FREE', language: 'bg' },
            headers: { 'accept-language': 'en-US' },
        });
        const res = createMockResponse();
        const next = () => { };
        (0, languageDetection_1.languageDetectionMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.detectedLanguage).toBe('bg');
    });
    (0, vitest_1.it)('should ignore invalid user language preference', () => {
        const req = createMockRequest({
            user: { id: '1', email: 'test@test.com', tier: 'FREE', language: 'invalid' },
            headers: { 'accept-language': 'en-US' },
        });
        const res = createMockResponse();
        const next = () => { };
        (0, languageDetection_1.languageDetectionMiddleware)(req, res, next);
        // Should fall back to header
        (0, vitest_1.expect)(req.detectedLanguage).toBe('en');
    });
});
// ============================================
// Helper Function Tests
// ============================================
(0, vitest_1.describe)('getDetectedLanguage', () => {
    (0, vitest_1.it)('should return detected language from request', () => {
        const req = createMockRequest();
        req.detectedLanguage = 'en';
        const result = (0, languageDetection_1.getDetectedLanguage)(req);
        (0, vitest_1.expect)(result).toBe('en');
    });
    (0, vitest_1.it)('should return default when not set', () => {
        const req = createMockRequest();
        const result = (0, languageDetection_1.getDetectedLanguage)(req);
        (0, vitest_1.expect)(result).toBe(languageDetection_1.DEFAULT_LANGUAGE);
    });
});
// ============================================
// Constants Tests
// ============================================
(0, vitest_1.describe)('Language Constants', () => {
    (0, vitest_1.it)('should have Bulgarian and English as supported languages', () => {
        (0, vitest_1.expect)(languageDetection_1.SUPPORTED_LANGUAGES).toContain('bg');
        (0, vitest_1.expect)(languageDetection_1.SUPPORTED_LANGUAGES).toContain('en');
    });
    (0, vitest_1.it)('should have Bulgarian as default language', () => {
        (0, vitest_1.expect)(languageDetection_1.DEFAULT_LANGUAGE).toBe('bg');
    });
    (0, vitest_1.it)('should have exactly 2 supported languages', () => {
        (0, vitest_1.expect)(languageDetection_1.SUPPORTED_LANGUAGES).toHaveLength(2);
    });
});
// ============================================
// Edge Cases
// ============================================
(0, vitest_1.describe)('Edge Cases', () => {
    (0, vitest_1.it)('should handle malformed Accept-Language header', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)(';;;invalid;;;');
        (0, vitest_1.expect)(result).toBe(languageDetection_1.DEFAULT_LANGUAGE);
    });
    (0, vitest_1.it)('should handle header with only whitespace', () => {
        const result = (0, languageDetection_1.detectLanguageFromHeader)('   ');
        (0, vitest_1.expect)(result).toBe(languageDetection_1.DEFAULT_LANGUAGE);
    });
    (0, vitest_1.it)('should handle header with quality value 0', () => {
        // Language with q=0 should be ignored
        const result = (0, languageDetection_1.detectLanguageFromHeader)('en;q=0,bg;q=0.5');
        (0, vitest_1.expect)(result).toBe('bg');
    });
    (0, vitest_1.it)('should handle very long Accept-Language header', () => {
        const longHeader = 'en-US,en;q=0.9,fr;q=0.8,de;q=0.7,es;q=0.6,it;q=0.5,pt;q=0.4,nl;q=0.3,ru;q=0.2,ja;q=0.1';
        const result = (0, languageDetection_1.detectLanguageFromHeader)(longHeader);
        (0, vitest_1.expect)(result).toBe('en');
    });
    (0, vitest_1.it)('should handle case-insensitive language codes', () => {
        (0, vitest_1.expect)((0, languageDetection_1.detectLanguageFromHeader)('BG-BG')).toBe('bg');
        (0, vitest_1.expect)((0, languageDetection_1.detectLanguageFromHeader)('EN-US')).toBe('en');
        (0, vitest_1.expect)((0, languageDetection_1.detectLanguageFromHeader)('Bg')).toBe('bg');
    });
});
//# sourceMappingURL=languageDetection.test.js.map