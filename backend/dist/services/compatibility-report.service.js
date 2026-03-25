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
var compatibility_report_service_exports = {};
__export(compatibility_report_service_exports, {
  generateCompatibilityReport: () => generateCompatibilityReport,
  getCachedReport: () => getCachedReport,
  invalidateReportCache: () => invalidateReportCache
});
module.exports = __toCommonJS(compatibility_report_service_exports);
var import_synastry = require("./synastry.service");
var import_llm = require("./llm");
var import_redis = require("../utils/redis");
const REPORT_CACHE_TTL = 604800;
const REPORT_CACHE_PREFIX = "compatibility-report:";
const PLANET_WEIGHTS = {
  sun: 3,
  moon: 3,
  venus: 2.5,
  mars: 2.5,
  mercury: 2,
  jupiter: 1.5,
  saturn: 1.5,
  rising: 2,
  uranus: 1,
  neptune: 1,
  pluto: 1,
  northNode: 1,
  chiron: 1
};
function generateReportCacheKey(userId, partnerId, language) {
  return `${REPORT_CACHE_PREFIX}${userId}:${partnerId}:${language}`;
}
function getPlanetDisplayName(planet, language) {
  const names = {
    sun: { en: "Sun", bg: "\u0421\u043B\u044A\u043D\u0446\u0435" },
    moon: { en: "Moon", bg: "\u041B\u0443\u043D\u0430" },
    mercury: { en: "Mercury", bg: "\u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439" },
    venus: { en: "Venus", bg: "\u0412\u0435\u043D\u0435\u0440\u0430" },
    mars: { en: "Mars", bg: "\u041C\u0430\u0440\u0441" },
    jupiter: { en: "Jupiter", bg: "\u042E\u043F\u0438\u0442\u0435\u0440" },
    saturn: { en: "Saturn", bg: "\u0421\u0430\u0442\u0443\u0440\u043D" },
    uranus: { en: "Uranus", bg: "\u0423\u0440\u0430\u043D" },
    neptune: { en: "Neptune", bg: "\u041D\u0435\u043F\u0442\u0443\u043D" },
    pluto: { en: "Pluto", bg: "\u041F\u043B\u0443\u0442\u043E\u043D" },
    northNode: { en: "North Node", bg: "\u0421\u0435\u0432\u0435\u0440\u0435\u043D \u0432\u044A\u0437\u0435\u043B" },
    southNode: { en: "South Node", bg: "\u042E\u0436\u0435\u043D \u0432\u044A\u0437\u0435\u043B" },
    chiron: { en: "Chiron", bg: "\u0425\u0438\u0440\u043E\u043D" },
    rising: { en: "Ascendant", bg: "\u0410\u0441\u0446\u0435\u043D\u0434\u0435\u043D\u0442" }
  };
  return names[planet]?.[language] || planet;
}
function getAspectDisplayName(aspect, language) {
  const names = {
    conjunction: { en: "Conjunction", bg: "\u0421\u044A\u0432\u043F\u0430\u0434" },
    opposition: { en: "Opposition", bg: "\u041E\u043F\u043E\u0437\u0438\u0446\u0438\u044F" },
    trine: { en: "Trine", bg: "\u0422\u0440\u0438\u0433\u043E\u043D" },
    square: { en: "Square", bg: "\u041A\u0432\u0430\u0434\u0440\u0430\u0442" },
    sextile: { en: "Sextile", bg: "\u0421\u0435\u043A\u0441\u0442\u0438\u043B" },
    quincunx: { en: "Quincunx", bg: "\u041A\u0432\u0438\u043D\u043A\u0443\u043D\u043A\u0441" }
  };
  return names[aspect]?.[language] || aspect;
}
function calculateEmotionalScore(synastry) {
  const emotionalPlanets = ["moon", "venus", "cancer", "scorpio", "pisces"];
  let score = 0;
  let totalWeight = 0;
  for (const aspect of synastry.interAspects) {
    const isEmotional = emotionalPlanets.includes(aspect.userPlanet) || emotionalPlanets.includes(aspect.partnerPlanet);
    if (isEmotional) {
      const weight = (PLANET_WEIGHTS[aspect.userPlanet] || 1) + (PLANET_WEIGHTS[aspect.partnerPlanet] || 1);
      const aspectScore = aspect.nature === "harmonious" ? 80 : aspect.nature === "challenging" ? 35 : 50;
      score += aspectScore * weight * (1 - aspect.orb / 10);
      totalWeight += weight;
    }
  }
  const moonMoon = synastry.interAspects.find(
    (a) => a.userPlanet === "moon" && a.partnerPlanet === "moon"
  );
  if (moonMoon && moonMoon.nature === "harmonious") {
    score += 15;
  }
  return Math.min(100, Math.round(totalWeight > 0 ? score / totalWeight : 50));
}
function calculateCommunicationScore(synastry) {
  const communicationPlanets = ["mercury", "gemini", "virgo", "jupiter"];
  let score = 0;
  let totalWeight = 0;
  for (const aspect of synastry.interAspects) {
    const isCommunication = communicationPlanets.includes(aspect.userPlanet) || communicationPlanets.includes(aspect.partnerPlanet);
    if (isCommunication) {
      const weight = (PLANET_WEIGHTS[aspect.userPlanet] || 1) + (PLANET_WEIGHTS[aspect.partnerPlanet] || 1);
      const aspectScore = aspect.nature === "harmonious" ? 80 : aspect.nature === "challenging" ? 35 : 50;
      score += aspectScore * weight * (1 - aspect.orb / 10);
      totalWeight += weight;
    }
  }
  return Math.min(100, Math.round(totalWeight > 0 ? score / totalWeight : 50));
}
function calculatePhysicalScore(synastry) {
  const physicalPlanets = ["mars", "venus", "aries", "taurus", "scorpio"];
  let score = 0;
  let totalWeight = 0;
  for (const aspect of synastry.interAspects) {
    const isPhysical = physicalPlanets.includes(aspect.userPlanet) || physicalPlanets.includes(aspect.partnerPlanet);
    if (isPhysical) {
      const weight = (PLANET_WEIGHTS[aspect.userPlanet] || 1) + (PLANET_WEIGHTS[aspect.partnerPlanet] || 1);
      const aspectScore = aspect.nature === "harmonious" ? 80 : aspect.nature === "challenging" ? 35 : 50;
      score += aspectScore * weight * (1 - aspect.orb / 10);
      totalWeight += weight;
    }
  }
  const venusMars = synastry.interAspects.find(
    (a) => a.userPlanet === "venus" && a.partnerPlanet === "mars" || a.userPlanet === "mars" && a.partnerPlanet === "venus"
  );
  if (venusMars) {
    score += venusMars.nature === "harmonious" ? 20 : venusMars.nature === "challenging" ? -5 : 5;
  }
  return Math.min(100, Math.round(totalWeight > 0 ? score / totalWeight : 50));
}
function calculateLongTermScore(synastry) {
  const longTermPlanets = ["saturn", "jupiter", "northNode", "southNode"];
  let score = 0;
  let totalWeight = 0;
  for (const aspect of synastry.interAspects) {
    const isLongTerm = longTermPlanets.includes(aspect.userPlanet) || longTermPlanets.includes(aspect.partnerPlanet);
    if (isLongTerm) {
      const weight = (PLANET_WEIGHTS[aspect.userPlanet] || 1) + (PLANET_WEIGHTS[aspect.partnerPlanet] || 1);
      const isSaturn = aspect.userPlanet === "saturn" || aspect.partnerPlanet === "saturn";
      const aspectScore = aspect.nature === "harmonious" ? isSaturn ? 85 : 75 : aspect.nature === "challenging" ? 30 : 50;
      score += aspectScore * weight * (1 - aspect.orb / 10);
      totalWeight += weight;
    }
  }
  const sunSaturn = synastry.interAspects.find(
    (a) => a.userPlanet === "sun" && a.partnerPlanet === "saturn" || a.userPlanet === "saturn" && a.partnerPlanet === "sun"
  );
  if (sunSaturn && sunSaturn.nature === "harmonious") {
    score += 10;
  }
  return Math.min(100, Math.round(totalWeight > 0 ? score / totalWeight : 50));
}
async function generateCategoryAnalysis(categoryName, score, relevantAspects, language) {
  const aspectsText = relevantAspects.slice(0, 3).map((a) => `${a.userPlanet} ${a.aspect} ${a.partnerPlanet}: ${language === "bg" ? a.interpretation.bg : a.interpretation.en}`).join("\n");
  const prompt = language === "bg" ? `\u0422\u0438 \u0441\u0438 \u0435\u043A\u0441\u043F\u0435\u0440\u0442 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433. \u041D\u0430\u043F\u0438\u0448\u0438 \u043A\u0440\u0430\u0442\u044A\u043A \u0430\u043D\u0430\u043B\u0438\u0437 (2-3 \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u044F) \u0437\u0430 "${categoryName}" \u0441\u044A\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442 \u0441 \u0440\u0435\u0437\u0443\u043B\u0442\u0430\u0442 ${score}/100.

\u041E\u0441\u043D\u043E\u0432\u043D\u0438 \u0430\u0441\u043F\u0435\u043A\u0442\u0438:
${aspectsText}

\u0410\u043D\u0430\u043B\u0438\u0437\u044A\u0442 \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0431\u044A\u0434\u0435 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u0435\u043D, \u043F\u043E\u043B\u0435\u0437\u0435\u043D \u0438 \u043D\u0430 \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438 \u0435\u0437\u0438\u043A.` : `You are an expert astrologer. Write a brief analysis (2-3 sentences) for "${categoryName}" compatibility with a score of ${score}/100.

Key aspects:
${aspectsText}

Keep the analysis specific, practical, and encouraging.`;
  try {
    const analysis = await (0, import_llm.chatCompletion)(
      [{ role: "user", content: prompt }],
      { temperature: 0.7, maxTokens: 200 }
    );
    return analysis.trim();
  } catch (error) {
    console.error("[CompatibilityReport] LLM error:", error);
    if (score >= 70) {
      return language === "bg" ? `\u0421\u0438\u043B\u043D\u0430 ${categoryName.toLowerCase()} \u0432\u0440\u044A\u0437\u043A\u0430. \u0415\u043D\u0435\u0440\u0433\u0438\u0438\u0442\u0435 \u0432\u0438 \u0441\u0435 \u0434\u043E\u043F\u044A\u043B\u0432\u0430\u0442 \u0434\u043E\u0431\u0440\u0435 \u0432 \u0442\u0430\u0437\u0438 \u043E\u0431\u043B\u0430\u0441\u0442.` : `Strong ${categoryName.toLowerCase()} connection. Your energies complement each other well in this area.`;
    } else if (score >= 50) {
      return language === "bg" ? `\u0423\u043C\u0435\u0440\u0435\u043D\u0430 ${categoryName.toLowerCase()} \u0441\u044A\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442. \u0418\u043C\u0430 \u043C\u044F\u0441\u0442\u043E \u0437\u0430 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u0438 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435.` : `Moderate ${categoryName.toLowerCase()} compatibility. There's room for growth and understanding.`;
    } else {
      return language === "bg" ? `\u0422\u0430\u0437\u0438 \u043E\u0431\u043B\u0430\u0441\u0442 \u0438\u0437\u0438\u0441\u043A\u0432\u0430 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u0438 \u0440\u0430\u0431\u043E\u0442\u0430. \u041F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u0441\u0442\u0432\u0430\u0442\u0430 \u043D\u043E\u0441\u044F\u0442 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436.` : `This area requires attention and work. Challenges bring opportunities for growth.`;
    }
  }
}
async function generateAdvice(synastry, strengths, challenges, language) {
  const summary = language === "bg" ? synastry.summary.bg : synastry.summary.en;
  const prompt = language === "bg" ? `\u0422\u0438 \u0441\u0438 \u043C\u044A\u0434\u044A\u0440 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433. \u0414\u0430\u0439 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u0438 \u0438 \u043F\u043E\u043B\u0435\u0437\u043D\u0438 \u0441\u044A\u0432\u0435\u0442\u0438 \u0437\u0430 \u0434\u0432\u043E\u0439\u043A\u0430 \u0432\u044A\u0437 \u043E\u0441\u043D\u043E\u0432\u0430 \u043D\u0430 \u0442\u0435\u0445\u043D\u0438\u044F \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u043D \u0430\u043D\u0430\u043B\u0438\u0437.

\u0421\u0418\u041B\u041D\u0418 \u0421\u0422\u0420\u0410\u041D\u0418:
${strengths.map((s) => `- ${s}`).join("\n")}

\u041F\u0420\u0415\u0414\u0418\u0417\u0412\u0418\u041A\u0410\u0422\u0415\u041B\u0421\u0422\u0412\u0410:
${challenges.map((c) => `- ${c}`).join("\n")}

\u041E\u0411\u041E\u0411\u0429\u0415\u041D\u0418\u0415:
${summary}

\u041D\u0430\u043F\u0438\u0448\u0438 3-4 \u043F\u0440\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441\u044A\u0432\u0435\u0442\u0430 \u043D\u0430 \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438 \u0435\u0437\u0438\u043A, \u043A\u043E\u0438\u0442\u043E \u0434\u0430 \u0438\u043C \u043F\u043E\u043C\u043E\u0433\u043D\u0430\u0442 \u0434\u0430 \u0440\u0430\u0437\u0432\u0438\u0432\u0430\u0442 \u0432\u0440\u044A\u0437\u043A\u0430\u0442\u0430 \u0441\u0438. \u0412\u0441\u0435\u043A\u0438 \u0441\u044A\u0432\u0435\u0442 \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0431\u044A\u0434\u0435 \u0435\u0434\u043D\u043E \u0438\u0437\u0440\u0435\u0447\u0435\u043D\u0438\u0435.` : `You are a wise astrologer. Give concrete and helpful advice for a couple based on their astrological analysis.

STRENGTHS:
${strengths.map((s) => `- ${s}`).join("\n")}

CHALLENGES:
${challenges.map((c) => `- ${c}`).join("\n")}

SUMMARY:
${summary}

Write 3-4 practical pieces of advice that will help them develop their relationship. Each piece of advice should be one sentence.`;
  try {
    const advice = await (0, import_llm.chatCompletion)(
      [{ role: "user", content: prompt }],
      { temperature: 0.7, maxTokens: 300 }
    );
    return advice.trim();
  } catch (error) {
    console.error("[CompatibilityReport] LLM advice error:", error);
    return language === "bg" ? `\u0424\u043E\u043A\u0443\u0441\u0438\u0440\u0430\u0439\u0442\u0435 \u0441\u0435 \u0432\u044A\u0440\u0445\u0443 \u0432\u0430\u0448\u0438\u0442\u0435 \u0441\u0438\u043B\u043D\u0438 \u0441\u0442\u0440\u0430\u043D\u0438. \u041A\u043E\u043C\u0443\u043D\u0438\u043A\u0438\u0440\u0430\u0439\u0442\u0435 \u043E\u0442\u043A\u0440\u0438\u0442\u043E \u0437\u0430 \u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u0441\u0442\u0432\u0430\u0442\u0430. \u0414\u0430\u0439\u0442\u0435 \u0441\u0438 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E \u0437\u0430 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u0435\u043D \u0440\u0430\u0441\u0442\u0435\u0436. \u041F\u043E\u0447\u0438\u0442\u0430\u0439\u0442\u0435 \u0443\u043D\u0438\u043A\u0430\u043B\u043D\u043E\u0441\u0442\u0442\u0430 \u043D\u0430 \u0432\u0441\u0435\u043A\u0438 \u043E\u0442 \u0432\u0430\u0441.` : `Focus on your strengths together. Communicate openly about challenges. Give each other space for individual growth. Honor the uniqueness in each of you.`;
  }
}
async function generateCompatibilityReport(userBirthData, partnerBirthData, partnerId, partnerName, userId, language = "bg") {
  const cacheKey = generateReportCacheKey(userId, partnerId, language);
  try {
    const cached = await import_redis.redisClient.get(cacheKey);
    if (cached) {
      console.log(`[CompatibilityReport] Cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("[CompatibilityReport] Cache read error:", error);
  }
  const synastry = await (0, import_synastry.calculateSynastryChart)(
    userBirthData,
    partnerBirthData,
    userId,
    partnerId
  );
  const emotionalScore = calculateEmotionalScore(synastry);
  const communicationScore = calculateCommunicationScore(synastry);
  const physicalScore = calculatePhysicalScore(synastry);
  const longTermScore = calculateLongTermScore(synastry);
  const overallScore = Math.round(
    emotionalScore * 0.3 + communicationScore * 0.25 + physicalScore * 0.2 + longTermScore * 0.25
  );
  const emotionalAspects = synastry.interAspects.filter(
    (a) => ["moon", "venus"].includes(a.userPlanet) || ["moon", "venus"].includes(a.partnerPlanet)
  );
  const communicationAspects = synastry.interAspects.filter(
    (a) => a.userPlanet === "mercury" || a.partnerPlanet === "mercury"
  );
  const physicalAspects = synastry.interAspects.filter(
    (a) => ["mars", "venus"].includes(a.userPlanet) && ["mars", "venus"].includes(a.partnerPlanet)
  );
  const longTermAspects = synastry.interAspects.filter(
    (a) => ["saturn", "jupiter", "northNode"].includes(a.userPlanet) || ["saturn", "jupiter", "northNode"].includes(a.partnerPlanet)
  );
  const [
    emotionalAnalysis,
    communicationAnalysis,
    physicalAnalysis,
    longTermAnalysis
  ] = await Promise.all([
    generateCategoryAnalysis("\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430", emotionalScore, emotionalAspects, language),
    generateCategoryAnalysis("\u041A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F", communicationScore, communicationAspects, language),
    generateCategoryAnalysis("\u0424\u0438\u0437\u0438\u0447\u0435\u0441\u043A\u0430", physicalScore, physicalAspects, language),
    generateCategoryAnalysis("\u0414\u044A\u043B\u0433\u043E\u0441\u0440\u043E\u0447\u043D\u0430", longTermScore, longTermAspects, language)
  ]);
  const keyAspects = synastry.interAspects.filter((a) => ["sun", "moon", "venus", "mars", "rising"].includes(a.userPlanet) || ["sun", "moon", "venus", "mars", "rising"].includes(a.partnerPlanet)).slice(0, 5).map((aspect) => ({
    userPlanet: getPlanetDisplayName(aspect.userPlanet, language),
    partnerPlanet: getPlanetDisplayName(aspect.partnerPlanet, language),
    aspect: getAspectDisplayName(aspect.aspect, language),
    aspectBg: aspect.aspectBg,
    description: language === "bg" ? aspect.interpretation.bg : aspect.interpretation.en,
    nature: aspect.nature
  }));
  const strengths = synastry.strengths.map(
    (s) => language === "bg" ? `${s.title.bg}: ${s.description.bg}` : `${s.title.en}: ${s.description.en}`
  );
  const challenges = synastry.challenges.map(
    (c) => language === "bg" ? `${c.title.bg}: ${c.description.bg}` : `${c.title.en}: ${c.description.en}`
  );
  if (strengths.length === 0) {
    if (overallScore >= 60) {
      strengths.push(
        language === "bg" ? "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u043D\u0438 \u0430\u0441\u043F\u0435\u043A\u0442\u0438 \u043C\u0435\u0436\u0434\u0443 \u043B\u0438\u0447\u043D\u0438\u0442\u0435 \u043F\u043B\u0430\u043D\u0435\u0442\u0438" : "Harmonious aspects between personal planets"
      );
    }
    if (emotionalScore >= 60) {
      strengths.push(
        language === "bg" ? "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u043F\u043E\u0434\u043A\u0440\u0435\u043F\u0430 \u0438 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435" : "Emotional support and understanding"
      );
    }
  }
  if (challenges.length === 0) {
    if (overallScore < 60) {
      challenges.push(
        language === "bg" ? "\u041D\u044F\u043A\u043E\u0438 \u043F\u043B\u0430\u043D\u0435\u0442\u0430\u0440\u043D\u0438 \u0430\u0441\u043F\u0435\u043A\u0442\u0438 \u0438\u0437\u0438\u0441\u043A\u0432\u0430\u0442 \u0440\u0430\u0431\u043E\u0442\u0430" : "Some planetary aspects require work"
      );
    }
  }
  const advice = await generateAdvice(synastry, strengths, challenges, language);
  const report = {
    partnerId,
    partnerName,
    overallScore,
    categories: {
      emotional: {
        score: emotionalScore,
        label: "Emotional",
        labelBg: "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430",
        analysis: emotionalAnalysis
      },
      communication: {
        score: communicationScore,
        label: "Communication",
        labelBg: "\u041A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F",
        analysis: communicationAnalysis
      },
      physical: {
        score: physicalScore,
        label: "Physical",
        labelBg: "\u0424\u0438\u0437\u0438\u0447\u0435\u0441\u043A\u0430",
        analysis: physicalAnalysis
      },
      longTerm: {
        score: longTermScore,
        label: "Long-term",
        labelBg: "\u0414\u044A\u043B\u0433\u043E\u0441\u0440\u043E\u0447\u043D\u0430",
        analysis: longTermAnalysis
      }
    },
    keyAspects,
    strengths,
    challenges,
    advice,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    language
  };
  try {
    await import_redis.redisClient.setEx(cacheKey, REPORT_CACHE_TTL, JSON.stringify(report));
    console.log(`[CompatibilityReport] Cached report for ${cacheKey}`);
  } catch (error) {
    console.warn("[CompatibilityReport] Cache write error:", error);
  }
  return report;
}
async function getCachedReport(userId, partnerId, language) {
  const cacheKey = generateReportCacheKey(userId, partnerId, language);
  try {
    const cached = await import_redis.redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("[CompatibilityReport] Cache read error:", error);
  }
  return null;
}
async function invalidateReportCache(userId, partnerId) {
  const keys = [
    generateReportCacheKey(userId, partnerId, "bg"),
    generateReportCacheKey(userId, partnerId, "en")
  ];
  try {
    await Promise.all(keys.map((key) => import_redis.redisClient.del(key)));
    console.log(`[CompatibilityReport] Invalidated cache for partner ${partnerId}`);
  } catch (error) {
    console.warn("[CompatibilityReport] Cache invalidation error:", error);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateCompatibilityReport,
  getCachedReport,
  invalidateReportCache
});
