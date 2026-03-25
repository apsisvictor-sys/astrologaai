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
var pdfController_exports = {};
__export(pdfController_exports, {
  emailChartPDF: () => emailChartPDF,
  generateChartPDF: () => generateChartPDF,
  getPDFStatus: () => getPDFStatus
});
module.exports = __toCommonJS(pdfController_exports);
var import_prisma = require("../utils/prisma");
var import_astrology = require("../services/astrology");
var import_pdf_generator = require("../services/pdf-generator.stub");
async function generateChartPDF(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
    const lang = req.query.lang || "bg";
    const preview = req.query.preview === "true";
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
    let chart = null;
    const existingChart = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId: profileId }
    });
    if (existingChart) {
      chart = existingChart.chartData;
    } else {
      const birthDate = new Date(birthProfile.birthDate);
      const birthTime = birthProfile.birthTime || "12:00";
      const [hour, minute] = birthTime.split(":").map(Number);
      chart = await (0, import_astrology.calculateNatalChart)({
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        day: birthDate.getDate(),
        hour: hour || 12,
        minute: minute || 0,
        latitude: birthProfile.latitude,
        longitude: birthProfile.longitude,
        timezone: birthProfile.timezone
      });
      await import_prisma.prisma.birthChart.create({
        data: {
          userId,
          birthProfileId: profileId,
          chartData: chart
        }
      });
    }
    const pdfBuffer = await (0, import_pdf_generator.generateNatalChartPDF)({
      chart,
      profileName: birthProfile.name,
      birthDate: birthProfile.birthDate.toISOString(),
      birthTime: birthProfile.birthTime,
      locationName: birthProfile.locationName,
      language: lang
    });
    const sanitizedName = birthProfile.name.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, "_");
    const filename = `${sanitizedName}_natal_chart_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
    const headers = (0, import_pdf_generator.getPDFHeaders)(filename);
    if (preview) {
      headers["Content-Disposition"] = `inline; filename="${filename}.pdf"`;
    }
    res.set(headers);
    res.send(pdfBuffer);
    console.log(`[PDF] Generated PDF for chart ${profileId}, size: ${pdfBuffer.length} bytes`);
  } catch (error) {
    console.error("[PDF] Generation error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to generate PDF",
        details: process.env.NODE_ENV === "development" ? error.message : void 0
      }
    });
  }
}
async function emailChartPDF(req, res) {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;
    const { email: targetEmail, lang = "bg" } = req.body;
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
    const [user, birthProfile] = await Promise.all([
      import_prisma.prisma.user.findUnique({ where: { id: userId } }),
      import_prisma.prisma.birthProfile.findFirst({ where: { id: profileId, userId } })
    ]);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "User not found" }
      });
      return;
    }
    if (!birthProfile) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Birth profile not found" }
      });
      return;
    }
    let chart = null;
    const existingChart = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId: profileId }
    });
    if (existingChart) {
      chart = existingChart.chartData;
    } else {
      const birthDate = new Date(birthProfile.birthDate);
      const birthTime = birthProfile.birthTime || "12:00";
      const [hour, minute] = birthTime.split(":").map(Number);
      chart = await (0, import_astrology.calculateNatalChart)({
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        day: birthDate.getDate(),
        hour: hour || 12,
        minute: minute || 0,
        latitude: birthProfile.latitude,
        longitude: birthProfile.longitude,
        timezone: birthProfile.timezone
      });
    }
    const pdfBuffer = await (0, import_pdf_generator.generateNatalChartPDF)({
      chart,
      profileName: birthProfile.name,
      birthDate: birthProfile.birthDate.toISOString(),
      birthTime: birthProfile.birthTime,
      locationName: birthProfile.locationName,
      language: lang
    });
    const pdfBase64 = pdfBuffer.toString("base64");
    const emailToSend = targetEmail || user.email;
    const sanitizedName = birthProfile.name.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, "_");
    const filename = `${sanitizedName}_natal_chart_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.pdf`;
    console.log(`[PDF] Prepared PDF email for ${emailToSend}, chart: ${profileId}`);
    res.json({
      success: true,
      data: {
        message: lang === "bg" ? "PDF \u0433\u043E\u0442\u043E\u0432 \u0437\u0430 \u0438\u0437\u043F\u0440\u0430\u0449\u0430\u043D\u0435" : "PDF ready for email",
        email: emailToSend,
        filename,
        // Include base64 for client-side email handling
        pdfBase64,
        size: pdfBuffer.length
      }
    });
  } catch (error) {
    console.error("[PDF] Email error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to prepare PDF email" }
    });
  }
}
async function getPDFStatus(req, res) {
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
      where: { id: profileId, userId },
      include: { birthChart: true }
    });
    if (!birthProfile) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Birth profile not found" }
      });
      return;
    }
    res.json({
      success: true,
      data: {
        canGeneratePDF: false,
        hasChart: !!birthProfile.birthChart,
        profileName: birthProfile.name,
        supportedLanguages: ["en", "bg"]
      }
    });
  } catch (error) {
    console.error("[PDF] Status error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to check PDF status" }
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  emailChartPDF,
  generateChartPDF,
  getPDFStatus
});
