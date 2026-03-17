"use strict";
/**
 * Forecast Service
 * US-15: Daily Forecast
 *
 * Generates personalized daily forecasts based on user's natal chart
 * and current planetary transits
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyForecast = generateDailyForecast;
exports.getDailyForecast = getDailyForecast;
exports.generateWeeklyForecast = generateWeeklyForecast;
exports.getWeeklyForecast = getWeeklyForecast;
exports.getPersonalDailyHoroscope = getPersonalDailyHoroscope;
const redis_1 = require("../utils/redis");
const astrology_1 = require("./astrology");
const llm_1 = require("./llm");
const forecast_cron_1 = require("./forecast-cron");
// ============================================
// Constants
// ============================================
const FORECAST_CACHE_TTL = 43200; // 12 hours in seconds (daily forecasts change twice a day)
const WEEKLY_CACHE_TTL = 604800; // 7 days in seconds
// Planet translations
const PLANET_TRANSLATIONS = {
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
};
// Moon phase translations
const MOON_PHASE_TRANSLATIONS = {
    'New Moon': 'Новолуние',
    'Waxing Crescent': 'Нарастващ полумесец',
    'First Quarter': 'Първа четвърт',
    'Waxing Gibbous': 'Нарастващ триъгълник',
    'Full Moon': 'Пълнолуние',
    'Waning Gibbous': 'Намаляващ триъгълник',
    'Last Quarter': 'Последна четвърт',
    'Waning Crescent': 'Намаляващ полумесец',
};
// Sign translations (full)
const SIGN_TRANSLATIONS_FULL = {
    Aries: 'Овен',
    Taurus: 'Телец',
    Gemini: 'Близнаци',
    Cancer: 'Рак',
    Leo: 'Лъв',
    Virgo: 'Дева',
    Libra: 'Везни',
    Scorpio: 'Скорпион',
    Sagittarius: 'Стрелец',
    Capricorn: 'Козирог',
    Aquarius: 'Водолей',
    Pisces: 'Риби',
};
// ============================================
// Helper Functions
// ============================================
function getTodayDateString() {
    const now = new Date();
    const Sofia = 'Europe/Sofia';
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: Sofia,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(now);
}
function getWeekStartDateString() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(now.setDate(diff));
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Sofia',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(monday);
}
/**
 * Derive moon phase from the transit positions already fetched from the SDK.
 * Uses the Sun-Moon elongation angle — no extra API call needed.
 */
function deriveMoonPhaseFromTransits(transits) {
    const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const PHASE_NAMES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
        'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    const PHASE_BG = ['Новолуние', 'Нарастващ полумесец', 'Първа четвърт', 'Нарастващ триъгълник',
        'Пълнолуние', 'Намаляващ триъгълник', 'Последна четвърт', 'Намаляващ полумесец'];
    const sun = transits.find(t => t.planet === 'sun');
    const moon = transits.find(t => t.planet === 'moon');
    if (!sun || !moon) {
        throw new Error('[Forecast] Cannot derive moon phase: sun/moon missing from transits');
    }
    const sunLon = SIGNS.indexOf(sun.sign) * 30 + sun.degree;
    const moonLon = SIGNS.indexOf(moon.sign) * 30 + moon.degree;
    const angle = ((moonLon - sunLon) + 360) % 360;
    const idx = Math.min(Math.floor(angle / 45), 7);
    return {
        phase: PHASE_NAMES[idx],
        phaseBg: PHASE_BG[idx],
        illumination: Math.round((1 - Math.cos(angle * Math.PI / 180)) / 2 * 100),
        sign: moon.sign,
        signBg: moon.signBg,
    };
}
function translateToBulgarian(text) {
    // Simplified translation - in production this would use proper translation
    // For now, we'll use the LLM to generate Bulgarian content
    return text; // Placeholder - actual translation happens in LLM generation
}
// ============================================
// Main Service Functions
// ============================================
/**
 * Get current planetary transits
 * Uses astrology-api.io or fallback calculation
 */
