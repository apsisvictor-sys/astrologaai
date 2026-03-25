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
var compatibilityController_exports = {};
__export(compatibilityController_exports, {
  getCompatibilityAnalysis: () => getCompatibilityAnalysis,
  invalidateCompatibilityCache: () => invalidateCompatibilityCache
});
module.exports = __toCommonJS(compatibilityController_exports);
var import_compatibility = require("../services/compatibility");
const getCompatibilityAnalysis = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { partnerId } = req.params;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated"
        }
      });
    }
    if (!partnerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Partner ID is required"
        }
      });
    }
    const analysis = await (0, import_compatibility.calculateCompatibility)(userId, partnerId);
    res.json({
      success: true,
      data: {
        compatibility: analysis
      }
    });
  } catch (error) {
    console.error("Get compatibility error:", error);
    if (error instanceof Error) {
      if (error.message === "User birth chart not found") {
        return res.status(400).json({
          success: false,
          error: {
            code: "BIRTH_CHART_REQUIRED",
            message: "Please complete your birth data before viewing compatibility"
          }
        });
      }
      if (error.message === "Partner not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "PARTNER_NOT_FOUND",
            message: "Partner not found"
          }
        });
      }
    }
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to calculate compatibility"
      }
    });
  }
};
const invalidateCompatibilityCache = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { partnerId } = req.params;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated"
        }
      });
    }
    await (0, import_compatibility.invalidateCompatibilityCache)(userId, partnerId);
    res.json({
      success: true,
      data: {
        message: "Compatibility cache invalidated"
      }
    });
  } catch (error) {
    console.error("Invalidate cache error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to invalidate cache"
      }
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getCompatibilityAnalysis,
  invalidateCompatibilityCache
});
