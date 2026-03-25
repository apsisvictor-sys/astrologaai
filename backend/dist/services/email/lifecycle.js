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
var lifecycle_exports = {};
__export(lifecycle_exports, {
  runLifecycleCron: () => runLifecycleCron,
  sendVerificationEmail: () => sendVerificationEmail,
  sendWelcomeEmail: () => sendWelcomeEmail
});
module.exports = __toCommonJS(lifecycle_exports);
var import_render = require("@react-email/render");
var import_resend = require("resend");
var import_prisma = require("../../utils/prisma");
var import_redis = require("../../utils/redis");
var import_WelcomeEmail = require("../../emails/WelcomeEmail");
var import_VerificationEmail = require("../../emails/VerificationEmail");
var import_OracleWaitingEmail = require("../../emails/OracleWaitingEmail");
var import_FeatureDiscoveryEmail = require("../../emails/FeatureDiscoveryEmail");
var import_ReEngagementEmail = require("../../emails/ReEngagementEmail");
var import_SoftUpgradeEmail = require("../../emails/SoftUpgradeEmail");
var import_UpgradeOfferEmail = require("../../emails/UpgradeOfferEmail");
var import_crypto = __toESM(require("crypto"));
const FRONTEND_URL = process.env.FRONTEND_URL || "https://astrologa.bg";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@astrologa.bg";
const PROMO_CODE = process.env.LIFECYCLE_PROMO_CODE || "";
function getResend() {
  return new import_resend.Resend(process.env.RESEND_API_KEY);
}
function buildUnsubscribeUrl(token, language) {
  const locale = language === "bg" ? "" : "en/";
  return `${FRONTEND_URL}/${locale}notifications/unsubscribe?token=${token}&all=true`;
}
function buildChatUrl(language) {
  return `${FRONTEND_URL}/${language === "bg" ? "" : "en/"}chat`;
}
function buildPricingUrl(language) {
  return `${FRONTEND_URL}/${language === "bg" ? "" : "en/"}pricing`;
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
function extractSigns(chartData) {
  if (!chartData) return {};
  return {
    sunSign: chartData?.sun?.sign ?? void 0,
    moonSign: chartData?.moon?.sign ?? void 0,
    risingSign: chartData?.rising?.sign ?? void 0
  };
}
function dedupKey(userId, day) {
  return `email_lifecycle:${userId}:day${day}`;
}
async function markSent(userId, day) {
  const key = dedupKey(userId, day);
  const existing = await import_redis.redisClient.get(key);
  if (existing) return false;
  await import_redis.redisClient.setEx(key, 60 * 60 * 24 * 400, "1");
  return true;
}
async function getUsersInWindow(hoursAgo) {
  const now = /* @__PURE__ */ new Date();
  const windowStart = new Date(now.getTime() - (hoursAgo + 1) * 60 * 60 * 1e3);
  const windowEnd = new Date(now.getTime() - (hoursAgo - 1) * 60 * 60 * 1e3);
  return import_prisma.prisma.user.findMany({
    where: {
      createdAt: { gte: windowStart, lte: windowEnd },
      OR: [
        { notificationPreference: { is: null } },
        { notificationPreference: { emailEnabled: true } }
      ]
    },
    include: {
      notificationPreference: { select: { emailEnabled: true } },
      birthProfiles: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { birthChart: { select: { chartData: true } } }
      }
    }
  });
}
async function sendWelcomeEmail(userId, email, fullName, language, chartData) {
  const canSend = await markSent(userId, 0);
  if (!canSend) return;
  const token = await ensureUnsubscribeToken(userId);
  const { sunSign, moonSign, risingSign } = extractSigns(chartData);
  const html = await (0, import_render.render)(
    (0, import_WelcomeEmail.WelcomeEmail)({
      firstName: fullName || void 0,
      sunSign,
      moonSign,
      risingSign,
      chatUrl: buildChatUrl(language),
      unsubscribeUrl: buildUnsubscribeUrl(token, language)
    })
  );
  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your cosmic blueprint is ready \u2726 \u2014 AstroLogAI",
    html
  });
}
async function runLifecycleCron() {
  const days = [
    { day: 1, hoursAgo: 24 },
    { day: 3, hoursAgo: 72 },
    { day: 7, hoursAgo: 168 },
    { day: 14, hoursAgo: 336 },
    { day: 30, hoursAgo: 720 }
  ];
  let processed = 0;
  let sent = 0;
  let errors = 0;
  for (const { day, hoursAgo } of days) {
    const users = await getUsersInWindow(hoursAgo);
    for (const user of users) {
      processed++;
      try {
        const canSend = await markSent(user.id, day);
        if (!canSend) continue;
        const token = await ensureUnsubscribeToken(user.id);
        const chartData = user.birthProfiles[0]?.birthChart?.chartData;
        const { sunSign, moonSign } = extractSigns(chartData);
        const isFree = user.tier === "FREE";
        const lang = user.language || "en";
        const unsubUrl = buildUnsubscribeUrl(token, lang);
        const chatUrl = buildChatUrl(lang);
        const pricingUrl = buildPricingUrl(lang);
        let sessionCount = 0;
        if (day === 1 || day === 7) {
          sessionCount = await import_prisma.prisma.chatSession.count({ where: { userId: user.id } });
        }
        let html = null;
        let subject = "";
        if (day === 1 && sessionCount === 0) {
          subject = "The Oracle is waiting for you \u2014 AstroLogAI";
          html = await (0, import_render.render)(
            (0, import_OracleWaitingEmail.OracleWaitingEmail)({
              firstName: user.fullName ?? void 0,
              sunSign,
              chatUrl,
              unsubscribeUrl: unsubUrl
            })
          );
        } else if (day === 3) {
          subject = "Did you know the Oracle can... \u2014 AstroLogAI";
          html = await (0, import_render.render)(
            (0, import_FeatureDiscoveryEmail.FeatureDiscoveryEmail)({
              firstName: user.fullName ?? void 0,
              forecastUrl: `${FRONTEND_URL}/${lang === "bg" ? "" : "en/"}forecast`,
              partnersUrl: `${FRONTEND_URL}/${lang === "bg" ? "" : "en/"}partners`,
              chartUrl: `${FRONTEND_URL}/${lang === "bg" ? "" : "en/"}chart`,
              chatUrl,
              unsubscribeUrl: unsubUrl
            })
          );
        } else if (day === 7 && sessionCount < 3) {
          subject = "Your chart has something new to show you \u2014 AstroLogAI";
          html = await (0, import_render.render)(
            (0, import_ReEngagementEmail.ReEngagementEmail)({
              firstName: user.fullName ?? void 0,
              sunSign,
              chatUrl,
              unsubscribeUrl: unsubUrl
            })
          );
        } else if (day === 14 && isFree) {
          subject = `You're exploring ${sunSign || "your"} energy deeply \u2014 AstroLogAI`;
          html = await (0, import_render.render)(
            (0, import_SoftUpgradeEmail.SoftUpgradeEmail)({
              firstName: user.fullName ?? void 0,
              sunSign,
              pricingUrl,
              chatUrl,
              unsubscribeUrl: unsubUrl
            })
          );
        } else if (day === 30 && isFree) {
          subject = "A month of cosmic exploration \u2014 a gift for you \u2726";
          html = await (0, import_render.render)(
            (0, import_UpgradeOfferEmail.UpgradeOfferEmail)({
              firstName: user.fullName ?? void 0,
              sunSign,
              moonSign,
              promoCode: PROMO_CODE || void 0,
              pricingUrl,
              unsubscribeUrl: unsubUrl
            })
          );
        }
        if (!html) continue;
        const resend = getResend();
        await resend.emails.send({ from: FROM_EMAIL, to: user.email, subject, html });
        sent++;
      } catch (err) {
        errors++;
        console.error(`[Lifecycle] Error sending day ${day} to user ${user.id}:`, err);
      }
    }
  }
  return { processed, sent, errors };
}
async function sendVerificationEmail(email, token, language = "en") {
  const locale = language === "bg" ? "" : "en/";
  const verifyUrl = `${FRONTEND_URL}/${locale}verify-email?token=${token}`;
  const html = await (0, import_render.render)((0, import_VerificationEmail.VerificationEmail)({ verifyUrl, language }));
  const subject = language === "bg" ? "\u041F\u043E\u0442\u0432\u044A\u0440\u0434\u0438 \u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441\u0430 \u0441\u0438 \u2726" : "Verify your email \u2726";
  const resend = getResend();
  await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runLifecycleCron,
  sendVerificationEmail,
  sendWelcomeEmail
});