async function getCurrentTransits(natalChart) {
    const { getActiveTransitsForUser } = await Promise.resolve().then(() => __importStar(require('./transits')));
    const { skyPositions } = await getActiveTransitsForUser(natalChart);
    return skyPositions.map(p => ({
        planet: p.planet,
        planetBg: p.planetBg,
        sign: p.sign,
        signBg: p.signBg,
        degree: p.degree,
    }));
}
/**
 * Analyze how current transits affect the natal chart
 */
function analyzeTransitImpact(transits, natalChart) {
    return transits.map(transit => {
        // Find if this transit makes any significant aspects to natal planets
        const natalPlanetRecord = natalChart[transit.planet];
        if (!natalPlanetRecord || typeof natalPlanetRecord !== 'object')
            return transit;
        const planetPosition = natalPlanetRecord;
        const natalDegree = planetPosition.degree;
        const transitDegree = transit.degree;
        // Calculate aspect
        const aspectAngle = Math.abs(natalDegree - transitDegree);
        const normalizedAngle = Math.min(aspectAngle, 360 - aspectAngle);
        let aspect = '';
        let aspectBg = '';
        let influence = 'neutral';
        let description = '';
        // Check for major aspects
        if (normalizedAngle < 8) {
            aspect = 'conjunction';
            aspectBg = 'съвпад';
            influence = 'neutral';
            description = 'Нова енергия и фокус в тази област';
        }
        else if (normalizedAngle < 8 + 8) {
            aspect = 'sextile';
            aspectBg = 'секстил';
            influence = 'positive';
            description = 'Възможности за растеж и хармония';
        }
        else if (normalizedAngle < 90 + 8) {
            aspect = 'square';
            aspectBg = 'квадрат';
            influence = 'challenging';
            description = 'Напрежение и предизвикателства';
        }
        else if (normalizedAngle < 120 + 8) {
            aspect = 'trine';
            aspectBg = 'тригон';
            influence = 'positive';
            description = 'Хармония и подкрепа';
        }
        else if (normalizedAngle < 180 + 8) {
            aspect = 'opposition';
            aspectBg = 'опозиция';
            influence = 'challenging';
            description = 'Баланс между вътрешни и външни влияния';
        }
        if (aspect) {
            transit.aspectToNatal = {
                natalPlanet: transit.planet === 'sun' ? 'Вашето Слънце' :
                    transit.planet === 'moon' ? 'Вашата Луна' :
                        `Вашият ${PLANET_TRANSLATIONS[transit.planet] || transit.planet}`,
                aspect,
                aspectBg,
                orb: Math.round(normalizedAngle * 10) / 10,
                influence,
                description,
            };
        }
        return transit;
    });
}
/**
 * Generate daily forecast using LLM
 */
