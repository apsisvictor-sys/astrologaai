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
var natalChartController_exports = {};
__export(natalChartController_exports, {
  deleteNatalChart: () => deleteNatalChart,
  generateNatalChart: () => generateNatalChart,
  getNatalChart: () => getNatalChart,
  getSharedNatalChart: () => getSharedNatalChart,
  recalculateNatalChart: () => recalculateNatalChart,
  shareNatalChart: () => shareNatalChart
});
module.exports = __toCommonJS(natalChartController_exports);
var crypto = __toESM(require("crypto"));
var import_prisma = require("../utils/prisma");
var import_astrology = require("../services/astrology");
var import_redis = require("../utils/redis");
async function generateNatalChart(req, res) {
  try {
    const userId = req.user?.id;
    const { birthProfileId } = req.body;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    if (!birthProfileId) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "birthProfileId is required" }
      });
      return;
    }
    const birthProfile = await import_prisma.prisma.birthProfile.findFirst({
      where: { id: birthProfileId, userId }
    });
    if (!birthProfile) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Birth profile not found" }
      });
      return;
    }
    const existingChart = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId }
    });
    if (existingChart) {
      res.json({
        success: true,
        data: {
          chart: existingChart.chartData,
          chartId: existingChart.id,
          cached: true
        }
      });
      return;
    }
    const birthDate = new Date(birthProfile.birthDate);
    const birthTime = birthProfile.birthTime || "12:00";
    const [hour, minute] = birthTime.split(":").map(Number);
    const birthDataInput = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      // JavaScript months are 0-indexed
      day: birthDate.getDate(),
      hour: hour || 12,
      minute: minute || 0,
      latitude: birthProfile.latitude,
      longitude: birthProfile.longitude,
      timezone: birthProfile.timezone
    };
    const chart = await (0, import_astrology.calculateNatalChart)(birthDataInput);
    const savedChart = await import_prisma.prisma.birthChart.create({
      data: {
        userId,
        birthProfileId,
        chartData: chart
        // Store as JSON
      }
    });
    console.log(`[NatalChart] Created chart ${savedChart.id} for profile ${birthProfileId}`);
    res.status(201).json({
      success: true,
      data: {
        chart,
        chartId: savedChart.id,
        cached: false
      }
    });
  } catch (error) {
    console.error("[NatalChart] Generate error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to generate natal chart" }
    });
  }
}
async function getNatalChart(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
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
    res.json({
      success: true,
      data: {
        chart: chart.chartData,
        chartId: chart.id,
        birthProfile: {
          id: birthProfile.id,
          name: birthProfile.name,
          birthDate: birthProfile.birthDate,
          birthTime: birthProfile.birthTime,
          locationName: birthProfile.locationName
        }
      }
    });
  } catch (error) {
    console.error("[NatalChart] Get error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve natal chart" }
    });
  }
}
async function deleteNatalChart(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
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
    const result = await import_prisma.prisma.birthChart.deleteMany({
      where: { birthProfileId: profileId }
    });
    if (result.count === 0) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Natal chart not found" }
      });
      return;
    }
    console.log(`[NatalChart] Deleted chart for profile ${profileId}`);
    res.json({
      success: true,
      data: { message: "Natal chart deleted successfully" }
    });
  } catch (error) {
    console.error("[NatalChart] Delete error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to delete natal chart" }
    });
  }
}
async function recalculateNatalChart(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
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
    await import_prisma.prisma.birthChart.deleteMany({
      where: { birthProfileId: profileId }
    });
    const birthDate = new Date(birthProfile.birthDate);
    const birthTime = birthProfile.birthTime || "12:00";
    const [hour, minute] = birthTime.split(":").map(Number);
    const birthDataInput = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour: hour || 12,
      minute: minute || 0,
      latitude: birthProfile.latitude,
      longitude: birthProfile.longitude,
      timezone: birthProfile.timezone
    };
    const chart = await (0, import_astrology.calculateNatalChart)(birthDataInput);
    const savedChart = await import_prisma.prisma.birthChart.create({
      data: {
        userId,
        birthProfileId: profileId,
        chartData: chart
      }
    });
    console.log(`[NatalChart] Recalculated chart ${savedChart.id} for profile ${profileId}`);
    res.json({
      success: true,
      data: {
        chart,
        chartId: savedChart.id,
        cached: false
      }
    });
  } catch (error) {
    console.error("[NatalChart] Recalculate error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to recalculate natal chart" }
    });
  }
}
async function shareNatalChart(req, res) {
  try {
    const userId = req.user?.id;
    const { chartId, profileId, isPublic = false, expiresIn = 7 * 24 * 60 * 60 } = req.body;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    if (!profileId) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "profileId is required" }
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
    const shareToken = crypto.randomBytes(16).toString("hex");
    const shareData = {
      chartId: chart.id,
      profileId,
      userId,
      isPublic,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await import_redis.redisClient.setEx(
      `chart_share:${shareToken}`,
      expiresIn,
      JSON.stringify(shareData)
    );
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/shared-chart/${shareToken}`;
    console.log(`[NatalChart] Created share link for chart ${chart.id}`);
    res.json({
      success: true,
      data: {
        shareUrl,
        shareToken,
        expiresInSeconds: expiresIn,
        isPublic
      }
    });
  } catch (error) {
    console.error("[NatalChart] Share error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to generate share link" }
    });
  }
}
async function getSharedNatalChart(req, res) {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Share token is required" }
      });
      return;
    }
    const shareDataStr = await import_redis.redisClient.get(`chart_share:${token}`);
    if (!shareDataStr) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Share link expired or not found" }
      });
      return;
    }
    const shareData = JSON.parse(shareDataStr);
    const chart = await import_prisma.prisma.birthChart.findFirst({
      where: { id: shareData.chartId }
    });
    if (!chart) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Natal chart not found" }
      });
      return;
    }
    const birthProfile = await import_prisma.prisma.birthProfile.findFirst({
      where: { id: shareData.profileId },
      select: { name: true, id: true }
    });
    console.log(`[NatalChart] Accessed shared chart ${chart.id}`);
    res.json({
      success: true,
      data: {
        chart: chart.chartData,
        chartId: chart.id,
        profileName: birthProfile?.name || "Unknown",
        isPublic: shareData.isPublic
      }
    });
  } catch (error) {
    console.error("[NatalChart] Get shared error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve shared chart" }
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deleteNatalChart,
  generateNatalChart,
  getNatalChart,
  getSharedNatalChart,
  recalculateNatalChart,
  shareNatalChart
});
