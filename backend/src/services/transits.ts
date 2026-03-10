/**
 * Transit Calculation Service
 * US-15: Daily Forecast - Transit calculations
 * 
 * Calculates current planetary positions and their aspects to natal chart
 */

import { redisClient } from '../utils/redis';

// ============================================
// Types
// ============================================

export interface TransitPosition {
  planet: string;
  planetBg: string;
  sign: string;
  signBg: string;
  degree: number;
  retrograde: boolean;
}

export interface TransitAspect {
  transitPlanet: string;
  transitPlanetBg: string;
  natalPlanet: string;
  natalPlanetBg: string;
  aspect: string;
  aspectBg: string;
  orb: number;
  influence: 'positive' | 'challenging' | 'neutral';
  description: string;
}

export interface MoonPhase {
  phase: string;
  phaseBg: string;
  illumination: number;
  moonSign: string;
  moonSignBg: string;
}

export interface DailyTransits {
  date: string;
  transits: TransitPosition[];
  aspectsToNatal: TransitAspect[];
  moonPhase: MoonPhase;
  generatedAt: string;
}

// ============================================
// Constants
// ============================================

const TRANSIT_CACHE_TTL = 3600; // 1 hour in seconds

// Planet names in Bulgarian
const PLANET_BG: Record<string, string> = {
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

// Sign translations
const SIGN_BG: Record<string, string> = {
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
const ASPECT_BG: Record<string, string> = {
  conjunction: 'съвпад',
  sextile: 'секстил',
  square: 'квадрат',
  trine: 'тригон',
  opposition: 'опозиция',
};

// Aspect influence
const ASPECT_INFLUENCE: Record<string, 'positive' | 'challenging' | 'neutral'> = {
  conjunction: 'neutral',
  sextile: 'positive',
  square: 'challenging',
  trine: 'positive',
  opposition: 'challenging',
};

// Aspect orbs (allowed deviation in degrees)
const ASPECT_ORBS: Record<string, number> = {
  conjunction: 10,
  sextile: 6,
  square: 8,
  trine: 8,
  opposition: 10,
};

// Aspect angles
const ASPECT_ANGLES: Record<string, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

// Moon phases in Bulgarian
const MOON_PHASE_BG: Record<string, string> = {
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
const ASPECT_DESCRIPTIONS: Record<string, string> = {
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
 * Calculate Julian Day from date
 */
function calculateJulianDay(year: number, month: number, day: number, hour: number = 12): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  
  return Math.floor(365.25 * (year + 4716)) + 
         Math.floor(30.6001 * (month + 1)) + 
         day + B - 1524.5 + 
         hour / 24;
}

/**
 * Calculate sun position (approximate)
 */
function calculateSunPosition(jd: number): { sign: string; degree: number } {
  // Days since J2000.0
  const d = jd - 2451545.0;
  
  // Mean longitude of the Sun
  const L = (280.460 + 0.9856474 * d) % 360;
  
  // Mean anomaly of the Sun
  const g = ((357.528 + 0.9856003 * d) % 360) * Math.PI / 180;
  
  // Ecliptic longitude
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360;
  
  const degree = lambda < 0 ? lambda + 360 : lambda;
  
  // Determine sign
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(degree / 30);
  
  return {
    sign: signs[signIndex],
    degree: degree % 30,
  };
}

/**
 * Calculate moon position (approximate)
 */
function calculateMoonPosition(jd: number): { sign: string; degree: number; phase: number } {
  const d = jd - 2451545.0;
  
  // Moon's mean longitude
  const Lm = ((218.316 + 13.176396 * d) % 360) * Math.PI / 180;
  
  // Moon's mean anomaly
  const Mm = ((134.963 + 13.064993 * d) % 360) * Math.PI / 180;
  
  // Sun's mean anomaly
  const Ms = ((357.529 + 0.9856003 * d) % 360) * Math.PI / 180;
  
  // Moon's elongation
  const D = ((297.850 + 12.190749 * d) % 360) * Math.PI / 180;
  
  // Ecliptic longitude (simplified)
  const lambda = (Lm * 180 / Math.PI + 6.289 * Math.sin(Mm) - 1.274 * Math.sin(2 * D - Mm) + 0.658 * Math.sin(2 * D)) % 360;
  
  const degree = lambda < 0 ? lambda + 360 : lambda;
  
  // Moon phase (0-1, where 0 = new moon, 0.5 = full moon)
  const phase = ((D * 180 / Math.PI) % 360) / 360;
  
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(degree / 30);
  
  return {
    sign: signs[signIndex],
    degree: degree % 30,
    phase,
  };
}

/**
 * Calculate planetary position (simplified approximation)
 * For production, use Swiss Ephemeris or astrology API
 */
function calculatePlanetPosition(planet: string, jd: number): { sign: string; degree: number; retrograde: boolean } {
  const d = jd - 2451545.0;
  
  // Simplified orbital elements (for demonstration)
  const orbitalData: Record<string, { period: number; offset: number }> = {
    mercury: { period: 87.97, offset: 0 },
    venus: { period: 224.7, offset: 50 },
    mars: { period: 686.98, offset: 120 },
    jupiter: { period: 4332.59, offset: 200 },
    saturn: { period: 10759.22, offset: 280 },
    uranus: { period: 30688.5, offset: 320 },
    neptune: { period: 60182, offset: 340 },
    pluto: { period: 90560, offset: 350 },
  };
  
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  
  if (planet === 'sun') {
    const pos = calculateSunPosition(jd);
    return { ...pos, retrograde: false };
  }
  
  if (planet === 'moon') {
    const pos = calculateMoonPosition(jd);
    return { sign: pos.sign, degree: pos.degree, retrograde: false };
  }
  
  const data = orbitalData[planet];
  if (!data) {
    // Default for unknown planets - use a fixed position
    const degree = (d * 0.9856) % 360;
    const signIndex = Math.floor(Math.abs(degree) / 30);
    return {
      sign: signs[signIndex % 12],
      degree: Math.abs(degree) % 30,
      retrograde: false,
    };
  }
  
  // Calculate approximate position based on orbital period
  const meanMotion = 360 / data.period;
  const degree = (d * meanMotion + data.offset) % 360;
  const signIndex = Math.floor(Math.abs(degree) / 30);
  
  // Simplified retrograde detection (outer planets appear retrograde more often)
  const retrograde = Math.sin(d / data.period * Math.PI * 2) < -0.7;
  
  return {
    sign: signs[signIndex % 12],
    degree: Math.abs(degree) % 30,
    retrograde,
  };
}

/**
 * Calculate moon phase name
 */
function getMoonPhaseName(phase: number): string {
  if (phase < 0.0625) return 'New Moon';
  if (phase < 0.1875) return 'Waxing Crescent';
  if (phase < 0.3125) return 'First Quarter';
  if (phase < 0.4375) return 'Waxing Gibbous';
  if (phase < 0.5625) return 'Full Moon';
  if (phase < 0.6875) return 'Waning Gibbous';
  if (phase < 0.8125) return 'Last Quarter';
  return 'Waning Crescent';
}

/**
 * Calculate aspect between two planetary positions
 */
function calculateAspect(degree1: number, degree2: number): { aspect: string; orb: number } | null {
  let diff = Math.abs(degree1 - degree2);
  if (diff > 180) diff = 360 - diff;
  
  for (const [aspect, angle] of Object.entries(ASPECT_ANGLES)) {
    const orb = Math.abs(diff - angle);
    if (orb <= ASPECT_ORBS[aspect]) {
      return { aspect, orb };
    }
  }
  
  return null;
}

/**
 * Normalize degree to 0-360 range
 */
function normalizeDegree(degree: number): number {
  return ((degree % 360) + 360) % 360;
}

// ============================================
// Main Service Functions
// ============================================

/**
 * Get daily transit positions
 */
export async function getDailyTransits(date: Date): Promise<DailyTransits> {
  const dateStr = date.toISOString().split('T')[0];
  const cacheKey = `transits:${dateStr}`;
  
  // Try cache first
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('[Transits] Cache read error:', error);
  }
  
  // Calculate Julian Day
  const jd = calculateJulianDay(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours() + date.getMinutes() / 60
  );
  
  // Calculate planetary positions
  const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  
  const transits: TransitPosition[] = planets.map(planet => {
    const pos = calculatePlanetPosition(planet, jd);
    return {
      planet,
      planetBg: PLANET_BG[planet] || planet,
      sign: pos.sign,
      signBg: SIGN_BG[pos.sign] || pos.sign,
      degree: Math.round(pos.degree * 10) / 10,
      retrograde: pos.retrograde,
    };
  });
  
  // Calculate moon phase
  const moonData = calculateMoonPosition(jd);
  const phaseName = getMoonPhaseName(moonData.phase);
  
  const moonPhase: MoonPhase = {
    phase: phaseName,
    phaseBg: MOON_PHASE_BG[phaseName] || phaseName,
    illumination: Math.round(Math.abs(Math.sin(moonData.phase * Math.PI)) * 100),
    moonSign: moonData.sign,
    moonSignBg: SIGN_BG[moonData.sign] || moonData.sign,
  };
  
  const result: DailyTransits = {
    date: dateStr,
    transits,
    aspectsToNatal: [], // Will be populated when comparing to natal chart
    moonPhase,
    generatedAt: new Date().toISOString(),
  };
  
  // Cache for 1 hour
  try {
    await redisClient.setEx(cacheKey, TRANSIT_CACHE_TTL, JSON.stringify(result));
  } catch (error) {
    console.warn('[Transits] Cache write error:', error);
  }
  
  return result;
}

/**
 * Calculate aspects between transits and natal chart
 */
export function calculateTransitsToNatal(
  transits: TransitPosition[],
  natalChart: any
): TransitAspect[] {
  const aspects: TransitAspect[] = [];
  
  // Extract natal planet positions from chart
  const natalPlanets: Record<string, { sign: string; degree: number }> = {};
  
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
 * Fetches today's sky from astrology-api.io (cached 1h via getDailyTransits),
 * then computes which transiting planets are aspecting the user's natal planets.
 *
 * @param natalChart - The user's natal chart object (birthChart.chartData from DB)
 * @returns { skyPositions, aspectsToNatal, moonPhase, generatedAt }
 */
export async function getActiveTransitsForUser(natalChart: any): Promise<{
  skyPositions: TransitPosition[];
  aspectsToNatal: TransitAspect[];
  moonPhase: MoonPhase;
  generatedAt: string;
}> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  // Always get in-house data first (no API key needed, always available)
  const dailyData = await getDailyTransits(today);
  let skyPositions = dailyData.transits;

  // Try to upgrade to real astrology-api.io data (more accurate positions)
  try {
    const { getAstrologyOrchestrator } = await import('./astrology/astrology-orchestrator');
    const apiData = await getAstrologyOrchestrator().getTransits(dateStr);
    if (apiData?.planets?.length > 0) {
      skyPositions = apiData.planets.map((p: any) => ({
        planet: p.name,
        planetBg: PLANET_BG[p.name] || p.name,
        sign: p.sign,
        signBg: SIGN_BG[p.sign] || p.sign,
        degree: typeof p.degree === 'number' ? Math.round(p.degree * 10) / 10 : parseFloat(p.degree || '0'),
        retrograde: p.retrograde ?? false,
      }));
    }
  } catch (err) {
    console.warn('[Transits] astrology-api.io unavailable, using in-house calculation:', err instanceof Error ? err.message : err);
  }

  const aspectsToNatal = calculateTransitsToNatal(skyPositions, natalChart);

  return {
    skyPositions,
    aspectsToNatal,
    moonPhase: dailyData.moonPhase,
    generatedAt: new Date().toISOString(),
  };
}

export type { DailyTransits as DailyTransitsType, TransitAspect as TransitAspectType };
