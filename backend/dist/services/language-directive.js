"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguageDirective = getLanguageDirective;
exports.buildLanguageAwarePrompt = buildLanguageAwarePrompt;
exports.getTerm = getTerm;
exports.getAllTerms = getAllTerms;
exports.translatePlanet = translatePlanet;
exports.translateSign = translateSign;
exports.translateAspect = translateAspect;
exports.formatHouse = formatHouse;
exports.detectLanguageFromHeader = detectLanguageFromHeader;
exports.isValidLanguage = isValidLanguage;
exports.normalizeLanguage = normalizeLanguage;
exports.buildChatSystemPrompt = buildChatSystemPrompt;
exports.buildForecastSystemPrompt = buildForecastSystemPrompt;
exports.buildTransitAlertPrompt = buildTransitAlertPrompt;
// Language directive configuration
const LANGUAGE_DIRECTIVES = {
    bg: `ВАЖНО: Винаги отговаряй на БЪЛГАРСКИ ЕЗИК с правилна българска астрологическа терминология.

Използвай следните български термини:
- Планети: Слънце, Луна, Меркурий, Венера, Марс, Юпитер, Сатурн, Уран, Нептун, Плутон, Северен Възел, Южен Възел
- Знаци: Овен, Телец, Близнаци, Рак, Лъв, Дева, Везни, Скорпион, Стрелец, Козирог, Водолей, Риби
- Аспекти: съвпад, секстил, квадрат, тригон, опозиция
- Домове: 1-ви до 12-ти дом
- Елементи: Огън, Земя, Въздух, Вода
- Модалности: Кардинален, Фиксиран, Мутабелен

Запази професионален, топъл и съветващ тон на български език.`,
    en: `IMPORTANT: Always respond in English with proper astrological terminology.

Maintain a professional, warm, and advisory tone in English.`,
};
// Chart terminology for context injection
const CHART_TERMINOLOGY = {
    bg: {
        // Planets
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
        northNode: 'Северен Възел',
        southNode: 'Южен Възел',
        chiron: 'Хирон',
        // Signs
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
        // Aspects
        conjunction: 'съвпад',
        sextile: 'секстил',
        square: 'квадрат',
        trine: 'тригон',
        opposition: 'опозиция',
        // Houses
        house: 'дом',
        firstHouse: '1-ви дом',
        secondHouse: '2-ри дом',
        thirdHouse: '3-ти дом',
        fourthHouse: '4-ти дом',
        fifthHouse: '5-ти дом',
        sixthHouse: '6-ти дом',
        seventhHouse: '7-ми дом',
        eighthHouse: '8-ми дом',
        ninthHouse: '9-ти дом',
        tenthHouse: '10-ти дом',
        eleventhHouse: '11-ти дом',
        twelfthHouse: '12-ти дом',
        // Elements
        fire: 'Огън',
        earth: 'Земя',
        air: 'Въздух',
        water: 'Вода',
        // Modalities
        cardinal: 'Кардинален',
        fixed: 'Фиксиран',
        mutable: 'Мутабелен',
        // Common phrases
        retrograde: 'ретрограден',
        direct: 'директен',
        natalChart: 'натална карта',
        transit: 'транзит',
        synastry: 'синастрия',
        ascendant: 'асцендент',
        midheaven: 'средно небе (MC)',
    },
    en: {
        // Default English terms
        sun: 'Sun',
        moon: 'Moon',
        mercury: 'Mercury',
        venus: 'Venus',
        mars: 'Mars',
        jupiter: 'Jupiter',
        saturn: 'Saturn',
        uranus: 'Uranus',
        neptune: 'Neptune',
        pluto: 'Pluto',
        northNode: 'North Node',
        southNode: 'South Node',
        chiron: 'Chiron',
        aries: 'Aries',
        taurus: 'Taurus',
        gemini: 'Gemini',
        cancer: 'Cancer',
        leo: 'Leo',
        virgo: 'Virgo',
        libra: 'Libra',
        scorpio: 'Scorpio',
        sagittarius: 'Sagittarius',
        capricorn: 'Capricorn',
        aquarius: 'Aquarius',
        pisces: 'Pisces',
        conjunction: 'conjunction',
        sextile: 'sextile',
        square: 'square',
        trine: 'trine',
        opposition: 'opposition',
        house: 'house',
        firstHouse: '1st house',
        secondHouse: '2nd house',
        thirdHouse: '3rd house',
        fourthHouse: '4th house',
        fifthHouse: '5th house',
        sixthHouse: '6th house',
        seventhHouse: '7th house',
        eighthHouse: '8th house',
        ninthHouse: '9th house',
        tenthHouse: '10th house',
        eleventhHouse: '11th house',
        twelfthHouse: '12th house',
        fire: 'Fire',
        earth: 'Earth',
        air: 'Air',
        water: 'Water',
        cardinal: 'Cardinal',
        fixed: 'Fixed',
        mutable: 'Mutable',
        retrograde: 'retrograde',
        direct: 'direct',
        natalChart: 'natal chart',
        transit: 'transit',
        synastry: 'synastry',
        ascendant: 'Ascendant',
        midheaven: 'Midheaven (MC)',
    },
};
// ============================================
// Main Functions
// ============================================
/**
 * Get the language directive for AI prompts
 *
 * @param language - Target language
 * @returns Language directive string to append to system prompt
 */
