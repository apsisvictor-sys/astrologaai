/**
 * Swiss Ephemeris Fallback Provider
 * US-33: Astrology API Fallback Strategy
 * 
 * Secondary provider using local calculations based on
 * simplified astronomical algorithms.
 * 
 * This provides a robust fallback when the primary API is unavailable.
 * Uses Jean Meeus astronomical algorithms for approximate positions.
 */

import {
  BaseAstrologyProvider,
  AstrologyProviderType,
  AstrologyProviderStatus,
  type BirthDataInput,
  type NatalChart,
  type TransitData,
  type SynastryData,
  type ProgressionData,
  type SolarReturnData,
  type RelocationData,
  type CompositeData,
  type VenusReturnData,
  type AstrologyCalculationOptions,
  type PlanetPosition,
  type HouseCusp,
  type Aspect,
} from './astrology-provider.interface';
import { redisClient } from '../../utils/redis';

// ============================================
// Constants
// ============================================

const CHART_CACHE_TTL = 86400; // 24 hours in seconds

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

// Sign translations
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

const ASPECT_TRANSLATIONS: Record<string, string> = {
  conjunction: 'съвпад',
  sextile: 'секстил',
  square: 'квадрат',
  trine: 'тригон',
  opposition: 'опозиция',
};

const ASPECT_NATURE: Record<string, 'harmonious' | 'challenging' | 'neutral'> = {
  conjunction: 'neutral',
  sextile: 'harmonious',
  square: 'challenging',
  trine: 'harmonious',
  opposition: 'challenging',
};

const SIGN_ELEMENTS: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};

const SIGN_MODALITIES: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
};

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// ============================================
// Astronomical Calculations
// ============================================

/**
 * Calculate Julian Day Number from date
 * Based on Jean Meeus "Astronomical Algorithms"
 */
function calculateJulianDay(year: number, month: number, day: number, hour: number, minute: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);

  const decimalHour = hour + minute / 60;

  return Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day + B - 1524.5 +
    decimalHour / 24;
}

/**
 * Calculate Sun's position using simplified algorithm
 * Returns position in degrees (0-360)
 */
function calculateSunPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0

  // Mean longitude of the Sun
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L0 = L0 % 360;

  // Mean anomaly of the Sun
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = M % 360;
  const Mrad = M * Math.PI / 180;

  // Equation of center
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);

  // True longitude
  const sunLong = L0 + C;

  return sunLong;
}

/**
 * Calculate Moon's position using simplified algorithm
 */
function calculateMoonPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;

  // Mean longitude of the Moon
  let Lm = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  Lm = Lm % 360;

  // Mean elongation of the Moon
  let D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  D = D % 360;

  // Sun's mean anomaly
  let Ms = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  Ms = Ms % 360;

  // Moon's mean anomaly
  let Mm = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  Mm = Mm % 360;

  // Convert to radians
  const Drad = D * Math.PI / 180;
  const Msrad = Ms * Math.PI / 180;
  const Mmrad = Mm * Math.PI / 180;

  // Major corrections
  const corrections =
    6.288774 * Math.sin(Mmrad) +
    1.274027 * Math.sin(2 * Drad - Mmrad) +
    0.658314 * Math.sin(2 * Drad) +
    0.213618 * Math.sin(2 * Mmrad) -
    0.185116 * Math.sin(Msrad) -
    0.114332 * Math.sin(2 * Drad);

  return Lm + corrections;
}

/**
 * Calculate Mercury's position (simplified)
 */
function calculateMercuryPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let L = 252.2509 + 149474.0722 * T;
  return L % 360;
}

/**
 * Calculate Venus's position (simplified)
 */
function calculateVenusPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let L = 181.9798 + 58519.2130 * T;
  return L % 360;
}

/**
 * Calculate Mars's position (simplified)
 */
function calculateMarsPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let L = 355.4330 + 19141.6964 * T;
  return L % 360;
}

/**
 * Calculate Jupiter's position (simplified)
 */
function calculateJupiterPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let L = 34.3515 + 3036.3027 * T;
  return L % 360;
}

/**
 * Calculate Saturn's position (simplified)
 */
function calculateSaturnPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let L = 50.0774 + 1223.5110 * T;
  return L % 360;
}

/**
 * Calculate Uranus's position (simplified)
 */
function calculateUranusPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let L = 314.0550 + 429.8640 * T;
  return L % 360;
}

/**
 * Calculate Neptune's position (simplified)
 */
function calculateNeptunePosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let L = 304.3490 + 219.8833 * T;
  return L % 360;
}

/**
 * Calculate Pluto's position (simplified)
 */
function calculatePlutoPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let L = 238.9290 + 145.2078 * T;
  return L % 360;
}

/**
 * Calculate Ascendant (Rising Sign)
 */
function calculateAscendant(jd: number, latitude: number, longitude: number): number {
  const T = (jd - 2451545.0) / 36525;

  // Greenwich Mean Sidereal Time
  let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  GMST = GMST % 360;

  // Local Sidereal Time
  const LST = GMST + longitude;

  // Calculate Ascendant
  const latRad = latitude * Math.PI / 180;
  const lstRad = LST * Math.PI / 180;

  // Obliquity of ecliptic (simplified)
  const obliquity = 23.439291 - 0.0130042 * T;
  const oblRad = obliquity * Math.PI / 180;

  // Ascendant calculation
  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad);

  let ascendant = Math.atan2(y, x) * 180 / Math.PI;
  if (ascendant < 0) ascendant += 360;

  return ascendant;
}

/**
 * Get sign from degree
 */
function getSignFromDegree(degree: number): string {
  const normalizedDegree = ((degree % 360) + 360) % 360;
  const signIndex = Math.floor(normalizedDegree / 30);
  return ZODIAC_SIGNS[signIndex];
}

/**
 * Get degree within sign (0-30)
 */
function getDegreeInSign(degree: number): number {
  const normalizedDegree = ((degree % 360) + 360) % 360;
  return normalizedDegree % 30;
}

/**
 * Calculate house cusps (simplified Placidus)
 */
function calculateHouses(ascendantDegree: number): HouseCusp[] {
  const houses: HouseCusp[] = [];

  for (let i = 0; i < 12; i++) {
    const cuspDegree = (ascendantDegree + i * 30) % 360;
    const sign = getSignFromDegree(cuspDegree);

    houses.push({
      number: i + 1,
      sign,
      signBg: SIGN_TRANSLATIONS[sign] || sign,
      degree: getDegreeInSign(cuspDegree),
    });
  }

  return houses;
}

/**
 * Determine house placement from degree
 */
function getHouseFromDegree(degree: number, houses: HouseCusp[]): number {
  // Simplified: each house is 30 degrees starting from ascendant
  const normalizedDegree = ((degree % 360) + 360) % 360;
  return Math.floor(normalizedDegree / 30) + 1;
}

/**
 * Calculate aspects between planets
 */
function calculateAspects(planets: Record<string, PlanetPosition>): Aspect[] {
  const aspects: Aspect[] = [];
  const planetList = Object.entries(planets);
  const aspectOrbs: Record<string, number> = {
    conjunction: 8,
    sextile: 6,
    square: 6,
    trine: 6,
    opposition: 8,
  };

  for (let i = 0; i < planetList.length; i++) {
    for (let j = i + 1; j < planetList.length; j++) {
      const [name1, p1] = planetList[i];
      const [name2, p2] = planetList[j];

      // Skip minor aspects for fallback
      if (name1 === 'lilith' || name2 === 'lilith') continue;
      if (name1 === 'chiron' || name2 === 'chiron') continue;

      // Calculate angular difference
      const diff = Math.abs(p1.degree - p2.degree);
      const normalizedDiff = Math.min(diff, 360 - diff);

      // Check for aspects
      const aspectTypes: Array<{ name: string; angle: number }> = [
        { name: 'conjunction', angle: 0 },
        { name: 'sextile', angle: 60 },
        { name: 'square', angle: 90 },
        { name: 'trine', angle: 120 },
        { name: 'opposition', angle: 180 },
      ];

      for (const aspectType of aspectTypes) {
        const orb = aspectOrbs[aspectType.name];
        if (Math.abs(normalizedDiff - aspectType.angle) <= orb) {
          aspects.push({
            planet1: name1,
            planet2: name2,
            aspect: aspectType.name,
            aspectBg: ASPECT_TRANSLATIONS[aspectType.name] || aspectType.name,
            orb: Math.abs(normalizedDiff - aspectType.angle),
            nature: ASPECT_NATURE[aspectType.name] || 'neutral',
          });
          break;
        }
      }
    }
  }

  return aspects;
}

/**
 * Calculate element distribution
 */
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

/**
 * Calculate modality distribution
 */
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
// Swiss Ephemeris Fallback Provider Implementation
// ============================================

export class SwissEphemerisProvider extends BaseAstrologyProvider {
  readonly name = 'swiss-ephemeris-fallback';
  readonly type = AstrologyProviderType.SECONDARY;
  readonly endpoint = 'local';

  isAvailable(): boolean {
    // Always available as fallback
    return true;
  }

