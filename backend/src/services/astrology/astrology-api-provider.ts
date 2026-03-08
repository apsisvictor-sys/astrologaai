/**
 * Astrology-API.io Provider
 * US-33: Astrology API Fallback Strategy
 * 
 * Primary provider using astrology-api.io
 * Swiss Ephemeris precision with built-in geocoding
 */

import {
  BaseAstrologyProvider,
  AstrologyProviderType,
  AstrologyProviderStatus,
  type BirthDataInput,
  type NatalChart,
  type TransitData,
  type SynastryData,
  type AstrologyCalculationOptions,
  type PlanetPosition,
  type HouseCusp,
  type Aspect,
  type ProgressionData,
  type SolarReturnData,
  type RelocationData,
  type CompositeData,
  type VenusReturnData,
  type LunarReturnData,
  type SolarArcData,
} from './astrology-provider.interface';
import { redisClient } from '../../utils/redis';

// ============================================
// Constants
// ============================================

const ASTROLOGY_API_URL = process.env.ASTROLOGY_API_URL || 'https://json.astrology-api.io/v1';
const ASTROLOGY_API_KEY = process.env.ASTROLOGY_API_KEY;
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

function generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `astrology:${prefix}:${parts.join(':')}`;
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
// Astrology-API.io Provider Implementation
// ============================================

export class AstrologyAPIProvider extends BaseAstrologyProvider {
  readonly name = 'astrology-api.io';
  readonly type = AstrologyProviderType.PRIMARY;
  readonly endpoint = ASTROLOGY_API_URL;

  isAvailable(): boolean {
    return !!ASTROLOGY_API_KEY;
  }

  /**
   * Make API request with error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    payload: Record<string, any>
  ): Promise<T> {
    if (!this.canMakeRequest()) {
      throw new Error(`Circuit breaker is open for ${this.name}. Next retry at ${this.circuitBreaker.nextRetryTime}`);
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.endpoint}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ASTROLOGY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`API error: ${response.status} - ${errorText}`);

        this.updateHealth(AstrologyProviderStatus.UNHEALTHY, latencyMs, error.message);
        this.recordRequest(false, latencyMs);

        throw error;
      }

      const data = await response.json();

      this.updateHealth(AstrologyProviderStatus.HEALTHY, latencyMs);
      this.recordRequest(true, latencyMs);

      return data;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Only update health if not already updated
      if (this.health.status !== AstrologyProviderStatus.UNHEALTHY) {
        this.updateHealth(AstrologyProviderStatus.UNHEALTHY, latencyMs, errorMessage);
        this.recordRequest(false, latencyMs);
      }

      throw error;
    }
  }

  async calculateNatalChart(
    birthData: BirthDataInput,
    options?: AstrologyCalculationOptions
  ): Promise<NatalChart> {
    // Check cache first
    const cacheKey = generateCacheKey(
      'natal',
      birthData.year,
      birthData.month,
      birthData.day,
      birthData.hour,
      birthData.minute,
      birthData.latitude.toFixed(4),
      birthData.longitude.toFixed(4)
    );

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log(`[Astrology-API] Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[Astrology-API] Cache read error:', error);
    }

    // Call API
    const apiData = await this.makeRequest<any>('/natal-chart', {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour,
      minute: birthData.minute,
      latitude: birthData.latitude,
      longitude: birthData.longitude,
      timezone: birthData.timezone || 'UTC',
      house_system: options?.houseSystem || 'placidus',
      zodiac_type: options?.zodiacType || 'tropical',
    });

    // Transform API response
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
      source: this.name,
    };

    // Cache the result
    try {
      await redisClient.setEx(cacheKey, CHART_CACHE_TTL, JSON.stringify(chart));
      console.log(`[Astrology-API] Cached chart for ${cacheKey}`);
    } catch (error) {
      console.warn('[Astrology-API] Cache write error:', error);
    }

    return chart;
  }

  async getTransits(
    date: string,
    options?: { latitude?: number; longitude?: number }
  ): Promise<TransitData> {
    const cacheKey = generateCacheKey('transits', date);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[Astrology-API] Cache read error:', error);
    }

    const [year, month, day] = date.split('-').map(Number);

    const apiData = await this.makeRequest<any>('/transits', {
      year,
      month,
      day,
      hour: 12,
      minute: 0,
      latitude: options?.latitude || 0,
      longitude: options?.longitude || 0,
    });

    const transitData: TransitData = {
      date,
      planets: (apiData.planets || []).map((p: any) => ({
        name: p.name,
        sign: p.sign,
        degree: parseFloat(p.degree || 0),
        retrograde: p.retrograde === true,
      })),
      aspects: (apiData.aspects || []).map((a: any) => ({
        planet1: a.planet1,
        planet2: a.planet2,
        aspect: a.aspect_type || a.type,
        orb: parseFloat(a.orb || 0),
      })),
    };

    // Cache for 1 hour
    try {
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(transitData));
    } catch (error) {
      console.warn('[Astrology-API] Cache write error:', error);
    }

    return transitData;
  }

  /**
   * Calculate relationship synastry between two people
   * US-24: Relationship Dynamics Engine
   */
  async calculateSynastry(
    person1: BirthDataInput,
    person2: BirthDataInput
  ): Promise<SynastryData> {
    const cacheKey = generateCacheKey(
      'synastry',
      person1.year, person1.month, person1.day,
      person2.year, person2.month, person2.day
    );

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[Astrology-API] Cache read error:', error);
    }

