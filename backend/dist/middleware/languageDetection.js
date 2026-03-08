"use strict";
/**
 * Language Detection Middleware
 * US-26: Auto-Detect User Language
 *
 * Detects user's preferred language from:
 * 1. User's stored preference (if authenticated)
 * 2. Accept-Language header
 * 3. Default to Bulgarian (bg) for BG market
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LANGUAGE = exports.SUPPORTED_LANGUAGES = void 0;
exports.detectLanguageFromHeader = detectLanguageFromHeader;
exports.languageDetectionMiddleware = languageDetectionMiddleware;
exports.getDetectedLanguage = getDetectedLanguage;
// Supported languages
exports.SUPPORTED_LANGUAGES = ['bg', 'en'];
// Default language for BG market
exports.DEFAULT_LANGUAGE = 'bg';
/**
 * Detect language from Accept-Language header
 *
 * Examples:
 * - "bg-BG,bg;q=0.9,en;q=0.8" -> "bg"
 * - "en-US,en;q=0.9,bg;q=0.8" -> "en"
 * - "bg" -> "bg"
 */
function detectLanguageFromHeader(acceptLanguage) {
    if (!acceptLanguage) {
        return exports.DEFAULT_LANGUAGE;
    }
    // Parse Accept-Language header
    // Format: "language-region;q=quality,language;q=quality"
    const languages = acceptLanguage.split(',').map(lang => {
        const [code, qualityStr] = lang.trim().split(';');
        const quality = qualityStr ? parseFloat(qualityStr.replace('q=', '')) : 1.0;
        return {
            code: code?.toLowerCase().split('-')[0] || '', // Get language code without region
            quality,
        };
    });
    // Sort by quality (highest first)
    languages.sort((a, b) => b.quality - a.quality);
    // Find first supported language
    for (const lang of languages) {
        if (exports.SUPPORTED_LANGUAGES.includes(lang.code)) {
            return lang.code;
        }
    }
    // No supported language found, use default
    return exports.DEFAULT_LANGUAGE;
}
/**
 * Language detection middleware
 *
 * Sets req.detectedLanguage based on:
 * 1. User's stored preference (if authenticated)
 * 2. Accept-Language header
 * 3. Default (Bulgarian)
 */
function languageDetectionMiddleware(req, res, next) {
    // Priority 1: Use user's stored preference if authenticated
    if (req.user?.language && exports.SUPPORTED_LANGUAGES.includes(req.user.language)) {
        req.detectedLanguage = req.user.language;
        next();
        return;
    }
    // Priority 2: Detect from Accept-Language header
    const acceptLanguage = req.headers['accept-language'];
    req.detectedLanguage = detectLanguageFromHeader(acceptLanguage);
    next();
}
/**
 * Get detected language from request
 * Falls back to default if not set
 */
function getDetectedLanguage(req) {
    return req.detectedLanguage || exports.DEFAULT_LANGUAGE;
}
exports.default = languageDetectionMiddleware;
//# sourceMappingURL=languageDetection.js.map