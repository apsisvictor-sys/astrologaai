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
var chartAnalysisController_exports = {};
__export(chartAnalysisController_exports, {
  getChartAnalysis: () => getChartAnalysis,
  getHouseAnalysis: () => getHouseAnalysis,
  getPlanetAnalysis: () => getPlanetAnalysis
});
module.exports = __toCommonJS(chartAnalysisController_exports);
var import_prisma = require("../utils/prisma");
var import_chart_analysis = require("../services/chart-analysis");
async function getChartAnalysis(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
    const lang = req.query.lang || "bg";
    const level = req.query.level || "basic";
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const birthProfile = await import_prisma.prisma.birthProfile.findFirst({
      where: { id: profileId, userId }
    });
    if (!birthProfile) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Birth profile not found" }
      });
      return;
    }
    const chartRecord = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId: profileId }
    });
    if (!chartRecord) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Natal chart not found. Generate one first." }
      });
      return;
    }
    const chartData = chartRecord.chartData;
    const analysis = (0, import_chart_analysis.analyzeChart)(chartData);
    const getText = (item) => {
      const langKey = lang === "bg" ? "Bg" : "";
      return item[`${level}${langKey}`] || item.basic;
    };
    const getKeywords = (item) => {
      return lang === "bg" ? item.keywordsBg : item.keywords;
    };
    const getName = (item) => {
      return lang === "bg" ? item.planetNameBg : item.planetName;
    };
    const response = {
      language: lang,
      level,
      profile: {
        id: birthProfile.id,
        name: birthProfile.name,
        birthDate: birthProfile.birthDate,
        birthTime: birthProfile.birthTime,
        locationName: birthProfile.locationName
      },
      bigThree: {
        sun: {
          planet: analysis.bigThree.sun.planet,
          name: getName(analysis.bigThree.sun),
          symbol: analysis.bigThree.sun.symbol,
          sign: lang === "bg" ? analysis.bigThree.sun.signBg : analysis.bigThree.sun.sign,
          degree: analysis.bigThree.sun.degree,
          house: analysis.bigThree.sun.house,
          retrograde: analysis.bigThree.sun.retrograde,
          interpretation: getText(analysis.bigThree.sun),
          keywords: getKeywords(analysis.bigThree.sun)
        },
        moon: {
          planet: analysis.bigThree.moon.planet,
          name: getName(analysis.bigThree.moon),
          symbol: analysis.bigThree.moon.symbol,
          sign: lang === "bg" ? analysis.bigThree.moon.signBg : analysis.bigThree.moon.sign,
          degree: analysis.bigThree.moon.degree,
          house: analysis.bigThree.moon.house,
          retrograde: analysis.bigThree.moon.retrograde,
          interpretation: getText(analysis.bigThree.moon),
          keywords: getKeywords(analysis.bigThree.moon)
        },
        rising: {
          planet: analysis.bigThree.rising.planet,
          name: getName(analysis.bigThree.rising),
          symbol: analysis.bigThree.rising.symbol,
          sign: lang === "bg" ? analysis.bigThree.rising.signBg : analysis.bigThree.rising.sign,
          degree: analysis.bigThree.rising.degree,
          house: analysis.bigThree.rising.house,
          retrograde: analysis.bigThree.rising.retrograde,
          interpretation: getText(analysis.bigThree.rising),
          keywords: getKeywords(analysis.bigThree.rising)
        }
      },
      planets: analysis.planets.map((planet) => ({
        planet: planet.planet,
        name: getName(planet),
        symbol: planet.symbol,
        sign: lang === "bg" ? planet.signBg : planet.sign,
        degree: planet.degree,
        house: planet.house,
        retrograde: planet.retrograde,
        interpretation: getText(planet),
        keywords: getKeywords(planet)
      })),
      houses: analysis.houses.map((house) => ({
        number: house.number,
        sign: lang === "bg" ? house.signBg : house.sign,
        degree: house.degree,
        interpretation: getText(house),
        keywords: getKeywords(house)
      })),
      aspects: analysis.aspects.map((aspect) => ({
        planet1: aspect.planet1,
        planet2: aspect.planet2,
        aspect: lang === "bg" ? aspect.aspectBg : aspect.aspect,
        orb: aspect.orb,
        nature: aspect.nature,
        interpretation: getText(aspect),
        keywords: getKeywords(aspect)
      })),
      elements: analysis.elements,
      modalities: analysis.modalities
    };
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error("[ChartAnalysis] Error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to analyze chart" }
    });
  }
}
async function getPlanetAnalysis(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId, planetName } = req.params;
    const lang = req.query.lang || "bg";
    const level = req.query.level || "basic";
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const chartRecord = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId: profileId, userId }
    });
    if (!chartRecord) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Chart not found" }
      });
      return;
    }
    const chartData = chartRecord.chartData;
    const analysis = (0, import_chart_analysis.analyzeChart)(chartData);
    const planet = analysis.planets.find(
      (p) => p.planet.toLowerCase() === planetName.toLowerCase()
    );
    if (!planet) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: `Planet '${planetName}' not found in chart` }
      });
      return;
    }
    const langKey = lang === "bg" ? "Bg" : "";
    const textKey = `${level}${langKey}`;
    res.json({
      success: true,
      data: {
        planet: planet.planet,
        name: lang === "bg" ? planet.planetNameBg : planet.planetName,
        symbol: planet.symbol,
        sign: lang === "bg" ? planet.signBg : planet.sign,
        degree: planet.degree,
        house: planet.house,
        retrograde: planet.retrograde,
        interpretation: {
          basic: planet.basic,
          basicBg: planet.basicBg,
          intermediate: planet.intermediate,
          intermediateBg: planet.intermediateBg,
          advanced: planet.advanced,
          advancedBg: planet.advancedBg
        },
        currentLevel: planet[textKey],
        keywords: lang === "bg" ? planet.keywordsBg : planet.keywords
      }
    });
  } catch (error) {
    console.error("[ChartAnalysis] Planet analysis error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to analyze planet" }
    });
  }
}
async function getHouseAnalysis(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId, houseNumber } = req.params;
    const lang = req.query.lang || "bg";
    const level = req.query.level || "basic";
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const houseNum = parseInt(houseNumber, 10);
    if (isNaN(houseNum) || houseNum < 1 || houseNum > 12) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "House number must be between 1 and 12" }
      });
      return;
    }
    const chartRecord = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId: profileId, userId }
    });
    if (!chartRecord) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Chart not found" }
      });
      return;
    }
    const chartData = chartRecord.chartData;
    const analysis = (0, import_chart_analysis.analyzeChart)(chartData);
    const house = analysis.houses.find((h) => h.number === houseNum);
    if (!house) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: `House ${houseNum} not found` }
      });
      return;
    }
    const langKey = lang === "bg" ? "Bg" : "";
    const textKey = `${level}${langKey}`;
    res.json({
      success: true,
      data: {
        number: house.number,
        sign: lang === "bg" ? house.signBg : house.sign,
        degree: house.degree,
        interpretation: {
          basic: house.basic,
          basicBg: house.basicBg,
          intermediate: house.intermediate,
          intermediateBg: house.intermediateBg,
          advanced: house.advanced,
          advancedBg: house.advancedBg
        },
        currentLevel: house[textKey],
        keywords: lang === "bg" ? house.keywordsBg : house.keywords
      }
    });
  } catch (error) {
    console.error("[ChartAnalysis] House analysis error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to analyze house" }
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getChartAnalysis,
  getHouseAnalysis,
  getPlanetAnalysis
});
