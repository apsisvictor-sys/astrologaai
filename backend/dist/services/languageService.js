"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BULGARIAN_ASTROLOGICAL_TERMS = void 0;
exports.getLanguageDirective = getLanguageDirective;
exports.getLanguageDirectiveWithContext = getLanguageDirectiveWithContext;
exports.detectLanguage = detectLanguage;
exports.isValidLanguage = isValidLanguage;
exports.normalizeLanguage = normalizeLanguage;
exports.validateBulgarianAstrologicalTerms = validateBulgarianAstrologicalTerms;
exports.buildSystemPromptWithLanguage = buildSystemPromptWithLanguage;
const languageDetection_1 = require("../middleware/languageDetection");
// ============================================
// Bulgarian Astrological Terminology
// ============================================
/**
 * Comprehensive Bulgarian astrological terminology
 * Used for validation and ensuring correct translations
 */
exports.BULGARIAN_ASTROLOGICAL_TERMS = {
    planets: {
        sun: 'Слънце',
        moon: 'Луна',
        mercury: 'Меркурий',
        venus: 'Венера',
        mars: 'Марс',
        jupiter: 'Юпитер',
        saturn: 'Сатурн',
        uranus: 'Уран',
        neptune: 'Нептун',
        pluto: 'Плутон',
        northNode: 'Северен възел',
        southNode: 'Южен възел',
        chiron: 'Хирон',
        rising: 'Асцендент',
    },
    signs: {
        aries: 'Овен',
        taurus: 'Телец',
        gemini: 'Близнаци',
        cancer: 'Рак',
        leo: 'Лъв',
        virgo: 'Дева',
        libra: 'Везни',
        scorpio: 'Скорпион',
        sagittarius: 'Стрелец',
        capricorn: 'Козирог',
        aquarius: 'Водолей',
        pisces: 'Риби',
    },
    aspects: {
        conjunction: 'съвпад',
        opposition: 'опозиция',
        trine: 'тригон',
        square: 'квадрат',
        sextile: 'секстил',
        quincunx: 'квинкункс',
    },
    houses: {
        singular: 'дом',
        plural: 'дома',
        ordinals: [
            'Първи', 'Втори', 'Трети', 'Четвърти', 'Пети', 'Шести',
            'Седми', 'Осми', 'Девети', 'Десети', 'Единадесети', 'Дванадесети'
        ],
    },
    elements: {
        fire: 'Огън',
        earth: 'Земя',
        air: 'Въздух',
        water: 'Вода',
    },
    modalities: {
        cardinal: 'Кардинален',
        fixed: 'Фиксиран',
        mutable: 'Мутабелен',
    },
    moonPhases: {
        newMoon: 'Новолуние',
        waxingCrescent: 'Нарастващ полумесец',
        firstQuarter: 'Първа четвърт',
        waxingGibbous: 'Нарастващ триъгълник',
        fullMoon: 'Пълнолуние',
        waningGibbous: 'Намаляващ триъгълник',
        lastQuarter: 'Последна четвърт',
        waningCrescent: 'Намаляващ полумесец',
    },
    transitTerms: {
        transit: 'транзит',
        retrograde: 'ретрограден',
        direct: 'директен',
        orb: 'орб',
        degree: 'градус',
    },
};
// ============================================
// Language Directives
// ============================================
/**
 * Language directive templates for AI prompts
 * These ensure the AI responds in the correct language with proper terminology
 */
const LANGUAGE_DIRECTIVES = {
    bg: `IMPORTANT: Always respond in Bulgarian (Български). Use proper Bulgarian astrological terminology.

БЪЛГАРСКИ АСТРОЛОГИЧНИ ТЕРМИНИ:
- Планети: Слънце, Луна, Меркурий, Венера, Марс, Юпитер, Сатурн, Уран, Нептун, Плутон
- Знаци: Овен, Телец, Близнаци, Рак, Лъв, Дева, Везни, Скорпион, Стрелец, Козирог, Водолей, Риби
- Аспекти: съвпад, секстил, квадрат, тригон, опозиция
- Домове: Първи до Дванадесети дом
- Елементи: Огън, Земя, Въздух, Вода

Бъди топъл и разговорен на български. Използвай естествен език, не превеждай буквално от английски.`,
    en: `Always respond in English with clear, natural language.`,
};
/**
 * Get language directive for AI prompts
 * @param language - Target language
 * @returns Language directive string to append to system prompt
 */
function getLanguageDirective(language) {
    return LANGUAGE_DIRECTIVES[language] || LANGUAGE_DIRECTIVES[languageDetection_1.DEFAULT_LANGUAGE];
}
/**
 * Get language directive with context
 * Includes additional context based on content type
 */