function getLanguageDirective(language) {
    return LANGUAGE_DIRECTIVES[language] || LANGUAGE_DIRECTIVES.bg;
}
/**
 * Build a language-aware system prompt for AI responses
 *
 * @param basePrompt - Base system prompt content
 * @param language - Target language
 * @returns Complete system prompt with language directive
 */
function buildLanguageAwarePrompt(basePrompt, language) {
    const directive = getLanguageDirective(language);
    return `${basePrompt}\n\n${directive}`;
}
/**
 * Get terminology translation for a given key
 *
 * @param key - Terminology key (e.g., 'sun', 'aries', 'conjunction')
 * @param language - Target language
 * @returns Translated term or original key if not found
 */
function getTerm(key, language) {
    return CHART_TERMINOLOGY[language]?.[key] || key;
}
/**
 * Get all terminology for a language
 *
 * @param language - Target language
 * @returns Complete terminology map for the language
 */
function getAllTerms(language) {
    return CHART_TERMINOLOGY[language] || CHART_TERMINOLOGY.en;
}
/**
 * Translate a planet name
 */
function translatePlanet(planet, language) {
    const key = planet.toLowerCase();
    return getTerm(key, language);
}
/**
 * Translate a zodiac sign
 */
function translateSign(sign, language) {
    const key = sign.toLowerCase();
    return getTerm(key, language);
}
/**
 * Translate an aspect type
 */
function translateAspect(aspect, language) {
    const key = aspect.toLowerCase();
    return getTerm(key, language);
}
/**
 * Format a house number in the target language
 */
function formatHouse(houseNumber, language) {
    if (language === 'bg') {
        const ordinals = {
            1: '1-ви',
            2: '2-ри',
            3: '3-ти',
            4: '4-ти',
            5: '5-ти',
            6: '6-ти',
            7: '7-ми',
            8: '8-ми',
            9: '9-ти',
            10: '10-ти',
            11: '11-ти',
            12: '12-ти',
        };
        return `${ordinals[houseNumber] || `${houseNumber}-ти`} дом`;
    }
    return `${houseNumber}${getOrdinalSuffix(houseNumber)} house`;
}
function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
/**
 * Detect language from Accept-Language header
 *
 * @param acceptLanguage - Accept-Language header value
 * @returns Detected supported language (defaults to 'bg')
 */