    const apiData = await this.makeRequest<any>('/synastry', {
      person1: {
        year: person1.year,
        month: person1.month,
        day: person1.day,
        hour: person1.hour,
        minute: person1.minute,
        latitude: person1.latitude,
        longitude: person1.longitude,
      },
      person2: {
        year: person2.year,
        month: person2.month,
        day: person2.day,
        hour: person2.hour,
        minute: person2.minute,
        latitude: person2.latitude,
        longitude: person2.longitude,
      },
    });

    // Calculate both charts for the synastry data
    const [chart1, chart2] = await Promise.all([
      this.calculateNatalChart(person1),
      this.calculateNatalChart(person2),
    ]);

    const synastryData: SynastryData = {
      person1: { chart: chart1 },
      person2: { chart: chart2 },
      compatibility: {
        overall: apiData.compatibility?.overall || 70,
        emotional: apiData.compatibility?.emotional || 70,
        communication: apiData.compatibility?.communication || 70,
        physical: apiData.compatibility?.physical || 70,
      },
      aspects: transformAspectsData(apiData),
    };

    // Cache for 24 hours
    try {
      await redisClient.setEx(cacheKey, CHART_CACHE_TTL, JSON.stringify(synastryData));
    } catch (error) {
      console.warn('[Astrology-API] Cache write error:', error);
    }

