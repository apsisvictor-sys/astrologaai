"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var astrology_api_provider_exports = {};
__export(astrology_api_provider_exports, {
  AstrologyAPIProvider: () => AstrologyAPIProvider,
  createAstrologyAPIProvider: () => createAstrologyAPIProvider,
  default: () => astrology_api_provider_default
});
module.exports = __toCommonJS(astrology_api_provider_exports);
var import_astrology_provider = require("./astrology-provider.interface");
var import_redis = require("../../utils/redis");
const ASTROLOGY_API_URL = process.env.ASTROLOGY_API_URL || "https://json.astrology-api.io/v1";
const ASTROLOGY_API_KEY = process.env.ASTROLOGY_API_KEY;
const CHART_CACHE_TTL = 86400;
const PLANET_SYMBOLS = {
  sun: "\u2609",
  moon: "\u263D",
  mercury: "\u263F",
  venus: "\u2640",
  mars: "\u2642",
  jupiter: "\u2643",
  saturn: "\u2644",
  uranus: "\u26E2",
  neptune: "\u2646",
  pluto: "\u2647",
  northNode: "\u260A",
  southNode: "\u260B",
  chiron: "\u26B7",
  lilith: "\u26B7",
  rising: "ASC"
};
const SIGN_TRANSLATIONS = {
  Aries: "\u041E\u0432\u0435\u043D",
  Taurus: "\u0422\u0435\u043B\u0435\u0446",
  Gemini: "\u0411\u043B\u0438\u0437\u043D\u0430\u0446\u0438",
  Cancer: "\u0420\u0430\u043A",
  Leo: "\u041B\u044A\u0432",
  Virgo: "\u0414\u0435\u0432\u0430",
  Libra: "\u0412\u0435\u0437\u043D\u0438",
  Scorpio: "\u0421\u043A\u043E\u0440\u043F\u0438\u043E\u043D",
  Sagittarius: "\u0421\u0442\u0440\u0435\u043B\u0435\u0446",
  Capricorn: "\u041A\u043E\u0437\u0438\u0440\u043E\u0433",
  Aquarius: "\u0412\u043E\u0434\u043E\u043B\u0435\u0439",
  Pisces: "\u0420\u0438\u0431\u0438"
};
const ASPECT_TRANSLATIONS = {
  conjunction: "\u0441\u044A\u0432\u043F\u0430\u0434",
  sextile: "\u0441\u0435\u043A\u0441\u0442\u0438\u043B",
  square: "\u043A\u0432\u0430\u0434\u0440\u0430\u0442",
  trine: "\u0442\u0440\u0438\u0433\u043E\u043D",
  opposition: "\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044F",
  quincunx: "\u043A\u0432\u0438\u043D\u043A\u0443\u043D\u043A\u0441",
  semisextile: "\u043F\u043E\u043B\u0443\u0441\u0435\u043A\u0441\u0442\u0438\u043B",
  semisquare: "\u043F\u043E\u043B\u0443\u043A\u0432\u0430\u0434\u0440\u0430\u0442",
  sesquisquare: "\u0441\u0435\u0441\u043A\u0438\u043A\u0432\u0430\u0434\u0440\u0430\u0442"
};
const ASPECT_NATURE = {
  conjunction: "neutral",
  sextile: "harmonious",
  square: "challenging",
  trine: "harmonious",
  opposition: "challenging",
  quincunx: "neutral",
  semisextile: "harmonious",
  semisquare: "challenging",
  sesquisquare: "challenging"
};
const SIGN_ELEMENTS = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",
  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",
  Gemini: "air",
  Libra: "air",
  Aquarius: "air",
  Cancer: "water",
  Scorpio: "water",
  Pisces: "water"
};
const SIGN_MODALITIES = {
  Aries: "cardinal",
  Cancer: "cardinal",
  Libra: "cardinal",
  Capricorn: "cardinal",
  Taurus: "fixed",
  Leo: "fixed",
  Scorpio: "fixed",
  Aquarius: "fixed",
  Gemini: "mutable",
  Virgo: "mutable",
  Sagittarius: "mutable",
  Pisces: "mutable"
};
function generateCacheKey(prefix, ...parts) {
  return `astrology:${prefix}:${parts.join(":")}`;
}
function transformPlanetData(data, planetName) {
  const planetData = data[planetName] || data.planets?.[planetName];
  if (!planetData) {
    throw new Error(`Missing data for planet: ${planetName}`);
  }
  const sign = planetData.sign || planetData.zodiac_sign || "Unknown";
  return {
    name: planetName,
    sign,
    signBg: SIGN_TRANSLATIONS[sign] || sign,
    degree: parseFloat(planetData.degree || planetData.position || 0),
    house: parseInt(planetData.house || 1, 10),
    retrograde: planetData.retrograde === true || planetData.is_retrograde === true,
    symbol: PLANET_SYMBOLS[planetName] || ""
  };
}
function transformHousesData(data) {
  const houses = data.houses || data.house_cusps || [];
  return houses.map((house, index) => {
    const sign = house.sign || house.zodiac_sign || "Unknown";
    return {
      number: index + 1,
      sign,
      signBg: SIGN_TRANSLATIONS[sign] || sign,
      degree: parseFloat(house.degree || house.position || house.cusp || 0)
    };
  });
}
function transformAspectsData(data) {
  const aspects = data.aspects || [];
  return aspects.map((aspect) => {
    const aspectType = aspect.aspect_type || aspect.type || aspect.name || "conjunction";
    return {
      planet1: aspect.planet1 || aspect.planet_1 || "",
      planet2: aspect.planet2 || aspect.planet_2 || "",
      aspect: aspectType,
      aspectBg: ASPECT_TRANSLATIONS[aspectType] || aspectType,
      orb: parseFloat(aspect.orb || aspect.orb_degree || 0),
      nature: ASPECT_NATURE[aspectType] || "neutral"
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
class AstrologyAPIProvider extends import_astrology_provider.BaseAstrologyProvider {
  constructor() {
    super(...arguments);
    this.name = "astrology-api.io";
    this.type = import_astrology_provider.AstrologyProviderType.PRIMARY;
    this.endpoint = ASTROLOGY_API_URL;
  }
  isAvailable() {
    return !!ASTROLOGY_API_KEY;
  }
  /**
   * Make API request with error handling
   */
  async makeRequest(endpoint, payload) {
    if (!this.canMakeRequest()) {
      throw new Error(`Circuit breaker is open for ${this.name}. Next retry at ${this.circuitBreaker.nextRetryTime}`);
    }
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.endpoint}${endpoint}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ASTROLOGY_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`API error: ${response.status} - ${errorText}`);
        this.updateHealth(import_astrology_provider.AstrologyProviderStatus.UNHEALTHY, latencyMs, error.message);
        this.recordRequest(false, latencyMs);
        throw error;
      }
      const data = await response.json();
      this.updateHealth(import_astrology_provider.AstrologyProviderStatus.HEALTHY, latencyMs);
      this.recordRequest(true, latencyMs);
      return data;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (this.health.status !== import_astrology_provider.AstrologyProviderStatus.UNHEALTHY) {
        this.updateHealth(import_astrology_provider.AstrologyProviderStatus.UNHEALTHY, latencyMs, errorMessage);
        this.recordRequest(false, latencyMs);
      }
      throw error;
    }
  }
  async calculateNatalChart(birthData, options) {
    const cacheKey = generateCacheKey(
      "natal",
      birthData.year,
      birthData.month,
      birthData.day,
      birthData.hour,
      birthData.minute,
      birthData.latitude.toFixed(4),
      birthData.longitude.toFixed(4)
    );
    try {
      const cached = await import_redis.redisClient.get(cacheKey);
      if (cached) {
        console.log(`[Astrology-API] Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn("[Astrology-API] Cache read error:", error);
    }
    const apiData = await this.makeRequest("/natal-chart", {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour,
      minute: birthData.minute,
      latitude: birthData.latitude,
      longitude: birthData.longitude,
      timezone: birthData.timezone || "UTC",
      house_system: options?.houseSystem || "placidus",
      zodiac_type: options?.zodiacType || "tropical"
    });
    const planets = {
      sun: transformPlanetData(apiData, "sun"),
      moon: transformPlanetData(apiData, "moon"),
      rising: transformPlanetData(apiData, "rising"),
      mercury: transformPlanetData(apiData, "mercury"),
      venus: transformPlanetData(apiData, "venus"),
      mars: transformPlanetData(apiData, "mars"),
      jupiter: transformPlanetData(apiData, "jupiter"),
      saturn: transformPlanetData(apiData, "saturn"),
      uranus: transformPlanetData(apiData, "uranus"),
      neptune: transformPlanetData(apiData, "neptune"),
      pluto: transformPlanetData(apiData, "pluto"),
      northNode: transformPlanetData(apiData, "north_node"),
      southNode: transformPlanetData(apiData, "south_node"),
      chiron: transformPlanetData(apiData, "chiron")
    };
    try {
      planets.lilith = transformPlanetData(apiData, "lilith");
    } catch {
    }
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
      lilith: planets.lilith,
      houses: transformHousesData(apiData),
      aspects: transformAspectsData(apiData),
      elements: calculateElementDistribution(planets),
      modalities: calculateModalityDistribution(planets),
      calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: this.name
    };
    try {
      await import_redis.redisClient.setEx(cacheKey, CHART_CACHE_TTL, JSON.stringify(chart));
      console.log(`[Astrology-API] Cached chart for ${cacheKey}`);
    } catch (error) {
      console.warn("[Astrology-API] Cache write error:", error);
    }
    return chart;
  }
  async getTransits(date, options) {
    const cacheKey = generateCacheKey("transits", date);
    try {
      const cached = await import_redis.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn("[Astrology-API] Cache read error:", error);
    }
    const [year, month, day] = date.split("-").map(Number);
    const apiData = await this.makeRequest("/transits", {
      year,
      month,
      day,
      hour: 12,
      minute: 0,
      latitude: options?.latitude || 0,
      longitude: options?.longitude || 0
    });
    const transitData = {
      date,
      planets: (apiData.planets || []).map((p) => ({
        name: p.name,
        sign: p.sign,
        degree: parseFloat(p.degree || 0),
        retrograde: p.retrograde === true
      })),
      aspects: (apiData.aspects || []).map((a) => ({
        planet1: a.planet1,
        planet2: a.planet2,
        aspect: a.aspect_type || a.type,
        orb: parseFloat(a.orb || 0)
      }))
    };
    try {
      await import_redis.redisClient.setEx(cacheKey, 3600, JSON.stringify(transitData));
    } catch (error) {
      console.warn("[Astrology-API] Cache write error:", error);
    }
    return transitData;
  }
  /**
   * Calculate relationship synastry between two people
   * US-24: Relationship Dynamics Engine
   */
  async calculateSynastry(person1, person2) {
    const cacheKey = generateCacheKey(
      "synastry",
      person1.year,
      person1.month,
      person1.day,
      person2.year,
      person2.month,
      person2.day
    );
    try {
      const cached = await import_redis.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn("[Astrology-API] Cache read error:", error);
    }
    const apiData = await this.makeRequest("/synastry", {
      person1: {
        year: person1.year,
        month: person1.month,
        day: person1.day,
        hour: person1.hour,
        minute: person1.minute,
        latitude: person1.latitude,
        longitude: person1.longitude
      },
      person2: {
        year: person2.year,
        month: person2.month,
        day: person2.day,
        hour: person2.hour,
        minute: person2.minute,
        latitude: person2.latitude,
        longitude: person2.longitude
      }
    });
    const [chart1, chart2] = await Promise.all([
      this.calculateNatalChart(person1),
      this.calculateNatalChart(person2)
    ]);
    const synastryData = {
      person1: { chart: chart1 },
      person2: { chart: chart2 },
      compatibility: {
        overall: apiData.compatibility?.overall || 70,
        emotional: apiData.compatibility?.emotional || 70,
        communication: apiData.compatibility?.communication || 70,
        physical: apiData.compatibility?.physical || 70
      },
      aspects: transformAspectsData(apiData)
    };
    try {
      await import_redis.redisClient.setEx(cacheKey, CHART_CACHE_TTL, JSON.stringify(synastryData));
    } catch (error) {
      console.warn("[Astrology-API] Cache write error:", error);
    }
    return synastryData;
  }
  // ============================================
  // Advanced Tools (The Elite 5)
  // ============================================
  async getProgressions(birthData, targetDate, options) {
    const apiData = await this.makeRequest("/progressed-chart", {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour,
      minute: birthData.minute,
      latitude: birthData.latitude,
      longitude: birthData.longitude,
      target_date: targetDate
    });
    return {
      progressedDate: targetDate,
      planets: [],
      // Mocking for provider fallback shape for now
      houses: [],
      aspects: [],
      moonPhase: { phase: "unknown", illumination: 0, age: 0, angle: 0 }
    };
  }
  async getSolarReturn(birthData, year, options) {
    const apiData = await this.makeRequest("/solar-return", {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour,
      minute: birthData.minute,
      latitude: birthData.latitude,
      longitude: birthData.longitude,
      return_year: year
    });
    return {
      returnDate: `${year}-01-01`,
      exactTime: "00:00:00",
      planets: [],
      houses: [],
      aspects: []
    };
  }
  async getRelocation(birthData, targetLocation, options) {
    const apiData = await this.makeRequest("/astrocartography", {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour,
      minute: birthData.minute,
      latitude: birthData.latitude,
      longitude: birthData.longitude,
      target_lat: targetLocation.latitude,
      target_lon: targetLocation.longitude
    });
    return {
      targetLocation: { city: "Target", latitude: targetLocation.latitude, longitude: targetLocation.longitude },
      lines: []
    };
  }
  async getCompositeChart(person1, person2, options) {
    const apiData = await this.makeRequest("/composite-chart", {
      person1: { ...person1 },
      person2: { ...person2 }
    });
    return {
      midpointDate: "2025-01-01",
      midpointLocation: { latitude: 0, longitude: 0 },
      planets: [],
      houses: [],
      aspects: []
    };
  }
  async getVenusReturn(birthData, year, options) {
    const apiData = await this.makeRequest("/venus-return", {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour,
      minute: birthData.minute,
      latitude: birthData.latitude,
      longitude: birthData.longitude,
      return_year: year
    });
    return {
      returnDate: `${year}-01-01`,
      exactTime: "00:00:00",
      themes: ["love", "beauty", "harmony"]
    };
  }
  async getLunarReturn(birthData, year, month, options) {
    const apiData = await this.makeRequest("/lunar-return", {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour,
      minute: birthData.minute,
      latitude: birthData.latitude,
      longitude: birthData.longitude,
      return_year: year,
      return_month: month
    });
    return {
      returnDate: `${year}-${String(month).padStart(2, "0")}-01`,
      exactTime: apiData?.exact_time || "00:00:00",
      planets: apiData?.planets ? this.transformPlanetsArray(apiData.planets) : [],
      houses: apiData?.houses ? transformHousesData(apiData) : [],
      aspects: apiData?.aspects ? transformAspectsData(apiData) : []
    };
  }
  async getSolarArcDirections(birthData, targetDate, options) {
    const apiData = await this.makeRequest("/solar-arc", {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour,
      minute: birthData.minute,
      latitude: birthData.latitude,
      longitude: birthData.longitude,
      target_date: targetDate
    });
    return {
      progressedDate: targetDate,
      arcDegrees: apiData?.arc_degrees || 0,
      planets: apiData?.planets ? this.transformPlanetsArray(apiData.planets) : [],
      aspects: apiData?.aspects ? transformAspectsData(apiData) : []
    };
  }
  transformPlanetsArray(planets) {
    return planets.map((p) => {
      const sign = p.sign || p.zodiac_sign || "Unknown";
      return {
        name: p.name || "",
        sign,
        signBg: SIGN_TRANSLATIONS[sign] || sign,
        degree: parseFloat(p.degree || 0),
        house: parseInt(p.house || 1, 10),
        retrograde: p.retrograde === true || p.is_retrograde === true,
        symbol: PLANET_SYMBOLS[p.name?.toLowerCase() || ""] || ""
      };
    });
  }
}
function createAstrologyAPIProvider() {
  return new AstrologyAPIProvider();
}
var astrology_api_provider_default = AstrologyAPIProvider;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AstrologyAPIProvider,
  createAstrologyAPIProvider
});