function detectLanguageFromHeader(acceptLanguage) {
    if (!acceptLanguage) {
        return 'bg';
    }
    // Parse Accept-Language header
    const languages = acceptLanguage.split(',').map(lang => {
        const [code, qualityStr] = lang.trim().split(';');
        const quality = qualityStr ? parseFloat(qualityStr.replace('q=', '')) : 1.0;
        return {
            code: code?.toLowerCase().split('-')[0] || '',
            quality,
        };
    });
    // Sort by quality (highest first)
    languages.sort((a, b) => b.quality - a.quality);
    // Find first supported language
    for (const lang of languages) {
        if (lang.code === 'bg' || lang.code === 'en') {
            return lang.code;
        }
    }
    // Default to Bulgarian for BG market
    return 'bg';
}
/**
 * Validate that a language is supported
 */
function isValidLanguage(lang) {
    return lang === 'bg' || lang === 'en';
}
/**
 * Normalize language string to supported language
 * Defaults to 'bg' if invalid or missing
 */
function normalizeLanguage(lang) {
    if (isValidLanguage(lang)) {
        return lang;
    }
    return 'bg';
}
// ============================================
// AI Prompt Builders
// ============================================
/**
 * Build chat system prompt with language directive
 */
function buildChatSystemPrompt(chartSummary, transitsSummary, language) {
    const basePrompt = `You are AstroLogAI, a wise and knowledgeable astrologer with deep expertise in natal chart interpretation, transits, synastry, and predictive astrology.

YOUR CAPABILITIES:
- Natal chart interpretation (planetary positions, aspects, houses)
- Transit analysis and forecasting
- Relationship compatibility (synastry)
- Career, love, and life guidance based on astrology
- Understanding of both Western and basic Vedic concepts

YOUR APPROACH:
- Be warm, wise, and approachable
- Use astrological terminology but explain concepts clearly
- Always ground your advice in the user's actual chart
- Reference specific planetary positions and aspects when relevant
- Offer guidance, not deterministic predictions
- Connect cosmic themes to real-life situations
- Be encouraging while remaining realistic

RESPONSE STYLE:
- Personalize every response using the user's chart data
- When discussing transits, explain how they interact with the natal chart
- If asked about timing, reference relevant planetary movements
- For relationship questions, consider both charts if available
- Keep responses focused and practical
- End with an empowering insight when appropriate`;
    let fullPrompt = buildLanguageAwarePrompt(basePrompt, language);
    // Add chart context if available
    if (chartSummary) {
        fullPrompt += `\n\nUSER'S NATAL CHART:\n${chartSummary}`;
    }
    // Add transit context if available
    if (transitsSummary) {
        fullPrompt += `\n\nCURRENT TRANSITS:\n${transitsSummary}`;
    }
    return fullPrompt;
}
/**
 * Build forecast system prompt with language directive
 */
