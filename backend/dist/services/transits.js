"use strict";
/**
 * Transit Calculation Service
 * US-15: Daily Forecast - Transit calculations
 *
 * Calculates current planetary positions and their aspects to natal chart
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTransitsToNatal = calculateTransitsToNatal;
const redis_1 = require("../utils/redis");
// ============================================
// Constants
// ============================================
// Planet names in Bulgarian
const PLANET_BG = {
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
};
// SDK sign abbreviations → full names
const SIGN_ABBREV_TO_FULL = {
    Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
    Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
    Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};
// SDK planet names → internal names
const PLANET_SDK_TO_INTERNAL = {
    Sun: 'sun', Moon: 'moon', Mercury: 'mercury', Venus: 'venus',
    Mars: 'mars', Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus',
    Neptune: 'neptune', Pluto: 'pluto', True_Node: 'northNode',
};
// Sign translations
const SIGN_BG = {
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
// Aspect translations
const ASPECT_BG = {
    conjunction: 'съвпад',
    sextile: 'секстил',
    square: 'квадрат',
    trine: 'тригон',
    opposition: 'опозиция',
};
// Aspect influence
const ASPECT_INFLUENCE = {
    conjunction: 'neutral',
    sextile: 'positive',
    square: 'challenging',
    trine: 'positive',
    opposition: 'challenging',
};
// Aspect orbs (allowed deviation in degrees)
const ASPECT_ORBS = {
    conjunction: 10,
    sextile: 6,
    square: 8,
    trine: 8,
    opposition: 10,
};
// Aspect angles
const ASPECT_ANGLES = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
};
// Moon phases in Bulgarian
const MOON_PHASE_BG = {
    'New Moon': 'Новолуние',
    'Waxing Crescent': 'Млад месец',
    'First Quarter': 'Първа четвърт',
    'Waxing Gibbous': 'Растяща луна',
    'Full Moon': 'Пълнолуние',
    'Waning Gibbous': 'Намаляваща луна',
    'Last Quarter': 'Последна четвърт',
    'Waning Crescent': 'Стар месец',
};
// Aspect descriptions for transit-to-natal interpretations
const ASPECT_DESCRIPTIONS = {
    'sun-conjunction': 'Енергиен пик, фокус върху идентичността',
    'sun-sextile': 'Хармония и възможности за растеж',
    'sun-square': 'Напрежение и предизвикателства, изискващи действие',
    'sun-trine': 'Плавен поток от енергия и креативност',
    'sun-opposition': 'Полярност, балансиране на противоположни сили',
    'moon-conjunction': 'Емоционална интензивност, вътрешни чувства',
    'moon-sextile': 'Емоционална хармония и интуитивност',
    'moon-square': 'Емоционално напрежение, вътрешен конфликт',
    'moon-trine': 'Емоционален баланс и вътрешен мир',
    'moon-opposition': 'Емоционални полярности, нужда от баланс',
    'mercury-conjunction': 'Ментална яснота и комуникация',
    'mercury-sextile': 'Лесна комуникация и нови идеи',
    'mercury-square': 'Ментално напрежение, недоразумения',
    'mercury-trine': 'Плавна комуникация и интелектуален растеж',
    'mercury-opposition': 'Противоречиви мисли, нужда от обективност',
    'venus-conjunction': 'Любов, красота, привлекателност',
    'venus-sextile': 'Хармония в отношенията, творчество',
    'venus-square': 'Напрежение в отношенията, ценности',
    'venus-trine': 'Романтика, удоволствие, хармония',
    'venus-opposition': 'Взаимни компромиси, балансиране на нужди',
    'mars-conjunction': 'Действие, енергия, увереност',
    'mars-sextile': 'Продуктивна енергия, инициатива',
    'mars-square': 'Конфликти, нетърпение, напрежение',
    'mars-trine': 'Плавна енергия, увереност в действията',
    'mars-opposition': 'Противостоящи сили, нужда от контрол',
    'jupiter-conjunction': 'Разширение, късмет, растеж',
    'jupiter-sextile': 'Възможности, оптимизъм, успех',
    'jupiter-square': 'Прекалено разширяване, нужда от умереност',
    'jupiter-trine': 'Благословии, късмет, духовен растеж',
    'jupiter-opposition': 'Прекомерност, нужда от баланс',
    'saturn-conjunction': 'Отговорност, ограничения, структуриране',
    'saturn-sextile': 'Дисциплина, търпение, практичност',
    'saturn-square': 'Препятствия, ограничения, изпитания',
    'saturn-trine': 'Стабилност, постижения, дългосрочен успех',
    'saturn-opposition': 'Отговорности, нужда от баланс',
    'uranus-conjunction': 'Внезапни промени, пробуждане, свобода',
    'uranus-sextile': 'Интуитивни проблясъци, иновации',
    'uranus-square': 'Неочаквани промени, напрежение, бунт',
    'uranus-trine': 'Творческа свобода, проблясъци, иновации',
    'uranus-opposition': 'Внезапни обрати, нужда от гъвкавост',
    'neptune-conjunction': 'Духовност, илюзии, въображение',
    'neptune-sextile': 'Интуиция, творчество, духовност',
    'neptune-square': 'Заблуди, объркване, ескапизъм',
    'neptune-trine': 'Вдъхновение, духовен растеж, креативност',
    'neptune-opposition': 'Илюзии, нужда от яснота',
    'pluto-conjunction': 'Трансформация, власт, дълбоки промени',
    'pluto-sextile': 'Лична трансформация, скрита сила',
    'pluto-square': 'Властови борби, принудителни промени',
    'pluto-trine': 'Емптична трансформация, регенерация',
    'pluto-opposition': 'Кризи, нужда от освобождаване',
};
// ============================================
// Helper Functions
// ============================================
/**
 * Calculate aspect between two planetary positions
 */
