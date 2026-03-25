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
var horoscope_email_exports = {};
__export(horoscope_email_exports, {
  sendDailyHoroscopeEmails: () => sendDailyHoroscopeEmails
});
module.exports = __toCommonJS(horoscope_email_exports);
var import_render = require("@react-email/render");
var import_resend = require("resend");
var import_crypto = __toESM(require("crypto"));
var import_prisma = require("../../utils/prisma");
var import_redis = require("../../utils/redis");
var import_HoroscopeProEmail = require("../../emails/HoroscopeProEmail");
var import_HoroscopeFreeEmail = require("../../emails/HoroscopeFreeEmail");
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
  return `${FRONTEND_URL}/${locale}notifications/unsubscribe?token=${token}&type=dailyHoroscope`;
}
function buildForecastUrl(language) {
  const locale = language === "bg" ? "" : "en/";
  return `${FRONTEND_URL}/${locale}forecast?ref=horoscope-email&utm_source=email&utm_medium=daily`;
}
function buildUpgradeUrl(language) {
  const locale = language === "bg" ? "" : "en/";
  return `${FRONTEND_URL}/${locale}pricing?ref=horoscope-email&utm_source=email&utm_medium=daily`;
}
async function checkAndMarkSent(userId, date) {
  const key = `email_horoscope:${userId}:${date}`;
  const existing = await import_redis.redisClient.get(key);
  if (existing) return false;
  await import_redis.redisClient.setEx(key, 60 * 60 * 48, "1");
  return true;
}
async function clearDedup(userId, date) {
  await import_redis.redisClient.del(`email_horoscope:${userId}:${date}`);
}
async function handleSendFailure(userId) {
  const key = `email_horoscope_fail:${userId}`;
  const current = await import_redis.redisClient.get(key);
  const count = parseInt(current || "0", 10) + 1;
  await import_redis.redisClient.setEx(key, 60 * 60 * 24 * 30, String(count));
  if (count >= 3) {
    await import_prisma.prisma.notificationPreference.updateMany({
      where: { userId },
      data: { dailyHoroscope: false }
    });
    await import_redis.redisClient.del(key);
    console.log(`[HoroscopeEmail] Auto-disabled dailyHoroscope for ${userId} after 3 consecutive failures`);
  }
}
async function resetFailureCounter(userId) {
  await import_redis.redisClient.del(`email_horoscope_fail:${userId}`);
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
    const bgMonths = [
      "\u044F\u043D\u0443",
      "\u0444\u0435\u0432",
      "\u043C\u0430\u0440",
      "\u0430\u043F\u0440",
      "\u043C\u0430\u0439",
      "\u044E\u043D\u0438",
      "\u044E\u043B\u0438",
      "\u0430\u0432\u0433",
      "\u0441\u0435\u043F",
      "\u043E\u043A\u0442",
      "\u043D\u043E\u0435",
      "\u0434\u0435\u043A"
    ];
    return `${now.getDate()} ${bgMonths[now.getMonth()]}`;
  }
  return now.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}
