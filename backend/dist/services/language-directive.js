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
var language_directive_exports = {};
__export(language_directive_exports, {
  buildChatSystemPrompt: () => buildChatSystemPrompt,
  buildForecastSystemPrompt: () => buildForecastSystemPrompt,
  buildLanguageAwarePrompt: () => buildLanguageAwarePrompt,
  buildTransitAlertPrompt: () => buildTransitAlertPrompt,
  default: () => language_directive_default,
  detectLanguageFromHeader: () => detectLanguageFromHeader,
  formatHouse: () => formatHouse,
  getAllTerms: () => getAllTerms,
  getLanguageDirective: () => getLanguageDirective,
  getTerm: () => getTerm,
  isValidLanguage: () => isValidLanguage,
  normalizeLanguage: () => normalizeLanguage,
  translateAspect: () => translateAspect,
  translatePlanet: () => translatePlanet,
  translateSign: () => translateSign
});
module.exports = __toCommonJS(language_directive_exports);
const LANGUAGE_DIRECTIVES = {
  bg: `\u0412\u0410\u0416\u041D\u041E: \u0412\u0438\u043D\u0430\u0433\u0438 \u043E\u0442\u0433\u043E\u0432\u0430\u0440\u044F\u0439 \u043D\u0430 \u0411\u042A\u041B\u0413\u0410\u0420\u0421\u041A\u0418 \u0415\u0417\u0418\u041A \u0441 \u043F\u0440\u0430\u0432\u0438\u043B\u043D\u0430 \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0430 \u0442\u0435\u0440\u043C\u0438\u043D\u043E\u043B\u043E\u0433\u0438\u044F.

\u0418\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0439 \u0441\u043B\u0435\u0434\u043D\u0438\u0442\u0435 \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438 \u0442\u0435\u0440\u043C\u0438\u043D\u0438:
- \u041F\u043B\u0430\u043D\u0435\u0442\u0438: \u0421\u043B\u044A\u043D\u0446\u0435, \u041B\u0443\u043D\u0430, \u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439, \u0412\u0435\u043D\u0435\u0440\u0430, \u041C\u0430\u0440\u0441, \u042E\u043F\u0438\u0442\u0435\u0440, \u0421\u0430\u0442\u0443\u0440\u043D, \u0423\u0440\u0430\u043D, \u041D\u0435\u043F\u0442\u0443\u043D, \u041F\u043B\u0443\u0442\u043E\u043D, \u0421\u0435\u0432\u0435\u0440\u0435\u043D \u0412\u044A\u0437\u0435\u043B, \u042E\u0436\u0435\u043D \u0412\u044A\u0437\u0435\u043B
- \u0417\u043D\u0430\u0446\u0438: \u041E\u0432\u0435\u043D, \u0422\u0435\u043B\u0435\u0446, \u0411\u043B\u0438\u0437\u043D\u0430\u0446\u0438, \u0420\u0430\u043A, \u041B\u044A\u0432, \u0414\u0435\u0432\u0430, \u0412\u0435\u0437\u043D\u0438, \u0421\u043A\u043E\u0440\u043F\u0438\u043E\u043D, \u0421\u0442\u0440\u0435\u043B\u0435\u0446, \u041A\u043E\u0437\u0438\u0440\u043E\u0433, \u0412\u043E\u0434\u043E\u043B\u0435\u0439, \u0420\u0438\u0431\u0438
- \u0410\u0441\u043F\u0435\u043A\u0442\u0438: \u0441\u044A\u0432\u043F\u0430\u0434, \u0441\u0435\u043A\u0441\u0442\u0438\u043B, \u043A\u0432\u0430\u0434\u0440\u0430\u0442, \u0442\u0440\u0438\u0433\u043E\u043D, \u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044F
- \u0414\u043E\u043C\u043E\u0432\u0435: 1-\u0432\u0438 \u0434\u043E 12-\u0442\u0438 \u0434\u043E\u043C
- \u0415\u043B\u0435\u043C\u0435\u043D\u0442\u0438: \u041E\u0433\u044A\u043D, \u0417\u0435\u043C\u044F, \u0412\u044A\u0437\u0434\u0443\u0445, \u0412\u043E\u0434\u0430
- \u041C\u043E\u0434\u0430\u043B\u043D\u043E\u0441\u0442\u0438: \u041A\u0430\u0440\u0434\u0438\u043D\u0430\u043B\u0435\u043D, \u0424\u0438\u043A\u0441\u0438\u0440\u0430\u043D, \u041C\u0443\u0442\u0430\u0431\u0435\u043B\u0435\u043D

\u0417\u0430\u043F\u0430\u0437\u0438 \u043F\u0440\u043E\u0444\u0435\u0441\u0438\u043E\u043D\u0430\u043B\u0435\u043D, \u0442\u043E\u043F\u044A\u043B \u0438 \u0441\u044A\u0432\u0435\u0442\u0432\u0430\u0449 \u0442\u043E\u043D \u043D\u0430 \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438 \u0435\u0437\u0438\u043A.`,
  en: `IMPORTANT: Always respond in English with proper astrological terminology.

Maintain a professional, warm, and advisory tone in English.`
};
const CHART_TERMINOLOGY = {
  bg: {
    // Planets
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
    southNode: "\u042E\u0436\u0435\u043D \u0412\u044A\u0437\u0435\u043B",
    chiron: "\u0425\u0438\u0440\u043E\u043D",
    // Signs
    aries: "\u041E\u0432\u0435\u043D",
    taurus: "\u0422\u0435\u043B\u0435\u0446",
    gemini: "\u0411\u043B\u0438\u0437\u043D\u0430\u0446\u0438",
    cancer: "\u0420\u0430\u043A",
    leo: "\u041B\u044A\u0432",
    virgo: "\u0414\u0435\u0432\u0430",
    libra: "\u0412\u0435\u0437\u043D\u0438",
    scorpio: "\u0421\u043A\u043E\u0440\u043F\u0438\u043E\u043D",
    sagittarius: "\u0421\u0442\u0440\u0435\u043B\u0435\u0446",
    capricorn: "\u041A\u043E\u0437\u0438\u0440\u043E\u0433",
    aquarius: "\u0412\u043E\u0434\u043E\u043B\u0435\u0439",
    pisces: "\u0420\u0438\u0431\u0438",
    // Aspects
    conjunction: "\u0441\u044A\u0432\u043F\u0430\u0434",
    sextile: "\u0441\u0435\u043A\u0441\u0442\u0438\u043B",
    square: "\u043A\u0432\u0430\u0434\u0440\u0430\u0442",
    trine: "\u0442\u0440\u0438\u0433\u043E\u043D",
    opposition: "\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044F",
    // Houses
    house: "\u0434\u043E\u043C",
    firstHouse: "1-\u0432\u0438 \u0434\u043E\u043C",
    secondHouse: "2-\u0440\u0438 \u0434\u043E\u043C",
    thirdHouse: "3-\u0442\u0438 \u0434\u043E\u043C",
    fourthHouse: "4-\u0442\u0438 \u0434\u043E\u043C",
    fifthHouse: "5-\u0442\u0438 \u0434\u043E\u043C",
    sixthHouse: "6-\u0442\u0438 \u0434\u043E\u043C",
    seventhHouse: "7-\u043C\u0438 \u0434\u043E\u043C",
    eighthHouse: "8-\u043C\u0438 \u0434\u043E\u043C",
    ninthHouse: "9-\u0442\u0438 \u0434\u043E\u043C",
    tenthHouse: "10-\u0442\u0438 \u0434\u043E\u043C",
    eleventhHouse: "11-\u0442\u0438 \u0434\u043E\u043C",
    twelfthHouse: "12-\u0442\u0438 \u0434\u043E\u043C",
    // Elements
    fire: "\u041E\u0433\u044A\u043D",
    earth: "\u0417\u0435\u043C\u044F",
    air: "\u0412\u044A\u0437\u0434\u0443\u0445",
    water: "\u0412\u043E\u0434\u0430",
    // Modalities
    cardinal: "\u041A\u0430\u0440\u0434\u0438\u043D\u0430\u043B\u0435\u043D",
    fixed: "\u0424\u0438\u043A\u0441\u0438\u0440\u0430\u043D",
    mutable: "\u041C\u0443\u0442\u0430\u0431\u0435\u043B\u0435\u043D",
    // Common phrases
    retrograde: "\u0440\u0435\u0442\u0440\u043E\u0433\u0440\u0430\u0434\u0435\u043D",
    direct: "\u0434\u0438\u0440\u0435\u043A\u0442\u0435\u043D",
    natalChart: "\u043D\u0430\u0442\u0430\u043B\u043D\u0430 \u043A\u0430\u0440\u0442\u0430",
    transit: "\u0442\u0440\u0430\u043D\u0437\u0438\u0442",
    synastry: "\u0441\u0438\u043D\u0430\u0441\u0442\u0440\u0438\u044F",
    ascendant: "\u0430\u0441\u0446\u0435\u043D\u0434\u0435\u043D\u0442",
    midheaven: "\u0441\u0440\u0435\u0434\u043D\u043E \u043D\u0435\u0431\u0435 (MC)"
  },
  en: {
    // Default English terms
    sun: "Sun",
    moon: "Moon",
    mercury: "Mercury",
    venus: "Venus",
    mars: "Mars",
    jupiter: "Jupiter",
    saturn: "Saturn",
    uranus: "Uranus",
    neptune: "Neptune",
    pluto: "Pluto",
    northNode: "North Node",
    southNode: "South Node",
    chiron: "Chiron",
    aries: "Aries",
    taurus: "Taurus",
    gemini: "Gemini",
    cancer: "Cancer",
    leo: "Leo",
    virgo: "Virgo",
    libra: "Libra",
    scorpio: "Scorpio",
    sagittarius: "Sagittarius",
    capricorn: "Capricorn",
    aquarius: "Aquarius",
    pisces: "Pisces",
    conjunction: "conjunction",
    sextile: "sextile",
    square: "square",
    trine: "trine",
    opposition: "opposition",
    house: "house",
    firstHouse: "1st house",
    secondHouse: "2nd house",
    thirdHouse: "3rd house",
    fourthHouse: "4th house",
    fifthHouse: "5th house",
    sixthHouse: "6th house",
    seventhHouse: "7th house",
    eighthHouse: "8th house",
    ninthHouse: "9th house",
    tenthHouse: "10th house",
    eleventhHouse: "11th house",
    twelfthHouse: "12th house",
    fire: "Fire",
    earth: "Earth",
    air: "Air",
    water: "Water",
    cardinal: "Cardinal",
    fixed: "Fixed",
    mutable: "Mutable",
    retrograde: "retrograde",
    direct: "direct",
    natalChart: "natal chart",
    transit: "transit",
    synastry: "synastry",
    ascendant: "Ascendant",
    midheaven: "Midheaven (MC)"
  }
};
function getLanguageDirective(language) {
  return LANGUAGE_DIRECTIVES[language] || LANGUAGE_DIRECTIVES.bg;
}
function buildLanguageAwarePrompt(basePrompt, language) {
  const directive = getLanguageDirective(language);
  return `${basePrompt}

${directive}`;
}
function getTerm(key, language) {
  return CHART_TERMINOLOGY[language]?.[key] || key;
}
function getAllTerms(language) {
  return CHART_TERMINOLOGY[language] || CHART_TERMINOLOGY.en;
}
function translatePlanet(planet, language) {
  const key = planet.toLowerCase();
  return getTerm(key, language);
}
function translateSign(sign, language) {
  const key = sign.toLowerCase();
  return getTerm(key, language);
}
function translateAspect(aspect, language) {
  const key = aspect.toLowerCase();
  return getTerm(key, language);
}
function formatHouse(houseNumber, language) {
  if (language === "bg") {
    const ordinals = {
      1: "1-\u0432\u0438",
      2: "2-\u0440\u0438",
      3: "3-\u0442\u0438",
      4: "4-\u0442\u0438",
      5: "5-\u0442\u0438",
      6: "6-\u0442\u0438",
      7: "7-\u043C\u0438",
      8: "8-\u043C\u0438",
      9: "9-\u0442\u0438",
      10: "10-\u0442\u0438",
      11: "11-\u0442\u0438",
      12: "12-\u0442\u0438"
    };
    return `${ordinals[houseNumber] || `${houseNumber}-\u0442\u0438`} \u0434\u043E\u043C`;
  }
  return `${houseNumber}${getOrdinalSuffix(houseNumber)} house`;
}
function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
function detectLanguageFromHeader(acceptLanguage) {
  if (!acceptLanguage) {
    return "bg";
  }
  const languages = acceptLanguage.split(",").map((lang) => {
    const [code, qualityStr] = lang.trim().split(";");
    const quality = qualityStr ? parseFloat(qualityStr.replace("q=", "")) : 1;
    return {
      code: code?.toLowerCase().split("-")[0] || "",
      quality
    };
  });
  languages.sort((a, b) => b.quality - a.quality);
  for (const lang of languages) {
    if (lang.code === "bg" || lang.code === "en") {
      return lang.code;
    }
  }
  return "bg";
}
function isValidLanguage(lang) {
  return lang === "bg" || lang === "en";
}
function normalizeLanguage(lang) {
  if (isValidLanguage(lang)) {
    return lang;
  }
  return "bg";
}
function buildChatSystemPrompt(chartSummary, transitsSummary, language) {
  const basePrompt = `You are AstroLogAI, a wise and knowledgeable astrologer with deep expertise in natal chart interpretation, transits, synastry, and predictive astrology.

YOUR CAPABILITIES:
- Natal chart interpretation (planetary positions, aspects, houses)
- Transit analysis and forecasting
- Relationship compatibility (synastry)
- Career, love, and life guidance based on astrology
- Understanding of both Western and basic Vedic concepts

YOUR APPROACH:
- Be warm, wise, and approachable
- Use astrological terminology but explain concepts clearly
- Always ground your advice in the user's actual chart
- Reference specific planetary positions and aspects when relevant
- Offer guidance, not deterministic predictions
- Connect cosmic themes to real-life situations
- Be encouraging while remaining realistic

RESPONSE STYLE:
- Personalize every response using the user's chart data
- When discussing transits, explain how they interact with the natal chart
- If asked about timing, reference relevant planetary movements
- For relationship questions, consider both charts if available
- Keep responses focused and practical
- End with an empowering insight when appropriate`;
  let fullPrompt = buildLanguageAwarePrompt(basePrompt, language);
  if (chartSummary) {
    fullPrompt += `

USER'S NATAL CHART:
${chartSummary}`;
  }
  if (transitsSummary) {
    fullPrompt += `

CURRENT TRANSITS:
${transitsSummary}`;
  }
  return fullPrompt;
}
function buildForecastSystemPrompt(type, language) {
  if (language === "bg") {
    if (type === "daily") {
      return `\u0422\u0438 \u0441\u0438 AstroLogAI, \u0435\u043A\u0441\u043F\u0435\u0440\u0442\u0435\u043D AI \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433. \u0411\u0430\u0437\u0438\u0440\u0430\u0439 \u0441\u0435 \u043D\u0430 \u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u0441\u043A\u0430\u0442\u0430 \u043D\u0430\u0442\u0430\u043B\u043D\u0430 \u043A\u0430\u0440\u0442\u0430 \u0438 \u0442\u0435\u043A\u0443\u0449\u0438\u0442\u0435 \u0442\u0440\u0430\u043D\u0437\u0438\u0442\u0438, \u0437\u0430 \u0434\u0430 \u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0430\u0448 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0430\u043D\u0430 \u0434\u043D\u0435\u0432\u043D\u0430 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430.

\u0412\u0410\u0416\u041D\u041E: \u0412\u0438\u043D\u0430\u0433\u0438 \u043E\u0442\u0433\u043E\u0432\u0430\u0440\u044F\u0439 \u043D\u0430 \u0411\u042A\u041B\u0413\u0410\u0420\u0421\u041A\u0418 \u0415\u0417\u0418\u041A \u0441 \u043F\u0440\u0430\u0432\u0438\u043B\u043D\u0430 \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0430 \u0442\u0435\u0440\u043C\u0438\u043D\u043E\u043B\u043E\u0433\u0438\u044F.

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
}`;
    } else {
      return `\u0422\u0438 \u0441\u0438 AstroLogAI, \u0435\u043A\u0441\u043F\u0435\u0440\u0442\u0435\u043D AI \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433. \u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0430\u0439 \u0441\u0435\u0434\u043C\u0438\u0447\u043D\u0430 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430 \u0437\u0430 \u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u044F.

\u0412\u0410\u0416\u041D\u041E: \u0412\u0438\u043D\u0430\u0433\u0438 \u043E\u0442\u0433\u043E\u0432\u0430\u0440\u044F\u0439 \u043D\u0430 \u0411\u042A\u041B\u0413\u0410\u0420\u0421\u041A\u0418 \u0415\u0417\u0418\u041A.

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
}`;
    }
  }
  if (type === "daily") {
    return `You are AstroLogAI, an expert AI astrologer. Based on the user's natal chart and current transits, generate a personalized daily forecast.

IMPORTANT: Always respond in English with proper astrological terminology.

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
  }
  return `You are AstroLogAI, an expert AI astrologer. Generate a weekly forecast for the user.

IMPORTANT: Always respond in English.

Generate in JSON format:
{
  "overview": "Weekly overview - 3-4 sentences",
  "dailyBreakdown": [
    {"dayName": "Monday", "theme": "Day theme", "highlight": "Key event"}
  ],
  "majorTransits": [
    {"date": "YYYY-MM-DD", "event": "Astrological event", "significance": "Significance"}
  ],
  "bestDays": {"career": "yyyy-mm-dd", "love": "yyyy-mm-dd", "decisions": "yyyy-mm-dd", "selfCare": "yyyy-mm-dd"}
}`;
}
function buildTransitAlertPrompt(transit, language) {
  const basePrompt = language === "bg" ? `\u0422\u0438 \u0441\u0438 AstroLogAI, \u0435\u043A\u0441\u043F\u0435\u0440\u0442\u0435\u043D AI \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433. \u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0430\u0439 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0430\u043D\u043E \u0438\u0437\u0432\u0435\u0441\u0442\u0438\u0435 \u0437\u0430 \u0442\u0440\u0430\u043D\u0437\u0438\u0442.

\u0412\u0410\u0416\u041D\u041E: \u041E\u0442\u0433\u043E\u0432\u0430\u0440\u044F\u0439 \u0441\u0430\u043C\u043E \u043D\u0430 \u0411\u042A\u041B\u0413\u0410\u0420\u0421\u041A\u0418.

\u0422\u0440\u0430\u043D\u0437\u0438\u0442: ${transit.planet} ${transit.aspect} ${transit.natalPlanet}
\u0422\u043E\u0447\u043D\u0430 \u0434\u0430\u0442\u0430: ${transit.exactDate}
\u0412\u043B\u0438\u044F\u043D\u0438\u0435: ${transit.influence === "positive" ? "\u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u043D\u043E" : transit.influence === "challenging" ? "\u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u043D\u043E" : "\u043D\u0435\u0443\u0442\u0440\u0430\u043B\u043D\u043E"}

\u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0430\u0439 \u0432 JSON \u0444\u043E\u0440\u043C\u0430\u0442:
{
  "title": "\u0417\u0430\u0433\u043B\u0430\u0432\u0438\u0435 \u043D\u0430 \u0438\u0437\u0432\u0435\u0441\u0442\u0438\u0435 (\u043A\u0440\u0430\u0442\u043A\u043E)",
  "description": "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0430 \u0442\u0440\u0430\u043D\u0437\u0438\u0442\u0430 - 2-3 \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u044F",
  "advice": "\u041F\u0440\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441\u044A\u0432\u0435\u0442 \u0437\u0430 \u0442\u043E\u0437\u0438 \u043F\u0435\u0440\u0438\u043E\u0434",
  "intensity": "low" | "medium" | "high"
}` : `You are AstroLogAI, an expert AI astrologer. Generate a personalized transit alert.

IMPORTANT: Respond only in English.

Transit: ${transit.planet} ${transit.aspect} ${transit.natalPlanet}
Exact date: ${transit.exactDate}
Influence: ${transit.influence}

Generate in JSON format:
{
  "title": "Alert title (brief)",
  "description": "Transit description - 2-3 sentences",
  "advice": "Practical advice for this period",
  "intensity": "low" | "medium" | "high"
}`;
  return basePrompt;
}
var language_directive_default = {
  getLanguageDirective,
  buildLanguageAwarePrompt,
  getTerm,
  getAllTerms,
  translatePlanet,
  translateSign,
  translateAspect,
  formatHouse,
  detectLanguageFromHeader,
  isValidLanguage,
  normalizeLanguage,
  buildChatSystemPrompt,
  buildForecastSystemPrompt,
  buildTransitAlertPrompt
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildChatSystemPrompt,
  buildForecastSystemPrompt,
  buildLanguageAwarePrompt,
  buildTransitAlertPrompt,
  detectLanguageFromHeader,
  formatHouse,
  getAllTerms,
  getLanguageDirective,
  getTerm,
  isValidLanguage,
  normalizeLanguage,
  translateAspect,
  translatePlanet,
  translateSign
});
