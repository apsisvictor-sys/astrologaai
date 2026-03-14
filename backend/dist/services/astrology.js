"use strict";
/**
 * Astrology Service
 * US-06: Natal Chart Generation
 *
 * Integrates with astrology-api.io for chart calculations
 * Implements Redis caching with 24h TTL
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePositionBasedCacheKey = generatePositionBasedCacheKey;
exports.calculateNatalChart = calculateNatalChart;
exports.getCachedChart = getCachedChart;
exports.invalidateChartCache = invalidateChartCache;
exports.checkAstrologyApiHealth = checkAstrologyApiHealth;
// ============================================
// Constants
// ============================================
const ASTROLOGY_API_URL = process.env.ASTROLOGY_API_URL || 'https://api.astrology-api.io';
const ASTROLOGY_API_KEY = process.env.ASTROLOGY_API_KEY;
const CHART_CACHE_TTL = 2592000; // 30 days in seconds (updated from 24h)
const CHART_CACHE_TTL_LEGACY = 86400; // 24 hours for legacy cache keys
const CHART_CACHE_TTL_ASPECT = 7776000; // 90 days in seconds (2592000 * 3)
// ============================================
// Aspect Definitions for Caching
// ============================================
// Zodiac signs in correct order (0 = Aries, 11 = Pisces)
const ZODIAC_ORDER = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];
// Major aspects with their exact angles and maximum orbs
const MAJOR_ASPECTS = {
    conjunction: { angle: 0, maxOrb: 10 },
    opposition: { angle: 180, maxOrb: 10 },
    trine: { angle: 120, maxOrb: 8 },
    square: { angle: 90, maxOrb: 8 },
    sextile: { angle: 60, maxOrb: 6 },
};
// Planets to include in aspect calculation (for caching)
const ASPECT_PLANETS = [
    'sun', 'moon', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
];
// Planet symbols
const PLANET_SYMBOLS = {
    sun: '☉',
    moon: '☽',
    mercury: '☿',
    venus: '♀',
    mars: '♂',
    jupiter: '♃',
    saturn: '♄',
    uranus: '⛢',
    neptune: '♆',
    pluto: '♇',
    northNode: '☊',
    southNode: '☋',
    chiron: '⚷',
    lilith: '⚷',
    rising: 'ASC',
};
// Sign translations (English to Bulgarian)
const SIGN_TRANSLATIONS = {
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
// Sign abbreviations from v3 API (3-letter) → full name
const SIGN_ABBR_TO_FULL = {
    Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
    Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
    Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};
// Country name → ISO 2-letter code for v3 API
const COUNTRY_TO_CODE = {
    'Greece': 'GR', 'Bulgaria': 'BG', 'Germany': 'DE', 'France': 'FR',
    'United Kingdom': 'GB', 'UK': 'GB', 'Great Britain': 'GB',
    'United States': 'US', 'USA': 'US', 'Italy': 'IT', 'Spain': 'ES',
    'Russia': 'RU', 'Turkey': 'TR', 'Romania': 'RO', 'Serbia': 'RS',
    'North Macedonia': 'MK', 'Macedonia': 'MK', 'Albania': 'AL',
    'Croatia': 'HR', 'Bosnia and Herzegovina': 'BA', 'Bosnia': 'BA',
    'Montenegro': 'ME', 'Slovenia': 'SI', 'Austria': 'AT',
    'Netherlands': 'NL', 'Belgium': 'BE', 'Switzerland': 'CH',
    'Poland': 'PL', 'Czech Republic': 'CZ', 'Czechia': 'CZ',
    'Hungary': 'HU', 'Slovakia': 'SK', 'Ukraine': 'UA', 'Belarus': 'BY',
    'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI',
    'Portugal': 'PT', 'Canada': 'CA', 'Australia': 'AU',
    'China': 'CN', 'Japan': 'JP', 'India': 'IN', 'Brazil': 'BR',
    'Mexico': 'MX', 'Argentina': 'AR', 'South Africa': 'ZA',
    'Egypt': 'EG', 'Israel': 'IL', 'UAE': 'AE',
    'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA',
};
function parseLocationForV3(locationName) {
    const parts = locationName.split(',').map(p => p.trim());
    const city = parts[0] || locationName;
    const country = parts[parts.length - 1] || '';
    const countryCode = COUNTRY_TO_CODE[country];
    if (!countryCode) {
        throw new Error(`[Astrology] Unknown country "${country}" in locationName "${locationName}". Add it to COUNTRY_TO_CODE.`);
    }
    return { city, countryCode };
}
// Aspect translations (English to Bulgarian)
const ASPECT_TRANSLATIONS = {
    conjunction: 'съвпад',
    sextile: 'секстил',
    square: 'квадрат',
    trine: 'тригон',
    opposition: 'опозиция',
    quincunx: 'квинкункс',
    semisextile: 'полусекстил',
    semisquare: 'полуквадрат',
    sesquisquare: 'сескиквадрат',
};
// Aspect nature mapping
const ASPECT_NATURE = {
    conjunction: 'neutral',
    sextile: 'harmonious',
    square: 'challenging',
    trine: 'harmonious',
    opposition: 'challenging',
    quincunx: 'neutral',
    semisextile: 'harmonious',
    semisquare: 'challenging',
    sesquisquare: 'challenging',
};
// Element mapping
const SIGN_ELEMENTS = {
    Aries: 'fire',
    Leo: 'fire',
    Sagittarius: 'fire',
    Taurus: 'earth',
    Virgo: 'earth',
    Capricorn: 'earth',
    Gemini: 'air',
    Libra: 'air',
    Aquarius: 'air',
    Cancer: 'water',
    Scorpio: 'water',
    Pisces: 'water',
};
// Modality mapping
const SIGN_MODALITIES = {
    Aries: 'cardinal',
    Cancer: 'cardinal',
    Libra: 'cardinal',
    Capricorn: 'cardinal',
    Taurus: 'fixed',
    Leo: 'fixed',
    Scorpio: 'fixed',
    Aquarius: 'fixed',
    Gemini: 'mutable',
    Virgo: 'mutable',
    Sagittarius: 'mutable',
    Pisces: 'mutable',
};
// ============================================
// Cache Key Generation
// ============================================
/**
 * Legacy cache key based on exact birth data (backward compatibility)
 * Low cache hit rate - each minute creates a new cache entry
 */
