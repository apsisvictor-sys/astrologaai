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
var partnerController_exports = {};
__export(partnerController_exports, {
  createPartner: () => createPartner,
  deletePartner: () => deletePartner,
  getCompatibilityReport: () => getCompatibilityReport,
  getCompositeChart: () => getCompositeChart,
  getPartner: () => getPartner,
  getSynastry: () => getSynastry,
  listPartners: () => listPartners,
  updatePartner: () => updatePartner
});
module.exports = __toCommonJS(partnerController_exports);
var import_prisma = require("../utils/prisma");
var import_client = require("@prisma/client");
var import_synastry = require("../services/synastry.service");
var import_compatibility_report = require("../services/compatibility-report.service");
var import_composite = require("../services/composite.service");
const validateBirthData = (data) => {
  const errors = [];
  if (!data.birthDate) {
    errors.push("Birth date is required");
  } else if (new Date(data.birthDate) > /* @__PURE__ */ new Date()) {
    errors.push("Birth date cannot be in the future");
  }
  if (!data.locationName) {
    errors.push("Birth location is required");
  }
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    errors.push("Valid coordinates are required");
  }
  if (!data.timezone) {
    errors.push("Timezone is required");
  }
  if (data.birthTime && !data.isUnknownTime) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(data.birthTime)) {
      errors.push("Birth time must be in HH:MM format");
    }
  }
  return errors;
};
const isValidRelationshipType = (type) => {
  return Object.values(import_client.RelationshipType).includes(type);
};
const listPartners = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated"
        }
      });
    }
    const partners = await import_prisma.prisma.partner.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        label: true,
        relationshipType: true,
        birthDate: true,
        birthTime: true,
        locationName: true,
        chartSummary: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    });
    const formattedPartners = partners.map((partner) => ({
      id: partner.id,
      name: partner.name,
      label: partner.label,
      relationshipType: partner.relationshipType.toLowerCase(),
      birthData: {
        date: partner.birthDate.toISOString().split("T")[0],
        time: partner.birthTime,
        location: partner.locationName,
        isUnknownTime: !partner.birthTime
      },
      chartSummary: partner.chartSummary,
      notes: partner.notes,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt
    }));
    res.json({
      success: true,
      data: {
        partners: formattedPartners
      }
    });
  } catch (error) {
    console.error("List partners error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve partners"
      }
    });
  }
};
const getPartner = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated"
        }
      });
    }
    const partner = await import_prisma.prisma.partner.findFirst({
      where: {
        id,
        userId
        // Ensure user owns this partner record
      }
    });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Partner not found"
        }
      });
    }
    res.json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          label: partner.label,
          relationshipType: partner.relationshipType.toLowerCase(),
          birthData: {
            date: partner.birthDate.toISOString().split("T")[0],
            time: partner.birthTime,
            location: partner.locationName,
            latitude: partner.latitude,
            longitude: partner.longitude,
            timezone: partner.timezone,
            isUnknownTime: partner.isUnknownTime
          },
          chartSummary: partner.chartSummary,
          notes: partner.notes,
          createdAt: partner.createdAt,
          updatedAt: partner.updatedAt
        }
      }
    });
  } catch (error) {
    console.error("Get partner error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve partner"
      }
    });
  }
};
const createPartner = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated"
        }
      });
    }
    const {
      name,
      label,
      relationshipType = "romantic",
      birthDate,
      birthTime,
      locationName,
      latitude,
      longitude,
      timezone,
      isUnknownTime = false,
      notes
    } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Partner name is required",
          details: [{ field: "name", message: "Name cannot be empty" }]
        }
      });
    }
    const normalizedType = relationshipType.toUpperCase();
    if (!isValidRelationshipType(normalizedType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid relationship type",
          details: [{
            field: "relationshipType",
            message: `Must be one of: ${Object.values(import_client.RelationshipType).join(", ").toLowerCase()}`
          }]
        }
      });
    }
    const birthDataValidation = validateBirthData({
      birthDate,
      birthTime,
      locationName,
      latitude,
      longitude,
      timezone,
      isUnknownTime
    });
    if (birthDataValidation.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid birth data",
          details: birthDataValidation.map((msg) => ({ message: msg }))
        }
      });
    }
    const user = await import_prisma.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: { select: { partners: true } }
      }
    });
    const partnerLimits = {
      FREE: 0,
      PRO: 0,
      // Partners is a PREMIUM-only feature
      PREMIUM: 10
    };
    const limit = partnerLimits[user?.tier || "FREE"];
    const currentCount = user?._count.partners || 0;
    if (currentCount >= limit) {
      return res.status(403).json({
        success: false,
        error: {
          code: "LIMIT_EXCEEDED",
          message: `Partner limit reached for your tier (${limit} partners)`,
          upgradeRequired: user?.tier !== "PREMIUM"
        }
      });
    }
    const partner = await import_prisma.prisma.partner.create({
      data: {
        userId,
        name: name.trim(),
        label: label?.trim() || null,
        relationshipType: normalizedType,
        birthDate: new Date(birthDate),
        birthTime: isUnknownTime ? null : birthTime,
        locationName,
        latitude,
        longitude,
        timezone,
        isUnknownTime,
        notes: notes?.trim() || null
      }
    });
    res.status(201).json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          label: partner.label,
          relationshipType: partner.relationshipType.toLowerCase(),
          birthData: {
            date: partner.birthDate.toISOString().split("T")[0],
            time: partner.birthTime,
            location: partner.locationName,
            isUnknownTime: partner.isUnknownTime
          },
          notes: partner.notes,
          createdAt: partner.createdAt
        },
        message: "Partner added successfully"
      }
    });
  } catch (error) {
    console.error("Create partner error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create partner"
      }
    });
  }
};
const updatePartner = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated"
        }
      });
    }
    const existingPartner = await import_prisma.prisma.partner.findFirst({
      where: { id, userId }
    });
    if (!existingPartner) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Partner not found"
        }
      });
    }
    const {
      name,
      label,
      relationshipType,
      birthDate,
      birthTime,
      locationName,
      latitude,
      longitude,
      timezone,
      isUnknownTime,
      notes
    } = req.body;
    const updateData = {};
    if (name !== void 0) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Partner name cannot be empty"
          }
        });
      }
      updateData.name = name.trim();
    }
    if (label !== void 0) {
      updateData.label = label?.trim() || null;
    }
    if (relationshipType !== void 0) {
      const normalizedType = relationshipType.toUpperCase();
      if (!isValidRelationshipType(normalizedType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid relationship type"
          }
        });
      }
      updateData.relationshipType = normalizedType;
    }
    if (notes !== void 0) {
      updateData.notes = notes?.trim() || null;
    }
    if (birthDate !== void 0 || birthTime !== void 0 || locationName !== void 0) {
      const newBirthData = {
        birthDate: birthDate !== void 0 ? new Date(birthDate) : existingPartner.birthDate,
        birthTime: birthTime !== void 0 ? isUnknownTime ? null : birthTime : existingPartner.birthTime,
        locationName: locationName !== void 0 ? locationName : existingPartner.locationName,
        latitude: latitude !== void 0 ? latitude : existingPartner.latitude,
        longitude: longitude !== void 0 ? longitude : existingPartner.longitude,
        timezone: timezone !== void 0 ? timezone : existingPartner.timezone,
        isUnknownTime: isUnknownTime !== void 0 ? isUnknownTime : existingPartner.isUnknownTime
      };
      const birthDataValidation = validateBirthData(newBirthData);
      if (birthDataValidation.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid birth data",
            details: birthDataValidation.map((msg) => ({ message: msg }))
          }
        });
      }
      updateData.birthDate = newBirthData.birthDate;
      updateData.birthTime = newBirthData.birthTime;
      updateData.locationName = newBirthData.locationName;
      updateData.latitude = newBirthData.latitude;
      updateData.longitude = newBirthData.longitude;
      updateData.timezone = newBirthData.timezone;
      updateData.isUnknownTime = newBirthData.isUnknownTime;
      updateData.chartSummary = null;
    }
    const updatedPartner = await import_prisma.prisma.partner.update({
      where: { id },
      data: updateData
    });
    res.json({
      success: true,
      data: {
        partner: {
          id: updatedPartner.id,
          name: updatedPartner.name,
          label: updatedPartner.label,
          relationshipType: updatedPartner.relationshipType.toLowerCase(),
          birthData: {
            date: updatedPartner.birthDate.toISOString().split("T")[0],
            time: updatedPartner.birthTime,
            location: updatedPartner.locationName,
            isUnknownTime: updatedPartner.isUnknownTime
          },
          notes: updatedPartner.notes,
          updatedAt: updatedPartner.updatedAt
        },
        message: "Partner updated successfully"
      }
    });
  } catch (error) {
    console.error("Update partner error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update partner"
      }
    });
  }
};
const deletePartner = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated"
        }
      });
    }
    const partner = await import_prisma.prisma.partner.findFirst({
      where: { id, userId }
    });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Partner not found"
        }
      });
    }
    await import_prisma.prisma.partner.delete({
      where: { id }
    });
    res.json({
      success: true,
      data: {
        message: "Partner removed successfully"
      }
    });
  } catch (error) {
    console.error("Delete partner error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete partner"
      }
    });
  }
};
const getSynastry = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: partnerId } = req.params;
    const language = req.query.language || "bg";
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated"
        }
      });
    }
    const userBirthData = await import_prisma.prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    if (!userBirthData) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BIRTH_DATA_REQUIRED",
          message: "You need to enter your birth data first to calculate synastry"
        }
      });
    }
    const partner = await import_prisma.prisma.partner.findFirst({
      where: { id: partnerId, userId }
    });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Partner not found"
        }
      });
    }
    const cachedSynastry = await (0, import_synastry.getCachedSynastry)(userId, partnerId);
    if (cachedSynastry) {
      return res.json({
        success: true,
        data: {
          synastry: cachedSynastry,
          partner: {
            id: partner.id,
            name: partner.name,
            label: partner.label,
            relationshipType: partner.relationshipType.toLowerCase()
          },
          language,
          cached: true
        }
      });
    }
    const userBirthDate = new Date(userBirthData.birthDate);
    const [userHour = 12, userMinute = 0] = (userBirthData.birthTime || "12:00").split(":").map(Number);
    const partnerBirthDate = new Date(partner.birthDate);
    const [partnerHour = 12, partnerMinute = 0] = (partner.birthTime || "12:00").split(":").map(Number);
    const synastryChart = await (0, import_synastry.calculateSynastryChart)(
      {
        year: userBirthDate.getFullYear(),
        month: userBirthDate.getMonth() + 1,
        day: userBirthDate.getDate(),
        hour: userHour,
        minute: userMinute,
        latitude: userBirthData.latitude,
        longitude: userBirthData.longitude,
        timezone: userBirthData.timezone
      },
      {
        year: partnerBirthDate.getFullYear(),
        month: partnerBirthDate.getMonth() + 1,
        day: partnerBirthDate.getDate(),
        hour: partnerHour,
        minute: partnerMinute,
        latitude: partner.latitude,
        longitude: partner.longitude,
        timezone: partner.timezone
      },
      userId,
      partnerId
    );
    if (!partner.chartSummary) {
      await import_prisma.prisma.partner.update({
        where: { id: partnerId },
        data: {
          chartSummary: {
            sunSign: synastryChart.partnerChart.sun.sign,
            moonSign: synastryChart.partnerChart.moon.sign,
            risingSign: synastryChart.partnerChart.rising?.sign
          }
        }
      });
    }
    res.json({
      success: true,
      data: {
        synastry: synastryChart,
        partner: {
          id: partner.id,
          name: partner.name,
          label: partner.label,
          relationshipType: partner.relationshipType.toLowerCase()
        },
        language,
        cached: false
      }
    });
  } catch (error) {
    console.error("Get synastry error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to calculate synastry chart"
      }
    });
  }
};
const getCompatibilityReport = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: partnerId } = req.params;
    const language = req.query.language || "bg";
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated"
        }
      });
    }
    const userBirthData = await import_prisma.prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    if (!userBirthData) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BIRTH_DATA_REQUIRED",
          message: "You need to enter your birth data first to generate a compatibility report"
        }
      });
    }
    const partner = await import_prisma.prisma.partner.findFirst({
      where: { id: partnerId, userId }
    });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Partner not found"
        }
      });
    }
    const cachedReport = await (0, import_compatibility_report.getCachedReport)(userId, partnerId, language);
    if (cachedReport) {
      return res.json({
        success: true,
        data: {
          report: cachedReport,
          partner: {
            id: partner.id,
            name: partner.name,
            label: partner.label,
            relationshipType: partner.relationshipType.toLowerCase()
          },
          cached: true
        }
      });
    }
    const userBirthDate = new Date(userBirthData.birthDate);
    const [userHour = 12, userMinute = 0] = (userBirthData.birthTime || "12:00").split(":").map(Number);
    const partnerBirthDate = new Date(partner.birthDate);
    const [partnerHour = 12, partnerMinute = 0] = (partner.birthTime || "12:00").split(":").map(Number);
    const report = await (0, import_compatibility_report.generateCompatibilityReport)(
      {
        year: userBirthDate.getFullYear(),
        month: userBirthDate.getMonth() + 1,
        day: userBirthDate.getDate(),
        hour: userHour,
        minute: userMinute,
        latitude: userBirthData.latitude,
        longitude: userBirthData.longitude,
        timezone: userBirthData.timezone
      },
      {
        year: partnerBirthDate.getFullYear(),
        month: partnerBirthDate.getMonth() + 1,
        day: partnerBirthDate.getDate(),
        hour: partnerHour,
        minute: partnerMinute,
        latitude: partner.latitude,
        longitude: partner.longitude,
        timezone: partner.timezone
      },
      partnerId,
      partner.name,
      userId,
      language
    );
    if (!partner.chartSummary) {
      try {
        const synastryResult = await import("../services/synastry.service").then(
          (m) => m.calculateSynastryChart(
            {
              year: userBirthDate.getFullYear(),
              month: userBirthDate.getMonth() + 1,
              day: userBirthDate.getDate(),
              hour: userHour,
              minute: userMinute,
              latitude: userBirthData.latitude,
              longitude: userBirthData.longitude,
              timezone: userBirthData.timezone
            },
            {
              year: partnerBirthDate.getFullYear(),
              month: partnerBirthDate.getMonth() + 1,
              day: partnerBirthDate.getDate(),
              hour: partnerHour,
              minute: partnerMinute,
              latitude: partner.latitude,
              longitude: partner.longitude,
              timezone: partner.timezone
            },
            userId,
            partnerId
          )
        );
        const chartSummary = {
          sunSign: synastryResult.partnerChart?.sun?.sign || "",
          moonSign: synastryResult.partnerChart?.moon?.sign || "",
          risingSign: synastryResult.partnerChart?.rising?.sign || ""
        };
        if (chartSummary.sunSign || chartSummary.moonSign || chartSummary.risingSign) {
          await import_prisma.prisma.partner.update({
            where: { id: partnerId },
            data: { chartSummary }
          });
        }
      } catch (summaryError) {
        console.warn("Failed to update partner chart summary:", summaryError);
      }
    }
    res.json({
      success: true,
      data: {
        report,
        partner: {
          id: partner.id,
          name: partner.name,
          label: partner.label,
          relationshipType: partner.relationshipType.toLowerCase()
        },
        cached: false
      }
    });
  } catch (error) {
    console.error("Get compatibility report error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to generate compatibility report"
      }
    });
  }
};
const getCompositeChart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: partnerId } = req.params;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" }
      });
    }
    const user = await import_prisma.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.tier !== "PREMIUM") {
      return res.status(403).json({
        success: false,
        error: {
          code: "PREMIUM_REQUIRED",
          message: "Composite chart requires a PREMIUM subscription",
          upgradeRequired: true
        }
      });
    }
    const userBirthData = await import_prisma.prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    if (!userBirthData) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BIRTH_DATA_REQUIRED",
          message: "You need to enter your birth data first to calculate a composite chart"
        }
      });
    }
    const partner = await import_prisma.prisma.partner.findFirst({
      where: { id: partnerId, userId }
    });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Partner not found" }
      });
    }
    const userBirthDate = new Date(userBirthData.birthDate);
    const [userHour = 12, userMinute = 0] = (userBirthData.birthTime || "12:00").split(":").map(Number);
    const partnerBirthDate = new Date(partner.birthDate);
    const [partnerHour = 12, partnerMinute = 0] = (partner.birthTime || "12:00").split(":").map(Number);
    const composite = await (0, import_composite.calculateCompositeChart)(
      {
        year: userBirthDate.getFullYear(),
        month: userBirthDate.getMonth() + 1,
        day: userBirthDate.getDate(),
        hour: userHour,
        minute: userMinute,
        latitude: userBirthData.latitude,
        longitude: userBirthData.longitude,
        timezone: userBirthData.timezone
      },
      {
        year: partnerBirthDate.getFullYear(),
        month: partnerBirthDate.getMonth() + 1,
        day: partnerBirthDate.getDate(),
        hour: partnerHour,
        minute: partnerMinute,
        latitude: partner.latitude,
        longitude: partner.longitude,
        timezone: partner.timezone
      }
    );
    res.json({
      success: true,
      data: {
        composite,
        partner: {
          id: partner.id,
          name: partner.name,
          label: partner.label,
          relationshipType: partner.relationshipType.toLowerCase()
        },
        cached: false
      }
    });
  } catch (error) {
    console.error("Get composite chart error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to calculate composite chart"
      }
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPartner,
  deletePartner,
  getCompatibilityReport,
  getCompositeChart,
  getPartner,
  getSynastry,
  listPartners,
  updatePartner
});
