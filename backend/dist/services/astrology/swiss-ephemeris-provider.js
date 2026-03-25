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
var swiss_ephemeris_provider_exports = {};
__export(swiss_ephemeris_provider_exports, {
  SwissEphemerisProvider: () => SwissEphemerisProvider,
  createSwissEphemerisProvider: () => createSwissEphemerisProvider,
  default: () => swiss_ephemeris_provider_default
});
module.exports = __toCommonJS(swiss_ephemeris_provider_exports);
var import_astrology_provider = require("./astrology-provider.interface");
var import_redis = require("../../utils/redis");
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
  opposition: "\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044F"
};
const ASPECT_NATURE = {
  conjunction: "neutral",
  sextile: "harmonious",
  square: "challenging",
  trine: "harmonious",
  opposition: "challenging"
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
const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];
function calculateJulianDay(year, month, day, hour, minute) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  const decimalHour = hour + minute / 60;
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5 + decimalHour / 24;
}
function calculateSunPosition(jd) {
  const T = (jd - 2451545) / 36525;
  let L0 = 280.46646 + 36000.76983 * T + 3032e-7 * T * T;
  L0 = L0 % 360;
  let M = 357.52911 + 35999.05029 * T - 1537e-7 * T * T;
  M = M % 360;
  const Mrad = M * Math.PI / 180;
  const C = (1.914602 - 4817e-6 * T - 14e-6 * T * T) * Math.sin(Mrad) + (0.019993 - 101e-6 * T) * Math.sin(2 * Mrad) + 289e-6 * Math.sin(3 * Mrad);
  const sunLong = L0 + C;
  return sunLong;
}
function calculateMoonPosition(jd) {
  const T = (jd - 2451545) / 36525;
  let Lm = 218.3164477 + 481267.88123421 * T - 15786e-7 * T * T;
  Lm = Lm % 360;
  let D = 297.8501921 + 445267.1114034 * T - 18819e-7 * T * T;
  D = D % 360;
  let Ms = 357.5291092 + 35999.0502909 * T - 1536e-7 * T * T;
  Ms = Ms % 360;
  let Mm = 134.9633964 + 477198.8675055 * T + 87414e-7 * T * T;
  Mm = Mm % 360;
  const Drad = D * Math.PI / 180;
  const Msrad = Ms * Math.PI / 180;
  const Mmrad = Mm * Math.PI / 180;
  const corrections = 6.288774 * Math.sin(Mmrad) + 1.274027 * Math.sin(2 * Drad - Mmrad) + 0.658314 * Math.sin(2 * Drad) + 0.213618 * Math.sin(2 * Mmrad) - 0.185116 * Math.sin(Msrad) - 0.114332 * Math.sin(2 * Drad);
  return Lm + corrections;
}
function calculateMercuryPosition(jd) {
  const T = (jd - 2451545) / 36525;
  let L = 252.2509 + 149474.0722 * T;
  return L % 360;
}
function calculateVenusPosition(jd) {
  const T = (jd - 2451545) / 36525;
  let L = 181.9798 + 58519.213 * T;
  return L % 360;
}
function calculateMarsPosition(jd) {
  const T = (jd - 2451545) / 36525;
  let L = 355.433 + 19141.6964 * T;
  return L % 360;
}
function calculateJupiterPosition(jd) {
  const T = (jd - 2451545) / 36525;
  let L = 34.3515 + 3036.3027 * T;
  return L % 360;
}
function calculateSaturnPosition(jd) {
  const T = (jd - 2451545) / 36525;
  let L = 50.0774 + 1223.511 * T;
  return L % 360;
}
function calculateUranusPosition(jd) {
  const T = (jd - 2451545) / 36525;
  let L = 314.055 + 429.864 * T;
  return L % 360;
}
function calculateNeptunePosition(jd) {
  const T = (jd - 2451545) / 36525;
  let L = 304.349 + 219.8833 * T;
  return L % 360;
}
function calculatePlutoPosition(jd) {
  const T = (jd - 2451545) / 36525;
  let L = 238.929 + 145.2078 * T;
  return L % 360;
}
function calculateAscendant(jd, latitude, longitude) {
  const T = (jd - 2451545) / 36525;
  let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545) + 387933e-9 * T * T;
  GMST = GMST % 360;
  const LST = GMST + longitude;
  const latRad = latitude * Math.PI / 180;
  const lstRad = LST * Math.PI / 180;
  const obliquity = 23.439291 - 0.0130042 * T;
  const oblRad = obliquity * Math.PI / 180;
  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad);
  let ascendant = Math.atan2(y, x) * 180 / Math.PI;
  if (ascendant < 0) ascendant += 360;
  return ascendant;
}
function getSignFromDegree(degree) {
  const normalizedDegree = (degree % 360 + 360) % 360;
  const signIndex = Math.floor(normalizedDegree / 30);
  return ZODIAC_SIGNS[signIndex];
}
function getDegreeInSign(degree) {
  const normalizedDegree = (degree % 360 + 360) % 360;
  return normalizedDegree % 30;
}
function calculateHouses(ascendantDegree) {
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const cuspDegree = (ascendantDegree + i * 30) % 360;
    const sign = getSignFromDegree(cuspDegree);
    houses.push({
      number: i + 1,
      sign,
      signBg: SIGN_TRANSLATIONS[sign] || sign,
      degree: getDegreeInSign(cuspDegree)
    });
  }
  return houses;
}
function getHouseFromDegree(degree, houses) {
  const normalizedDegree = (degree % 360 + 360) % 360;
  return Math.floor(normalizedDegree / 30) + 1;
}
function calculateAspects(planets) {
  const aspects = [];
  const planetList = Object.entries(planets);
  const aspectOrbs = {
    conjunction: 8,
    sextile: 6,
    square: 6,
    trine: 6,
    opposition: 8
  };
  for (let i = 0; i < planetList.length; i++) {
    for (let j = i + 1; j < planetList.length; j++) {
      const [name1, p1] = planetList[i];
      const [name2, p2] = planetList[j];
      if (name1 === "lilith" || name2 === "lilith") continue;
      if (name1 === "chiron" || name2 === "chiron") continue;
      const diff = Math.abs(p1.degree - p2.degree);
      const normalizedDiff = Math.min(diff, 360 - diff);
      const aspectTypes = [
        { name: "conjunction", angle: 0 },
        { name: "sextile", angle: 60 },
        { name: "square", angle: 90 },
        { name: "trine", angle: 120 },
        { name: "opposition", angle: 180 }
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
            nature: ASPECT_NATURE[aspectType.name] || "neutral"
          });
          break;
        }
      }
    }
  }
  return aspects;
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
class SwissEphemerisProvider extends import_astrology_provider.BaseAstrologyProvider {
  constructor() {
    super(...arguments);
    this.name = "swiss-ephemeris-fallback";
    this.type = import_astrology_provider.AstrologyProviderType.SECONDARY;
    this.endpoint = "local";
  }
  isAvailable() {
    return true;
  }
  async calculateNatalChart(birthData, options) {
    const startTime = Date.now();
    const cacheKey = `astrology:fallback:natal:${birthData.year}-${birthData.month}-${birthData.day}:${birthData.hour}:${birthData.minute}:${birthData.latitude.toFixed(4)}:${birthData.longitude.toFixed(4)}`;
    try {
      const cached = await import_redis.redisClient.get(cacheKey);
      if (cached) {
        console.log(`[Swiss-Fallback] Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn("[Swiss-Fallback] Cache read error:", error);
    }
    const jd = calculateJulianDay(
      birthData.year,
      birthData.month,
      birthData.day,
      birthData.hour,
      birthData.minute
    );
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
    const createPosition = (name, degree, isRetrograde = false) => {
      const sign = getSignFromDegree(degree);
      return {
        name,
        sign,
        signBg: SIGN_TRANSLATIONS[sign] || sign,
        degree: getDegreeInSign(degree),
        house: getHouseFromDegree(degree, []),
        retrograde: isRetrograde,
        symbol: PLANET_SYMBOLS[name] || ""
      };
    };
    const T = (jd - 2451545) / 36525;
    let northNodeDeg = 125.04452 - 1934.136261 * T;
    northNodeDeg = (northNodeDeg % 360 + 360) % 360;
    const southNodeDeg = (northNodeDeg + 180) % 360;
    let chironDeg = 207.5917 + 14.1594 * T;
    chironDeg = (chironDeg % 360 + 360) % 360;
    const planets = {
      sun: createPosition("sun", sunDeg),
      moon: createPosition("moon", moonDeg),
      rising: createPosition("rising", ascendantDeg),
      mercury: createPosition("mercury", mercuryDeg),
      venus: createPosition("venus", venusDeg),
      mars: createPosition("mars", marsDeg),
      jupiter: createPosition("jupiter", jupiterDeg),
      saturn: createPosition("saturn", saturnDeg, true),
      uranus: createPosition("uranus", uranusDeg, true),
      neptune: createPosition("neptune", neptuneDeg, true),
      pluto: createPosition("pluto", plutoDeg, true),
      northNode: createPosition("northNode", northNodeDeg),
      southNode: createPosition("southNode", southNodeDeg),
      chiron: createPosition("chiron", chironDeg)
    };
    const houses = calculateHouses(ascendantDeg);
    Object.keys(planets).forEach((name) => {
      if (name !== "rising") {
        planets[name].house = getHouseFromDegree(
          name === "sun" ? sunDeg : name === "moon" ? moonDeg : name === "mercury" ? mercuryDeg : name === "venus" ? venusDeg : name === "mars" ? marsDeg : name === "jupiter" ? jupiterDeg : name === "saturn" ? saturnDeg : name === "uranus" ? uranusDeg : name === "neptune" ? neptuneDeg : name === "pluto" ? plutoDeg : name === "northNode" ? northNodeDeg : name === "southNode" ? southNodeDeg : chironDeg,
          houses
        );
      }
    });
    planets.rising.house = 1;
    const aspects = calculateAspects(planets);
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
      calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: this.name
    };
    const latencyMs = Date.now() - startTime;
    this.updateHealth(import_astrology_provider.AstrologyProviderStatus.HEALTHY, latencyMs);
    this.recordRequest(true, latencyMs);
    try {
      await import_redis.redisClient.setEx(cacheKey, CHART_CACHE_TTL, JSON.stringify(chart));
    } catch (error) {
      console.warn("[Swiss-Fallback] Cache write error:", error);
    }
    return chart;
  }
  async getTransits(date, options) {
    const startTime = Date.now();
    const [year, month, day] = date.split("-").map(Number);
    const jd = calculateJulianDay(year, month, day, 12, 0);
    const transitData = {
      date,
      planets: [
        { name: "sun", sign: getSignFromDegree(calculateSunPosition(jd)), degree: getDegreeInSign(calculateSunPosition(jd)), retrograde: false },
        { name: "moon", sign: getSignFromDegree(calculateMoonPosition(jd)), degree: getDegreeInSign(calculateMoonPosition(jd)), retrograde: false },
        { name: "mercury", sign: getSignFromDegree(calculateMercuryPosition(jd)), degree: getDegreeInSign(calculateMercuryPosition(jd)), retrograde: false },
        { name: "venus", sign: getSignFromDegree(calculateVenusPosition(jd)), degree: getDegreeInSign(calculateVenusPosition(jd)), retrograde: false },
        { name: "mars", sign: getSignFromDegree(calculateMarsPosition(jd)), degree: getDegreeInSign(calculateMarsPosition(jd)), retrograde: false }
      ],
      aspects: []
    };
    const latencyMs = Date.now() - startTime;
    this.updateHealth(import_astrology_provider.AstrologyProviderStatus.HEALTHY, latencyMs);
    this.recordRequest(true, latencyMs);
    return transitData;
  }
  async calculateSynastry(birthData1, birthData2) {
    const [chart1, chart2] = await Promise.all([
      this.calculateNatalChart(birthData1),
      this.calculateNatalChart(birthData2)
    ]);
    const sunSigns = [chart1.sun.sign, chart2.sun.sign];
    const moonSigns = [chart1.moon.sign, chart2.moon.sign];
    const elementCompatibility = {
      fire: { fire: 90, earth: 50, air: 80, water: 40 },
      earth: { fire: 50, earth: 90, air: 60, water: 80 },
      air: { fire: 80, earth: 60, air: 90, water: 50 },
      water: { fire: 40, earth: 80, air: 50, water: 90 }
    };
    const sun1Element = SIGN_ELEMENTS[chart1.sun.sign] || "fire";
    const sun2Element = SIGN_ELEMENTS[chart2.sun.sign] || "fire";
    const moon1Element = SIGN_ELEMENTS[chart1.moon.sign] || "water";
    const moon2Element = SIGN_ELEMENTS[chart2.moon.sign] || "water";
    const overall = Math.round((elementCompatibility[sun1Element][sun2Element] + elementCompatibility[moon1Element][moon2Element]) / 2);
    return {
      person1: { chart: chart1 },
      person2: { chart: chart2 },
      compatibility: {
        overall,
        emotional: elementCompatibility[moon1Element][moon2Element],
        communication: 70,
        physical: 75
      },
      aspects: []
    };
  }
  // ============================================
  // Advanced Tools Fallbacks (Swiss Ephemeris does not support these)
  // ============================================
  async getProgressions(birthData, targetDate, options) {
    throw new Error("Progressions not supported in offline fallback");
  }
  async getSolarReturn(birthData, returnYear, options) {
    throw new Error("Solar Return not supported in offline fallback");
  }
  async getRelocation(birthData, targetLocation, options) {
    throw new Error("Astrocartography not supported in offline fallback");
  }
  async getCompositeChart(person1, person2, options) {
    throw new Error("Composite charts not supported in offline fallback");
  }
  async getVenusReturn(birthData, returnYear, options) {
    throw new Error("Venus Return not supported in offline fallback");
  }
  async getLunarReturn(birthData, year, month, options) {
    throw new Error("Lunar Return not supported in offline fallback");
  }
  async getSolarArcDirections(birthData, targetDate, options) {
    throw new Error("Solar Arc Directions not supported in offline fallback");
  }
}
function createSwissEphemerisProvider() {
  return new SwissEphemerisProvider();
}
var swiss_ephemeris_provider_default = SwissEphemerisProvider;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SwissEphemerisProvider,
  createSwissEphemerisProvider
});