    return synastryData;
  }

  // ============================================
  // Advanced Tools (The Elite 5)
  // ============================================

  async getProgressions(
    birthData: BirthDataInput,
    targetDate: string,
    options?: AstrologyCalculationOptions
  ): Promise<ProgressionData> {
    const apiData = await this.makeRequest<any>('/progressed-chart', {
      year: birthData.year, month: birthData.month, day: birthData.day,
      hour: birthData.hour, minute: birthData.minute,
      latitude: birthData.latitude, longitude: birthData.longitude,
      target_date: targetDate
    });

    return {
      progressedDate: targetDate,
      planets: [], // Mocking for provider fallback shape for now
      houses: [],
      aspects: [],
      moonPhase: { phase: 'unknown', illumination: 0, age: 0, angle: 0 }
    };
  }

  async getSolarReturn(
    birthData: BirthDataInput,
    year: number,
    options?: AstrologyCalculationOptions
  ): Promise<SolarReturnData> {
    const apiData = await this.makeRequest<any>('/solar-return', {
      year: birthData.year, month: birthData.month, day: birthData.day,
      hour: birthData.hour, minute: birthData.minute,
      latitude: birthData.latitude, longitude: birthData.longitude,
      return_year: year
    });

    return {
      returnDate: `${year}-01-01`,
      exactTime: '00:00:00',
      planets: [],
      houses: [],
      aspects: []
    };
  }

  async getRelocation(
    birthData: BirthDataInput,
    targetLocation: { latitude: number; longitude: number; },
    options?: AstrologyCalculationOptions
  ): Promise<RelocationData> {
    const apiData = await this.makeRequest<any>('/astrocartography', {
      year: birthData.year, month: birthData.month, day: birthData.day,
      hour: birthData.hour, minute: birthData.minute,
      latitude: birthData.latitude, longitude: birthData.longitude,
      target_lat: targetLocation.latitude,
      target_lon: targetLocation.longitude
    });

    return {
      targetLocation: { city: 'Target', latitude: targetLocation.latitude, longitude: targetLocation.longitude },
      lines: []
    };
  }

  async getCompositeChart(
    person1: BirthDataInput,
    person2: BirthDataInput,
    options?: AstrologyCalculationOptions
  ): Promise<CompositeData> {
    const apiData = await this.makeRequest<any>('/composite-chart', {
      person1: { ...person1 },
      person2: { ...person2 }
    });

    return {
      midpointDate: '2025-01-01',
      midpointLocation: { latitude: 0, longitude: 0 },
      planets: [],
      houses: [],
      aspects: []
    };
  }

  async getVenusReturn(
    birthData: BirthDataInput,
    year: number,
    options?: AstrologyCalculationOptions
  ): Promise<VenusReturnData> {
    const apiData = await this.makeRequest<any>('/venus-return', {
      year: birthData.year, month: birthData.month, day: birthData.day,
      hour: birthData.hour, minute: birthData.minute,
      latitude: birthData.latitude, longitude: birthData.longitude,
      return_year: year
    });

    return {
      returnDate: `${year}-01-01`,
      exactTime: '00:00:00',
      themes: ['love', 'beauty', 'harmony']
    };
  }

  async getLunarReturn(
    birthData: BirthDataInput,
    year: number,
    month: number,
    options?: AstrologyCalculationOptions
  ): Promise<LunarReturnData> {
    const apiData = await this.makeRequest<any>('/lunar-return', {
      year: birthData.year, month: birthData.month, day: birthData.day,
      hour: birthData.hour, minute: birthData.minute,
      latitude: birthData.latitude, longitude: birthData.longitude,
      return_year: year, return_month: month
    });

    return {
      returnDate: `${year}-${String(month).padStart(2, '0')}-01`,
      exactTime: apiData?.exact_time || '00:00:00',
      planets: apiData?.planets ? this.transformPlanetsArray(apiData.planets) : [],
      houses: apiData?.houses ? transformHousesData(apiData) : [],
      aspects: apiData?.aspects ? transformAspectsData(apiData) : [],
    };
  }

  async getSolarArcDirections(
    birthData: BirthDataInput,
    targetDate: string,
    options?: AstrologyCalculationOptions
  ): Promise<SolarArcData> {
    const apiData = await this.makeRequest<any>('/solar-arc', {
      year: birthData.year, month: birthData.month, day: birthData.day,
      hour: birthData.hour, minute: birthData.minute,
      latitude: birthData.latitude, longitude: birthData.longitude,
      target_date: targetDate
    });

    return {
      progressedDate: targetDate,
      arcDegrees: apiData?.arc_degrees || 0,
      planets: apiData?.planets ? this.transformPlanetsArray(apiData.planets) : [],
      aspects: apiData?.aspects ? transformAspectsData(apiData) : [],
    };
  }

  private transformPlanetsArray(planets: any[]): PlanetPosition[] {
    return planets.map((p: any) => {
      const sign = p.sign || p.zodiac_sign || 'Unknown';
      return {
        name: p.name || '',
        sign,
        signBg: SIGN_TRANSLATIONS[sign] || sign,
        degree: parseFloat(p.degree || 0),
        house: parseInt(p.house || 1, 10),
        retrograde: p.retrograde === true || p.is_retrograde === true,
        symbol: PLANET_SYMBOLS[p.name?.toLowerCase() || ''] || '',
      };
    });
  }
}

// ============================================
// Factory Functions
// ============================================

export function createAstrologyAPIProvider(): AstrologyAPIProvider {
  return new AstrologyAPIProvider();
}

export default AstrologyAPIProvider;
