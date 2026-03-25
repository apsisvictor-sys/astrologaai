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
var morning_briefing_email_exports = {};
__export(morning_briefing_email_exports, {
  sendMorningBriefingEmails: () => sendMorningBriefingEmails
});
module.exports = __toCommonJS(morning_briefing_email_exports);
var import_render = require("@react-email/render");
var import_resend = require("resend");
var import_crypto = __toESM(require("crypto"));
var import_prisma = require("../../utils/prisma");
var import_redis = require("../../utils/redis");
var import_MorningBriefingEmail = require("../../emails/MorningBriefingEmail");
var import_forecast_cron = require("../forecast-cron");
const FRONTEND_URL = process.env.FRONTEND_URL || "https://astrologa.bg";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@astrologa.bg";
function getResend() {
  return new import_resend.Resend(process.env.RESEND_API_KEY);
}
function todayString() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function buildUnsubscribeUrl(token, language) {
  const locale = language === "bg" ? "" : "en/";
  return `${FRONTEND_URL}/${locale}notifications/unsubscribe?token=${token}&type=morningBriefing`;
}
function buildForecastUrl(language) {
  const locale = language === "bg" ? "" : "en/";
  return `${FRONTEND_URL}/${locale}forecast?ref=morning-briefing&utm_source=email&utm_medium=morning_briefing`;
}
function buildUpgradeUrl(language) {
  const locale = language === "bg" ? "" : "en/";
  return `${FRONTEND_URL}/${locale}pricing?ref=morning-briefing&utm_source=email&utm_medium=morning_briefing`;
}
function isInSendWindow(timezone) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false
    });
    const localHour = parseInt(formatter.format(/* @__PURE__ */ new Date()), 10);
    return localHour >= 6 && localHour < 8;
  } catch {
    return false;
  }
}
function formatDateForEmail(language) {
  const now = /* @__PURE__ */ new Date();
  if (language === "bg") {
    const bgMonths = [
      "\u044F\u043D\u0443\u0430\u0440\u0438",
      "\u0444\u0435\u0432\u0440\u0443\u0430\u0440\u0438",
      "\u043C\u0430\u0440\u0442",
      "\u0430\u043F\u0440\u0438\u043B",
      "\u043C\u0430\u0439",
      "\u044E\u043D\u0438",
      "\u044E\u043B\u0438",
      "\u0430\u0432\u0433\u0443\u0441\u0442",
      "\u0441\u0435\u043F\u0442\u0435\u043C\u0432\u0440\u0438",
      "\u043E\u043A\u0442\u043E\u043C\u0432\u0440\u0438",
      "\u043D\u043E\u0435\u043C\u0432\u0440\u0438",
      "\u0434\u0435\u043A\u0435\u043C\u0432\u0440\u0438"
    ];
    const bgDays = ["\u043D\u0435\u0434\u0435\u043B\u044F", "\u043F\u043E\u043D\u0435\u0434\u0435\u043B\u043D\u0438\u043A", "\u0432\u0442\u043E\u0440\u043D\u0438\u043A", "\u0441\u0440\u044F\u0434\u0430", "\u0447\u0435\u0442\u0432\u044A\u0440\u0442\u044A\u043A", "\u043F\u0435\u0442\u044A\u043A", "\u0441\u044A\u0431\u043E\u0442\u0430"];
    return `${bgDays[now.getDay()]}, ${now.getDate()} ${bgMonths[now.getMonth()]} ${now.getFullYear()}`;
  }
  return now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatShortDateForSubject(language) {
  const now = /* @__PURE__ */ new Date();
  if (language === "bg") {
    const bgMonths = ["\u044F\u043D\u0443", "\u0444\u0435\u0432", "\u043C\u0430\u0440", "\u0430\u043F\u0440", "\u043C\u0430\u0439", "\u044E\u043D\u0438", "\u044E\u043B\u0438", "\u0430\u0432\u0433", "\u0441\u0435\u043F", "\u043E\u043A\u0442", "\u043D\u043E\u0435", "\u0434\u0435\u043A"];
    return `${now.getDate()} ${bgMonths[now.getMonth()]}`;
  }
  return now.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}
async function checkAndMarkSent(userId, date) {
  const key = `email_morning_briefing:${userId}:${date}`;
  const existing = await import_redis.redisClient.get(key);
  if (existing) return false;
  await import_redis.redisClient.setEx(key, 60 * 60 * 48, "1");
  return true;
}
async function clearDedup(userId, date) {
  await import_redis.redisClient.del(`email_morning_briefing:${userId}:${date}`);
}
async function handleSendFailure(userId) {
  const key = `email_morning_briefing_fail:${userId}`;
  const current = await import_redis.redisClient.get(key);
  const count = parseInt(current || "0", 10) + 1;
  await import_redis.redisClient.setEx(key, 60 * 60 * 24 * 30, String(count));
  if (count >= 3) {
    await import_prisma.prisma.notificationPreference.updateMany({
      where: { userId },
      data: { morningBriefing: false }
    });
    await import_redis.redisClient.del(key);
    console.log(`[MorningBriefing] Auto-disabled morningBriefing for ${userId} after 3 consecutive failures`);
  }
}
async function resetFailureCounter(userId) {
  await import_redis.redisClient.del(`email_morning_briefing_fail:${userId}`);
}
async function ensureUnsubscribeToken(userId) {
  const pref = await import_prisma.prisma.notificationPreference.findUnique({ where: { userId } });
  if (pref?.unsubscribeToken) return pref.unsubscribeToken;
  const token = import_crypto.default.randomBytes(32).toString("hex");
  await import_prisma.prisma.notificationPreference.upsert({
    where: { userId },
    update: { unsubscribeToken: token },
    create: { userId, unsubscribeToken: token }
  });
  return token;
}
function extractTopTransits(forecastData, language) {
  const transits = forecastData?.transits ?? [];
  return transits.filter((t) => t.aspectToNatal).slice(0, 3).map((t) => ({
    planet: language === "bg" ? t.planetBg || t.planet : t.planet,
    sign: language === "bg" ? t.signBg || t.sign : t.sign,
    influence: t.aspectToNatal?.influence ?? "neutral",
    description: language === "bg" ? t.aspectToNatal?.descriptionBg || t.aspectToNatal?.description || "" : t.aspectToNatal?.description || ""
  }));
}
async function sendMorningBriefingEmails() {
  const date = todayString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
  const users = await import_prisma.prisma.user.findMany({
    where: {
      emailVerified: true,
      isSuspended: false,
      notificationPreference: {
        morningBriefing: true,
        emailEnabled: true
      },
      OR: [
        { tier: { in: ["PRO", "PREMIUM"] } },
        { tier: "FREE", lastQueryDate: { gte: sevenDaysAgo } }
      ],
      // Must have a BirthProfile (for timezone) and BirthChart (for forecast)
      birthProfiles: { some: {} },
      birthChart: { isNot: null }
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      language: true,
      tier: true,
      birthProfiles: {
        take: 1,
        select: { timezone: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });
  let processed = 0;
  let sent = 0;
  let skippedWindow = 0;
  let errors = 0;
  for (const user of users) {
    processed++;
    const timezone = user.birthProfiles[0]?.timezone;
    if (!timezone) {
      skippedWindow++;
      continue;
    }
    if (!isInSendWindow(timezone)) {
      skippedWindow++;
      continue;
    }
    try {
      const canSend = await checkAndMarkSent(user.id, date);
      if (!canSend) continue;
      const lang = user.language || "bg";
      const tier = user.tier;
      let moonPhase = "Waxing Gibbous";
      let moonPhaseBg;
      let moonSign;
      let moonSignBg;
      let moonIllumination;
      let energy = "medium";
      let transits = [];
      let tip;
      let tipBg;
      let oracleInsight;
      if (tier === "PRO" || tier === "PREMIUM") {
        const stored = await (0, import_forecast_cron.getStoredForecast)(user.id, date);
        const forecastData = stored?.forecast;
        if (!forecastData) {
          await clearDedup(user.id, date);
          continue;
        }
        moonPhase = forecastData.moonPhase?.phase || "Waxing Gibbous";
        moonPhaseBg = forecastData.moonPhase?.phaseBg;
        moonSign = forecastData.moonPhase?.sign;
        moonSignBg = forecastData.moonPhase?.signBg;
        moonIllumination = forecastData.moonPhase?.illumination;
        energy = forecastData.energy || "medium";
        transits = extractTopTransits(forecastData, lang);
        tip = forecastData.recommendations?.[0];
        tipBg = forecastData.recommendationsBg?.[0];
        if (tier === "PREMIUM") {
          oracleInsight = forecastData.oracleInsight ?? void 0;
        }
      }
      const token = await ensureUnsubscribeToken(user.id);
      const dateStr = formatDateForEmail(lang);
      const shortDate = formatShortDateForSubject(lang);
      const subject = lang === "bg" ? `\u{1F319} \u0422\u0432\u043E\u044F\u0442 \u0441\u0443\u0442\u0440\u0435\u0448\u0435\u043D \u0431\u0440\u0438\u0444\u0438\u043D\u0433 \u0437\u0430 ${shortDate}` : `\u{1F319} Your morning briefing for ${shortDate}`;
      const html = await (0, import_render.render)(
        (0, import_MorningBriefingEmail.MorningBriefingEmail)({
          tier,
          language: lang,
          firstName: user.fullName ?? void 0,
          date: dateStr,
          moonPhase,
          moonPhaseBg,
          moonSign,
          moonSignBg,
          moonIllumination,
          energy,
          transits: tier !== "FREE" ? transits : void 0,
          tip: tier !== "FREE" ? tip : void 0,
          tipBg: tier !== "FREE" ? tipBg : void 0,
          oracleInsight,
          forecastUrl: buildForecastUrl(lang),
          upgradeUrl: buildUpgradeUrl(lang),
          unsubscribeUrl: buildUnsubscribeUrl(token, lang)
        })
      );
      const resend = getResend();
      await resend.emails.send({ from: FROM_EMAIL, to: user.email, subject, html });
      await resetFailureCounter(user.id);
      sent++;
    } catch (err) {
      errors++;
      console.error(`[MorningBriefing] Error sending to user ${user.id}:`, err);
      await handleSendFailure(user.id);
    }
    await delay(2e3);
  }
  console.log(`[MorningBriefing] ${date}: processed=${processed}, sent=${sent}, skippedWindow=${skippedWindow}, errors=${errors}`);
  return { processed, sent, skippedWindow, errors };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  sendMorningBriefingEmails
});