function calculateAspect(degree1, degree2) {
    let diff = Math.abs(degree1 - degree2);
    if (diff > 180)
        diff = 360 - diff;
    for (const [aspect, angle] of Object.entries(ASPECT_ANGLES)) {
        const orb = Math.abs(diff - angle);
        if (orb <= ASPECT_ORBS[aspect]) {
            return { aspect, orb };
        }
    }
    return null;
}
// ============================================
// Main Service Functions
// ============================================
/**
 * Derive moon phase from sky positions already fetched from the SDK.
 * Uses the Sun-Moon angle — no extra API call needed.
 */
function deriveMoonPhaseFromPositions(skyPositions) {
    const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const PHASE_NAMES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
        'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    const sun = skyPositions.find(p => p.planet === 'sun');
    const moon = skyPositions.find(p => p.planet === 'moon');
    if (!sun || !moon) {
        throw new Error('[Transits] Cannot derive moon phase: Sun or Moon missing from sky positions');
    }
    const sunLon = SIGNS.indexOf(sun.sign) * 30 + sun.degree;
    const moonLon = SIGNS.indexOf(moon.sign) * 30 + moon.degree;
    const angle = ((moonLon - sunLon) + 360) % 360;
    const idx = Math.min(Math.floor(angle / 45), 7);
    const phaseName = PHASE_NAMES[idx];
    return {
        phase: phaseName,
        phaseBg: MOON_PHASE_BG[phaseName] || phaseName,
        illumination: Math.round((1 - Math.cos(angle * Math.PI / 180)) / 2 * 100),
        moonSign: moon.sign,
        moonSignBg: moon.signBg,
    };
}
/**
 * Calculate aspects between transits and natal chart
 */
function calculateTransitsToNatal(transits, natalChart) {
    const aspects = [];
    // Extract natal planet positions from chart
    const natalPlanets = {};
    // Handle both wrapped { chartData: {...} } and raw { sun: {...}, ... } shapes
    const chartData = natalChart?.chartData ?? natalChart;
    if (chartData && typeof chartData === 'object') {
        const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
        planets.forEach(planet => {
            if (chartData[planet]) {
                natalPlanets[planet] = {
                    sign: chartData[planet].sign,
                    degree: chartData[planet].degree,
                };
            }
        });
    }
    // Calculate aspects for each transit planet to each natal planet
    transits.forEach(transit => {
        Object.entries(natalPlanets).forEach(([natalPlanet, natalPos]) => {
            // Convert to absolute degrees (sign position * 30 + degree in sign)
            const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
            const transitAbsolute = signs.indexOf(transit.sign) * 30 + transit.degree;
            const natalAbsolute = signs.indexOf(natalPos.sign) * 30 + natalPos.degree;
            const aspectData = calculateAspect(transitAbsolute, natalAbsolute);
            if (aspectData) {
                const key = `${transit.planet}-${aspectData.aspect}`;
                const description = ASPECT_DESCRIPTIONS[key] ||
                    `${PLANET_BG[transit.planet]} ${ASPECT_BG[aspectData.aspect]} ${PLANET_BG[natalPlanet]}`;
                aspects.push({
                    transitPlanet: transit.planet,
                    transitPlanetBg: PLANET_BG[transit.planet] || transit.planet,
                    natalPlanet,
                    natalPlanetBg: PLANET_BG[natalPlanet] || natalPlanet,
                    aspect: aspectData.aspect,
                    aspectBg: ASPECT_BG[aspectData.aspect] || aspectData.aspect,
                    orb: Math.round(aspectData.orb * 10) / 10,
                    influence: ASPECT_INFLUENCE[aspectData.aspect],
                    description,
                });
            }
        });
    });
    // Sort by orb (tightest aspects first)
    return aspects.sort((a, b) => a.orb - b.orb);
}
/**
 * Get active transit-to-natal aspects for a user's chart.
 */
