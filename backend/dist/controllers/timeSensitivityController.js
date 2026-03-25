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
var timeSensitivityController_exports = {};
__export(timeSensitivityController_exports, {
  default: () => timeSensitivityController_default,
  getTimeSensitivity: () => getTimeSensitivity,
  getTimeSensitivitySummary: () => getTimeSensitivitySummary
});
module.exports = __toCommonJS(timeSensitivityController_exports);
var import_astrology = require("../services/astrology");
var import_prisma = require("../utils/prisma");
function parseBirthTime(time) {
  if (!time) return { hour: 12, minute: 0 };
  const [h, m] = time.split(":").map(Number);
  return { hour: h || 12, minute: m || 0 };
}
function formatTimeOffset(baseHour, baseMinute, offsetMinutes) {
  const totalMinutes = baseHour * 60 + baseMinute + offsetMinutes;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
function calculateHouseChanges(originalHouses, newHouses) {
  return newHouses.map((house, index) => {
    const originalHouse = originalHouses[index];
    const changed = house.sign !== originalHouse.sign;
    return {
      house: house.number,
      sign: house.sign,
      signBg: house.signBg,
      changed
    };
  });
}
function calculatePlanetShifts(originalChart, newChart) {
  const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  return planets.map((planet) => {
    const originalPlanet = originalChart[planet];
    const newPlanet = newChart[planet];
    const changed = originalPlanet.house !== newPlanet.house;
    return {
      planet,
      originalHouse: originalPlanet.house,
      newHouse: newPlanet.house,
      changed
    };
  });
}
function calculateRisingSignSensitivity(dataPoints) {
  const signs = new Set(dataPoints.map((d) => d.rising.sign));
  const signChanges = signs.size - 1;
  const stable = signChanges === 0;
  const stabilityScore = Math.max(0, 100 - signChanges * 30);
  return { stable, signChanges, stabilityScore };
}
function calculateHouseSensitivity(dataPoints) {
  if (dataPoints.length === 0) {
    return { stableHouses: 12, changingHouses: [], stabilityScore: 100 };
  }
  const houseChanges = /* @__PURE__ */ new Map();
  for (let i = 1; i <= 12; i++) {
    houseChanges.set(i, 0);
  }
  dataPoints.forEach((point) => {
    point.houseChanges.forEach((hc) => {
      if (hc.changed) {
        houseChanges.set(hc.house, (houseChanges.get(hc.house) || 0) + 1);
      }
    });
  });
  const changingHouses = [];
  const threshold = Math.ceil(dataPoints.length * 0.3);
  houseChanges.forEach((changes, house) => {
    if (changes >= threshold) {
      changingHouses.push(house);
    }
  });
  const stableHouses = 12 - changingHouses.length;
  const stabilityScore = Math.round(stableHouses / 12 * 100);
  return { stableHouses, changingHouses, stabilityScore };
}
function generateSummary(risingSensitivity, houseSensitivity, overallStability, isUnknownTime, language) {
  if (language === "bg") {
    const stabilityText2 = overallStability >= 80 ? "\u0412\u0430\u0448\u0430\u0442\u0430 \u043A\u0430\u0440\u0442\u0430 \u0435 \u0441\u0438\u043B\u043D\u043E \u0441\u0442\u0430\u0431\u0438\u043B\u043D\u0430" : overallStability >= 50 ? "\u0412\u0430\u0448\u0430\u0442\u0430 \u043A\u0430\u0440\u0442\u0430 \u0438\u043C\u0430 \u0443\u043C\u0435\u0440\u0435\u043D\u0430 \u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442 \u043A\u044A\u043C \u0432\u0440\u0435\u043C\u0435\u0442\u043E" : "\u0412\u0430\u0448\u0430\u0442\u0430 \u043A\u0430\u0440\u0442\u0430 \u0435 \u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u043D\u0430 \u043A\u044A\u043C \u043F\u0440\u043E\u043C\u0435\u043D\u0438 \u0432\u044A\u0432 \u0432\u0440\u0435\u043C\u0435\u0442\u043E";
    const risingText2 = risingSensitivity.stable ? "\u0410\u0441\u0446\u0435\u043D\u0434\u0435\u043D\u0442\u044A\u0442 \u043E\u0441\u0442\u0430\u0432\u0430 \u0441\u0442\u0430\u0431\u0438\u043B\u0435\u043D \u0432 \u0446\u0435\u043B\u0438\u044F \u0432\u0440\u0435\u043C\u0435\u0432\u0438 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D" : `\u0410\u0441\u0446\u0435\u043D\u0434\u0435\u043D\u0442\u044A\u0442 \u0441\u0435 \u043F\u0440\u043E\u043C\u0435\u043D\u044F ${risingSensitivity.signChanges} \u043F\u044A\u0442\u0438 \u0432 \u0440\u0430\u043C\u043A\u0438\u0442\u0435 \u043D\u0430 \xB130 \u043C\u0438\u043D\u0443\u0442\u0438`;
    const houseText2 = houseSensitivity.stableHouses === 12 ? "\u0412\u0441\u0438\u0447\u043A\u0438 \u0434\u043E\u043C\u043E\u0432\u0435 \u043E\u0441\u0442\u0430\u0432\u0430\u0442 \u0441\u0442\u0430\u0431\u0438\u043B\u043D\u0438" : `${12 - houseSensitivity.stableHouses} \u0434\u043E\u043C\u043E\u0432\u0435 \u043F\u0440\u043E\u043C\u0435\u043D\u044F\u0442 \u0437\u043D\u0430\u0446\u0438 \u043F\u0440\u0438 \u0432\u0430\u0440\u0438\u0430\u0446\u0438\u0438 \u0432\u044A\u0432 \u0432\u0440\u0435\u043C\u0435\u0442\u043E`;
    const unknownTimeNote2 = isUnknownTime ? " \u0422\u044A\u0439 \u043A\u0430\u0442\u043E \u0442\u043E\u0447\u043D\u0438\u044F\u0442 \u0447\u0430\u0441 \u0435 \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D, \u0438\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u043C\u0435 \u043E\u0431\u044F\u0434 (12:00) \u043A\u0430\u0442\u043E \u0440\u0435\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u044F." : "";
    return {
      en: `${stabilityText2}. ${risingText2}. ${houseText2}.${unknownTimeNote2}`,
      bg: `${stabilityText2}. ${risingText2}. ${houseText2}.${unknownTimeNote2}`
    };
  }
  const stabilityText = overallStability >= 80 ? "Your chart is highly stable" : overallStability >= 50 ? "Your chart has moderate time sensitivity" : "Your chart is sensitive to time changes";
  const risingText = risingSensitivity.stable ? "The Rising sign remains stable across the entire time range" : `The Rising sign changes ${risingSensitivity.signChanges} times within \xB130 minutes`;
  const houseText = houseSensitivity.stableHouses === 12 ? "All houses remain stable" : `${12 - houseSensitivity.stableHouses} houses change signs with time variations`;
  const unknownTimeNote = isUnknownTime ? " Since exact time is unknown, we use noon (12:00) as reference." : "";
  return {
    en: `${stabilityText}. ${risingText}. ${houseText}.${unknownTimeNote}`,
    bg: `${stabilityText}. ${risingText}. ${houseText}.${unknownTimeNote}`
  };
}
async function getTimeSensitivity(req, res) {
  try {
    const { profileId } = req.params;
    const userId = req.user?.id;
    const timeRange = parseInt(req.query.timeRange) || 30;
    const interval = parseInt(req.query.interval) || 5;
    const lang = req.query.lang || "bg";
    if (timeRange < 5 || timeRange > 120) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TIME_RANGE",
          message: "Time range must be between 5 and 120 minutes"
        }
      });
    }
    if (interval < 1 || interval > 30) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INTERVAL",
          message: "Interval must be between 1 and 30 minutes"
        }
      });
    }
    const totalPoints = Math.ceil(timeRange * 2 / interval) + 1;
    if (totalPoints > 20) {
      return res.status(400).json({
        success: false,
        error: {
          code: "TOO_MANY_POINTS",
          message: `Request would generate ${totalPoints} API calls. Reduce timeRange or increase interval.`
        }
      });
    }
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: {
        id: profileId,
        userId
      },
      include: { birthChart: { select: { chartData: true } } }
    });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PROFILE_NOT_FOUND",
          message: "Birth profile not found"
        }
      });
    }
    const birthDate = new Date(profile.birthDate);
    const { hour, minute } = parseBirthTime(profile.birthTime);
    const isUnknownTime = profile.isUnknownTime;
    const originalBirthData = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour,
      minute,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone
    };
    const originalChart = profile.birthChart?.chartData ?? await (0, import_astrology.calculateNatalChart)(originalBirthData);
    const dataPoints = [];
    const offsets = [];
    for (let offset = -timeRange; offset <= timeRange; offset += interval) {
      offsets.push(offset);
    }
    for (const offset of offsets) {
      const newHour = Math.floor((hour * 60 + minute + offset) / 60) % 24;
      const newMinute = (hour * 60 + minute + offset) % 60;
      const adjustedBirthData = {
        ...originalBirthData,
        hour: newHour < 0 ? newHour + 24 : newHour,
        minute: Math.abs(newMinute)
      };
      const adjustedChart = await (0, import_astrology.calculateNatalChart)(adjustedBirthData);
      dataPoints.push({
        timeOffset: offset,
        birthTime: formatTimeOffset(hour, minute, offset),
        rising: {
          sign: adjustedChart.rising.sign,
          signBg: adjustedChart.rising.signBg,
          degree: adjustedChart.rising.degree,
          changed: adjustedChart.rising.sign !== originalChart.rising.sign
        },
        houseChanges: calculateHouseChanges(originalChart.houses, adjustedChart.houses),
        planetShifts: calculatePlanetShifts(originalChart, adjustedChart)
      });
    }
    const risingSensitivity = calculateRisingSignSensitivity(dataPoints);
    const houseSensitivity = calculateHouseSensitivity(dataPoints);
    const overallStability = Math.round(
      risingSensitivity.stabilityScore * 0.6 + houseSensitivity.stabilityScore * 0.4
    );
    let confidenceLevel;
    if (isUnknownTime) {
      confidenceLevel = "low";
    } else if (overallStability >= 80) {
      confidenceLevel = "high";
    } else if (overallStability >= 50) {
      confidenceLevel = "medium";
    } else {
      confidenceLevel = "low";
    }
    const summary = generateSummary(
      risingSensitivity,
      houseSensitivity,
      overallStability,
      isUnknownTime,
      lang
    );
    const response = {
      profileId,
      profileName: profile.name,
      originalTime: {
        time: profile.birthTime || "12:00",
        isUnknown: isUnknownTime
      },
      sensitivity: {
        risingSign: risingSensitivity,
        houses: houseSensitivity,
        overallStability,
        confidenceLevel
      },
      timeRange: {
        start: formatTimeOffset(hour, minute, -timeRange),
        end: formatTimeOffset(hour, minute, timeRange),
        interval
      },
      dataPoints,
      summary
    };
    return res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error("[Time Sensitivity] Error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "CALCULATION_ERROR",
        message: "Failed to calculate time sensitivity",
        details: error instanceof Error ? error.message : void 0
      }
    });
  }
}
async function getTimeSensitivitySummary(req, res) {
  try {
    const { profileId } = req.params;
    const userId = req.user?.id;
    const lang = req.query.lang || "bg";
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: {
        id: profileId,
        userId
      }
    });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PROFILE_NOT_FOUND",
          message: "Birth profile not found"
        }
      });
    }
    const birthDate = new Date(profile.birthDate);
    const { hour, minute } = parseBirthTime(profile.birthTime);
    const isUnknownTime = profile.isUnknownTime;
    const keyPoints = [-30, 0, 30];
    const charts = [];
    for (const offset of keyPoints) {
      const newHour = Math.floor((hour * 60 + minute + offset) / 60) % 24;
      const newMinute = (hour * 60 + minute + offset) % 60;
      const adjustedBirthData = {
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        day: birthDate.getDate(),
        hour: newHour < 0 ? newHour + 24 : newHour,
        minute: Math.abs(newMinute),
        latitude: profile.latitude,
        longitude: profile.longitude,
        timezone: profile.timezone
      };
      charts.push(await (0, import_astrology.calculateNatalChart)(adjustedBirthData));
    }
    const risingSigns = new Set(charts.map((c) => c.rising.sign));
    const risingChanges = risingSigns.size - 1;
    const overallStability = Math.max(0, 100 - risingChanges * 30);
    let confidenceLevel;
    if (isUnknownTime) {
      confidenceLevel = "low";
    } else if (overallStability >= 80) {
      confidenceLevel = "high";
    } else if (overallStability >= 50) {
      confidenceLevel = "medium";
    } else {
      confidenceLevel = "low";
    }
    return res.json({
      success: true,
      data: {
        profileId,
        profileName: profile.name,
        originalTime: {
          time: profile.birthTime || "12:00",
          isUnknown: isUnknownTime
        },
        sensitivity: {
          risingSignChanges: risingChanges,
          overallStability,
          confidenceLevel
        },
        summary: {
          en: overallStability >= 80 ? "Your chart is stable across the \xB130 minute range." : overallStability >= 50 ? "Your chart shows some sensitivity to birth time variations." : "Your chart is highly sensitive to birth time changes.",
          bg: overallStability >= 80 ? "\u0412\u0430\u0448\u0430\u0442\u0430 \u043A\u0430\u0440\u0442\u0430 \u0435 \u0441\u0442\u0430\u0431\u0438\u043B\u043D\u0430 \u0432 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430 \xB130 \u043C\u0438\u043D\u0443\u0442\u0438." : overallStability >= 50 ? "\u0412\u0430\u0448\u0430\u0442\u0430 \u043A\u0430\u0440\u0442\u0430 \u043F\u043E\u043A\u0430\u0437\u0432\u0430 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430 \u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442 \u043A\u044A\u043C \u0432\u0430\u0440\u0438\u0430\u0446\u0438\u0438 \u0432\u044A\u0432 \u0432\u0440\u0435\u043C\u0435\u0442\u043E." : "\u0412\u0430\u0448\u0430\u0442\u0430 \u043A\u0430\u0440\u0442\u0430 \u0435 \u0441\u0438\u043B\u043D\u043E \u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u043D\u0430 \u043A\u044A\u043C \u043F\u0440\u043E\u043C\u0435\u043D\u0438 \u0432\u044A\u0432 \u0432\u0440\u0435\u043C\u0435\u0442\u043E."
        }
      }
    });
  } catch (error) {
    console.error("[Time Sensitivity Summary] Error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "CALCULATION_ERROR",
        message: "Failed to calculate time sensitivity summary"
      }
    });
  }
}
var timeSensitivityController_default = {
  getTimeSensitivity,
  getTimeSensitivitySummary
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getTimeSensitivity,
  getTimeSensitivitySummary
});