function generateCacheKey(birthData) {
    const { year, month, day, hour, minute, latitude, longitude } = birthData;
    // Round coordinates to 4 decimal places to avoid cache misses from floating point differences
    const lat = latitude.toFixed(4);
    const lon = longitude.toFixed(4);
    return `natal_chart:${year}-${month}-${day}:${hour}:${minute}:${lat}:${lon}`;
}
/**
 * NEW: Position-based cache key for high cache hit rate
 * Groups charts with identical planetary positions regardless of birth minute
 * Format: Sun:Cap20|Moon:Leo12|Mer:Cap5|Ven:Pis18|...
 */
function generatePositionBasedCacheKey(chart) {
    // Planet abbreviation mapping
    const planetAbbr = {
        sun: 'Sun',
        moon: 'Moon',
        mercury: 'Mer',
        venus: 'Ven',
        mars: 'Mar',
        jupiter: 'Jup',
        saturn: 'Sat',
        uranus: 'Ura',
        neptune: 'Nep',
        pluto: 'Plu',
    };
    // Sign abbreviation mapping (3 letters)
    const signAbbr = {
        Aries: 'Ari',
        Taurus: 'Tau',
        Gemini: 'Gem',
        Cancer: 'Can',
        Leo: 'Leo',
        Virgo: 'Vir',
        Libra: 'Lib',
        Scorpio: 'Sco',
        Sagittarius: 'Sag',
        Capricorn: 'Cap',
        Aquarius: 'Aqu',
        Pisces: 'Pis',
    };
    // Build planet position parts
    const planetKeys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    const parts = [];
    planetKeys.forEach(planetKey => {
        const planet = chart[planetKey];
        if (planet) {
            const abbr = planetAbbr[planetKey] || planetKey.substring(0, 3);
            const sign = signAbbr[planet.sign] || planet.sign.substring(0, 3);
            const degree = Math.round(planet.degree); // Round to nearest degree
            parts.push(`${abbr}:${sign}${degree}`);
        }
    });
    // Add Ascendant (Rising)
    if (chart.rising) {
        const sign = signAbbr[chart.rising.sign] || chart.rising.sign.substring(0, 3);
        const degree = Math.round(chart.rising.degree);
        parts.push(`Asc:${sign}${degree}`);
    }
    // Add Midheaven (MC) - typically in house 10
    const mcHouse = chart.houses.find(h => h.number === 10);
    if (mcHouse) {
        const sign = signAbbr[mcHouse.sign] || mcHouse.sign.substring(0, 3);
        const degree = Math.round(mcHouse.degree % 30); // Degree within sign
        parts.push(`MC:${sign}${degree}`);
    }
    return `chart_pos:${parts.join('|')}`;
}
function computeAspects(chart) {
    const aspects = [];
    // Get planet longitudes (absolute degrees in zodiac, 0-360°)
    const getLongitude = (planet) => {
        // Convert sign + degree to absolute longitude
        const signIndex = ZODIAC_ORDER.indexOf(planet.sign);
        return signIndex >= 0 ? (signIndex * 30) + planet.degree : planet.degree;
    };
    // Build map of planet positions
    const planetPositions = {};
    ASPECT_PLANETS.forEach(planetKey => {
        const planet = chart[planetKey];
        if (planet) {
            planetPositions[planetKey] = getLongitude(planet);
        }
    });
    // Add Ascendant (Rising)
    if (chart.rising) {
        planetPositions['Ascendant'] = getLongitude(chart.rising);
    }
    // Add Midheaven (from house 10)
    const mcHouse = chart.houses.find(h => h.number === 10);
    if (mcHouse) {
        planetPositions['Midheaven'] = getLongitude(mcHouse);
    }
    // Calculate aspects between all pairs
    const planetList = Object.keys(planetPositions);
    for (let i = 0; i < planetList.length; i++) {
        for (let j = i + 1; j < planetList.length; j++) {
            const p1 = planetList[i];
            const p2 = planetList[j];
            const lon1 = planetPositions[p1];
            const lon2 = planetPositions[p2];
            // Calculate angular difference
            let diff = Math.abs(lon1 - lon2);
            if (diff > 180)
                diff = 360 - diff;
            // Check each major aspect
            for (const [aspectType, { angle, maxOrb }] of Object.entries(MAJOR_ASPECTS)) {
                const orb = Math.abs(diff - angle);
                if (orb <= maxOrb) {
                    // Round orb to nearest whole degree (orb bucket)
                    const orbBucket = Math.round(orb);
                    aspects.push({
                        planet1: p1 < p2 ? p1 : p2, // Sort planet names for consistency
                        planet2: p1 < p2 ? p2 : p1,
                        aspectType,
                        orb,
                        orbBucket,
                    });
                    break; // Only count the closest aspect
                }
            }
        }
    }
    return aspects;
}
/**
 * NEW: Generate aspect-based cache key using 1° orb buckets
 * Format: natal_aspect_v1:{SHA256(aspect_signature)}
 * Where aspect_signature = sorted list of: planet1|planet2|aspect_type|orb_bucket
 */
