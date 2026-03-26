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
var user_exports = {};
__export(user_exports, {
  default: () => user_default
});
module.exports = __toCommonJS(user_exports);
var import_express = require("express");
var import_multer = __toESM(require("multer"));
var import_path = __toESM(require("path"));
var import_auth = require("../middleware/auth");
var import_prisma = require("../utils/prisma");
var import_redis = require("../utils/redis");
var import_streakService = require("../services/streakService");
var import_userPreferencesController = require("../controllers/userPreferencesController");
var import_deleteAccountController = require("../controllers/deleteAccountController");
var import_exportController = require("../controllers/exportController");
var import_avatarController = require("../controllers/avatarController");
var import_notificationPreferencesController = require("../controllers/notificationPreferencesController");
const router = (0, import_express.Router)();
const storage = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, import_path.default.join(process.cwd(), "tmp"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + import_path.default.extname(file.originalname));
  }
});
const upload = (0, import_multer.default)({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024
    // 2MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG and PNG images are allowed"));
    }
  }
});
router.post("/preferences/detect", import_userPreferencesController.detectLanguage);
router.get("/preferences", import_auth.authMiddleware, import_userPreferencesController.getPreferences);
router.put("/preferences", import_auth.authMiddleware, import_userPreferencesController.updatePreferences);
router.get("/profile", import_auth.authMiddleware, import_userPreferencesController.getProfile);
router.put("/profile", import_auth.authMiddleware, import_userPreferencesController.updateProfile);
router.post("/avatar", import_auth.authMiddleware, upload.single("avatar"), import_avatarController.uploadAvatar);
router.delete("/avatar", import_auth.authMiddleware, import_avatarController.deleteAvatar);
router.post("/verify-email", import_auth.authMiddleware, import_avatarController.sendEmailVerification);
router.post("/confirm-email", import_avatarController.confirmEmailChange);
router.post("/cancel-email-change", import_auth.authMiddleware, import_avatarController.cancelEmailChange);
router.get("/export/download", import_auth.authMiddleware, import_exportController.exportDataSync);
router.post("/export", import_auth.authMiddleware, import_exportController.requestExport);
router.get("/export/list", import_auth.authMiddleware, import_exportController.listExports);
router.get("/export/:id", import_auth.authMiddleware, import_exportController.getExportStatus);
router.get("/export/:id/download", import_auth.authMiddleware, import_exportController.downloadExport);
router.get("/notifications", import_auth.authMiddleware, import_notificationPreferencesController.getNotificationPreferences);
router.put("/notifications", import_auth.authMiddleware, import_notificationPreferencesController.updateNotificationPreferences);
router.get("/notifications/unsubscribe", import_notificationPreferencesController.unsubscribeFromNotifications);
router.post("/notifications/unsubscribe", import_notificationPreferencesController.unsubscribeFromNotifications);
router.post("/notifications/regenerate-token", import_auth.authMiddleware, import_notificationPreferencesController.regenerateUnsubscribeToken);
router.get("/notifications/sms-status", import_auth.authMiddleware, import_notificationPreferencesController.getSmsStatus);
router.delete("/", import_auth.authMiddleware, import_deleteAccountController.deleteAccount);
const ZODIAC_GLYPHS = {
  Aries: "\u2648",
  Taurus: "\u2649",
  Gemini: "\u264A",
  Cancer: "\u264B",
  Leo: "\u264C",
  Virgo: "\u264D",
  Libra: "\u264E",
  Scorpio: "\u264F",
  Sagittarius: "\u2650",
  Capricorn: "\u2651",
  Aquarius: "\u2652",
  Pisces: "\u2653"
};
router.get("/share-card", import_auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `share_card:${userId}`;
    const cached = await import_redis.redisClient.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { birthChart: { select: { chartData: true } } }
    });
    if (!profile?.birthChart?.chartData) {
      return res.status(404).json({ success: false, error: { code: "NO_CHART", message: "No birth chart found" } });
    }
    const cd = profile.birthChart.chartData;
    const data = {
      userId,
      sunSign: cd?.sun?.sign ?? null,
      moonSign: cd?.moon?.sign ?? null,
      risingSign: cd?.rising?.sign ?? null,
      sunGlyph: ZODIAC_GLYPHS[cd?.sun?.sign] ?? "\u2609",
      moonGlyph: ZODIAC_GLYPHS[cd?.moon?.sign] ?? "\u263D",
      risingGlyph: cd?.rising?.sign ? ZODIAC_GLYPHS[cd.rising.sign] ?? "\u2191" : null
    };
    await import_redis.redisClient.setEx(cacheKey, 60 * 60 * 24, JSON.stringify(data));
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[User] share-card error:", err);
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to get share card data" } });
  }
});
router.get("/share-card/public/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const cacheKey = `share_card_pub:${userId}`;
    const cached = await import_redis.redisClient.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });
    const profile = await import_prisma.prisma.birthProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { birthChart: { select: { chartData: true } } }
    });
    if (!profile?.birthChart?.chartData) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Chart not found" } });
    }
    const cd = profile.birthChart.chartData;
    const data = {
      sunSign: cd?.sun?.sign ?? null,
      moonSign: cd?.moon?.sign ?? null,
      risingSign: cd?.rising?.sign ?? null,
      sunGlyph: ZODIAC_GLYPHS[cd?.sun?.sign] ?? "\u2609",
      moonGlyph: ZODIAC_GLYPHS[cd?.moon?.sign] ?? "\u263D",
      risingGlyph: cd?.rising?.sign ? ZODIAC_GLYPHS[cd.rising.sign] ?? "\u2191" : null
    };
    await import_redis.redisClient.setEx(cacheKey, 60 * 60 * 24, JSON.stringify(data));
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed" } });
  }
});
router.get("/settings", import_auth.authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED" } });
  try {
    const user = await import_prisma.prisma.user.findUnique({
      where: { id: userId },
      select: { memoryEnabled: true }
    });
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND" } });
    return res.json({ success: true, data: { memoryEnabled: user.memoryEnabled } });
  } catch (err) {
    console.error("[User] settings GET error:", err);
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR" } });
  }
});
router.patch("/settings", import_auth.authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED" } });
  const { memoryEnabled } = req.body;
  if (typeof memoryEnabled !== "boolean") {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "memoryEnabled must be a boolean" } });
  }
  try {
    const user = await import_prisma.prisma.user.update({
      where: { id: userId },
      data: { memoryEnabled },
      select: { memoryEnabled: true }
    });
    return res.json({ success: true, data: { memoryEnabled: user.memoryEnabled } });
  } catch (err) {
    console.error("[User] settings PATCH error:", err);
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR" } });
  }
});
router.get("/memories", import_auth.authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  const tier = req.user?.tier;
  if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED" } });
  if (tier !== "PRO" && tier !== "PREMIUM") {
    return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Oracle Memory is available for PRO and PREMIUM subscribers." } });
  }
  try {
    const memories = await import_prisma.prisma.userMemory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        category: true,
        sourceDate: true,
        createdAt: true,
        lastRecalledAt: true
      }
    });
    return res.json({ success: true, data: { memories, total: memories.length } });
  } catch (err) {
    console.error("[User] memories GET error:", err);
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR" } });
  }
});
router.get("/memories/export", import_auth.authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  const tier = req.user?.tier;
  if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED" } });
  if (tier !== "PRO" && tier !== "PREMIUM") {
    return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Oracle Memory is available for PRO and PREMIUM subscribers." } });
  }
  try {
    const memories = await import_prisma.prisma.userMemory.findMany({
      where: { userId },
      orderBy: { sourceDate: "asc" },
      select: {
        id: true,
        content: true,
        category: true,
        sourceDate: true,
        chatIds: true,
        createdAt: true,
        lastRecalledAt: true
      }
    });
    const payload = {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      userId,
      totalMemories: memories.length,
      memories
    };
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="oracle-memories-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json"`);
    return res.json(payload);
  } catch (err) {
    console.error("[User] memories export error:", err);
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR" } });
  }
});
router.delete("/memories", import_auth.authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED" } });
  try {
    const result = await import_prisma.prisma.userMemory.deleteMany({ where: { userId } });
    return res.json({ success: true, data: { deleted: result.count } });
  } catch (err) {
    console.error("[User] memories DELETE all error:", err);
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR" } });
  }
});
router.delete("/memories/:id", import_auth.authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED" } });
  const { id } = req.params;
  try {
    const memory = await import_prisma.prisma.userMemory.findUnique({ where: { id }, select: { userId: true } });
    if (!memory) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Memory not found" } });
    }
    if (memory.userId !== userId) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN" } });
    }
    await import_prisma.prisma.userMemory.delete({ where: { id } });
    return res.json({ success: true, data: { id } });
  } catch (err) {
    console.error("[User] memories DELETE single error:", err);
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR" } });
  }
});
router.get("/streak", import_auth.authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED" } });
  try {
    const info = await (0, import_streakService.getStreakInfo)(userId);
    return res.json({ success: true, data: info });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR" } });
  }
});
var user_default = router;