function extractSigns(chartData) {
  if (!chartData) return {};
  return {
    sunSign: chartData?.sun?.sign ?? void 0,
    moonSign: chartData?.moon?.sign ?? void 0
  };
}
function firstSentence(text) {
  const match = text.match(/[^.!?]+[.!?]/);
  return match ? match[0].trim() : text;
}
function getFreeUserContent(_sunSign) {
  const day = (/* @__PURE__ */ new Date()).getDay();
  const generalThemes = [
    "Today brings a period of reflection and inner clarity. The cosmic energy supports thoughtful decisions and meaningful conversations.",
    "The stars align to bring opportunities for connection and growth. Stay open to new perspectives today.",
    "A powerful day for setting intentions. The planetary energies support your ambitions and creative impulses.",
    "Balance is the theme today. Take time to nurture both your inner world and your relationships with others.",
    "Today's energy favors patience and steady progress. Small steps lead to significant breakthroughs.",
    "The cosmic currents invite you to trust your intuition. Your instincts are sharper than usual today.",
    "Today is ideal for communication and collaboration. Express yourself clearly and listen actively."
  ];
  const loveTeasers = [
    "The stars support heartfelt conversations with loved ones today.",
    "An opportunity for deeper emotional connection emerges today.",
    "Today's energy brings warmth to your romantic connections.",
    "Open your heart \u2014 the stars support vulnerability and closeness.",
    "A gentle day for love \u2014 nurture your most important bonds.",
    "Romantic energy is heightened; trust what your heart tells you.",
    "Connection flows easily today \u2014 reach out to those who matter most."
  ];
  const careerTeasers = [
    "Your professional efforts are noticed today \u2014 keep moving forward.",
    "A favorable time for tackling challenging tasks at work.",
    "Today brings clarity on a professional question you have been pondering.",
    "Collaborative efforts shine today \u2014 lean into teamwork.",
    "Your creative instincts are an asset in professional settings today.",
    "A steady, focused approach brings the best results today.",
    "Today is well-suited for planning and organizing your professional goals."
  ];
  return {
    generalTheme: generalThemes[day],
    loveTeaser: loveTeasers[day],
    careerTeaser: careerTeasers[day]
  };
}
async function sendDailyHoroscopeEmails() {
  const date = todayString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
  const users = await import_prisma.prisma.user.findMany({
    where: {
      emailVerified: true,
      isSuspended: false,
      notificationPreference: {
        dailyHoroscope: true,
        emailEnabled: true
      },
      OR: [
        { tier: { in: ["PRO", "PREMIUM"] } },
        { tier: "FREE", lastQueryDate: { gte: sevenDaysAgo } }
      ],
      birthChart: { isNot: null }
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      language: true,
      tier: true,
      birthChart: { select: { chartData: true } }
    }
  });
  let processed = 0;
  let sent = 0;
  let errors = 0;
  for (const user of users) {
    processed++;
    try {
      const canSend = await checkAndMarkSent(user.id, date);
      if (!canSend) continue;
      const token = await ensureUnsubscribeToken(user.id);
      const lang = user.language || "bg";
      const unsubUrl = buildUnsubscribeUrl(token, lang);
      const dateStr = formatDateForEmail(lang);
      const shortDate = formatShortDateForSubject(lang);
      const { sunSign, moonSign } = extractSigns(user.birthChart?.chartData);
      const subject = lang === "bg" ? `\u2726 \u0422\u0432\u043E\u044F\u0442 \u0445\u043E\u0440\u043E\u0441\u043A\u043E\u043F \u0437\u0430 ${shortDate}` : `\u2726 Your horoscope for ${shortDate}`;
      let html;
      if (user.tier === "PRO" || user.tier === "PREMIUM") {
        const stored = await (0, import_forecast_cron.getStoredForecast)(user.id, date);
        const forecastData = stored?.forecast;
        if (!forecastData?.horoscope) {
          await clearDedup(user.id, date);
          continue;
        }
        html = await (0, import_render.render)(
          (0, import_HoroscopeProEmail.HoroscopeProEmail)({
            firstName: user.fullName ?? void 0,
            sunSign,
            moonSign,
            date: dateStr,
            generalTheme: forecastData.horoscope.general || forecastData.overallTheme || "",
            love: forecastData.horoscope.love || "",
            career: forecastData.horoscope.career || "",
            luckyNumbers: forecastData.horoscope.luckyNumbers || [],
            powerHours: forecastData.horoscope.powerHours || [],
            forecastUrl: buildForecastUrl(lang),
            unsubscribeUrl: unsubUrl
          })
        );
      } else {
        const { generalTheme, loveTeaser, careerTeaser } = getFreeUserContent(sunSign);
        html = await (0, import_render.render)(
          (0, import_HoroscopeFreeEmail.HoroscopeFreeEmail)({
            firstName: user.fullName ?? void 0,
            sunSign,
            date: dateStr,
            generalTheme,
            loveTeaser,
            careerTeaser,
            upgradeUrl: buildUpgradeUrl(lang),
            unsubscribeUrl: unsubUrl
          })
        );
      }
      const resend = getResend();
      await resend.emails.send({ from: FROM_EMAIL, to: user.email, subject, html });
      await resetFailureCounter(user.id);
      sent++;
    } catch (err) {
      errors++;
      console.error(`[HoroscopeEmail] Error sending to user ${user.id}:`, err);
      await handleSendFailure(user.id);
    }
    await delay(2e3);
  }
  console.log(`[HoroscopeEmail] ${date}: processed=${processed}, sent=${sent}, errors=${errors}`);
  return { processed, sent, errors };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  sendDailyHoroscopeEmails
});