async function generateAspectCacheKey(chart) {
    const aspects = computeAspects(chart);
    // Sort aspects for consistent ordering
    aspects.sort((a, b) => {
        if (a.planet1 !== b.planet1)
            return a.planet1.localeCompare(b.planet1);
        if (a.planet2 !== b.planet2)
            return a.planet2.localeCompare(b.planet2);
        return a.aspectType.localeCompare(b.aspectType);
    });
    // Create signature string
    const signature = aspects
        .map(a => `${a.planet1}|${a.planet2}|${a.aspectType}|${a.orbBucket}`)
        .join(';');
    // Hash with SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(signature);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `natal_aspect_v1:${hashHex}`;
}
// ============================================
// API Response Transformation
// ============================================
function transformPlanetData(data, planetName) {
    const planetData = data[planetName] || data.planets?.[planetName];
    if (!planetData) {
        throw new Error(`Missing data for planet: ${planetName}`);
    }
    const sign = planetData.sign || planetData.zodiac_sign || 'Unknown';
    return {
        name: planetName,
        sign,
        signBg: SIGN_TRANSLATIONS[sign] || sign,
        degree: parseFloat(planetData.degree || planetData.position || 0),
        house: parseInt(planetData.house || 1, 10),
        retrograde: planetData.retrograde === true || planetData.is_retrograde === true,
        symbol: PLANET_SYMBOLS[planetName] || '',
    };
}
function transformHousesData(data) {
    const houses = data.houses || data.house_cusps || [];
    return houses.map((house, index) => {
        const sign = house.sign || house.zodiac_sign || 'Unknown';
        return {
            number: index + 1,
            sign,
            signBg: SIGN_TRANSLATIONS[sign] || sign,
            degree: parseFloat(house.degree || house.position || house.cusp || 0),
        };
    });
}
function transformAspectsData(data) {
    const aspects = data.aspects || [];
    return aspects.map((aspect) => {
        const aspectType = aspect.aspect_type || aspect.type || aspect.name || 'conjunction';
        return {
            planet1: aspect.planet1 || aspect.planet_1 || '',
            planet2: aspect.planet2 || aspect.planet_2 || '',
            aspect: aspectType,
            aspectBg: ASPECT_TRANSLATIONS[aspectType] || aspectType,
            orb: parseFloat(aspect.orb || aspect.orb_degree || 0),
            nature: ASPECT_NATURE[aspectType] || 'neutral',
        };
    }).filter((a) => a.planet1 && a.planet2);
}
function calculateElementDistribution(planets) {
    const elements = { fire: 0, earth: 0, air: 0, water: 0 };
    Object.values(planets).forEach((planet) => {
        const element = SIGN_ELEMENTS[planet.sign];
        if (element) {
            elements[element]++;
        }
    });
    return elements;
}
function calculateModalityDistribution(planets) {
    const modalities = { cardinal: 0, fixed: 0, mutable: 0 };
    Object.values(planets).forEach((planet) => {
        const modality = SIGN_MODALITIES[planet.sign];
        if (modality) {
            modalities[modality]++;
        }
    });
    return modalities;
}
// ============================================
// Main Service Functions
// ============================================
/**
 * Calculate natal chart from birth data
 * Uses Redis caching with 3-layer strategy:
 * - Layer 1: Aspect-pattern cache (90-day TTL) - highest hit rate
 * - Layer 2: Position-based cache (30-day TTL) - medium hit rate
 * - Layer 3: Legacy exact birth data (24h TTL) - backward compatibility
 */