function getLanguageDirectiveWithContext(language, context) {
    const baseDirective = getLanguageDirective(language);
    if (language === 'en') {
        return baseDirective;
    }
    // Add context-specific instructions for Bulgarian
    const contextAdditions = {
        chat: '\n\nВключвай специфични препратки към наталната карта на потребителя в отговорите си.',
        forecast: '\n\nИзползвай насърчителен и практически тон в прогнозите.',
        compatibility: '\n\nБъди обективен и балансиран в анализа на съвместимостта.',
        alert: '\n\nБъди ясен и информативен в предупредителните съобщения.',
        tooltip: '\n\nОбяснявай кратко и ясно за потребители без астрологични познания.',
    };
    return baseDirective + (contextAdditions[context] || '');
}
// ============================================
// Language Detection
// ============================================
/**
 * Detect language from various sources
 * Priority: user preference > Accept-Language header > default
 */
function detectLanguage(userPreference, acceptLanguageHeader) {
    // Priority 1: User's stored preference
    if (userPreference && isValidLanguage(userPreference)) {
        return {
            language: userPreference,
            source: 'user_preference',
        };
    }
    // Priority 2: Accept-Language header
    if (acceptLanguageHeader) {
        const detected = (0, languageDetection_1.detectLanguageFromHeader)(acceptLanguageHeader);
        return {
            language: detected,
            source: 'header',
        };
    }
    // Priority 3: Default
    return {
        language: languageDetection_1.DEFAULT_LANGUAGE,
        source: 'default',
    };
}
/**
 * Check if a language code is supported
 */
function isValidLanguage(code) {
    return ['bg', 'en'].includes(code);
}
/**
 * Normalize language code to supported format
 */
function normalizeLanguage(code) {
    if (!code)
        return languageDetection_1.DEFAULT_LANGUAGE;
    const normalized = code.toLowerCase().split('-')[0];
    return isValidLanguage(normalized) ? normalized : languageDetection_1.DEFAULT_LANGUAGE;
}
// ============================================
// Content Validation
// ============================================
/**
 * Validate Bulgarian content contains proper astrological terms
 * Returns list of potentially incorrect terms
 */
function validateBulgarianAstrologicalTerms(content) {
    const issues = [];
    // Check for English planet names that should be Bulgarian
    const planetMap = {
        sun: 'Слънце',
        moon: 'Луна',
        mercury: 'Меркурий',
        venus: 'Венера',
        mars: 'Марс',
        jupiter: 'Юпитер',
        saturn: 'Сатурн',
        uranus: 'Уран',
        neptune: 'Нептун',
        pluto: 'Плутон',
    };
    for (const [english, bulgarian] of Object.entries(planetMap)) {
        // Use case-insensitive matching with word boundaries
        const regex = new RegExp(`\\b${english}\\b`, 'i');
        if (regex.test(content)) {
            issues.push(`English planet name "${english}" found - should use "${bulgarian}"`);
        }
    }
    // Check for English sign names
    const signMap = {
        aries: 'Овен',
        taurus: 'Телец',
        gemini: 'Близнаци',
        cancer: 'Рак',
        leo: 'Лъв',
        virgo: 'Дева',
        libra: 'Везни',
        scorpio: 'Скорпион',
        sagittarius: 'Стрелец',
        capricorn: 'Козирог',
        aquarius: 'Водолей',
        pisces: 'Риби',
    };
    for (const [english, bulgarian] of Object.entries(signMap)) {
        const regex = new RegExp(`\\b${english}\\b`, 'i');
        if (regex.test(content)) {
            issues.push(`English sign name "${english}" found - should use "${bulgarian}"`);
        }
    }
    return {
        isValid: issues.length === 0,
        issues,
    };
}
// ============================================
// System Prompt Builders
// ============================================
/**
 * Build complete system prompt with language directive
 * Used by chat, forecasts, and other AI-generated content
 */
function buildSystemPromptWithLanguage(basePrompt, language, context) {
    const directive = context
        ? getLanguageDirectiveWithContext(language, context)
        : getLanguageDirective(language);
    return `${basePrompt}\n\n${directive}`;
}
// ============================================
// Exports
// ============================================
exports.default = {
    getLanguageDirective,
    getLanguageDirectiveWithContext,
    detectLanguage,
    isValidLanguage,
    normalizeLanguage,
    validateBulgarianAstrologicalTerms,
    buildSystemPromptWithLanguage,
    BULGARIAN_ASTROLOGICAL_TERMS: exports.BULGARIAN_ASTROLOGICAL_TERMS,
};
//# sourceMappingURL=languageService.js.map