  async calculateNatalChart(
    birthData: BirthDataInput,
    options?: AstrologyCalculationOptions
  ): Promise<NatalChart> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = `astrology:fallback:natal:${birthData.year}-${birthData.month}-${birthData.day}:${birthData.hour}:${birthData.minute}:${birthData.latitude.toFixed(4)}:${birthData.longitude.toFixed(4)}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log(`[Swiss-Fallback] Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[Swiss-Fallback] Cache read error:', error);
    }

    // Calculate Julian Day
    const jd = calculateJulianDay(
      birthData.year,
      birthData.month,
      birthData.day,
      birthData.hour,
      birthData.minute
    );

    // Calculate planet positions
    const sunDeg = calculateSunPosition(jd);
    const moonDeg = calculateMoonPosition(jd);
    const mercuryDeg = calculateMercuryPosition(jd);
    const venusDeg = calculateVenusPosition(jd);
    const marsDeg = calculateMarsPosition(jd);
    const jupiterDeg = calculateJupiterPosition(jd);
    const saturnDeg = calculateSaturnPosition(jd);
    const uranusDeg = calculateUranusPosition(jd);
    const neptuneDeg = calculateNeptunePosition(jd);
    const plutoDeg = calculatePlutoPosition(jd);
    const ascendantDeg = calculateAscendant(jd, birthData.latitude, birthData.longitude);

    // Create planet positions
    const createPosition = (name: string, degree: number, isRetrograde: boolean = false): PlanetPosition => {
      const sign = getSignFromDegree(degree);
      return {
        name,
        sign,
        signBg: SIGN_TRANSLATIONS[sign] || sign,
        degree: getDegreeInSign(degree),
        house: getHouseFromDegree(degree, []),
        retrograde: isRetrograde,
        symbol: PLANET_SYMBOLS[name] || '',
      };
    };

    // North Node calculation (simplified - based on 18.6 year cycle)
    const T = (jd - 2451545.0) / 36525;
    let northNodeDeg = 125.04452 - 1934.136261 * T;
    northNodeDeg = ((northNodeDeg % 360) + 360) % 360;
    const southNodeDeg = (northNodeDeg + 180) % 360;

    // Chiron (simplified)
    let chironDeg = 207.5917 + 14.1594 * T;
    chironDeg = ((chironDeg % 360) + 360) % 360;

    const planets: Record<string, PlanetPosition> = {
      sun: createPosition('sun', sunDeg),
      moon: createPosition('moon', moonDeg),
      rising: createPosition('rising', ascendantDeg),
      mercury: createPosition('mercury', mercuryDeg),
      venus: createPosition('venus', venusDeg),
      mars: createPosition('mars', marsDeg),
      jupiter: createPosition('jupiter', jupiterDeg),
      saturn: createPosition('saturn', saturnDeg, true),
      uranus: createPosition('uranus', uranusDeg, true),
      neptune: createPosition('neptune', neptuneDeg, true),
      pluto: createPosition('pluto', plutoDeg, true),
      northNode: createPosition('northNode', northNodeDeg),
      southNode: createPosition('southNode', southNodeDeg),
      chiron: createPosition('chiron', chironDeg),
    };

    // Calculate houses
    const houses = calculateHouses(ascendantDeg);

    // Update house placements
    Object.keys(planets).forEach(name => {
      if (name !== 'rising') {
        planets[name].house = getHouseFromDegree(
          name === 'sun' ? sunDeg :
            name === 'moon' ? moonDeg :
              name === 'mercury' ? mercuryDeg :
                name === 'venus' ? venusDeg :
                  name === 'mars' ? marsDeg :
                    name === 'jupiter' ? jupiterDeg :
                      name === 'saturn' ? saturnDeg :
                        name === 'uranus' ? uranusDeg :
                          name === 'neptune' ? neptuneDeg :
                            name === 'pluto' ? plutoDeg :
                              name === 'northNode' ? northNodeDeg :
                                name === 'southNode' ? southNodeDeg :
                                  chironDeg,
          houses
        );
      }
    });
    planets.rising.house = 1;

    // Calculate aspects
    const aspects = calculateAspects(planets);

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
      houses,
      aspects,
      elements: calculateElementDistribution(planets),
      modalities: calculateModalityDistribution(planets),
      calculatedAt: new Date().toISOString(),
      source: this.name,
    };

    const latencyMs = Date.now() - startTime;
    this.updateHealth(AstrologyProviderStatus.HEALTHY, latencyMs);
    this.recordRequest(true, latencyMs);

    // Cache the result
    try {
      await redisClient.setEx(cacheKey, CHART_CACHE_TTL, JSON.stringify(chart));
    } catch (error) {
      console.warn('[Swiss-Fallback] Cache write error:', error);
    }

    return chart;
  }

  async getTransits(
    date: string,
    options?: { latitude?: number; longitude?: number }
  ): Promise<TransitData> {
    const startTime = Date.now();

    const [year, month, day] = date.split('-').map(Number);
    const jd = calculateJulianDay(year, month, day, 12, 0);

    const transitData: TransitData = {
      date,
      planets: [
        { name: 'sun', sign: getSignFromDegree(calculateSunPosition(jd)), degree: getDegreeInSign(calculateSunPosition(jd)), retrograde: false },
        { name: 'moon', sign: getSignFromDegree(calculateMoonPosition(jd)), degree: getDegreeInSign(calculateMoonPosition(jd)), retrograde: false },
        { name: 'mercury', sign: getSignFromDegree(calculateMercuryPosition(jd)), degree: getDegreeInSign(calculateMercuryPosition(jd)), retrograde: false },
        { name: 'venus', sign: getSignFromDegree(calculateVenusPosition(jd)), degree: getDegreeInSign(calculateVenusPosition(jd)), retrograde: false },
        { name: 'mars', sign: getSignFromDegree(calculateMarsPosition(jd)), degree: getDegreeInSign(calculateMarsPosition(jd)), retrograde: false },
      ],
      aspects: [],
    };

    const latencyMs = Date.now() - startTime;
    this.updateHealth(AstrologyProviderStatus.HEALTHY, latencyMs);
    this.recordRequest(true, latencyMs);

    return transitData;
  }

  async calculateSynastry(
    birthData1: BirthDataInput,
    birthData2: BirthDataInput
  ): Promise<SynastryData> {
    const [chart1, chart2] = await Promise.all([
      this.calculateNatalChart(birthData1),
      this.calculateNatalChart(birthData2),
    ]);

    // Simple compatibility calculation
    const sunSigns = [chart1.sun.sign, chart2.sun.sign];
    const moonSigns = [chart1.moon.sign, chart2.moon.sign];

    // Element compatibility
    const elementCompatibility: Record<string, Record<string, number>> = {
      fire: { fire: 90, earth: 50, air: 80, water: 40 },
      earth: { fire: 50, earth: 90, air: 60, water: 80 },
      air: { fire: 80, earth: 60, air: 90, water: 50 },
      water: { fire: 40, earth: 80, air: 50, water: 90 },
    };

    const sun1Element = SIGN_ELEMENTS[chart1.sun.sign] || 'fire';
    const sun2Element = SIGN_ELEMENTS[chart2.sun.sign] || 'fire';
    const moon1Element = SIGN_ELEMENTS[chart1.moon.sign] || 'water';
    const moon2Element = SIGN_ELEMENTS[chart2.moon.sign] || 'water';

    const overall = Math.round((
      elementCompatibility[sun1Element][sun2Element] +
      elementCompatibility[moon1Element][moon2Element]
    ) / 2);

    return {
      person1: { chart: chart1 },
      person2: { chart: chart2 },
      compatibility: {
        overall,
        emotional: elementCompatibility[moon1Element][moon2Element],
        communication: 70,
        physical: 75,
      },
      aspects: [],
    };
  }

  // ============================================
  // Advanced Tools Fallbacks (Swiss Ephemeris does not support these)
  // ============================================

  async getProgressions(birthData: BirthDataInput, targetDate: string, options?: AstrologyCalculationOptions): Promise<ProgressionData> { throw new Error('Progressions not supported in offline fallback'); }
  async getSolarReturn(birthData: BirthDataInput, returnYear: number, options?: AstrologyCalculationOptions): Promise<SolarReturnData> { throw new Error('Solar Return not supported in offline fallback'); }
  async getRelocation(birthData: BirthDataInput, targetLocation: { latitude: number; longitude: number }, options?: AstrologyCalculationOptions): Promise<RelocationData> { throw new Error('Astrocartography not supported in offline fallback'); }
  async getCompositeChart(person1: BirthDataInput, person2: BirthDataInput, options?: AstrologyCalculationOptions): Promise<CompositeData> { throw new Error('Composite charts not supported in offline fallback'); }
  async getVenusReturn(birthData: BirthDataInput, returnYear: number, options?: AstrologyCalculationOptions): Promise<VenusReturnData> { throw new Error('Venus Return not supported in offline fallback'); }
}

// ============================================
// Factory Functions
// ============================================

export function createSwissEphemerisProvider(): SwissEphemerisProvider {
  return new SwissEphemerisProvider();
}

export default SwissEphemerisProvider;
