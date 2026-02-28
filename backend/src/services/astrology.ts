/**
 * Astrology Service
 * US-06: Natal Chart Generation
 * 
 * Integrates with astrology-api.io for chart calculations
 * Implements Redis caching with 24h TTL
 */

import { redisClient } from '../utils/redis';

// ============================================
// Types
// ============================================

export interface BirthDataInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface PlanetPosition {
  name: string;
  sign: string;
  signBg: string; // Bulgarian translation
  degree: number;
  house: number;
  retrograde: boolean;
  symbol: string;
}

export interface HouseCusp {
  number: number;
  sign: string;
  signBg: string;
  degree: number;
}

export interface Aspect {
  planet1: string;
  planet2: string;
  aspect: string;
  aspectBg: string;
  orb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
}

export interface NatalChart {
  sun: PlanetPosition;
  moon: PlanetPosition;
  rising: PlanetPosition;
  mercury: PlanetPosition;
  venus: PlanetPosition;
  mars: PlanetPosition;
  jupiter: PlanetPosition;
  saturn: PlanetPosition;
  uranus: PlanetPosition;
  neptune: PlanetPosition;
  pluto: PlanetPosition;
  northNode: PlanetPosition;
  southNode: PlanetPosition;
  chiron: PlanetPosition;
  lilith?: PlanetPosition;
  houses: HouseCusp[];
  aspects: Aspect[];
  elements: {
    fire: number;
    earth: number;
    air: number;
    water: number;
  };
  modalities: {
    cardinal: number;
    fixed: number;
    mutable: number;
  };
  calculatedAt: string;
  source: string;
}

// ============================================
// Constants
// ============================================