async function getActiveTransitsForUser(natalChart) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    // Fetch real sky positions via SDK — one call per calendar day, shared across all users.
    // Throws on API failure — no silent fallback to approximate data.
    const cacheKey = `transits:global:${dateStr}`;
    let skyPositions;
    const cached = await redis_1.redisClient.get(cacheKey);
    if (cached) {
        skyPositions = JSON.parse(cached);
    } else {
        const { AstrologyClient } = await Promise.resolve().then(() => require('@astro-api/astroapi-typescript'));
        const client = new AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
        const [year, month, day] = dateStr.split('-').map(Number);
        const response = await client.data.getGlobalPositions({
            year, month, day, hour: 12, minute: 0, second: 0,
            options: {
                active_points: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
                    'Uranus', 'Neptune', 'Pluto', 'True_Node'],
                zodiac_type: 'Tropic',
            },
        });
        skyPositions = response.positions.map((p) => {
            const internalName = PLANET_SDK_TO_INTERNAL[p.name] || p.name.toLowerCase();
            const fullSign = SIGN_ABBREV_TO_FULL[p.sign] || p.sign;
            return {
                planet: internalName,
                planetBg: PLANET_BG[internalName] || p.name,
                sign: fullSign,
                signBg: SIGN_BG[fullSign] || p.sign,
                degree: Math.round((p.degree ?? 0) * 10) / 10,
                retrograde: p.is_retrograde ?? false,
            };
        });
        // Cache for 24 hours — one API call per day for all users
        await redis_1.redisClient.setEx(cacheKey, 86400, JSON.stringify(skyPositions));
    }
    const aspectsToNatal = calculateTransitsToNatal(skyPositions, natalChart);
    const moonPhase = deriveMoonPhaseFromPositions(skyPositions);
    return {
        skyPositions,
        aspectsToNatal,
        moonPhase,
        generatedAt: new Date().toISOString(),
    };
}
exports.getActiveTransitsForUser = getActiveTransitsForUser;
// House activation math
const SIGN_TO_LONGITUDE = {
    Aries: 0, Taurus: 30, Gemini: 60, Cancer: 90, Leo: 120, Virgo: 150,
    Libra: 180, Scorpio: 210, Sagittarius: 240, Capricorn: 270, Aquarius: 300, Pisces: 330,
};
function signDegreeToLongitude(sign, degree) {
    return (SIGN_TO_LONGITUDE[sign] ?? 0) + degree;
}
function getHouseForLongitude(longitude, cuspLongitudes) {
    for (let i = 0; i < 12; i++) {
        const start = cuspLongitudes[i];
        const end = cuspLongitudes[(i + 1) % 12];
        if (end > start) {
            if (longitude >= start && longitude < end) return i + 1;
        } else {
            if (longitude >= start || longitude < end) return i + 1;
        }
    }
    return 1;
}
function computeTransitHouses(skyPositions, natalHouses) {
    const sortedCusps = [...natalHouses].sort((a, b) => a.number - b.number);
    const cuspLongitudes = sortedCusps.map(h => signDegreeToLongitude(h.sign, h.degree));
    const result = {};
    for (const pos of skyPositions) {
        const lon = signDegreeToLongitude(pos.sign, pos.degree);
        result[pos.planet] = getHouseForLongitude(lon, cuspLongitudes);
    }
    return result;
}
exports.computeTransitHouses = computeTransitHouses;
//# sourceMappingURL=transits.js.map