function buildForecastSystemPrompt(type, language) {
    if (language === 'bg') {
        if (type === 'daily') {
            return `Ти си AstroLogAI, експертен AI астролог. Базирай се на потребителската натална карта и текущите транзити, за да генерираш персонализирана дневна прогноза.

ВАЖНО: Винаги отговаряй на БЪЛГАРСКИ ЕЗИК с правилна българска астрологическа терминология.

Използвай следните български термини:
- Слънце, Луна, Меркурий, Венера, Марс, Юпитер, Сатурн, Уран, Нептун, Плутон
- Овен, Телец, Близнаци, Рак, Лъв, Дева, Везни, Скорпион, Стрелец, Козирог, Водолей, Риби
- Съвпад, Секстил, Квадрат, Тригон, Опозиция
- 1-ви до 12-ти дом

Генерирай прогнозата в следния JSON формат (само JSON, без допълнителен текст):
{
  "overallTheme": "Кратко заглавие на деня в 2-3 думи",
  "horoscope": {
    "general": "Общ преглед на деня - 2-3 изречения",
    "love": "Любов и отношения - 2 изречения",
    "career": "Кариера и работа - 2 изречения", 
    "health": "Здраве и енергия - 2 изречения"
  },
  "recommendations": ["Препоръка 1", "Препоръка 2", "Препоръка 3"]
}`;
        }
        else {
            return `Ти си AstroLogAI, експертен AI астролог. Генерирай седмична прогноза за потребителя.

ВАЖНО: Винаги отговаряй на БЪЛГАРСКИ ЕЗИК.

Генерирай в JSON формат:
{
  "overview": "Общ преглед на седмицата - 3-4 изречения",
  "dailyBreakdown": [
    {"dayName": "Понеделник", "theme": "Тема на деня", "highlight": "Ключово събитие"},
    // ... 7 дни
  ],
  "majorTransits": [
    {"date": "YYYY-MM-DD", "event": "Астрологично събитие", "significance": "Значение"}
  ],
  "bestDays": {"career": "yyyy-mm-dd", "love": "yyyy-mm-dd", "decisions": "yyyy-mm-dd", "selfCare": "yyyy-mm-dd"}
}`;
        }
    }
    // English prompts
    if (type === 'daily') {
        return `You are AstroLogAI, an expert AI astrologer. Based on the user's natal chart and current transits, generate a personalized daily forecast.

IMPORTANT: Always respond in English with proper astrological terminology.

Generate the forecast in the following JSON format (JSON only, no additional text):
{
  "overallTheme": "Brief theme of the day in 2-3 words",
  "horoscope": {
    "general": "General overview of the day - 2-3 sentences",
    "love": "Love and relationships - 2 sentences",
    "career": "Career and work - 2 sentences",
    "health": "Health and energy - 2 sentences"
  },
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}`;
    }
    return `You are AstroLogAI, an expert AI astrologer. Generate a weekly forecast for the user.

IMPORTANT: Always respond in English.

Generate in JSON format:
{
  "overview": "Weekly overview - 3-4 sentences",
  "dailyBreakdown": [
    {"dayName": "Monday", "theme": "Day theme", "highlight": "Key event"}
  ],
  "majorTransits": [
    {"date": "YYYY-MM-DD", "event": "Astrological event", "significance": "Significance"}
  ],
  "bestDays": {"career": "yyyy-mm-dd", "love": "yyyy-mm-dd", "decisions": "yyyy-mm-dd", "selfCare": "yyyy-mm-dd"}
}`;
}
/**
 * Build transit alert prompt with language directive
 */
function buildTransitAlertPrompt(transit, language) {
    const basePrompt = language === 'bg'
        ? `Ти си AstroLogAI, експертен AI астролог. Генерирай персонализирано известие за транзит.

ВАЖНО: Отговаряй само на БЪЛГАРСКИ.

Транзит: ${transit.planet} ${transit.aspect} ${transit.natalPlanet}
Точна дата: ${transit.exactDate}
Влияние: ${transit.influence === 'positive' ? 'положително' : transit.influence === 'challenging' ? 'предизвикателно' : 'неутрално'}

Генерирай в JSON формат:
{
  "title": "Заглавие на известие (кратко)",
  "description": "Описание на транзита - 2-3 изречения",
  "advice": "Практически съвет за този период",
  "intensity": "low" | "medium" | "high"
}`
        : `You are AstroLogAI, an expert AI astrologer. Generate a personalized transit alert.

IMPORTANT: Respond only in English.

Transit: ${transit.planet} ${transit.aspect} ${transit.natalPlanet}
Exact date: ${transit.exactDate}
Influence: ${transit.influence}

Generate in JSON format:
{
  "title": "Alert title (brief)",
  "description": "Transit description - 2-3 sentences",
  "advice": "Practical advice for this period",
  "intensity": "low" | "medium" | "high"
}`;
    return basePrompt;
}
exports.default = {
    getLanguageDirective,
    buildLanguageAwarePrompt,
    getTerm,
    getAllTerms,
    translatePlanet,
    translateSign,
    translateAspect,
    formatHouse,
    detectLanguageFromHeader,
    isValidLanguage,
    normalizeLanguage,
    buildChatSystemPrompt,
    buildForecastSystemPrompt,
    buildTransitAlertPrompt,
};
//# sourceMappingURL=language-directive.js.map