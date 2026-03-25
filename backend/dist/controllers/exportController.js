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
var exportController_exports = {};
__export(exportController_exports, {
  default: () => exportController_default,
  downloadExport: () => downloadExport,
  exportDataSync: () => exportDataSync,
  getExportStatus: () => getExportStatus,
  listExports: () => listExports,
  requestExport: () => requestExport
});
module.exports = __toCommonJS(exportController_exports);
var import_prisma = __toESM(require("../utils/prisma"));
var import_redis = require("../utils/redis");
var import_data_export_pdf = require("../services/data-export-pdf");
const EXPORT_KEY_PREFIX = "export:";
const EXPORT_TTL = 7 * 24 * 60 * 60;
async function requestExport(req, res, next) {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required"
        }
      });
      return;
    }
    const { format = "json" } = req.body;
    if (format !== "json" && format !== "pdf") {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: 'Format must be "json" or "pdf"'
        }
      });
      return;
    }
    if (format === "pdf") {
      res.status(501).json({
        success: false,
        error: {
          code: "FEATURE_UNAVAILABLE",
          message: "PDF export is temporarily unavailable. Please use JSON format."
        }
      });
      return;
    }
    const userId = req.user.id;
    const exportId = generateExportId();
    const exportRecord = {
      id: exportId,
      userId,
      format,
      status: "pending",
      createdAt: /* @__PURE__ */ new Date()
    };
    await import_redis.redisClient.setEx(
      `${EXPORT_KEY_PREFIX}${exportId}`,
      EXPORT_TTL,
      JSON.stringify(exportRecord)
    );
    const userExportsKey = `${EXPORT_KEY_PREFIX}user:${userId}`;
    await import_redis.redisClient.lPush(userExportsKey, exportId);
    await import_redis.redisClient.lTrim(userExportsKey, 0, 4);
    await import_redis.redisClient.expire(userExportsKey, EXPORT_TTL);
    processExportAsync(exportId, userId, format).catch((err) => {
      console.error(`[Export] Error processing export ${exportId}:`, err);
    });
    const user = await import_prisma.default.user.findUnique({
      where: { id: userId },
      select: { language: true, email: true }
    });
    const lang = user?.language === "en" ? "en" : "bg";
    const estimatedTime = lang === "bg" ? "\u041D\u044F\u043A\u043E\u043B\u043A\u043E \u043C\u0438\u043D\u0443\u0442\u0438 (\u0449\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u0438\u043C\u0435\u0439\u043B)" : "A few minutes (you will receive an email)";
    console.log(`[Export] Created export request ${exportId} for user ${userId}, format: ${format}`);
    res.status(202).json({
      success: true,
      data: {
        exportId,
        status: "pending",
        format,
        estimatedTime,
        createdAt: exportRecord.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error("[Export] Error creating export request:", error);
    next(error);
  }
}
async function getExportStatus(req, res, next) {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required"
        }
      });
      return;
    }
    const { id: exportId } = req.params;
    const userId = req.user.id;
    const recordJson = await import_redis.redisClient.get(`${EXPORT_KEY_PREFIX}${exportId}`);
    if (!recordJson) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Export not found or expired"
        }
      });
      return;
    }
    const record = JSON.parse(recordJson);
    if (record.userId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this export"
        }
      });
      return;
    }
    res.status(200).json({
      success: true,
      data: {
        exportId: record.id,
        format: record.format,
        status: record.status,
        createdAt: record.createdAt.toISOString(),
        completedAt: record.completedAt?.toISOString(),
        downloadUrl: record.downloadUrl,
        expiresAt: new Date(record.createdAt.getTime() + EXPORT_TTL * 1e3).toISOString(),
        error: record.error
      }
    });
  } catch (error) {
    console.error("[Export] Error getting export status:", error);
    next(error);
  }
}
async function downloadExport(req, res, next) {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required"
        }
      });
      return;
    }
    const { id: exportId } = req.params;
    const userId = req.user.id;
    const recordJson = await import_redis.redisClient.get(`${EXPORT_KEY_PREFIX}${exportId}`);
    if (!recordJson) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Export not found or expired"
        }
      });
      return;
    }
    const record = JSON.parse(recordJson);
    if (record.userId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this export"
        }
      });
      return;
    }
    if (record.status !== "completed") {
      res.status(400).json({
        success: false,
        error: {
          code: "NOT_READY",
          message: record.status === "failed" ? "Export failed. Please try again." : "Export is still processing. Please wait."
        }
      });
      return;
    }
    const dataKey = `${EXPORT_KEY_PREFIX}data:${exportId}`;
    const exportData = await import_redis.redisClient.get(dataKey);
    if (!exportData) {
      res.status(404).json({
        success: false,
        error: {
          code: "EXPIRED",
          message: "Export data has expired. Please request a new export."
        }
      });
      return;
    }
    const filename = `astrologaai-export-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
    if (record.format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
      res.send(exportData);
    } else {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
      res.send(Buffer.from(exportData, "base64"));
    }
  } catch (error) {
    console.error("[Export] Error downloading export:", error);
    next(error);
  }
}
async function listExports(req, res, next) {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required"
        }
      });
      return;
    }
    const userId = req.user.id;
    const userExportsKey = `${EXPORT_KEY_PREFIX}user:${userId}`;
    const exportIds = await import_redis.redisClient.lRange(userExportsKey, 0, 4);
    const exports2 = await Promise.all(
      exportIds.map(async (id) => {
        const recordJson = await import_redis.redisClient.get(`${EXPORT_KEY_PREFIX}${id}`);
        if (!recordJson) return null;
        const record = JSON.parse(recordJson);
        return {
          exportId: record.id,
          format: record.format,
          status: record.status,
          createdAt: record.createdAt.toISOString(),
          completedAt: record.completedAt?.toISOString(),
          expiresAt: new Date(record.createdAt.getTime() + EXPORT_TTL * 1e3).toISOString()
        };
      })
    );
    const validExports = exports2.filter(Boolean);
    res.status(200).json({
      success: true,
      data: {
        exports: validExports,
        maxExports: 5
      }
    });
  } catch (error) {
    console.error("[Export] Error listing exports:", error);
    next(error);
  }
}
function generateExportId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `exp_${timestamp}_${random}`;
}
async function processExportAsync(exportId, userId, format) {
  const key = `${EXPORT_KEY_PREFIX}${exportId}`;
  try {
    await updateExportStatus(key, "processing");
    const userData = await fetchUserData(userId);
    let exportData;
    let downloadUrl;
    if (format === "json") {
      exportData = JSON.stringify(userData, null, 2);
      downloadUrl = `/api/v1/user/export/${exportId}/download`;
    } else {
      const pdfBuffer = await (0, import_data_export_pdf.generateDataExportPDF)(userData);
      exportData = pdfBuffer.toString("base64");
      downloadUrl = `/api/v1/user/export/${exportId}/download`;
    }
    const dataKey = `${EXPORT_KEY_PREFIX}data:${exportId}`;
    await import_redis.redisClient.setEx(dataKey, EXPORT_TTL, exportData);
    await updateExportStatus(key, "completed", downloadUrl);
    await sendExportReadyEmail(userId, exportId, format);
    console.log(`[Export] Completed export ${exportId} for user ${userId}`);
  } catch (error) {
    console.error(`[Export] Failed to process export ${exportId}:`, error);
    await updateExportStatus(
      key,
      "failed",
      void 0,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
async function updateExportStatus(key, status, downloadUrl, error) {
  const recordJson = await import_redis.redisClient.get(key);
  if (!recordJson) return;
  const record = JSON.parse(recordJson);
  record.status = status;
  if (downloadUrl) record.downloadUrl = downloadUrl;
  if (error) record.error = error;
  if (status === "completed" || status === "failed") {
    record.completedAt = /* @__PURE__ */ new Date();
  }
  const ttl = await import_redis.redisClient.ttl(key);
  if (ttl > 0) {
    await import_redis.redisClient.setEx(key, ttl, JSON.stringify(record));
  }
}
async function fetchUserData(userId) {
  const user = await import_prisma.default.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      birthProfiles: {
        include: {
          birthChart: {
            include: {
              historyEntries: true
            }
          }
        }
      },
      birthChart: {
        include: {
          historyEntries: true
        }
      },
      chatSessions: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { createdAt: "desc" }
      },
      partners: true,
      subscription: true,
      notificationPreference: true
    }
  });
  if (!user) {
    throw new Error("User not found");
  }
  const forecasts = await fetchUserForecasts(userId);
  const exportData = {
    exportInfo: {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      format: "AstroLogAI Data Export",
      version: "1.0.0"
    },
    profile: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      language: user.language,
      tier: user.tier,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString()
    },
    birthProfiles: user.birthProfiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      birthDate: profile.birthDate.toISOString(),
      birthTime: profile.birthTime,
      locationName: profile.locationName,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone,
      isUnknownTime: profile.isUnknownTime,
      chart: profile.birthChart ? {
        chartData: profile.birthChart.chartData,
        createdAt: profile.birthChart.createdAt.toISOString(),
        history: profile.birthChart.historyEntries.map((h) => ({
          archivedAt: h.archivedAt.toISOString(),
          reason: h.reason,
          birthDate: h.birthDate.toISOString(),
          locationName: h.locationName
        }))
      } : null
    })),
    birthChart: user.birthChart ? {
      chartData: user.birthChart.chartData,
      createdAt: user.birthChart.createdAt.toISOString(),
      history: user.birthChart.historyEntries.map((h) => ({
        archivedAt: h.archivedAt.toISOString(),
        reason: h.reason,
        birthDate: h.birthDate.toISOString(),
        locationName: h.locationName
      }))
    } : null,
    chatHistory: user.chatSessions.map((session) => ({
      id: session.id,
      title: session.title,
      summary: session.summary,
      createdAt: session.createdAt.toISOString(),
      messages: session.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString()
      }))
    })),
    forecasts,
    partners: user.partners.map((partner) => ({
      id: partner.id,
      name: partner.name,
      label: partner.label,
      relationshipType: partner.relationshipType,
      birthDate: partner.birthDate.toISOString(),
      birthTime: partner.birthTime,
      locationName: partner.locationName,
      chartSummary: partner.chartSummary,
      notes: partner.notes,
      createdAt: partner.createdAt.toISOString()
    })),
    subscription: user.subscription ? {
      tier: String(user.subscription.tier),
      status: String(user.subscription.status),
      currentPeriodStart: user.subscription.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() ?? null
    } : null,
    notificationPreferences: user.notificationPreference ? {
      dailyHoroscope: user.notificationPreference.dailyHoroscope,
      weeklyForecast: user.notificationPreference.weeklyForecast,
      newReading: user.notificationPreference.newReading,
      partnerUpdates: user.notificationPreference.partnerUpdates,
      marketing: user.notificationPreference.marketing,
      emailEnabled: user.notificationPreference.emailEnabled,
      pushEnabled: user.notificationPreference.pushEnabled
    } : null
  };
  return exportData;
}
async function fetchUserForecasts(userId) {
  const forecasts = {};
  try {
    const dailyKey = `forecast:daily:${userId}`;
    const weeklyKey = `forecast:weekly:${userId}`;
    const dailyForecast = await import_redis.redisClient.get(dailyKey);
    const weeklyForecast = await import_redis.redisClient.get(weeklyKey);
    if (dailyForecast) {
      forecasts.daily = JSON.parse(dailyForecast);
    }
    if (weeklyForecast) {
      forecasts.weekly = JSON.parse(weeklyForecast);
    }
  } catch (error) {
    console.warn("[Export] Could not fetch forecasts:", error);
  }
  return forecasts;
}
async function sendExportReadyEmail(userId, exportId, format) {
  try {
    const user = await import_prisma.default.user.findUnique({
      where: { id: userId },
      select: { email: true, language: true, fullName: true }
    });
    if (!user) return;
    const lang = user.language === "en" ? "en" : "bg";
    const downloadUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/settings/export?download=${exportId}`;
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailSubject = lang === "bg" ? "\u0414\u0430\u043D\u043D\u0438\u0442\u0435 \u0441\u0430 \u0433\u043E\u0442\u043E\u0432\u0438 \u0437\u0430 \u0438\u0437\u0442\u0435\u0433\u043B\u044F\u043D\u0435 - AstroLogAI" : "Your Data Export is Ready - AstroLogAI";
    const emailHtml = lang === "bg" ? `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">\u2728 AstroLogAI</h1>
          </div>
          <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">\u{1F4E6} \u0414\u0430\u043D\u043D\u0438\u0442\u0435 \u0441\u0430 \u0433\u043E\u0442\u043E\u0432\u0438 \u0437\u0430 \u0438\u0437\u0442\u0435\u0433\u043B\u044F\u043D\u0435</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            \u0417\u0434\u0440\u0430\u0432\u0435\u0439\u0442\u0435${user.fullName ? `, ${user.fullName}` : ""},
          </p>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            \u0412\u0430\u0448\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u0438 \u0432 ${format.toUpperCase()} \u0444\u043E\u0440\u043C\u0430\u0442 \u0441\u0430 \u0433\u043E\u0442\u043E\u0432\u0438 \u0437\u0430 \u0438\u0437\u0442\u0435\u0433\u043B\u044F\u043D\u0435.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600;">
              \u0418\u0437\u0442\u0435\u0433\u043B\u0438 \u0434\u0430\u043D\u043D\u0438\u0442\u0435
            </a>
          </div>
          <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u0438 \u0434\u0430\u043D\u043D\u0438</h3>
            <ul style="color: #A1A1AA; font-size: 14px; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u0437\u0430 \u0430\u043A\u0430\u0443\u043D\u0442\u0430</li>
              <li style="margin-bottom: 8px;">\u0420\u043E\u0436\u0434\u0435\u043D\u0438 \u0434\u0430\u043D\u043D\u0438 \u0438 \u043A\u0430\u0440\u0442\u0438</li>
              <li style="margin-bottom: 8px;">\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043D\u0430 \u0447\u0430\u0442\u043E\u0432\u0435\u0442\u0435</li>
              <li style="margin-bottom: 8px;">\u041F\u0440\u043E\u0433\u043D\u043E\u0437\u0438 \u0438 \u0445\u043E\u0440\u043E\u0441\u043A\u043E\u043F\u0438</li>
              <li style="margin-bottom: 8px;">\u041F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0438 \u0438 \u0432\u0440\u044A\u0437\u043A\u0438</li>
              <li>\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438 \u043F\u0440\u0435\u0434\u043F\u043E\u0447\u0438\u0442\u0430\u043D\u0438\u044F</li>
            </ul>
          </div>
          <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8B5CF6; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #CBD5E1; font-size: 14px; margin: 0;">
              \u23F0 \u0412\u0440\u044A\u0437\u043A\u0430\u0442\u0430 \u0437\u0430 \u0438\u0437\u0442\u0435\u0433\u043B\u044F\u043D\u0435 \u0435 \u0432\u0430\u043B\u0438\u0434\u043D\u0430 7 \u0434\u043D\u0438.
            </p>
          </div>
          <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
            \u0411\u043B\u0430\u0433\u043E\u0434\u0430\u0440\u0438\u043C \u0432\u0438, \u0447\u0435 \u0438\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0442\u0435 AstroLogAI!
          </p>
          <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
            \xA9 2026 AstroLogAI. \u0412\u0441\u0438\u0447\u043A\u0438 \u043F\u0440\u0430\u0432\u0430 \u0437\u0430\u043F\u0430\u0437\u0435\u043D\u0438.<br>
            \u0417\u0430 \u0432\u044A\u043F\u0440\u043E\u0441\u0438: support@astrologaai.com
          </p>
        </div>
      ` : `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">\u2728 AstroLogAI</h1>
          </div>
          <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">\u{1F4E6} Your Data Export is Ready</h2>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hello${user.fullName ? `, ${user.fullName}` : ""},
          </p>
          <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Your data export in ${format.toUpperCase()} format is ready for download.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600;">
              Download Data
            </a>
          </div>
          <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">Included Data</h3>
            <ul style="color: #A1A1AA; font-size: 14px; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Account information</li>
              <li style="margin-bottom: 8px;">Birth data and charts</li>
              <li style="margin-bottom: 8px;">Chat history</li>
              <li style="margin-bottom: 8px;">Forecasts and horoscopes</li>
              <li style="margin-bottom: 8px;">Partners and relationships</li>
              <li>Settings and preferences</li>
            </ul>
          </div>
          <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8B5CF6; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #CBD5E1; font-size: 14px; margin: 0;">
              \u23F0 Download link expires in 7 days.
            </p>
          </div>
          <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
            Thank you for using AstroLogAI!
          </p>
          <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
            \xA9 2026 AstroLogAI. All rights reserved.<br>
            Questions? support@astrologaai.com
          </p>
        </div>
      `;
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@astrologaai.com",
      to: user.email,
      subject: emailSubject,
      html: emailHtml
    });
    console.log(`[Export] Sent ready email to ${user.email} for export ${exportId}`);
  } catch (error) {
    console.error("[Export] Failed to send export ready email:", error);
  }
}
async function exportDataSync(req, res, next) {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required"
        }
      });
      return;
    }
    const userId = req.user.id;
    const userData = await fetchUserData(userId);
    const fileName = `astrologaai-data-export-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    console.log(`[Export Sync] User ${userId} exported their data at ${(/* @__PURE__ */ new Date()).toISOString()}`);
    res.status(200).json(userData);
  } catch (error) {
    console.error("[Export Sync] Error:", error);
    next(error);
  }
}
var exportController_default = {
  requestExport,
  getExportStatus,
  downloadExport,
  listExports,
  exportDataSync
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  downloadExport,
  exportDataSync,
  getExportStatus,
  listExports,
  requestExport
});
