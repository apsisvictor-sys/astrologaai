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
var birthDataController_exports = {};
__export(birthDataController_exports, {
  createBirthProfile: () => createBirthProfile,
  deleteBirthProfile: () => deleteBirthProfile,
  getBirthProfile: () => getBirthProfile,
  getChartHistory: () => getChartHistory,
  getHistoricalChart: () => getHistoricalChart,
  getRegenerationStatus: () => getRegenerationStatus,
  listBirthProfiles: () => listBirthProfiles,
  searchLocationsHandler: () => searchLocationsHandler,
  updateBirthProfile: () => updateBirthProfile
});
module.exports = __toCommonJS(birthDataController_exports);
var import_prisma = require("../utils/prisma");
var import_geocoding = require("../services/geocoding");
var import_astrology = require("../services/astrology");
const MAX_PROFILES_PER_USER = 10;
async function listBirthProfiles(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const profiles = await import_prisma.prisma.birthProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        birthChart: {
          select: { id: true, createdAt: true }
        }
      }
    });
    res.json({
      success: true,
      data: {
        profiles,
        total: profiles.length,
        maxAllowed: MAX_PROFILES_PER_USER
      }
    });
  } catch (error) {
    console.error("[BirthData] List error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch birth profiles" }
    });
  }
}
async function getBirthProfile(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: { id, userId },
      include: {
        birthChart: true
      }
    });
    if (!profile) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Birth profile not found" }
      });
      return;
    }
    res.json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    console.error("[BirthData] Get error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch birth profile" }
    });
  }
}
async function createBirthProfile(req, res) {
  try {
    const userId = req.user?.id;
    const input = req.body;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    if (!input.name || !input.birthDate || !input.locationName) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields",
          details: [
            !input.name && { field: "name", message: "Profile name is required" },
            !input.birthDate && { field: "birthDate", message: "Birth date is required" },
            !input.locationName && { field: "locationName", message: "Location is required" }
          ].filter(Boolean)
        }
      });
      return;
    }
    if (typeof input.latitude !== "number" || typeof input.longitude !== "number") {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid coordinates"
        }
      });
      return;
    }
    if (!(0, import_geocoding.validateCoordinates)(input.latitude, input.longitude)) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Coordinates out of valid range"
        }
      });
      return;
    }
    const birthDate = new Date(input.birthDate);
    if (isNaN(birthDate.getTime())) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid birth date format" }
      });
      return;
    }
    if (birthDate > /* @__PURE__ */ new Date()) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Birth date must be in the past" }
      });
      return;
    }
    if (input.birthTime && !input.isUnknownTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(input.birthTime)) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid time format. Use HH:MM (24-hour)" }
        });
        return;
      }
    }
    const existingCount = await import_prisma.prisma.birthProfile.count({
      where: { userId }
    });
    if (existingCount >= MAX_PROFILES_PER_USER) {
      res.status(400).json({
        success: false,
        error: {
          code: "LIMIT_EXCEEDED",
          message: `Maximum of ${MAX_PROFILES_PER_USER} birth profiles allowed`
        }
      });
      return;
    }
    const timezone = input.timezone || await (0, import_geocoding.getTimezoneFromCoordinates)(input.latitude, input.longitude);
    const profile = await import_prisma.prisma.birthProfile.create({
      data: {
        userId,
        name: input.name.trim(),
        birthDate,
        birthTime: input.isUnknownTime ? null : input.birthTime || null,
        locationName: input.locationName,
        latitude: input.latitude,
        longitude: input.longitude,
        timezone,
        isUnknownTime: input.isUnknownTime ?? !input.birthTime
      }
    });
    console.log(`[BirthData] Created profile ${profile.id} for user ${userId}`);
    try {
      const birthTime = input.isUnknownTime ? null : input.birthTime || null;
      const [hour, minute] = birthTime ? birthTime.split(":").map(Number) : [12, 0];
      const birthDataInput = {
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        day: birthDate.getDate(),
        hour,
        minute,
        latitude: input.latitude,
        longitude: input.longitude,
        timezone,
        locationName: input.locationName
      };
      const chart = await (0, import_astrology.calculateNatalChart)(birthDataInput);
      await import_prisma.prisma.birthChart.create({
        data: {
          userId,
          birthProfileId: profile.id,
          chartData: chart
        }
      });
      console.log(`[BirthData] Chart computed for profile ${profile.id}`);
    } catch (chartError) {
      console.error("[BirthData] Chart computation failed (non-blocking):", chartError);
    }
    res.status(201).json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    console.error("[BirthData] Create error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to create birth profile" }
    });
  }
}
async function updateBirthProfile(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const input = req.body;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const existing = await import_prisma.prisma.birthProfile.findFirst({
      where: { id, userId },
      include: {
        birthChart: true
      }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Birth profile not found" }
      });
      return;
    }
    let birthDate;
    if (input.birthDate) {
      birthDate = new Date(input.birthDate);
      if (isNaN(birthDate.getTime())) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid birth date format" }
        });
        return;
      }
      if (birthDate > /* @__PURE__ */ new Date()) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Birth date must be in the past" }
        });
        return;
      }
    }
    if (input.latitude !== void 0 && input.longitude !== void 0) {
      if (!(0, import_geocoding.validateCoordinates)(input.latitude, input.longitude)) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Coordinates out of valid range" }
        });
        return;
      }
    }
    if (input.birthTime && !input.isUnknownTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(input.birthTime)) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid time format. Use HH:MM (24-hour)" }
        });
        return;
      }
    }
    let timezone = input.timezone;
    if ((input.latitude !== void 0 || input.longitude !== void 0) && !input.timezone) {
      const lat = input.latitude ?? existing.latitude;
      const lon = input.longitude ?? existing.longitude;
      timezone = await (0, import_geocoding.getTimezoneFromCoordinates)(lat, lon);
    }
    const birthDataChanged = birthDate !== void 0 || input.birthTime !== void 0 || input.latitude !== void 0 || input.longitude !== void 0;
    let chartArchived = false;
    if (birthDataChanged && existing.birthChart) {
      await import_prisma.prisma.chartHistory.create({
        data: {
          chartId: existing.birthChart.id,
          chartData: existing.birthChart.chartData,
          birthDate: existing.birthDate,
          birthTime: existing.birthTime,
          locationName: existing.locationName,
          latitude: existing.latitude,
          longitude: existing.longitude,
          timezone: existing.timezone,
          reason: "birth_data_update"
        }
      });
      chartArchived = true;
      console.log(`[BirthData] Archived chart for profile ${id}`);
    }
    const profile = await import_prisma.prisma.birthProfile.update({
      where: { id },
      data: {
        ...input.name !== void 0 && { name: input.name.trim() },
        ...birthDate && { birthDate },
        ...input.birthTime !== void 0 && { birthTime: input.isUnknownTime ? null : input.birthTime || null },
        ...input.locationName !== void 0 && { locationName: input.locationName },
        ...input.latitude !== void 0 && { latitude: input.latitude },
        ...input.longitude !== void 0 && { longitude: input.longitude },
        ...timezone && { timezone },
        ...input.isUnknownTime !== void 0 && { isUnknownTime: input.isUnknownTime }
      }
    });
    if (birthDataChanged) {
      if (existing.birthChart) {
        await import_prisma.prisma.birthChart.delete({
          where: { id: existing.birthChart.id }
        });
      }
      try {
        const effectiveBirthDate = birthDate ?? existing.birthDate;
        const effectiveBirthTime = input.isUnknownTime ? null : input.birthTime !== void 0 ? input.birthTime : existing.birthTime;
        const [hour, minute] = effectiveBirthTime ? effectiveBirthTime.split(":").map(Number) : [12, 0];
        const birthDataInput = {
          year: effectiveBirthDate.getFullYear(),
          month: effectiveBirthDate.getMonth() + 1,
          day: effectiveBirthDate.getDate(),
          hour,
          minute,
          latitude: input.latitude ?? existing.latitude,
          longitude: input.longitude ?? existing.longitude,
          timezone: timezone ?? existing.timezone,
          locationName: input.locationName ?? existing.locationName
        };
        const chart = await (0, import_astrology.calculateNatalChart)(birthDataInput);
        await import_prisma.prisma.birthChart.create({
          data: { userId, birthProfileId: id, chartData: chart }
        });
        console.log(`[BirthData] Chart regenerated for profile ${id}`);
      } catch (chartError) {
        console.error("[BirthData] Chart regeneration failed (non-blocking):", chartError);
      }
    }
    console.log(`[BirthData] Updated profile ${id} for user ${userId}`);
    res.json({
      success: true,
      data: {
        profile,
        chartArchived,
        message: birthDataChanged ? "Birth data updated. Chart regenerated." : "Profile updated successfully."
      }
    });
  } catch (error) {
    console.error("[BirthData] Update error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to update birth profile" }
    });
  }
}
async function deleteBirthProfile(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const existing = await import_prisma.prisma.birthProfile.findFirst({
      where: { id, userId }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Birth profile not found" }
      });
      return;
    }
    await import_prisma.prisma.birthProfile.delete({
      where: { id }
    });
    console.log(`[BirthData] Deleted profile ${id} for user ${userId}`);
    res.json({
      success: true,
      data: { message: "Birth profile deleted successfully" }
    });
  } catch (error) {
    console.error("[BirthData] Delete error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to delete birth profile" }
    });
  }
}
async function searchLocationsHandler(req, res) {
  try {
    const { q, limit = "10" } = req.query;
    if (!q || typeof q !== "string" || q.length < 2) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Query must be at least 2 characters" }
      });
      return;
    }
    const limitNum = Math.min(parseInt(limit, 10) || 10, 20);
    const locations = await (0, import_geocoding.searchLocations)(q, limitNum);
    res.json({
      success: true,
      data: { locations }
    });
  } catch (error) {
    console.error("[BirthData] Location search error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to search locations" }
    });
  }
}
async function getRegenerationStatus(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { jobId } = req.query;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: { id, userId }
    });
    if (!profile) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Birth profile not found" }
      });
      return;
    }
    const chart = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId: id }
    });
    if (chart) {
      res.json({
        success: true,
        data: {
          status: "complete",
          chartId: chart.id,
          message: "Chart regeneration complete"
        }
      });
      return;
    }
    res.json({
      success: true,
      data: {
        status: "no_chart",
        message: "No chart found. Generate one from the profile page."
      }
    });
  } catch (error) {
    console.error("[BirthData] Regeneration status error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to check regeneration status" }
    });
  }
}
async function getChartHistory(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { limit = "10", offset = "0" } = req.query;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: { id, userId },
      include: {
        birthChart: {
          include: {
            historyEntries: {
              orderBy: { archivedAt: "desc" },
              take: parseInt(limit, 10) || 10,
              skip: parseInt(offset, 10) || 0
            }
          }
        }
      }
    });
    if (!profile) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Birth profile not found" }
      });
      return;
    }
    const historyEntries = profile.birthChart?.historyEntries || [];
    const totalCount = profile.birthChart ? await import_prisma.prisma.chartHistory.count({
      where: { chartId: profile.birthChart.id }
    }) : 0;
    res.json({
      success: true,
      data: {
        history: historyEntries.map((entry) => ({
          id: entry.id,
          birthDate: entry.birthDate,
          birthTime: entry.birthTime,
          locationName: entry.locationName,
          latitude: entry.latitude,
          longitude: entry.longitude,
          timezone: entry.timezone,
          reason: entry.reason,
          archivedAt: entry.archivedAt,
          notes: entry.notes
        })),
        total: totalCount,
        hasMore: totalCount > (parseInt(offset, 10) || 0) + historyEntries.length
      }
    });
  } catch (error) {
    console.error("[BirthData] Chart history error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch chart history" }
    });
  }
}
async function getHistoricalChart(req, res) {
  try {
    const userId = req.user?.id;
    const { id, historyId } = req.params;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
      return;
    }
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: { id, userId },
      include: {
        birthChart: {
          include: {
            historyEntries: {
              where: { id: historyId }
            }
          }
        }
      }
    });
    if (!profile || !profile.birthChart) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Birth profile or chart not found" }
      });
      return;
    }
    const historyEntry = profile.birthChart.historyEntries[0];
    if (!historyEntry) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Historical chart not found" }
      });
      return;
    }
    res.json({
      success: true,
      data: {
        history: {
          id: historyEntry.id,
          chartData: historyEntry.chartData,
          birthDate: historyEntry.birthDate,
          birthTime: historyEntry.birthTime,
          locationName: historyEntry.locationName,
          latitude: historyEntry.latitude,
          longitude: historyEntry.longitude,
          timezone: historyEntry.timezone,
          reason: historyEntry.reason,
          archivedAt: historyEntry.archivedAt,
          notes: historyEntry.notes
        }
      }
    });
  } catch (error) {
    console.error("[BirthData] Historical chart error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch historical chart" }
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createBirthProfile,
  deleteBirthProfile,
  getBirthProfile,
  getChartHistory,
  getHistoricalChart,
  getRegenerationStatus,
  listBirthProfiles,
  searchLocationsHandler,
  updateBirthProfile
});
