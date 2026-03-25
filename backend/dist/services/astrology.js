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
var astrology_exports = {};
__export(astrology_exports, {
  calculateNatalChart: () => calculateNatalChart,
  checkAstrologyApiHealth: () => checkAstrologyApiHealth,
  generatePositionBasedCacheKey: () => generatePositionBasedCacheKey,
  getCachedChart: () => getCachedChart,
  invalidateChartCache: () => invalidateChartCache
});
module.exports = __toCommonJS(astrology_exports);
const ASTROLOGY_API_URL = process.env.ASTROLOGY_API_URL || "https://api.astrology-api.io";
const ASTROLOGY_API_KEY = process.env.ASTROLOGY_API_KEY;
const CHART_CACHE_TTL = 2592e3;
const CHART_CACHE_TTL_LEGACY = 86400;
const CHART_CACHE_TTL_ASPECT = 7776e3;
const ZODIAC_ORDER = [
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
const MAJOR_ASPECTS = {
  conjunction: { angle: 0, maxOrb: 10 },
  opposition: { angle: 180, maxOrb: 10 },
  trine: { angle: 120, maxOrb: 8 },
  square: { angle: 90, maxOrb: 8 },
  sextile: { angle: 60, maxOrb: 6 }
};
const ASPECT_PLANETS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto"
];
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
const SIGN_ABBR_TO_FULL = {
  Ari: "Aries",
  Tau: "Taurus",
  Gem: "Gemini",
  Can: "Cancer",
  Leo: "Leo",
  Vir: "Virgo",
  Lib: "Libra",
  Sco: "Scorpio",
  Sag: "Sagittarius",
  Cap: "Capricorn",
  Aqu: "Aquarius",
  Pis: "Pisces"
};
const COUNTRY_TO_CODE = {
  "Greece": "GR",
  "Bulgaria": "BG",
  "Germany": "DE",
  "France": "FR",
  "United Kingdom": "GB",
  "UK": "GB",
  "Great Britain": "GB",
  "United States": "US",
  "USA": "US",
  "Italy": "IT",
  "Spain": "ES",
  "Russia": "RU",
  "Turkey": "TR",
  "Romania": "RO",
  "Serbia": "RS",
  "North Macedonia": "MK",
  "Macedonia": "MK",
  "Albania": "AL",
  "Croatia": "HR",
  "Bosnia and Herzegovina": "BA",
  "Bosnia": "BA",
  "Montenegro": "ME",
  "Slovenia": "SI",
  "Austria": "AT",
  "Netherlands": "NL",
  "Belgium": "BE",
  "Switzerland": "CH",
  "Poland": "PL",
  "Czech Republic": "CZ",
  "Czechia": "CZ",
  "Hungary": "HU",
  "Slovakia": "SK",
  "Ukraine": "UA",
  "Belarus": "BY",
  "Sweden": "SE",
  "Norway": "NO",
  "Denmark": "DK",
  "Finland": "FI",
  "Portugal": "PT",
  "Canada": "CA",
  "Australia": "AU",
  "China": "CN",
  "Japan": "JP",
  "India": "IN",
  "Brazil": "BR",
  "Mexico": "MX",
  "Argentina": "AR",
  "South Africa": "ZA",
  "Egypt": "EG",
  "Israel": "IL",
  "UAE": "AE",
  "United Arab Emirates": "AE",
  "Saudi Arabia": "SA"
};
function parseLocationForV3(locationName) {
  const parts = locationName.split(",").map((p) => p.trim());
  const city = parts[0] || locationName;
  const country = parts[parts.length - 1] || "";
  const countryCode = COUNTRY_TO_CODE[country];
  if (!countryCode) {
    throw new Error(`[Astrology] Unknown country "${country}" in locationName "${locationName}". Add it to COUNTRY_TO_CODE.`);
  }
  return { city, countryCode };
}
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
function generateCacheKey(birthData) {
  const { year, month, day, hour, minute, latitude, longitude } = birthData;
  const lat = latitude.toFixed(4);
  const lon = longitude.toFixed(4);
  return `natal_chart:${year}-${month}-${day}:${hour}:${minute}:${lat}:${lon}`;
}
function generatePositionBasedCacheKey(chart) {
  const planetAbbr = {
    sun: "Sun",
    moon: "Moon",
    mercury: "Mer",
    venus: "Ven",
    mars: "Mar",
    jupiter: "Jup",
    saturn: "Sat",
    uranus: "Ura",
    neptune: "Nep",
    pluto: "Plu"
  };
  const signAbbr = {
    Aries: "Ari",
    Taurus: "Tau",
    Gemini: "Gem",
    Cancer: "Can",
    Leo: "Leo",
    Virgo: "Vir",
    Libra: "Lib",
    Scorpio: "Sco",
    Sagittarius: "Sag",
    Capricorn: "Cap",
    Aquarius: "Aqu",
    Pisces: "Pis"
  };
  const planetKeys = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const parts = [];
  planetKeys.forEach((planetKey) => {
    const planet = chart[planetKey];
    if (planet) {
      const abbr = planetAbbr[planetKey] || planetKey.substring(0, 3);
      const sign = signAbbr[planet.sign] || planet.sign.substring(0, 3);
      const degree = Math.round(planet.degree);
      parts.push(`${abbr}:${sign}${degree}`);
    }
  });
  if (chart.rising) {
    const sign = signAbbr[chart.rising.sign] || chart.rising.sign.substring(0, 3);
    const degree = Math.round(chart.rising.degree);
    parts.push(`Asc:${sign}${degree}`);
  }
  const mcHouse = chart.houses.find((h) => h.number === 10);
  if (mcHouse) {
    const sign = signAbbr[mcHouse.sign] || mcHouse.sign.substring(0, 3);
    const degree = Math.round(mcHouse.degree % 30);
    parts.push(`MC:${sign}${degree}`);
  }
  return `chart_pos:${parts.join("|")}`;
}
function computeAspects(chart) {
  const aspects = [];
  const getLongitude = (planet) => {
    const signIndex = ZODIAC_ORDER.indexOf(planet.sign);
    return signIndex >= 0 ? signIndex * 30 + planet.degree : planet.degree;
  };
  const planetPositions = {};
  ASPECT_PLANETS.forEach((planetKey) => {
    const planet = chart[planetKey];
    if (planet) {
      planetPositions[planetKey] = getLongitude(planet);
    }
  });
  if (chart.rising) {
    planetPositions["Ascendant"] = getLongitude(chart.rising);
  }
  const mcHouse = chart.houses.find((h) => h.number === 10);
  if (mcHouse) {
    planetPositions["Midheaven"] = getLongitude(mcHouse);
  }
  const planetList = Object.keys(planetPositions);
  for (let i = 0; i < planetList.length; i++) {
    for (let j = i + 1; j < planetList.length; j++) {
      const p1 = planetList[i];
      const p2 = planetList[j];
      const lon1 = planetPositions[p1];
      const lon2 = planetPositions[p2];
      let diff = Math.abs(lon1 - lon2);
      if (diff > 180) diff = 360 - diff;
      for (const [aspectType, { angle, maxOrb }] of Object.entries(MAJOR_ASPECTS)) {
        const orb = Math.abs(diff - angle);
        if (orb <= maxOrb) {
          const orbBucket = Math.round(orb);
          aspects.push({
            planet1: p1 < p2 ? p1 : p2,
            // Sort planet names for consistency
            planet2: p1 < p2 ? p2 : p1,
            aspectType,
            orb,
            orbBucket
          });
          break;
        }
      }
    }
  }
  return aspects;
}
async function generateAspectCacheKey(chart) {
  const aspects = computeAspects(chart);
  aspects.sort((a, b) => {
    if (a.planet1 !== b.planet1) return a.planet1.localeCompare(b.planet1);
    if (a.planet2 !== b.planet2) return a.planet2.localeCompare(b.planet2);
    return a.aspectType.localeCompare(b.aspectType);
  });
  const signature = aspects.map((a) => `${a.planet1}|${a.planet2}|${a.aspectType}|${a.orbBucket}`).join(";");
  const encoder = new TextEncoder();
  const data = encoder.encode(signature);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `natal_aspect_v1:${hashHex}`;
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
async function calculateNatalChart(birthData) {
  if (!process.env.ASTROLOGY_API_KEY) {
    throw new Error("[Astrology] ASTROLOGY_API_KEY is not configured \u2014 cannot calculate chart");
  }
  const hasCoords = birthData.latitude != null && birthData.longitude != null && !!birthData.timezone;
  const hasLocationName = !!birthData.locationName;
  if (!hasCoords && !hasLocationName) {
    throw new Error(
      "[Astrology] Birth location required \u2014 provide latitude, longitude, and timezone (or locationName)"
    );
  }
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
      timezone: birthData.timezone
    };
  } else {
    const parsed = parseLocationForV3(birthData.locationName);
    birthDataPayload = {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour,
      minute: birthData.minute,
      second: 0,
      city: parsed.city,
      country_code: parsed.countryCode
    };
  }
  const apiUrl = process.env.ASTROLOGY_API_URL || "https://api.astrology-api.io";
  const apiKey = process.env.ASTROLOGY_API_KEY;
  const response = await fetch(`${apiUrl}/api/v3/charts/natal`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "AstrologaAI/1.0"
    },
    body: JSON.stringify({
      subject: {
        name: "subject",
        birth_data: birthDataPayload
      },
      options: {
        house_system: "P",
        zodiac_type: "Tropic",
        active_points: ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "True_Node", "Chiron"],
        precision: 4
      }
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Astrology] API error: ${response.status} - ${errorText}`);
    throw new Error(`Astrology API error: ${response.status}`);
  }
  const apiData = await response.json();
  const planetLookup = {};
  for (const p of apiData.chart_data?.planetary_positions || []) {
    planetLookup[p.name] = p;
  }
  const API_NAME_TO_KEY = {
    Sun: "sun",
    Moon: "moon",
    Mercury: "mercury",
    Venus: "venus",
    Mars: "mars",
    Jupiter: "jupiter",
    Saturn: "saturn",
    Uranus: "uranus",
    Neptune: "neptune",
    Pluto: "pluto",
    True_Node: "northNode",
    Chiron: "chiron"
  };
  const transformV3Planet = (p, key) => {
    const sign = SIGN_ABBR_TO_FULL[p.sign] || p.sign;
    return {
      name: key,
      sign,
      signBg: SIGN_TRANSLATIONS[sign] || sign,
      degree: parseFloat(p.degree ?? 0),
      house: parseInt(p.house ?? 1, 10),
      retrograde: p.is_retrograde === true,
      symbol: PLANET_SYMBOLS[key] || ""
    };
  };
  const ascData = apiData.subject_data?.ascendant;
  const ascSign = SIGN_ABBR_TO_FULL[ascData?.sign] || ascData?.sign || "Aries";
  const rising = {
    name: "rising",
    sign: ascSign,
    signBg: SIGN_TRANSLATIONS[ascSign] || ascSign,
    degree: parseFloat(ascData?.position ?? 0),
    house: 1,
    retrograde: false,
    symbol: "ASC"
  };
  const planets = { rising };
  for (const [apiName, key] of Object.entries(API_NAME_TO_KEY)) {
    const p = planetLookup[apiName];
    if (p) {
      planets[key] = transformV3Planet(p, key);
    }
  }
  const nnData = planetLookup["True_Node"];
  if (nnData) {
    const nnAbs = parseFloat(nnData.absolute_longitude ?? 0);
    const snAbs = (nnAbs + 180) % 360;
    const snSignIdx = Math.floor(snAbs / 30);
    const snSign = ZODIAC_ORDER[snSignIdx] || "Libra";
    const snDegree = snAbs % 30;
    const nnHouse = parseInt(nnData.house ?? 1, 10);
    const snHouse = (nnHouse - 1 + 6) % 12 + 1;
    planets.southNode = {
      name: "southNode",
      sign: snSign,
      signBg: SIGN_TRANSLATIONS[snSign] || snSign,
      degree: snDegree,
      house: snHouse,
      retrograde: true,
      symbol: "\u260B"
    };
  } else {
    planets.southNode = {
      name: "southNode",
      sign: "Libra",
      signBg: "\u0412\u0435\u0437\u043D\u0438",
      degree: 0,
      house: 7,
      retrograde: true,
      symbol: "\u260B"
    };
  }
  const houses = (apiData.chart_data?.house_cusps || []).map((h) => {
    const sign = SIGN_ABBR_TO_FULL[h.sign] || h.sign;
    return {
      number: parseInt(h.house, 10),
      sign,
      signBg: SIGN_TRANSLATIONS[sign] || sign,
      degree: parseFloat(h.degree ?? 0)
    };
  });
  const aspects = (apiData.chart_data?.aspects || []).map((a) => {
    const aspectType = (a.aspect_type || "conjunction").toLowerCase();
    const p1 = (a.point1 || "").toLowerCase().replace("true_node", "northNode");
    const p2 = (a.point2 || "").toLowerCase().replace("true_node", "northNode");
    return {
      planet1: p1,
      planet2: p2,
      aspect: aspectType,
      aspectBg: ASPECT_TRANSLATIONS[aspectType] || aspectType,
      orb: parseFloat(a.orb ?? 0),
      nature: ASPECT_NATURE[aspectType] || "neutral"
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
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    source: "astrology-api.io-v3"
  };
  return chart;
}
async function getCachedChart(_birthData) {
  return null;
}
async function invalidateChartCache(_birthData) {
}
async function checkAstrologyApiHealth() {
  if (!ASTROLOGY_API_KEY) {
    return false;
  }
  try {
    const response = await fetch(`${ASTROLOGY_API_URL}/health`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${ASTROLOGY_API_KEY}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateNatalChart,
  checkAstrologyApiHealth,
  generatePositionBasedCacheKey,
  getCachedChart,
  invalidateChartCache
});