async function calculateNatalChart(birthData) {
    // Validate API key
    if (!process.env.ASTROLOGY_API_KEY) {
        throw new Error('[Astrology] ASTROLOGY_API_KEY is not configured — cannot calculate chart');
    }
    // Validate location: must have lat/lon + timezone (preferred) or locationName
    const hasCoords = birthData.latitude != null && birthData.longitude != null && !!birthData.timezone;
    const hasLocationName = !!birthData.locationName;
    if (!hasCoords && !hasLocationName) {
        throw new Error('[Astrology] Birth location required — provide latitude, longitude, and timezone (or locationName)');
    }
    // Build birth_data payload: prefer coordinates (always accurate), fall back to city name
    let birthDataPayload;
    if (hasCoords) {
        birthDataPayload = {
            year: birthData.year,
            month: birthData.month,
            day: birthData.day,
            hour: birthData.hour,
            minute: birthData.minute,
            second: 0,
            latitude: birthData.latitude,
            longitude: birthData.longitude,
            timezone: birthData.timezone,
        };
    }
    else {
        // locationName path: parse "City, Country" — throw if country is unrecognised
        const parsed = parseLocationForV3(birthData.locationName);
        birthDataPayload = {
            year: birthData.year,
            month: birthData.month,
            day: birthData.day,
            hour: birthData.hour,
            minute: birthData.minute,
            second: 0,
            city: parsed.city,
            country_code: parsed.countryCode,
        };
    }
    // Call astrology-api.io v3
    try {
        const apiUrl = process.env.ASTROLOGY_API_URL || 'https://api.astrology-api.io';
        const apiKey = process.env.ASTROLOGY_API_KEY;
        const response = await fetch(`${apiUrl}/api/v3/charts/natal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'AstrologaAI/1.0',
            },
            body: JSON.stringify({
                subject: {
                    name: 'subject',
                    birth_data: birthDataPayload,
                },
                options: {
                    house_system: 'P',
                    zodiac_type: 'Tropic',
                    active_points: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'True_Node', 'Chiron'],
                    precision: 4,
                },
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Astrology] API error: ${response.status} - ${errorText}`);
            throw new Error(`Astrology API error: ${response.status}`);
        }
        const apiData = await response.json();
        // Build planet lookup from v3 planetary_positions array
        const planetLookup = {};
        for (const p of (apiData.chart_data?.planetary_positions || [])) {
            planetLookup[p.name] = p;
        }
        // Map v3 API planet name → internal key
        const API_NAME_TO_KEY = {
            Sun: 'sun', Moon: 'moon', Mercury: 'mercury', Venus: 'venus',
            Mars: 'mars', Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus',
            Neptune: 'neptune', Pluto: 'pluto', True_Node: 'northNode', Chiron: 'chiron',
        };
        // Transform a single planet from v3 format
        const transformV3Planet = (p, key) => {
            const sign = SIGN_ABBR_TO_FULL[p.sign] || p.sign;
            return {
                name: key,
                sign,
                signBg: SIGN_TRANSLATIONS[sign] || sign,
                degree: parseFloat(p.degree ?? 0),
                house: parseInt(p.house ?? 1, 10),
                retrograde: p.is_retrograde === true,
                symbol: PLANET_SYMBOLS[key] || '',
            };
        };
        // Extract ascendant (rising) from subject_data
        const ascData = apiData.subject_data?.ascendant;
        const ascSign = SIGN_ABBR_TO_FULL[ascData?.sign] || ascData?.sign || 'Aries';
        const rising = {
            name: 'rising',
            sign: ascSign,
            signBg: SIGN_TRANSLATIONS[ascSign] || ascSign,
            degree: parseFloat(ascData?.position ?? 0),
            house: 1,
            retrograde: false,
            symbol: 'ASC',
        };
        // Build planets map
        const planets = { rising };
        for (const [apiName, key] of Object.entries(API_NAME_TO_KEY)) {
            const p = planetLookup[apiName];
            if (p) {
                planets[key] = transformV3Planet(p, key);
            }
        }
        // Compute south node as opposite of north node (180° away)
        const nnData = planetLookup['True_Node'];
        if (nnData) {
            const nnAbs = parseFloat(nnData.absolute_longitude ?? 0);
            const snAbs = (nnAbs + 180) % 360;
            const snSignIdx = Math.floor(snAbs / 30);
            const snSign = ZODIAC_ORDER[snSignIdx] || 'Libra';
            const snDegree = snAbs % 30;
            const nnHouse = parseInt(nnData.house ?? 1, 10);
            const snHouse = ((nnHouse - 1 + 6) % 12) + 1;
            planets.southNode = {
                name: 'southNode',
                sign: snSign,
                signBg: SIGN_TRANSLATIONS[snSign] || snSign,
                degree: snDegree,
                house: snHouse,
                retrograde: true,
                symbol: '☋',
            };
        }
        else {
            planets.southNode = {
                name: 'southNode', sign: 'Libra', signBg: 'Везни',
                degree: 0, house: 7, retrograde: true, symbol: '☋',
            };
        }
        // Transform houses from v3 house_cusps array
        const houses = (apiData.chart_data?.house_cusps || []).map((h) => {
            const sign = SIGN_ABBR_TO_FULL[h.sign] || h.sign;
            return {
                number: parseInt(h.house, 10),
                sign,
                signBg: SIGN_TRANSLATIONS[sign] || sign,
                degree: parseFloat(h.degree ?? 0),
            };
        });
        // Transform aspects from v3 aspects array
        const aspects = (apiData.chart_data?.aspects || []).map((a) => {
            const aspectType = (a.aspect_type || 'conjunction').toLowerCase();
            const p1 = (a.point1 || '').toLowerCase().replace('true_node', 'northNode');
            const p2 = (a.point2 || '').toLowerCase().replace('true_node', 'northNode');
            return {
                planet1: p1,
                planet2: p2,
                aspect: aspectType,
                aspectBg: ASPECT_TRANSLATIONS[aspectType] || aspectType,
                orb: parseFloat(a.orb ?? 0),
                nature: ASPECT_NATURE[aspectType] || 'neutral',
            };
        }).filter((a) => a.planet1 && a.planet2);
        const chart = {
            sun: planets.sun,
            moon: planets.moon,
            rising: planets.rising,
            mercury: planets.mercury,
            venus: planets.venus,
            mars: planets.mars,
            jupiter: planets.jupiter,
            saturn: planets.saturn,
            uranus: planets.uranus,
            neptune: planets.neptune,
            pluto: planets.pluto,
            northNode: planets.northNode,
            southNode: planets.southNode,
            chiron: planets.chiron,
            houses,
            aspects,
            elements: calculateElementDistribution(planets),
            modalities: calculateModalityDistribution(planets),
            calculatedAt: new Date().toISOString(),
            source: 'astrology-api.io-v3',
        };
        return chart;
    }
    catch (error) {
        console.error('[Astrology] API call failed:', error);
        throw error;
    }
}
/** Redis cache removed — charts are stored in BirthChart table */
async function getCachedChart(_birthData) {
    return null;
}
/** Redis cache removed — no-op */
async function invalidateChartCache(_birthData) { }
/**
 * Check if astrology API is available
 */
async function checkAstrologyApiHealth() {
    if (!ASTROLOGY_API_KEY) {
        return false;
    }
    try {
        const response = await fetch(`${ASTROLOGY_API_URL}/health`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ASTROLOGY_API_KEY}`,
            },
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=astrology.js.map