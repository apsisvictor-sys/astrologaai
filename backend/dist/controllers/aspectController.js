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
var aspectController_exports = {};
__export(aspectController_exports, {
  getAspectMatrix: () => getAspectMatrix,
  getAspects: () => getAspects,
  getSpecificAspect: () => getSpecificAspect
});
module.exports = __toCommonJS(aspectController_exports);
var import_prisma = require("../utils/prisma");
async function getAspects(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
    const { type, planet, nature, lang = "bg" } = req.query;
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
    const chart = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId: profileId }
    });
    if (!chart) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Natal chart not found. Generate one first." }
      });
      return;
    }
    const chartData = chart.chartData;
    let aspects = chartData.aspects || [];
    if (type && typeof type === "string") {
      aspects = aspects.filter(
        (a) => a.aspect.toLowerCase() === type.toLowerCase()
      );
    }
    if (planet && typeof planet === "string") {
      aspects = aspects.filter(
        (a) => a.planet1.toLowerCase() === planet.toLowerCase() || a.planet2.toLowerCase() === planet.toLowerCase()
      );
    }
    if (nature && typeof nature === "string") {
      aspects = aspects.filter(
        (a) => a.nature.toLowerCase() === nature.toLowerCase()
      );
    }
    const aspectsByType = {
      conjunction: aspects.filter((a) => a.aspect.toLowerCase() === "conjunction").length,
      sextile: aspects.filter((a) => a.aspect.toLowerCase() === "sextile").length,
      square: aspects.filter((a) => a.aspect.toLowerCase() === "square").length,
      trine: aspects.filter((a) => a.aspect.toLowerCase() === "trine").length,
      opposition: aspects.filter((a) => a.aspect.toLowerCase() === "opposition").length
    };
    const aspectsByNature = {
      harmonious: aspects.filter((a) => a.nature === "harmonious").length,
      challenging: aspects.filter((a) => a.nature === "challenging").length,
      neutral: aspects.filter((a) => a.nature === "neutral").length
    };
    res.json({
      success: true,
      data: {
        aspects,
        total: aspects.length,
        filters: {
          type: type || null,
          planet: planet || null,
          nature: nature || null
        },
        statistics: {
          byType: aspectsByType,
          byNature: aspectsByNature
        },
        language: lang
      }
    });
  } catch (error) {
    console.error("[Aspects] Get error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve aspects" }
    });
  }
}
async function getSpecificAspect(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId, planet1, planet2 } = req.params;
    const { lang = "bg" } = req.query;
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
    const chart = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId: profileId }
    });
    if (!chart) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Natal chart not found. Generate one first." }
      });
      return;
    }
    const chartData = chart.chartData;
    const aspects = chartData.aspects || [];
    const aspect = aspects.find(
      (a) => a.planet1.toLowerCase() === planet1.toLowerCase() && a.planet2.toLowerCase() === planet2.toLowerCase() || a.planet1.toLowerCase() === planet2.toLowerCase() && a.planet2.toLowerCase() === planet1.toLowerCase()
    );
    if (!aspect) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `No aspect found between ${planet1} and ${planet2}`
        }
      });
      return;
    }
    res.json({
      success: true,
      data: {
        aspect,
        language: lang
      }
    });
  } catch (error) {
    console.error("[Aspects] Get specific error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve aspect" }
    });
  }
}
async function getAspectMatrix(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
    const { lang = "bg" } = req.query;
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
    const chart = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId: profileId }
    });
    if (!chart) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Natal chart not found. Generate one first." }
      });
      return;
    }
    const chartData = chart.chartData;
    const aspects = chartData.aspects || [];
    const planets = [
      "sun",
      "moon",
      "mercury",
      "venus",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
      "pluto",
      "northNode",
      "southNode",
      "chiron"
    ];
    const aspectMap = /* @__PURE__ */ new Map();
    aspects.forEach((aspect) => {
      const key1 = `${aspect.planet1}-${aspect.planet2}`;
      const key2 = `${aspect.planet2}-${aspect.planet1}`;
      aspectMap.set(key1, aspect);
      aspectMap.set(key2, aspect);
    });
    const matrix = [];
    matrix.push(["", ...planets]);
    planets.forEach((planet1) => {
      const row = [planet1];
      planets.forEach((planet2) => {
        if (planet1 === planet2) {
          row.push(null);
        } else {
          const key = `${planet1}-${planet2}`;
          const aspect = aspectMap.get(key);
          row.push(aspect || null);
        }
      });
      matrix.push(row);
    });
    res.json({
      success: true,
      data: {
        planets,
        matrix,
        totalAspects: aspects.length,
        language: lang
      }
    });
  } catch (error) {
    console.error("[Aspects] Get matrix error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve aspect matrix" }
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAspectMatrix,
  getAspects,
  getSpecificAspect
});
