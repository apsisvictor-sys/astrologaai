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
var guestChat_exports = {};
__export(guestChat_exports, {
  MAX_GUEST_MESSAGES: () => MAX_GUEST_MESSAGES,
  default: () => guestChat_default,
  signGuestToken: () => signGuestToken,
  verifyGuestToken: () => verifyGuestToken
});
module.exports = __toCommonJS(guestChat_exports);
var import_express = require("express");
var import_rateLimiter = require("../middleware/rateLimiter");
var import_crypto = require("crypto");
var import_astrology = require("../services/astrology");
var import_llm_helpers = require("../services/llm-helpers");
var import_llm = require("../services/llm");
var import_redis = require("../utils/redis");
const router = (0, import_express.Router)();
const GUEST_CHAT_SECRET = process.env.GUEST_CHAT_SECRET || "guest-chat-secret-change-in-prod";
if (!process.env.GUEST_CHAT_SECRET) {
  console.warn("[GuestChat] WARNING: GUEST_CHAT_SECRET env var not set. Using insecure default. Set this in production!");
}
const MAX_GUEST_MESSAGES = 10;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1e3;
function signGuestToken(sessionId, ip) {
  const payload = JSON.stringify({ sessionId, createdAt: Date.now(), ip });
  const sig = (0, import_crypto.createHmac)("sha256", GUEST_CHAT_SECRET).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64") + "." + sig;
}
function verifyGuestToken(token, ip) {
  if (!token || typeof token !== "string") return null;
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const payloadB64 = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    const payload = Buffer.from(payloadB64, "base64").toString();
    const expectedSig = (0, import_crypto.createHmac)("sha256", GUEST_CHAT_SECRET).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length || !(0, import_crypto.timingSafeEqual)(sigBuf, expectedBuf)) return null;
    const parsed = JSON.parse(payload);
    if (Date.now() - parsed.createdAt > TOKEN_TTL_MS) return null;
    if (parsed.ip && parsed.ip !== ip && parsed.ip !== "unknown") {
      console.warn(`[GuestChat] Token IP mismatch: token=${parsed.ip} req=${ip}`);
    }
    return parsed;
  } catch {
    return null;
  }
}
router.post(
  "/start",
  (0, import_rateLimiter.rateLimiter)(3, 3600),
  (req, res) => {
    const ip = req.ip || "unknown";
    const sessionId = (0, import_crypto.randomUUID)();
    const token = signGuestToken(sessionId, ip);
    res.json({
      success: true,
      data: { sessionId, token, maxMessages: MAX_GUEST_MESSAGES }
    });
  }
);
router.post(
  "/message",
  (0, import_rateLimiter.rateLimiter)(30, 3600),
  async (req, res) => {
    const { token, sessionId, content, birthData, language } = req.body;
    const guestLanguage = language === "bg" ? "bg" : "en";
    if (!token || !sessionId || !content) {
      res.status(400).json({ success: false, error: { code: "MISSING_FIELDS", message: "token, sessionId, and content are required" } });
      return;
    }
    if (content.length > 2e3) {
      res.status(400).json({ success: false, error: { code: "CONTENT_TOO_LONG", message: "Message too long. Maximum 2000 characters." } });
      return;
    }
    const session = verifyGuestToken(token, req.ip || "unknown");
    if (!session) {
      res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired session token" } });
      return;
    }
    if (session.sessionId !== sessionId) {
      res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Session ID mismatch." } });
      return;
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      res.status(400).json({ success: false, error: { code: "INVALID_SESSION_ID", message: "Invalid session ID format." } });
      return;
    }
    let msgCount = 0;
    try {
      const countStr = await import_redis.redisClient.get(`guest_msg_count:${sessionId}`);
      msgCount = countStr ? parseInt(countStr, 10) : 0;
    } catch (e) {
      console.warn("[GuestChat] Redis unavailable for message count check \u2014 failing open:", e);
    }
    if (msgCount >= MAX_GUEST_MESSAGES) {
      res.status(429).json({ success: false, error: { code: "GUEST_LIMIT_REACHED", message: "Guest message limit reached. Please register to continue." } });
      return;
    }
    let chartSummary;
    try {
      const cached = await import_redis.redisClient.get(`guest_chart:${sessionId}`);
      if (cached) {
        chartSummary = cached;
      } else if (birthData) {
        const [year, month, day] = birthData.birthDate.split("-").map(Number);
        const [hour, minute] = birthData.birthTime ? birthData.birthTime.split(":").map(Number) : [12, 0];
        const input = { year, month, day, hour, minute, latitude: birthData.latitude, longitude: birthData.longitude, timezone: birthData.timezone };
        const chart = await (0, import_astrology.calculateNatalChart)(input);
        chartSummary = (0, import_llm_helpers.generateChartSummary)(chart, "en");
        await import_redis.redisClient.setEx(`guest_chart:${sessionId}`, 86400, chartSummary);
      }
    } catch {
    }
    let history = [];
    try {
      const historyStr = await import_redis.redisClient.get(`guest_context:${sessionId}`);
      if (historyStr) {
        history = JSON.parse(historyStr);
      }
    } catch {
    }
    const systemPrompt = await (0, import_llm_helpers.buildSystemPrompt)({ chartSummary, language: guestLanguage });
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content }
    ];
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write(`event: metadata
data: ${JSON.stringify({ sessionId, remaining: Math.max(0, MAX_GUEST_MESSAGES - msgCount - 1) })}

`);
    let fullResponse = "";
    let hasError = false;
    try {
      for await (const chunk of (0, import_llm.streamChatCompletion)(messages)) {
        if (chunk.error) {
          hasError = true;
          res.write(`event: error
data: ${JSON.stringify({ message: chunk.error })}

`);
          break;
        }
        fullResponse += chunk.content;
        res.write(`event: chunk
data: ${JSON.stringify({ content: chunk.content, done: chunk.done })}

`);
        if (chunk.done) break;
      }
    } catch (streamError) {
      hasError = true;
      const msg = streamError instanceof Error ? streamError.message : "Streaming error";
      res.write(`event: error
data: ${JSON.stringify({ message: msg })}

`);
    }
    if (!hasError && fullResponse) {
      try {
        const updatedHistory = [
          ...history,
          { role: "user", content },
          { role: "assistant", content: fullResponse }
        ].slice(-20);
        await import_redis.redisClient.setEx(`guest_context:${sessionId}`, 86400, JSON.stringify(updatedHistory));
        await import_redis.redisClient.setEx(`guest_msg_count:${sessionId}`, 86400, String(msgCount + 1));
      } catch {
      }
    }
    res.write(`event: complete
data: ${JSON.stringify({ hasError })}

`);
    res.end();
  }
);
var guestChat_default = router;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MAX_GUEST_MESSAGES,
  signGuestToken,
  verifyGuestToken
});
