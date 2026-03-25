"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var forecast_exports = {};
__export(forecast_exports, {
  generateDailyForecast: () => generateDailyForecast,
  generateWeeklyForecast: () => generateWeeklyForecast,
  getDailyForecast: () => getDailyForecast,
  getPersonalDailyHoroscope: () => getPersonalDailyHoroscope,
  getWeeklyForecast: () => getWeeklyForecast
});
module.exports = __toCommonJS(forecast_exports);
var import_redis = require("../utils/redis");
var import_astrology = require("./astrology");
var import_llm = require("./llm");
var import_forecast_cron = require("./forecast-cron");
const FORECAST_CACHE_TTL = 43200;
const WEEKLY_CACHE_TTL = 604800;
const PLANET_TRANSLATIONS = {
  sun: "\u0421\u043B\u044A\u043D\u0446\u0435",
  moon: "\u041B\u0443\u043D\u0430",
  mercury: "\u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439",
  venus: "\u0412\u0435\u043D\u0435\u0440\u0430",
  mars: "\u041C\u0430\u0440\u0441",
  jupiter: "\u042E\u043F\u0438\u0442\u0435\u0440",
  saturn: "\u0421\u0430\u0442\u0443\u0440\u043D",
  uranus: "\u0423\u0440\u0430\u043D",
  neptune: "\u041D\u0435\u043F\u0442\u0443\u043D",
  pluto: "\u041F\u043B\u0443\u0442\u043E\u043D",
  northNode: "\u0421\u0435\u0432\u0435\u0440\u0435\u043D \u0412\u044A\u0437\u0435\u043B",
  southNode: "\u042E\u0436\u0435\u043D \u0412\u044A\u0437\u0435\u043B"
};
const MOON_PHASE_TRANSLATIONS = {
  "New Moon": "\u041D\u043E\u0432\u043E\u043B\u0443\u043D\u0438\u0435",
  "Waxing Crescent": "\u041D\u0430\u0440\u0430\u0441\u0442\u0432\u0430\u0449 \u043F\u043E\u043B\u0443\u043C\u0435\u0441\u0435\u0446",
  "First Quarter": "\u041F\u044A\u0440\u0432\u0430 \u0447\u0435\u0442\u0432\u044A\u0440\u0442",
  "Waxing Gibbous": "\u041D\u0430\u0440\u0430\u0441\u0442\u0432\u0430\u0449 \u0442\u0440\u0438\u044A\u0433\u044A\u043B\u043D\u0438\u043A",
  "Full Moon": "\u041F\u044A\u043B\u043D\u043E\u043B\u0443\u043D\u0438\u0435",
  "Waning Gibbous": "\u041D\u0430\u043C\u0430\u043B\u044F\u0432\u0430\u0449 \u0442\u0440\u0438\u044A\u0433\u044A\u043B\u043D\u0438\u043A",
  "Last Quarter": "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0430 \u0447\u0435\u0442\u0432\u044A\u0440\u0442",
  "Waning Crescent": "\u041D\u0430\u043C\u0430\u043B\u044F\u0432\u0430\u0449 \u043F\u043E\u043B\u0443\u043C\u0435\u0441\u0435\u0446"
};
const SIGN_TRANSLATIONS_FULL = {
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
function getTodayDateString() {
  const now = /* @__PURE__ */ new Date();
  const Sofia = "Europe/Sofia";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: Sofia,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(now);
}
function getWeekStartDateString() {
  const now = /* @__PURE__ */ new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(monday);
}
function deriveMoonPhaseFromTransits(transits) {
  const SIGNS = [
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
  const PHASE_NAMES = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent"
  ];
  const PHASE_BG = [
    "\u041D\u043E\u0432\u043E\u043B\u0443\u043D\u0438\u0435",
    "\u041D\u0430\u0440\u0430\u0441\u0442\u0432\u0430\u0449 \u043F\u043E\u043B\u0443\u043C\u0435\u0441\u0435\u0446",
    "\u041F\u044A\u0440\u0432\u0430 \u0447\u0435\u0442\u0432\u044A\u0440\u0442",
    "\u041D\u0430\u0440\u0430\u0441\u0442\u0432\u0430\u0449 \u0442\u0440\u0438\u044A\u0433\u044A\u043B\u043D\u0438\u043A",
    "\u041F\u044A\u043B\u043D\u043E\u043B\u0443\u043D\u0438\u0435",
    "\u041D\u0430\u043C\u0430\u043B\u044F\u0432\u0430\u0449 \u0442\u0440\u0438\u044A\u0433\u044A\u043B\u043D\u0438\u043A",
    "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0430 \u0447\u0435\u0442\u0432\u044A\u0440\u0442",
    "\u041D\u0430\u043C\u0430\u043B\u044F\u0432\u0430\u0449 \u043F\u043E\u043B\u0443\u043C\u0435\u0441\u0435\u0446"
  ];
  const sun = transits.find((t) => t.planet === "sun");
  const moon = transits.find((t) => t.planet === "moon");
  if (!sun || !moon) {
    throw new Error("[Forecast] Cannot derive moon phase: sun/moon missing from transits");
  }
  const sunLon = SIGNS.indexOf(sun.sign) * 30 + sun.degree;
  const moonLon = SIGNS.indexOf(moon.sign) * 30 + moon.degree;
  const angle = (moonLon - sunLon + 360) % 360;
  const idx = Math.min(Math.floor(angle / 45), 7);
  return {
    phase: PHASE_NAMES[idx],
    phaseBg: PHASE_BG[idx],
    illumination: Math.round((1 - Math.cos(angle * Math.PI / 180)) / 2 * 100),
    sign: moon.sign,
    signBg: moon.signBg
  };
}
function translateToBulgarian(text) {
  return text;
}
async function getCurrentTransits(natalChart) {
  const { getActiveTransitsForUser } = await import("./transits");
  const { skyPositions } = await getActiveTransitsForUser(natalChart);
  return skyPositions.map((p) => ({
    planet: p.planet,
    planetBg: p.planetBg,
    sign: p.sign,
    signBg: p.signBg,
    degree: p.degree
  }));
}
function analyzeTransitImpact(transits, natalChart) {
  return transits.map((transit) => {
    const natalPlanetRecord = natalChart[transit.planet];
    if (!natalPlanetRecord || typeof natalPlanetRecord !== "object") return transit;
    const planetPosition = natalPlanetRecord;
    const natalDegree = planetPosition.degree;
    const transitDegree = transit.degree;
    const aspectAngle = Math.abs(natalDegree - transitDegree);
    const normalizedAngle = Math.min(aspectAngle, 360 - aspectAngle);
    let aspect = "";
    let aspectBg = "";
    let influence = "neutral";
    let description = "";
    if (normalizedAngle < 8) {
      aspect = "conjunction";
      aspectBg = "\u0441\u044A\u0432\u043F\u0430\u0434";
      influence = "neutral";
      description = "\u041D\u043E\u0432\u0430 \u0435\u043D\u0435\u0440\u0433\u0438\u044F \u0438 \u0444\u043E\u043A\u0443\u0441 \u0432 \u0442\u0430\u0437\u0438 \u043E\u0431\u043B\u0430\u0441\u0442";
    } else if (normalizedAngle < 8 + 8) {
      aspect = "sextile";
      aspectBg = "\u0441\u0435\u043A\u0441\u0442\u0438\u043B";
      influence = "positive";
      description = "\u0412\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436 \u0438 \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u044F";
    } else if (normalizedAngle < 90 + 8) {
      aspect = "square";
      aspectBg = "\u043A\u0432\u0430\u0434\u0440\u0430\u0442";
      influence = "challenging";
      description = "\u041D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435 \u0438 \u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u0441\u0442\u0432\u0430";
    } else if (normalizedAngle < 120 + 8) {
      aspect = "trine";
      aspectBg = "\u0442\u0440\u0438\u0433\u043E\u043D";
      influence = "positive";
      description = "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u044F \u0438 \u043F\u043E\u0434\u043A\u0440\u0435\u043F\u0430";
    } else if (normalizedAngle < 180 + 8) {
      aspect = "opposition";
      aspectBg = "\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044F";
      influence = "challenging";
      description = "\u0411\u0430\u043B\u0430\u043D\u0441 \u043C\u0435\u0436\u0434\u0443 \u0432\u044A\u0442\u0440\u0435\u0448\u043D\u0438 \u0438 \u0432\u044A\u043D\u0448\u043D\u0438 \u0432\u043B\u0438\u044F\u043D\u0438\u044F";
    }
    if (aspect) {
      transit.aspectToNatal = {
        natalPlanet: transit.planet === "sun" ? "\u0412\u0430\u0448\u0435\u0442\u043E \u0421\u043B\u044A\u043D\u0446\u0435" : transit.planet === "moon" ? "\u0412\u0430\u0448\u0430\u0442\u0430 \u041B\u0443\u043D\u0430" : `\u0412\u0430\u0448\u0438\u044F\u0442 ${PLANET_TRANSLATIONS[transit.planet] || transit.planet}`,
        aspect,
        aspectBg,
        orb: Math.round(normalizedAngle * 10) / 10,
        influence,
        description
      };
    }
    return transit;
  });
}
async function generateLLMForecast(natalChart, transits, moonPhase, userLanguage = "bg") {
  const chartInfo = `
\u041F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u0441\u043A\u0430 \u043D\u0430\u0442\u0430\u043B\u043D\u0430 \u043A\u0430\u0440\u0442\u0430:
- \u0421\u043B\u044A\u043D\u0446\u0435: ${natalChart.sun.signBg} (${natalChart.sun.sign}) \u0432 ${natalChart.sun.house}\u0442\u0438 \u0434\u043E\u043C
- \u041B\u0443\u043D\u0430: ${natalChart.moon.signBg} (${natalChart.moon.sign}) \u0432 ${natalChart.moon.house}\u0442\u0438 \u0434\u043E\u043C
- \u0410\u0441\u0446\u0435\u043D\u0434\u0435\u043D\u0442: ${natalChart.rising.signBg} (${natalChart.rising.sign})

\u0414\u043D\u0435\u0448\u043D\u0438 \u0442\u0440\u0430\u043D\u0437\u0438\u0442\u0438:
${transits.map((t) => `- ${t.planetBg}: ${t.signBg} ${t.degree}\xB0${t.aspectToNatal ? ` - ${t.aspectToNatal.aspectBg} ${t.aspectToNatal.natalPlanet} (${t.aspectToNatal.description})` : ""}`).join("\n")}

\u041B\u0443\u043D\u043D\u0430 \u0444\u0430\u0437\u0430: ${moonPhase.phaseBg} (${moonPhase.illumination}% \u043E\u0441\u0432\u0435\u0442\u0435\u043D\u043E\u0441\u0442)
\u041B\u0443\u043D\u0435\u043D \u0437\u043D\u0430\u043A: ${moonPhase.signBg}
`;
  const systemPrompt = userLanguage === "bg" ? `\u0422\u0438 \u0441\u0438 AstroLogAI, \u0435\u043A\u0441\u043F\u0435\u0440\u0442\u0435\u043D AI \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433. \u0411\u0430\u0437\u0438\u0440\u0430\u0439 \u0441\u0435 \u043D\u0430 \u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u0441\u043A\u0430\u0442\u0430 \u043D\u0430\u0442\u0430\u043B\u043D\u0430 \u043A\u0430\u0440\u0442\u0430 \u0438 \u0442\u0435\u043A\u0443\u0449\u0438\u0442\u0435 \u0442\u0440\u0430\u043D\u0437\u0438\u0442\u0438, \u0437\u0430 \u0434\u0430 \u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0430\u0448 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0430\u043D\u0430 \u0434\u043D\u0435\u0432\u043D\u0430 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430.

\u0412\u041D\u0418\u041C\u0410\u041D\u0418\u0415: \u0412\u0438\u043D\u0430\u0433\u0438 \u043E\u0442\u0433\u043E\u0432\u0430\u0440\u044F\u0439 \u043D\u0430 \u0411\u042A\u041B\u0413\u0410\u0420\u0421\u041A\u0418 \u0415\u0417\u0418\u041A \u0441 \u043F\u0440\u0430\u0432\u0438\u043B\u043D\u0430 \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0430 \u0442\u0435\u0440\u043C\u0438\u043D\u043E\u043B\u043E\u0433\u0438\u044F.

\u0418\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0439 \u0441\u043B\u0435\u0434\u043D\u0438\u0442\u0435 \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438 \u0442\u0435\u0440\u043C\u0438\u043D\u0438:
- \u0421\u043B\u044A\u043D\u0446\u0435, \u041B\u0443\u043D\u0430, \u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439, \u0412\u0435\u043D\u0435\u0440\u0430, \u041C\u0430\u0440\u0441, \u042E\u043F\u0438\u0442\u0435\u0440, \u0421\u0430\u0442\u0443\u0440\u043D, \u0423\u0440\u0430\u043D, \u041D\u0435\u043F\u0442\u0443\u043D, \u041F\u043B\u0443\u0442\u043E\u043D
- \u041E\u0432\u0435\u043D, \u0422\u0435\u043B\u0435\u0446, \u0411\u043B\u0438\u0437\u043D\u0430\u0446\u0438, \u0420\u0430\u043A, \u041B\u044A\u0432, \u0414\u0435\u0432\u0430, \u0412\u0435\u0437\u043D\u0438, \u0421\u043A\u043E\u0440\u043F\u0438\u043E\u043D, \u0421\u0442\u0440\u0435\u043B\u0435\u0446, \u041A\u043E\u0437\u0438\u0440\u043E\u0433, \u0412\u043E\u0434\u043E\u043B\u0435\u0439, \u0420\u0438\u0431\u0438
- \u0421\u044A\u0432\u043F\u0430\u0434, \u0421\u0435\u043A\u0441\u0442\u0438\u043B, \u041A\u0432\u0430\u0434\u0440\u0430\u0442, \u0422\u0440\u0438\u0433\u043E\u043D, \u041E\u043F\u043E\u0437\u0438\u0446\u0438\u044F
- 1-\u0432\u0438 \u0434\u043E 12-\u0442\u0438 \u0434\u043E\u043C

\u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0430\u0439 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430\u0442\u0430 \u0432 \u0441\u043B\u0435\u0434\u043D\u0438\u044F JSON \u0444\u043E\u0440\u043C\u0430\u0442 (\u0441\u0430\u043C\u043E JSON, \u0431\u0435\u0437 \u0434\u043E\u043F\u044A\u043B\u043D\u0438\u0442\u0435\u043B\u0435\u043D \u0442\u0435\u043A\u0441\u0442):
{
  "overallTheme": "\u041A\u0440\u0430\u0442\u043A\u043E \u0437\u0430\u0433\u043B\u0430\u0432\u0438\u0435 \u043D\u0430 \u0434\u0435\u043D\u044F \u0432 2-3 \u0434\u0443\u043C\u0438",
  "horoscope": {
    "general": "\u041E\u0431\u0449 \u043F\u0440\u0435\u0433\u043B\u0435\u0434 \u043D\u0430 \u0434\u0435\u043D\u044F - 2-3 \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u044F",
    "love": "\u041B\u044E\u0431\u043E\u0432 \u0438 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F - 2 \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u044F",
    "career": "\u041A\u0430\u0440\u0438\u0435\u0440\u0430 \u0438 \u0440\u0430\u0431\u043E\u0442\u0430 - 2 \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u044F", 
    "health": "\u0417\u0434\u0440\u0430\u0432\u0435 \u0438 \u0435\u043D\u0435\u0440\u0433\u0438\u044F - 2 \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u044F"
  },
  "recommendations": ["\u041F\u0440\u0435\u043F\u043E\u0440\u044A\u043A\u0430 1", "\u041F\u0440\u0435\u043F\u043E\u0440\u044A\u043A\u0430 2", "\u041F\u0440\u0435\u043F\u043E\u0440\u044A\u043A\u0430 3"]
}` : `You are AstroLogAI, an expert AI astrologer. Based on the user's natal chart and current transits, generate a personalized daily forecast.

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
      { role: "system", content: systemPrompt },
      { role: "user", content: chartInfo }
    ];
    const response = await (0, import_llm.chatCompletion)(messages, { temperature: 0.7, maxTokens: 1e3 });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      overallTheme: parsed.overallTheme || "\u0414\u0435\u043D \u043D\u0430 \u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u0441\u0442\u0432\u0430\u0442\u0430",
      overallThemeBg: parsed.overallTheme || "\u0414\u0435\u043D \u043D\u0430 \u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u0441\u0442\u0432\u0430\u0442\u0430",
      horoscope: {
        general: parsed.horoscope?.general || "\u0414\u0435\u043D\u044F\u0442 \u043D\u043E\u0441\u0438 \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u0438 \u0435\u043D\u0435\u0440\u0433\u0438\u0438.",
        generalBg: parsed.horoscope?.general || "\u0414\u0435\u043D\u044F\u0442 \u043D\u043E\u0441\u0438 \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u0438 \u0435\u043D\u0435\u0440\u0433\u0438\u0438.",
        love: parsed.horoscope?.love || "\u041E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F\u0442\u0430 \u0438\u0437\u0438\u0441\u043A\u0432\u0430\u0442 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435.",
        loveBg: parsed.horoscope?.love || "\u041E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F\u0442\u0430 \u0438\u0437\u0438\u0441\u043A\u0432\u0430\u0442 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435.",
        career: parsed.horoscope?.career || "\u041A\u0430\u0440\u0438\u0435\u0440\u043D\u0438\u0442\u0435 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0441\u0430 \u043D\u0430\u043B\u0438\u0446\u0435.",
        careerBg: parsed.horoscope?.career || "\u041A\u0430\u0440\u0438\u0435\u0440\u043D\u0438\u0442\u0435 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0441\u0430 \u043D\u0430\u043B\u0438\u0446\u0435.",
        health: parsed.horoscope?.health || "\u041E\u0431\u044A\u0440\u043D\u0435\u0442\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043D\u0430 \u0435\u043D\u0435\u0440\u0433\u0438\u044F\u0442\u0430 \u0441\u0438.",
        healthBg: parsed.horoscope?.health || "\u041E\u0431\u044A\u0440\u043D\u0435\u0442\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043D\u0430 \u0435\u043D\u0435\u0440\u0433\u0438\u044F\u0442\u0430 \u0441\u0438."
      },
      recommendations: parsed.recommendations || ["\u041E\u0442\u0434\u0435\u043B\u0435\u0442\u0435 \u0432\u0440\u0435\u043C\u0435 \u0437\u0430 \u043F\u043E\u0447\u0438\u0432\u043A\u0430", "\u0421\u043B\u0443\u0448\u0430\u0439\u0442\u0435 \u0438\u043D\u0442\u0443\u0438\u0446\u0438\u044F\u0442\u0430 \u0441\u0438", "\u0411\u044A\u0434\u0435\u0442\u0435 \u043E\u0442\u0432\u043E\u0440\u0435\u043D\u0438 \u043A\u044A\u043C \u043D\u043E\u0432\u0438 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438"],
      recommendationsBg: parsed.recommendations || ["\u041E\u0442\u0434\u0435\u043B\u0435\u0442\u0435 \u0432\u0440\u0435\u043C\u0435 \u0437\u0430 \u043F\u043E\u0447\u0438\u0432\u043A\u0430", "\u0421\u043B\u0443\u0448\u0430\u0439\u0442\u0435 \u0438\u043D\u0442\u0443\u0438\u0446\u0438\u044F\u0442\u0430 \u0441\u0438", "\u0411\u044A\u0434\u0435\u0442\u0435 \u043E\u0442\u0432\u043E\u0440\u0435\u043D\u0438 \u043A\u044A\u043C \u043D\u043E\u0432\u0438 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438"]
    };
  } catch (error) {
    console.error("[Forecast] LLM generation error:", error);
    return {
      overallTheme: "\u0414\u0435\u043D \u043D\u0430 \u043D\u043E\u0432\u0438\u0442\u0435 \u043D\u0430\u0447\u0430\u043B\u0430",
      overallThemeBg: "\u0414\u0435\u043D \u043D\u0430 \u043D\u043E\u0432\u0438\u0442\u0435 \u043D\u0430\u0447\u0430\u043B\u0430",
      horoscope: {
        general: "\u0414\u043D\u0435\u0441 \u0435 \u0435\u0434\u0438\u043D \u0434\u0435\u043D \u043D\u0430 \u043D\u043E\u0432\u0438 \u043D\u0430\u0447\u0430\u043B\u0430 \u0438 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438. \u0421\u043B\u0443\u0448\u0430\u0439\u0442\u0435 \u0438\u043D\u0442\u0443\u0438\u0446\u0438\u044F\u0442\u0430 \u0441\u0438 \u0438 \u0431\u044A\u0434\u0435\u0442\u0435 \u043E\u0442\u0432\u043E\u0440\u0435\u043D\u0438 \u043A\u044A\u043C \u043F\u0440\u043E\u043C\u0435\u043D\u0438.",
        generalBg: "\u0414\u043D\u0435\u0441 \u0435 \u0435\u0434\u0438\u043D \u0434\u0435\u043D \u043D\u0430 \u043D\u043E\u0432\u0438 \u043D\u0430\u0447\u0430\u043B\u0430 \u0438 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438. \u0421\u043B\u0443\u0448\u0430\u0439\u0442\u0435 \u0438\u043D\u0442\u0443\u0438\u0446\u0438\u044F\u0442\u0430 \u0441\u0438 \u0438 \u0431\u044A\u0434\u0435\u0442\u0435 \u043E\u0442\u0432\u043E\u0440\u0435\u043D\u0438 \u043A\u044A\u043C \u043F\u0440\u043E\u043C\u0435\u043D\u0438.",
        love: "\u0412\u0440\u0435\u043C\u0435 \u0437\u0430 \u0434\u044A\u043B\u0431\u043E\u043A\u0438 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0438 \u0441 \u043F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0430. \u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430\u0442\u0430 \u0432\u0440\u044A\u0437\u043A\u0430 \u0435 \u043F\u043E\u0434\u0441\u0438\u043B\u0435\u043D\u0430.",
        loveBg: "\u0412\u0440\u0435\u043C\u0435 \u0437\u0430 \u0434\u044A\u043B\u0431\u043E\u043A\u0438 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0438 \u0441 \u043F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0430. \u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430\u0442\u0430 \u0432\u0440\u044A\u0437\u043A\u0430 \u0435 \u043F\u043E\u0434\u0441\u0438\u043B\u0435\u043D\u0430.",
        career: "\u041F\u0440\u043E\u0444\u0435\u0441\u0438\u043E\u043D\u0430\u043B\u043D\u0438\u0442\u0435 \u0432\u0438 \u0443\u0441\u0438\u043B\u0438\u044F \u0449\u0435 \u0431\u044A\u0434\u0430\u0442 \u0437\u0430\u0431\u0435\u043B\u0435\u0436\u0438\u043D\u0438. \u0422\u043E\u0432\u0430 \u0435 \u0434\u043E\u0431\u044A\u0440 \u0434\u0435\u043D \u0437\u0430 \u043D\u043E\u0432\u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0438.",
        careerBg: "\u041F\u0440\u043E\u0444\u0435\u0441\u0438\u043E\u043D\u0430\u043B\u043D\u0438\u0442\u0435 \u0432\u0438 \u0443\u0441\u0438\u043B\u0438\u044F \u0449\u0435 \u0431\u044A\u0434\u0430\u0442 \u0437\u0430\u0431\u0435\u043B\u0435\u0436\u0438\u043D\u0438. \u0422\u043E\u0432\u0430 \u0435 \u0434\u043E\u0431\u044A\u0440 \u0434\u0435\u043D \u0437\u0430 \u043D\u043E\u0432\u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u0438.",
        health: "\u041E\u0431\u044A\u0440\u043D\u0435\u0442\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043D\u0430 \u0441\u044A\u043D\u044F \u0438 \u043F\u043E\u0447\u0438\u0432\u043A\u0430\u0442\u0430. \u0415\u043D\u0435\u0440\u0433\u0438\u044F\u0442\u0430 \u043C\u043E\u0436\u0435 \u0434\u0430 \u0432\u0430\u0440\u0438\u0440\u0430 \u043F\u0440\u0435\u0437 \u0434\u0435\u043D\u044F.",
        healthBg: "\u041E\u0431\u044A\u0440\u043D\u0435\u0442\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043D\u0430 \u0441\u044A\u043D\u044F \u0438 \u043F\u043E\u0447\u0438\u0432\u043A\u0430\u0442\u0430. \u0415\u043D\u0435\u0440\u0433\u0438\u044F\u0442\u0430 \u043C\u043E\u0436\u0435 \u0434\u0430 \u0432\u0430\u0440\u0438\u0440\u0430 \u043F\u0440\u0435\u0437 \u0434\u0435\u043D\u044F."
      },
      recommendations: [
        "\u0421\u044A\u0437\u0434\u0430\u0439\u0442\u0435 \u0441\u0443\u0442\u0440\u0435\u0448\u043D\u0430 \u0440\u0443\u0442\u0438\u043D\u0430 \u0437\u0430 \u043C\u0435\u0434\u0438\u0442\u0430\u0446\u0438\u044F",
        "\u041F\u0440\u0430\u043A\u0442\u0438\u043A\u0443\u0432\u0430\u0439\u0442\u0435 \u0431\u043B\u0430\u0433\u043E\u0434\u0430\u0440\u043D\u043E\u0441\u0442",
        "\u0418\u0437\u0431\u044F\u0433\u0432\u0430\u0439\u0442\u0435 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u0438"
      ],
      recommendationsBg: [
        "\u0421\u044A\u0437\u0434\u0430\u0439\u0442\u0435 \u0441\u0443\u0442\u0440\u0435\u0448\u043D\u0430 \u0440\u0443\u0442\u0438\u043D\u0430 \u0437\u0430 \u043C\u0435\u0434\u0438\u0442\u0430\u0446\u0438\u044F",
        "\u041F\u0440\u0430\u043A\u0442\u0438\u043A\u0443\u0432\u0430\u0439\u0442\u0435 \u0431\u043B\u0430\u0433\u043E\u0434\u0430\u0440\u043D\u043E\u0441\u0442",
        "\u0418\u0437\u0431\u044F\u0433\u0432\u0430\u0439\u0442\u0435 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u0438"
      ]
    };
  }
}
async function generateDailyForecast(userId, birthData, userLanguage = "bg", precomputedChart) {
  const dateString = getTodayDateString();
  const stored = await (0, import_forecast_cron.getStoredForecast)(userId, dateString);
  if (stored?.forecast) {
    console.log(`[Forecast] DB hit for daily forecast, user ${userId}`);
    return { ...stored.forecast, cached: true };
  }
  const cacheKey = `forecast:daily:${userId}:${dateString}`;
  try {
    const cached = await import_redis.redisClient.get(cacheKey);
    if (cached) {
      console.log(`[Forecast] Redis hit for daily forecast, user ${userId}`);
      const forecast2 = JSON.parse(cached);
      forecast2.cached = true;
      return forecast2;
    }
  } catch (error) {
    console.warn("[Forecast] Cache read error:", error);
  }
  const natalChart = precomputedChart ?? await (0, import_astrology.calculateNatalChart)(birthData);
  const transits = await getCurrentTransits(natalChart);
  const analyzedTransits = analyzeTransitImpact(transits, natalChart);
  const moonPhase = deriveMoonPhaseFromTransits(transits);
  const llmForecast = await generateLLMForecast(natalChart, analyzedTransits, moonPhase, userLanguage);
  const challengingCount = analyzedTransits.filter((t) => t.aspectToNatal?.influence === "challenging").length;
  const positiveCount = analyzedTransits.filter((t) => t.aspectToNatal?.influence === "positive").length;
  let energy = "medium";
  if (positiveCount > challengingCount + 1) energy = "high";
  else if (challengingCount > positiveCount + 1) energy = "low";
  const moods = {
    "New Moon": "\u0420\u0435\u0444\u043B\u0435\u043A\u0442\u0438\u0432\u0435\u043D",
    "Waxing Crescent": "\u041E\u043F\u0442\u0438\u043C\u0438\u0441\u0442\u0438\u0447\u0435\u043D",
    "First Quarter": "\u0415\u043D\u0435\u0440\u0433\u0438\u0447\u0435\u043D",
    "Waxing Gibbous": "\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u0438\u0432\u0435\u043D",
    "Full Moon": "\u0418\u043D\u0442\u0435\u043D\u0437\u0438\u0432\u0435\u043D",
    "Waning Gibbous": "\u0411\u043B\u0430\u0433\u043E\u0434\u0430\u0440\u0435\u043D",
    "Last Quarter": "\u041E\u0441\u0432\u043E\u0431\u043E\u0436\u0434\u0430\u0432\u0430\u0449",
    "Waning Crescent": "\u0421\u043F\u043E\u043A\u043E\u0435\u043D"
  };
  const mood = moods[moonPhase.phase] || "\u0411\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u0430\u043D";
  const hour = (/* @__PURE__ */ new Date()).getHours();
  const powerHours = [
    `${(hour + 2) % 24}:00-${(hour + 4) % 24}:00`,
    `${(hour + 8) % 24}:00-${(hour + 10) % 24}:00`
  ];
  const luckyNumbers = [
    natalChart.sun.degree % 10 + 1,
    natalChart.moon.degree % 10 + 1,
    natalChart.rising.degree % 10 + 1,
    (natalChart.sun.degree + natalChart.moon.degree) % 10 + 1,
    (natalChart.mars?.degree || 10) % 10 + 1
  ].filter((v, i, a) => a.indexOf(v) === i);
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
      signBg: moonPhase.signBg
    },
    horoscope: {
      ...llmForecast.horoscope,
      luckyNumbers,
      powerHours
    },
    recommendations: llmForecast.recommendations,
    recommendationsBg: llmForecast.recommendationsBg,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    cached: false
  };
  await (0, import_forecast_cron.storeForecast)(userId, dateString, null, forecast);
  try {
    await import_redis.redisClient.setEx(cacheKey, FORECAST_CACHE_TTL, JSON.stringify(forecast));
  } catch (error) {
    console.warn("[Forecast] Cache write error:", error);
  }
  return forecast;
}
async function getDailyForecast(userId, birthData, userLanguage = "bg", precomputedChart) {
  return generateDailyForecast(userId, birthData, userLanguage, precomputedChart);
}
async function generateWeeklyForecast(userId, birthData, userLanguage = "bg", precomputedChart) {
  const weekStart = getWeekStartDateString();
  const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
  const cacheKey = `forecast:weekly:${userId}:${weekStart}`;
  try {
    const cached = await import_redis.redisClient.get(cacheKey);
    if (cached) {
      console.log(`[Forecast] Weekly forecast cache hit for user ${userId}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("[Forecast] Cache read error:", error);
  }
  const natalChart = precomputedChart ?? await (0, import_astrology.calculateNatalChart)(birthData);
  const chartSummary = `
\u041F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u0441\u043A\u0430 \u043D\u0430\u0442\u0430\u043B\u043D\u0430 \u043A\u0430\u0440\u0442\u0430:
- \u0421\u043B\u044A\u043D\u0446\u0435: ${natalChart.sun.signBg} \u0432 ${natalChart.sun.house}\u0442\u0438 \u0434\u043E\u043C
- \u041B\u0443\u043D\u0430: ${natalChart.moon.signBg} \u0432 ${natalChart.moon.house}\u0442\u0438 \u0434\u043E\u043C  
- \u0410\u0441\u0446\u0435\u043D\u0434\u0435\u043D\u0442: ${natalChart.rising.signBg}

\u0421\u0435\u0434\u043C\u0438\u0446\u0430: ${weekStart} \u0434\u043E ${weekEnd}
`;
  const systemPrompt = userLanguage === "bg" ? `\u0422\u0438 \u0441\u0438 AstroLogAI, \u0435\u043A\u0441\u043F\u0435\u0440\u0442\u0435\u043D AI \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433. \u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0430\u0439 \u0441\u0435\u0434\u043C\u0438\u0447\u043D\u0430 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430 \u0437\u0430 \u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u044F.

\u0412\u0438\u043D\u0430\u0433\u0438 \u043E\u0442\u0433\u043E\u0432\u0430\u0440\u044F\u0439 \u043D\u0430 \u0411\u042A\u041B\u0413\u0410\u0420\u0421\u041A\u0418.

\u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0430\u0439 \u0432 JSON \u0444\u043E\u0440\u043C\u0430\u0442:
{
  "overview": "\u041E\u0431\u0449 \u043F\u0440\u0435\u0433\u043B\u0435\u0434 \u043D\u0430 \u0441\u0435\u0434\u043C\u0438\u0446\u0430\u0442\u0430 - 3-4 \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u044F",
  "dailyBreakdown": [
    {"dayName": "\u041F\u043E\u043D\u0435\u0434\u0435\u043B\u043D\u0438\u043A", "theme": "\u0422\u0435\u043C\u0430 \u043D\u0430 \u0434\u0435\u043D\u044F", "highlight": "\u041A\u043B\u044E\u0447\u043E\u0432\u043E \u0441\u044A\u0431\u0438\u0442\u0438\u0435"},
    // ... 7 \u0434\u043D\u0438
  ],
  "majorTransits": [
    {"date": "YYYY-MM-DD", "event": "\u0410\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u043D\u043E \u0441\u044A\u0431\u0438\u0442\u0438\u0435", "significance": "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435"}
  ],
  "bestDays": {"career": "yyyy-mm-dd", "love": "yyyy-mm-dd", "decisions": "yyyy-mm-dd", "selfCare": "yyyy-mm-dd"}
}` : `You are AstroLogAI. Generate a weekly forecast in JSON:`;
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: chartSummary }
    ];
    const response = await (0, import_llm.chatCompletion)(messages, { temperature: 0.7, maxTokens: 1e3 });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const weeklyForecast = {
      weekStart,
      weekEnd,
      overview: parsed.overview || "\u0422\u0430\u0437\u0438 \u0441\u0435\u0434\u043C\u0438\u0446\u0430 \u043D\u043E\u0441\u0438 \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u0438 \u0435\u043D\u0435\u0440\u0433\u0438\u0438 \u0438 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436.",
      overviewBg: parsed.overview || "\u0422\u0430\u0437\u0438 \u0441\u0435\u0434\u043C\u0438\u0446\u0430 \u043D\u043E\u0441\u0438 \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u0438 \u0435\u043D\u0435\u0440\u0433\u0438\u0438 \u0438 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436.",
      dailyBreakdown: parsed.dailyBreakdown?.map((d) => ({
        date: d.date || weekStart,
        dayName: d.dayName || "\u0414\u0435\u043D",
        dayNameBg: d.dayName || "\u0414\u0435\u043D",
        theme: d.theme || "\u0411\u0430\u043B\u0430\u043D\u0441",
        themeBg: d.theme || "\u0411\u0430\u043B\u0430\u043D\u0441",
        highlight: d.highlight || "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u0435\u043D \u0434\u0435\u043D",
        highlightBg: d.highlight || "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u0435\u043D \u0434\u0435\u043D"
      })) || [],
      majorTransits: parsed.majorTransits || [],
      bestDays: parsed.bestDays || {
        career: weekStart,
        love: new Date(new Date(weekStart).getTime() + 2 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        decisions: new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        selfCare: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0]
      },
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      await import_redis.redisClient.setEx(cacheKey, WEEKLY_CACHE_TTL, JSON.stringify(weeklyForecast));
    } catch (error) {
      console.warn("[Forecast] Cache write error:", error);
    }
    return weeklyForecast;
  } catch (error) {
    console.error("[Forecast] Weekly LLM generation error:", error);
    const weeklyForecast = {
      weekStart,
      weekEnd,
      overview: "\u0422\u0430\u0437\u0438 \u0441\u0435\u0434\u043C\u0438\u0446\u0430 \u0435 \u0432\u0440\u0435\u043C\u0435 \u0437\u0430 \u043F\u0440\u0435\u043E\u0441\u043C\u0438\u0441\u043B\u044F\u043D\u0435 \u0438 \u043D\u043E\u0432\u0438 \u043D\u0430\u0447\u0430\u043B\u0430. \u041E\u0431\u044A\u0440\u043D\u0435\u0442\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043D\u0430 \u0432\u044A\u0442\u0440\u0435\u0448\u043D\u0438\u044F \u0441\u0438 \u0433\u043B\u0430\u0441.",
      overviewBg: "\u0422\u0430\u0437\u0438 \u0441\u0435\u0434\u043C\u0438\u0446\u0430 \u0435 \u0432\u0440\u0435\u043C\u0435 \u0437\u0430 \u043F\u0440\u0435\u043E\u0441\u043C\u0438\u0441\u043B\u044F\u043D\u0435 \u0438 \u043D\u043E\u0432\u0438 \u043D\u0430\u0447\u0430\u043B\u0430. \u041E\u0431\u044A\u0440\u043D\u0435\u0442\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u043D\u0430 \u0432\u044A\u0442\u0440\u0435\u0448\u043D\u0438\u044F \u0441\u0438 \u0433\u043B\u0430\u0441.",
      dailyBreakdown: [],
      majorTransits: [],
      bestDays: {
        career: weekStart,
        love: new Date(new Date(weekStart).getTime() + 2 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        decisions: new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        selfCare: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0]
      },
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return weeklyForecast;
  }
}
async function getWeeklyForecast(userId, birthData, userLanguage = "bg", precomputedChart) {
  return generateWeeklyForecast(userId, birthData, userLanguage, precomputedChart);
}
async function rewriteInOracleVoice(raw) {
  const systemPrompt = `You are The Oracle \u2014 a mystical, precise astrologer. Rewrite only the text fields in your voice: poetic, profound, specific. RULES:
- Preserve ALL astrological specifics (planet names, aspects, house positions, orb values)
- Keep the EXACT JSON structure
- Only rewrite: overall_theme, life_areas[].title, life_areas[].prediction, planetary_influences[].description, moon.prediction, tips[]
- Do NOT change: ratings, keywords, area, planet, aspect_type, natal_planet, strength, orb, phase, sign, illumination
- Return ONLY valid JSON, no markdown fences`;
  const payload = {
    overall_theme: raw.overall_theme,
    life_areas: (raw.life_areas ?? []).map((a) => ({
      area: a.area,
      title: a.title,
      prediction: a.prediction,
      rating: a.rating,
      keywords: a.keywords
    })),
    planetary_influences: (raw.planetary_influences ?? []).map((p) => ({
      planet: p.planet,
      aspect_type: p.aspect_type,
      description: p.description,
      strength: p.strength,
      natal_planet: p.natal_planet,
      orb: p.orb
    })),
    moon: { phase: raw.moon?.phase, sign: raw.moon?.sign, prediction: raw.moon?.prediction, illumination: raw.moon?.illumination },
    tips: raw.tips ?? []
  };
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(payload) }
    ];
    const response = await (0, import_llm.chatCompletion)(messages, { temperature: 0.65, maxTokens: 1800 });
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in LLM response");
    return JSON.parse(match[0]);
  } catch (err) {
    console.warn("[Forecast] Oracle voice rewrite failed \u2014 using raw API text:", err);
    return raw;
  }
}
async function getPersonalDailyHoroscope(userId, birthData, dateOverride) {
  const dateStr = dateOverride ?? getTodayDateString();
  const stored = await (0, import_forecast_cron.getStoredForecast)(userId, dateStr);
  if (stored?.horoscope) {
    console.log(`[Forecast] DB hit for horoscope, user ${userId}`);
    return { ...stored.horoscope, cached: true };
  }
  const cacheKey = `horoscope:personal:${userId}:${dateStr}`;
  try {
    const cached = await import_redis.redisClient.get(cacheKey);
    if (cached) {
      const h = JSON.parse(cached);
      h.cached = true;
      return h;
    }
  } catch {
  }
  const { AstrologyClient } = await import("@astro-api/astroapi-typescript");
  const client = new AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
  const raw = await client.horoscope.getPersonalDailyHoroscope({
    subject: {
      birth_data: {
        year: birthData.year,
        month: birthData.month,
        day: birthData.day,
        hour: birthData.hour,
        minute: birthData.minute,
        second: 0,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone
      }
    },
    date: dateStr,
    language: "en"
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
      keywords: a.keywords ?? []
    })),
    planetaryInfluences: (rewritten.planetary_influences ?? raw.planetary_influences ?? []).map((p) => ({
      planet: p.planet,
      aspectType: p.aspect_type,
      description: p.description,
      strength: Math.min(5, Math.max(1, p.strength ?? 3)),
      natalPlanet: p.natal_planet,
      orb: p.orb
    })),
    moon: {
      phase: raw.moon?.phase ?? "Unknown",
      sign: raw.moon?.sign ?? "Unknown",
      prediction: rewritten.moon?.prediction ?? raw.moon?.prediction ?? "",
      illumination: raw.moon?.illumination ?? 0
    },
    tips: rewritten.tips ?? raw.tips ?? [],
    cached: false
  };
  await (0, import_forecast_cron.storeForecast)(userId, dateStr, horoscope, null);
  try {
    await import_redis.redisClient.setEx(cacheKey, 86400, JSON.stringify(horoscope));
  } catch {
  }
  console.log(`[Forecast] Personal daily horoscope generated for user ${userId}`);
  return horoscope;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateDailyForecast,
  generateWeeklyForecast,
  getDailyForecast,
  getPersonalDailyHoroscope,
  getWeeklyForecast
});