async function generateLLMForecast(natalChart, transits, moonPhase, userLanguage = 'bg') {
    // Format chart info for prompt
    const chartInfo = `
Потребителска натална карта:
- Слънце: ${natalChart.sun.signBg} (${natalChart.sun.sign}) в ${natalChart.sun.house}ти дом
- Луна: ${natalChart.moon.signBg} (${natalChart.moon.sign}) в ${natalChart.moon.house}ти дом
- Асцендент: ${natalChart.rising.signBg} (${natalChart.rising.sign})

Днешни транзити:
${transits.map(t => `- ${t.planetBg}: ${t.signBg} ${t.degree}°${t.aspectToNatal ? ` - ${t.aspectToNatal.aspectBg} ${t.aspectToNatal.natalPlanet} (${t.aspectToNatal.description})` : ''}`).join('\n')}

Лунна фаза: ${moonPhase.phaseBg} (${moonPhase.illumination}% осветеност)
Лунен знак: ${moonPhase.signBg}
`;
    const systemPrompt = userLanguage === 'bg'
        ? `Ти си AstroLogAI, експертен AI астролог. Базирай се на потребителската натална карта и текущите транзити, за да генерираш персонализирана дневна прогноза.

ВНИМАНИЕ: Винаги отговаряй на БЪЛГАРСКИ ЕЗИК с правилна българска астрологическа терминология.

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
}`
        : `You are AstroLogAI, an expert AI astrologer. Based on the user's natal chart and current transits, generate a personalized daily forecast.

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
    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: chartInfo },
        ];
        const response = await (0, llm_1.chatCompletion)(messages, { temperature: 0.7, maxTokens: 1000 });
        // Parse the JSON response - extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            overallTheme: parsed.overallTheme || 'Ден на предизвикателствата',
            overallThemeBg: parsed.overallTheme || 'Ден на предизвикателствата',
            horoscope: {
                general: parsed.horoscope?.general || 'Денят носи интересни енергии.',
                generalBg: parsed.horoscope?.general || 'Денят носи интересни енергии.',
                love: parsed.horoscope?.love || 'Отношенията изискват внимание.',
                loveBg: parsed.horoscope?.love || 'Отношенията изискват внимание.',
                career: parsed.horoscope?.career || 'Кариерните възможности са налице.',
                careerBg: parsed.horoscope?.career || 'Кариерните възможности са налице.',
                health: parsed.horoscope?.health || 'Обърнете внимание на енергията си.',
                healthBg: parsed.horoscope?.health || 'Обърнете внимание на енергията си.',
            },
            recommendations: parsed.recommendations || ['Отделете време за почивка', 'Слушайте интуицията си', 'Бъдете отворени към нови възможности'],
            recommendationsBg: parsed.recommendations || ['Отделете време за почивка', 'Слушайте интуицията си', 'Бъдете отворени към нови възможности'],
        };
    }
    catch (error) {
        console.error('[Forecast] LLM generation error:', error);
        // Return fallback forecast
        return {
            overallTheme: 'Ден на новите начала',
            overallThemeBg: 'Ден на новите начала',
            horoscope: {
                general: 'Днес е един ден на нови начала и възможности. Слушайте интуицията си и бъдете отворени към промени.',
                generalBg: 'Днес е един ден на нови начала и възможности. Слушайте интуицията си и бъдете отворени към промени.',
                love: 'Време за дълбоки разговори с партньора. Емоционалната връзка е подсилена.',
                loveBg: 'Време за дълбоки разговори с партньора. Емоционалната връзка е подсилена.',
                career: 'Професионалните ви усилия ще бъдат забележини. Това е добър ден за нови проекти.',
                careerBg: 'Професионалните ви усилия ще бъдат забележини. Това е добър ден за нови проекти.',
                health: 'Обърнете внимание на съня и почивката. Енергията може да варира през деня.',
                healthBg: 'Обърнете внимание на съня и почивката. Енергията може да варира през деня.',
            },
            recommendations: [
                'Създайте сутрешна рутина за медитация',
                'Практикувайте благодарност',
                'Избягвайте конфликти'
            ],
            recommendationsBg: [
                'Създайте сутрешна рутина за медитация',
                'Практикувайте благодарност',
                'Избягвайте конфликти'
            ],
        };
    }
}
/**
 * Generate daily forecast for a user
 */
async function generateDailyForecast(userId, birthData, userLanguage = 'bg', precomputedChart) {
    const dateString = getTodayDateString();
    // 1. Check DB first (written by nightly cron or previous on-demand call)
    const stored = await (0, forecast_cron_1.getStoredForecast)(userId, dateString);
    if (stored?.forecast) {
        console.log(`[Forecast] DB hit for daily forecast, user ${userId}`);
        return { ...stored.forecast, cached: true };
    }
    // 2. Fall back to Redis hot cache
    const cacheKey = `forecast:daily:${userId}:${dateString}`;
    try {
        const cached = await redis_1.redisClient.get(cacheKey);
        if (cached) {
            console.log(`[Forecast] Redis hit for daily forecast, user ${userId}`);
            const forecast = JSON.parse(cached);
            forecast.cached = true;
            return forecast;
        }
    }
    catch (error) {
        console.warn('[Forecast] Cache read error:', error);
    }
    // Get natal chart (use precomputed from DB if available, otherwise call API)
    const natalChart = precomputedChart ?? await (0, astrology_1.calculateNatalChart)(birthData);
    // Get current transits
    const transits = await getCurrentTransits(natalChart);
    // Analyze transit impact on natal chart
    const analyzedTransits = analyzeTransitImpact(transits, natalChart);
    // Derive moon phase from already-fetched transit positions (no extra API call)
    const moonPhase = deriveMoonPhaseFromTransits(transits);
    // Generate LLM-based forecast
    const llmForecast = await generateLLMForecast(natalChart, analyzedTransits, moonPhase, userLanguage);
    // Determine energy level based on transits
    const challengingCount = analyzedTransits.filter(t => t.aspectToNatal?.influence === 'challenging').length;
    const positiveCount = analyzedTransits.filter(t => t.aspectToNatal?.influence === 'positive').length;
    let energy = 'medium';
    if (positiveCount > challengingCount + 1)
        energy = 'high';
    else if (challengingCount > positiveCount + 1)
        energy = 'low';
    // Determine mood based on moon
    const moods = {
        'New Moon': 'Рефлективен',
        'Waxing Crescent': 'Оптимистичен',
        'First Quarter': 'Енергичен',
        'Waxing Gibbous': 'Продуктивен',
        'Full Moon': 'Интензивен',
        'Waning Gibbous': 'Благодарен',
        'Last Quarter': 'Освобождаващ',
        'Waning Crescent': 'Спокоен',
    };
    const mood = moods[moonPhase.phase] || 'Балансиран';
    // Determine power hours (simplified - based on sun's position)
    const hour = new Date().getHours();
    const powerHours = [
        `${(hour + 2) % 24}:00-${(hour + 4) % 24}:00`,
        `${(hour + 8) % 24}:00-${(hour + 10) % 24}:00`,
    ];
    // Generate lucky numbers based on natal chart
    const luckyNumbers = [
        natalChart.sun.degree % 10 + 1,
        natalChart.moon.degree % 10 + 1,
        natalChart.rising.degree % 10 + 1,
        (natalChart.sun.degree + natalChart.moon.degree) % 10 + 1,
        (natalChart.mars?.degree || 10) % 10 + 1,
    ].filter((v, i, a) => a.indexOf(v) === i); // Unique numbers
    const forecast = {
        date: dateString,
        userId,
        overallTheme: llmForecast.overallTheme,
        overallThemeBg: llmForecast.overallThemeBg,
        mood,
        moodBg: mood,
        energy,
        transits: analyzedTransits,
        moonPhase: {
            phase: moonPhase.phase,
            phaseBg: moonPhase.phaseBg,
            illumination: moonPhase.illumination,
            sign: moonPhase.sign,
            signBg: moonPhase.signBg,
        },
        horoscope: {
            ...llmForecast.horoscope,
            luckyNumbers,
            powerHours,
        },
        recommendations: llmForecast.recommendations,
        recommendationsBg: llmForecast.recommendationsBg,
        generatedAt: new Date().toISOString(),
        cached: false,
    };
    // Persist to DB (survives server restarts and Redis flushes)
    await (0, forecast_cron_1.storeForecast)(userId, dateString, null, forecast);
    // Also warm Redis cache
    try {
        await redis_1.redisClient.setEx(cacheKey, FORECAST_CACHE_TTL, JSON.stringify(forecast));
    }
    catch (error) {
        console.warn('[Forecast] Cache write error:', error);
    }
    return forecast;
}
/**
 * Get daily forecast (from cache or generate)
 */
async function getDailyForecast(userId, birthData, userLanguage = 'bg', precomputedChart) {
    return generateDailyForecast(userId, birthData, userLanguage, precomputedChart);
}
/**
 * Generate weekly forecast
 */
async function generateWeeklyForecast(userId, birthData, userLanguage = 'bg', precomputedChart) {
    const weekStart = getWeekStartDateString();
    const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
    const cacheKey = `forecast:weekly:${userId}:${weekStart}`;
    // Try cache first
    try {
        const cached = await redis_1.redisClient.get(cacheKey);
        if (cached) {
            console.log(`[Forecast] Weekly forecast cache hit for user ${userId}`);
            return JSON.parse(cached);
        }
    }
    catch (error) {
        console.warn('[Forecast] Cache read error:', error);
    }
    // Get natal chart (use precomputed from DB if available, otherwise call API)
    const natalChart = precomputedChart ?? await (0, astrology_1.calculateNatalChart)(birthData);
    // Generate simplified weekly overview using LLM
    const chartSummary = `
Потребителска натална карта:
- Слънце: ${natalChart.sun.signBg} в ${natalChart.sun.house}ти дом
- Луна: ${natalChart.moon.signBg} в ${natalChart.moon.house}ти дом  
- Асцендент: ${natalChart.rising.signBg}

Седмица: ${weekStart} до ${weekEnd}
`;
    const systemPrompt = userLanguage === 'bg'
        ? `Ти си AstroLogAI, експертен AI астролог. Генерирай седмична прогноза за потребителя.

Винаги отговаряй на БЪЛГАРСКИ.

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
}`
        : `You are AstroLogAI. Generate a weekly forecast in JSON:`;
    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: chartSummary },
        ];
        const response = await (0, llm_1.chatCompletion)(messages, { temperature: 0.7, maxTokens: 1000 });
        // Parse the JSON response - extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }
        const parsed = JSON.parse(jsonMatch[0]);
        const weeklyForecast = {
            weekStart,
            weekEnd,
            overview: parsed.overview || 'Тази седмица носи интересни енергии и възможности за растеж.',
            overviewBg: parsed.overview || 'Тази седмица носи интересни енергии и възможности за растеж.',
            dailyBreakdown: parsed.dailyBreakdown?.map((d) => ({
                date: d.date || weekStart,
                dayName: d.dayName || 'Ден',
                dayNameBg: d.dayName || 'Ден',
                theme: d.theme || 'Баланс',
                themeBg: d.theme || 'Баланс',
                highlight: d.highlight || 'Хармоничен ден',
                highlightBg: d.highlight || 'Хармоничен ден',
            })) || [],
            majorTransits: parsed.majorTransits || [],
            bestDays: parsed.bestDays || {
                career: weekStart,
                love: new Date(new Date(weekStart).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                decisions: new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                selfCare: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            },
            generatedAt: new Date().toISOString(),
        };
        // Cache
        try {
            await redis_1.redisClient.setEx(cacheKey, WEEKLY_CACHE_TTL, JSON.stringify(weeklyForecast));
        }
        catch (error) {
            console.warn('[Forecast] Cache write error:', error);
        }
        return weeklyForecast;
    }
    catch (error) {
        console.error('[Forecast] Weekly LLM generation error:', error);
        // Fallback
        const weeklyForecast = {
            weekStart,
            weekEnd,
            overview: 'Тази седмица е време за преосмисляне и нови начала. Обърнете внимание на вътрешния си глас.',
            overviewBg: 'Тази седмица е време за преосмисляне и нови начала. Обърнете внимание на вътрешния си глас.',
            dailyBreakdown: [],
            majorTransits: [],
            bestDays: {
                career: weekStart,
                love: new Date(new Date(weekStart).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                decisions: new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                selfCare: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            },
            generatedAt: new Date().toISOString(),
        };
        return weeklyForecast;
    }
}
/**
 * Get weekly forecast
 */
async function getWeeklyForecast(userId, birthData, userLanguage = 'bg', precomputedChart) {
    return generateWeeklyForecast(userId, birthData, userLanguage, precomputedChart);
}
/**
 * Rewrite API text fields in the Oracle's voice using a short LLM call.
 * Preserves all astrological data (ratings, planet names, orbs, etc.).
 * Falls back to raw API text if LLM fails.
 */
async function rewriteInOracleVoice(raw) {
    const systemPrompt = `You are The Oracle — a mystical, precise astrologer. Rewrite only the text fields in your voice: poetic, profound, specific. RULES:
- Preserve ALL astrological specifics (planet names, aspects, house positions, orb values)
- Keep the EXACT JSON structure
- Only rewrite: overall_theme, life_areas[].title, life_areas[].prediction, planetary_influences[].description, moon.prediction, tips[]
- Do NOT change: ratings, keywords, area, planet, aspect_type, natal_planet, strength, orb, phase, sign, illumination
- Return ONLY valid JSON, no markdown fences`;
    const payload = {
        overall_theme: raw.overall_theme,
        life_areas: (raw.life_areas ?? []).map((a) => ({
            area: a.area, title: a.title, prediction: a.prediction,
            rating: a.rating, keywords: a.keywords,
        })),
        planetary_influences: (raw.planetary_influences ?? []).map((p) => ({
            planet: p.planet, aspect_type: p.aspect_type, description: p.description,
            strength: p.strength, natal_planet: p.natal_planet, orb: p.orb,
        })),
        moon: { phase: raw.moon?.phase, sign: raw.moon?.sign, prediction: raw.moon?.prediction, illumination: raw.moon?.illumination },
        tips: raw.tips ?? [],
    };
    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(payload) },
        ];
        const response = await (0, llm_1.chatCompletion)(messages, { temperature: 0.65, maxTokens: 1800 });
        const match = response.match(/\{[\s\S]*\}/);
        if (!match)
            throw new Error('No JSON in LLM response');
        return JSON.parse(match[0]);
    }
    catch (err) {
        console.warn('[Forecast] Oracle voice rewrite failed — using raw API text:', err);
        return raw; // fail open: raw text is still correct, just not in Oracle's voice
    }
}
/**
 * Get today's personal daily horoscope via SDK + Oracle voice rewrite.
 * Cached per user per day (24h TTL).
 */
async function getPersonalDailyHoroscope(userId, birthData) {
    const dateStr = getTodayDateString();
    // 1. Check DB first (written by nightly cron or previous on-demand call)
    const stored = await (0, forecast_cron_1.getStoredForecast)(userId, dateStr);
    if (stored?.horoscope) {
        console.log(`[Forecast] DB hit for horoscope, user ${userId}`);
        return { ...stored.horoscope, cached: true };
    }
    // 2. Fall back to Redis hot cache
    const cacheKey = `horoscope:personal:${userId}:${dateStr}`;
    try {
        const cached = await redis_1.redisClient.get(cacheKey);
        if (cached) {
            const h = JSON.parse(cached);
            h.cached = true;
            return h;
        }
    }
    catch { /* cache unavailable — proceed */ }
    const { AstrologyClient } = await Promise.resolve().then(() => __importStar(require('@astro-api/astroapi-typescript')));
    const client = new AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
    const raw = await client.horoscope.getPersonalDailyHoroscope({
        subject: {
            birth_data: {
                year: birthData.year, month: birthData.month, day: birthData.day,
                hour: birthData.hour, minute: birthData.minute, second: 0,
                latitude: birthData.latitude, longitude: birthData.longitude,
                timezone: birthData.timezone,
            },
        },
        date: dateStr,
        language: 'en',
    });
    const rewritten = await rewriteInOracleVoice(raw);
    const horoscope = {
        date: dateStr,
        overallTheme: rewritten.overall_theme ?? raw.overall_theme,
        overallRating: Math.min(5, Math.max(1, raw.overall_rating ?? 3)),
        lifeAreas: (rewritten.life_areas ?? raw.life_areas ?? []).map((a) => ({
            area: a.area,
            title: a.title,
            prediction: a.prediction,
            rating: Math.min(5, Math.max(1, a.rating ?? 3)),
            keywords: a.keywords ?? [],
        })),
        planetaryInfluences: (rewritten.planetary_influences ?? raw.planetary_influences ?? []).map((p) => ({
            planet: p.planet,
            aspectType: p.aspect_type,
            description: p.description,
            strength: Math.min(5, Math.max(1, p.strength ?? 3)),
            natalPlanet: p.natal_planet,
            orb: p.orb,
        })),
        moon: {
            phase: raw.moon?.phase ?? 'Unknown',
            sign: raw.moon?.sign ?? 'Unknown',
            prediction: rewritten.moon?.prediction ?? raw.moon?.prediction ?? '',
            illumination: raw.moon?.illumination ?? 0,
        },
        tips: rewritten.tips ?? raw.tips ?? [],
        cached: false,
    };
    // Persist to DB (survives server restarts and Redis flushes)
    await (0, forecast_cron_1.storeForecast)(userId, dateStr, horoscope, null);
    // Also warm Redis cache
    try {
        await redis_1.redisClient.setEx(cacheKey, 86400, JSON.stringify(horoscope));
    }
    catch { /* cache write failure is non-fatal */ }
    console.log(`[Forecast] Personal daily horoscope generated for user ${userId}`);
    return horoscope;
}
//# sourceMappingURL=forecast.js.map