const ASTROLOGY_API_URL = process.env.ASTROLOGY_API_URL || 'https://json.astrology-api.io/v1';
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
const MAJOR_ASPECTS: Record<string, { angle: number; maxOrb: number }> = {
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
const PLANET_SYMBOLS: Record<string, string> = {
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
const SIGN_TRANSLATIONS: Record<string, string> = {
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

// Aspect translations (English to Bulgarian)
const ASPECT_TRANSLATIONS: Record<string, string> = {
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
const ASPECT_NATURE: Record<string, 'harmonious' | 'challenging' | 'neutral'> = {
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
const SIGN_ELEMENTS: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
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
const SIGN_MODALITIES: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
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
function generateCacheKey(birthData: BirthDataInput): string {
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
function generatePositionBasedCacheKey(chart: NatalChart): string {
  // Planet abbreviation mapping
  const planetAbbr: Record<string, string> = {
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
  const signAbbr: Record<string, string> = {
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
  const parts: string[] = [];

  planetKeys.forEach(planetKey => {
    const planet = chart[planetKey as keyof NatalChart] as PlanetPosition;
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

/**
 * NEW: Compute aspects between planets for aspect-based caching
 * Returns a list of aspects with their types and orbs
 */
interface ComputedAspect {
  planet1: string;
  planet2: string;
  aspectType: string;
  orb: number;
  orbBucket: number;
}

function computeAspects(chart: NatalChart): ComputedAspect[] {
  const aspects: ComputedAspect[] = [];
  
  // Get planet longitudes (absolute degrees in zodiac, 0-360°)
  const getLongitude = (planet: PlanetPosition): number => {
    // Convert sign + degree to absolute longitude
    const signIndex = ZODIAC_ORDER.indexOf(planet.sign);
    return signIndex >= 0 ? (signIndex * 30) + planet.degree : planet.degree;
  };
  
  // Build map of planet positions
  const planetPositions: Record<string, number> = {};
  
  ASPECT_PLANETS.forEach(planetKey => {
    const planet = chart[planetKey as keyof NatalChart] as PlanetPosition;
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
    planetPositions['Midheaven'] = getLongitude(mcHouse as any);
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
      if (diff > 180) diff = 360 - diff;
      
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
async function generateAspectCacheKey(chart: NatalChart): Promise<string> {
  const aspects = computeAspects(chart);
  
  // Sort aspects for consistent ordering
  aspects.sort((a, b) => {
    if (a.planet1 !== b.planet1) return a.planet1.localeCompare(b.planet1);
    if (a.planet2 !== b.planet2) return a.planet2.localeCompare(b.planet2);
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

function transformPlanetData(data: any, planetName: string): PlanetPosition {
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

function transformHousesData(data: any): HouseCusp[] {
  const houses = data.houses || data.house_cusps || [];
  return houses.map((house: any, index: number) => {
    const sign = house.sign || house.zodiac_sign || 'Unknown';
    return {
      number: index + 1,
      sign,
      signBg: SIGN_TRANSLATIONS[sign] || sign,
      degree: parseFloat(house.degree || house.position || house.cusp || 0),
    };
  });
}

function transformAspectsData(data: any): Aspect[] {
  const aspects = data.aspects || [];
  return aspects.map((aspect: any) => {
    const aspectType = aspect.aspect_type || aspect.type || aspect.name || 'conjunction';
    return {
      planet1: aspect.planet1 || aspect.planet_1 || '',
      planet2: aspect.planet2 || aspect.planet_2 || '',
      aspect: aspectType,
      aspectBg: ASPECT_TRANSLATIONS[aspectType] || aspectType,
      orb: parseFloat(aspect.orb || aspect.orb_degree || 0),
      nature: ASPECT_NATURE[aspectType] || 'neutral',
    };
  }).filter((a: Aspect) => a.planet1 && a.planet2);
}

function calculateElementDistribution(planets: Record<string, PlanetPosition>): { fire: number; earth: number; air: number; water: number } {
  const elements = { fire: 0, earth: 0, air: 0, water: 0 };
  
  Object.values(planets).forEach((planet) => {
    const element = SIGN_ELEMENTS[planet.sign];
    if (element) {
      elements[element]++;
    }
  });
  
  return elements;
}

function calculateModalityDistribution(planets: Record<string, PlanetPosition>): { cardinal: number; fixed: number; mutable: number } {
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
export async function calculateNatalChart(birthData: BirthDataInput): Promise<NatalChart> {
  // Check if API key is configured
  if (!ASTROLOGY_API_KEY) {
    console.warn('[Astrology] No API key configured, using fallback calculation');
    return generateFallbackChart(birthData);
  }

  const legacyCacheKey = generateCacheKey(birthData);

  // Try Layer 3: Legacy cache first (backward compatibility, fastest lookup)
  try {
    const cached = await redisClient.get(legacyCacheKey);
    if (cached) {
      console.log(`[Astrology] Cache hit (Layer 3 - legacy) for ${legacyCacheKey}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('[Astrology] Cache read error:', error);
  }

  // Call astrology-api.io
  try {
    const response = await fetch(`${ASTROLOGY_API_URL}/natal-chart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ASTROLOGY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year: birthData.year,
        month: birthData.month,
        day: birthData.day,
        hour: birthData.hour,
        minute: birthData.minute,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone || 'UTC',
        house_system: 'placidus',
        zodiac_type: 'tropical',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Astrology] API error: ${response.status} - ${errorText}`);
      throw new Error(`Astrology API error: ${response.status}`);
    }

    const apiData = await response.json();
    
    // Transform API response to our format
    const planets: Record<string, PlanetPosition> = {
      sun: transformPlanetData(apiData, 'sun'),
      moon: transformPlanetData(apiData, 'moon'),
      rising: transformPlanetData(apiData, 'rising'),
      mercury: transformPlanetData(apiData, 'mercury'),
      venus: transformPlanetData(apiData, 'venus'),
      mars: transformPlanetData(apiData, 'mars'),
      jupiter: transformPlanetData(apiData, 'jupiter'),
      saturn: transformPlanetData(apiData, 'saturn'),
      uranus: transformPlanetData(apiData, 'uranus'),
      neptune: transformPlanetData(apiData, 'neptune'),
      pluto: transformPlanetData(apiData, 'pluto'),
      northNode: transformPlanetData(apiData, 'north_node'),
      southNode: transformPlanetData(apiData, 'south_node'),
      chiron: transformPlanetData(apiData, 'chiron'),
    };

    // Try to get lilith if available
    try {
      planets.lilith = transformPlanetData(apiData, 'lilith');
    } catch {
      // Lilith is optional
    }

    const chart: NatalChart = {
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
      lilith: planets.lilith,
      houses: transformHousesData(apiData),
      aspects: transformAspectsData(apiData),
      elements: calculateElementDistribution(planets),
      modalities: calculateModalityDistribution(planets),
      calculatedAt: new Date().toISOString(),
      source: 'astrology-api.io',
    };

    // ========================================
    // 3-Layer Caching Strategy
    // ========================================

    // Layer 1: Aspect-pattern cache (90-day TTL) - highest cache hit rate
    try {
      const aspectCacheKey = await generateAspectCacheKey(chart);
      await redisClient.setEx(aspectCacheKey, CHART_CACHE_TTL_ASPECT, JSON.stringify(chart));
      console.log(`[Astrology] Cached chart (Layer 1 - aspect-pattern) for ${aspectCacheKey}`);
    } catch (error) {
      console.warn('[Astrology] Aspect cache write error:', error);
    }

    // Layer 2: Position-based cache (30-day TTL) - medium cache hit rate
    const positionCacheKey = generatePositionBasedCacheKey(chart);
    try {
      await redisClient.setEx(positionCacheKey, CHART_CACHE_TTL, JSON.stringify(chart));
      console.log(`[Astrology] Cached chart (Layer 2 - position-based) for ${positionCacheKey}`);
    } catch (error) {
      console.warn('[Astrology] Position cache write error:', error);
    }

    // Layer 3: Legacy cache (24h TTL) - backward compatibility
    try {
      await redisClient.setEx(legacyCacheKey, CHART_CACHE_TTL_LEGACY, JSON.stringify(chart));
      console.log(`[Astrology] Cached chart (Layer 3 - legacy) for ${legacyCacheKey}`);
    } catch (error) {
      console.warn('[Astrology] Legacy cache write error:', error);
    }

    return chart;
  } catch (error) {
    console.error('[Astrology] API call failed:', error);
    // Fallback to calculation
    return generateFallbackChart(birthData);
  }
}

/**
 * Fallback chart calculation when API is unavailable
 * Uses simple astronomical approximation
 */
function generateFallbackChart(birthData: BirthDataInput): NatalChart {
  console.log('[Astrology] Generating fallback chart');
  
  // Simple sun sign calculation based on date
  const getSunSign = (month: number, day: number): string => {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
    return 'Pisces';
  };

  // Simple moon sign approximation (very rough - just rotates through signs)
  const getMoonSign = (day: number): string => {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    return signs[day % 12];
  };

  // Simple rising sign approximation based on hour and longitude
  const getRisingSign = (hour: number, longitude: number): string => {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    // Rough approximation: rising changes about every 2 hours
    const offset = Math.floor((hour + longitude / 30) % 12);
    return signs[offset >= 0 ? offset : offset + 12];
  };

  const sunSign = getSunSign(birthData.month, birthData.day);
  const moonSign = getMoonSign(birthData.day);
  const risingSign = getRisingSign(birthData.hour, birthData.longitude);

  // Create basic planet positions
  const createBasicPlanet = (name: string, sign: string): PlanetPosition => ({
    name,
    sign,
    signBg: SIGN_TRANSLATIONS[sign] || sign,
    degree: Math.random() * 30, // Placeholder
    house: Math.floor(Math.random() * 12) + 1, // Placeholder
    retrograde: name === 'saturn' || name === 'uranus' || name === 'neptune' || name === 'pluto',
    symbol: PLANET_SYMBOLS[name] || '',
  });

  const sun = createBasicPlanet('sun', sunSign);
  const moon = createBasicPlanet('moon', moonSign);
  const rising = { ...createBasicPlanet('rising', risingSign), house: 1 };

  const planets: Record<string, PlanetPosition> = {
    sun,
    moon,
    rising,
    mercury: createBasicPlanet('mercury', getSunSign(birthData.month, Math.min(birthData.day + 5, 28))),
    venus: createBasicPlanet('venus', getSunSign(birthData.month, Math.min(birthData.day + 10, 28))),
    mars: createBasicPlanet('mars', getMoonSign((birthData.day + 15) % 30)),
    jupiter: createBasicPlanet('jupiter', getMoonSign((birthData.day + 5) % 30)),
    saturn: createBasicPlanet('saturn', 'Capricorn'),
    uranus: createBasicPlanet('uranus', 'Aquarius'),
    neptune: createBasicPlanet('neptune', 'Pisces'),
    pluto: createBasicPlanet('pluto', 'Scorpio'),
    northNode: createBasicPlanet('northNode', 'Aquarius'),
    southNode: createBasicPlanet('southNode', 'Leo'),
    chiron: createBasicPlanet('chiron', 'Aries'),
  };

  // Create basic houses
  const houses: HouseCusp[] = Array.from({ length: 12 }, (_, i) => {
    const sign = getRisingSign((birthData.hour + i * 2) % 24, birthData.longitude);
    return {
      number: i + 1,
      sign,
      signBg: SIGN_TRANSLATIONS[sign] || sign,
      degree: (i * 30 + birthData.hour * 2.5) % 360,
    };
  });

  // Create basic aspects
  const aspects: Aspect[] = [
    { planet1: 'sun', planet2: 'moon', aspect: 'trine', aspectBg: 'тригон', orb: 5.2, nature: 'harmonious' },
    { planet1: 'venus', planet2: 'mars', aspect: 'conjunction', aspectBg: 'съвпад', orb: 2.1, nature: 'neutral' },
  ];

  const chart: NatalChart = {
    sun,
    moon,
    rising,
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
    source: 'fallback-calculation',
  };

  return chart;
}

/**
 * Get chart from cache by birth data
 */
export async function getCachedChart(birthData: BirthDataInput): Promise<NatalChart | null> {
  const cacheKey = generateCacheKey(birthData);
  
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('[Astrology] Cache read error:', error);
  }
  
  return null;
}

/**
 * Invalidate chart cache for specific birth data
 */
export async function invalidateChartCache(birthData: BirthDataInput): Promise<void> {
  const cacheKey = generateCacheKey(birthData);
  
  try {
    await redisClient.del(cacheKey);
    console.log(`[Astrology] Invalidated cache for ${cacheKey}`);
  } catch (error) {
    console.warn('[Astrology] Cache invalidation error:', error);
  }
}

/**
 * Check if astrology API is available
 */
export async function checkAstrologyApiHealth(): Promise<boolean> {
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
  } catch {
    return false;
  }
}

export type { NatalChart as NatalChartType, PlanetPosition as PlanetPositionType };
