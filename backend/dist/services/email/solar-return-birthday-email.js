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
var solar_return_birthday_email_exports = {};
__export(solar_return_birthday_email_exports, {
  sendSolarReturnBirthdayEmails: () => sendSolarReturnBirthdayEmails
});
module.exports = __toCommonJS(solar_return_birthday_email_exports);
var import_render = require("@react-email/render");
var import_resend = require("resend");
var import_crypto = __toESM(require("crypto"));
var import_client = require("@prisma/client");
var import_prisma = require("../../utils/prisma");
var import_redis = require("../../utils/redis");
var import_SolarReturnBirthdayEmail = require("../../emails/SolarReturnBirthdayEmail");
const FRONTEND_URL = process.env.FRONTEND_URL || "https://astrologa.bg";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@astrologa.bg";
function getResend() {
  return new import_resend.Resend(process.env.RESEND_API_KEY);
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isLeapYear(year) {
  return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
}
function getTomorrowBirthdayCriteria() {
  const tomorrow = /* @__PURE__ */ new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const month = tomorrow.getMonth() + 1;
  const day = tomorrow.getDate();
  const includeLeapDay = month === 2 && day === 28 && !isLeapYear(tomorrow.getFullYear());
  return { month, day, includeLeapDay };
}
function buildSolarReturnUrl(language) {
  const locale = language === "bg" ? "" : "en/";
  return `${FRONTEND_URL}/${locale}solar-return?ref=birthday-email&utm_source=email&utm_medium=birthday`;
}
function buildUpgradeUrl(language) {
  const locale = language === "bg" ? "" : "en/";
  return `${FRONTEND_URL}/${locale}pricing?ref=birthday-email&utm_source=email&utm_medium=birthday`;
}
function buildUnsubscribeUrl(token, language) {
  const locale = language === "bg" ? "" : "en/";
  return `${FRONTEND_URL}/${locale}notifications/unsubscribe?token=${token}&type=solarReturnBirthday`;
}
function getSubjectVariant(userId) {
  const hash = import_crypto.default.createHash("md5").update(userId).digest();
  return hash[0] % 2 === 0 ? "A" : "B";
}
function buildSubject(variant, language) {
  if (language === "bg") {
    return variant === "A" ? "\u{1F382} \u0427\u0435\u0441\u0442\u0438\u0442 \u0440\u043E\u0436\u0434\u0435\u043D \u0434\u0435\u043D! \u0422\u0432\u043E\u044F\u0442\u0430 Solar Return \u043A\u0430\u0440\u0442\u0430 \u0435 \u0433\u043E\u0442\u043E\u0432\u0430" : "\u2726 \u0417\u0432\u0435\u0437\u0434\u0438\u0442\u0435 \u0438\u043C\u0430\u0442 \u043F\u043E\u0441\u043B\u0430\u043D\u0438\u0435 \u0437\u0430 \u0442\u0432\u043E\u044F\u0442\u0430 \u0433\u043E\u0434\u0438\u043D\u0430 \u043D\u0430\u043F\u0440\u0435\u0434";
  }
  return variant === "A" ? "\u{1F382} Happy Birthday! Your Solar Return chart is ready" : "\u2726 The stars have a message for your year ahead";
}
async function checkAndMarkSent(userId, year) {
  const key = `email_solar_return_birthday:${userId}:${year}`;
  const existing = await import_redis.redisClient.get(key);
  if (existing) return false;
  await import_redis.redisClient.setEx(key, 60 * 60 * 24 * 380, "1");
  return true;
}
async function clearDedup(userId, year) {
  await import_redis.redisClient.del(`email_solar_return_birthday:${userId}:${year}`);
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
function extractSunSign(chartData) {
  if (!chartData || typeof chartData !== "object") return void 0;
  return chartData?.sun?.sign ?? void 0;
}
async function sendSolarReturnBirthdayEmails() {
  const { month, day, includeLeapDay } = getTomorrowBirthdayCriteria();
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const leapDayCondition = includeLeapDay ? import_client.Prisma.sql`OR (EXTRACT(MONTH FROM bp.birth_date) = 2 AND EXTRACT(DAY FROM bp.birth_date) = 29)` : import_client.Prisma.sql``;
  const users = await import_prisma.prisma.$queryRaw`
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.language,
      u.tier,
      bc.chart_data
    FROM users u
    INNER JOIN birth_charts bc ON bc.user_id = u.id
    INNER JOIN birth_profiles bp ON bc.birth_profile_id = bp.id
    LEFT JOIN notification_preferences np ON np.user_id = u.id
    WHERE u.email_verified = true
      AND u.is_suspended = false
      AND (np.email_enabled IS NULL OR np.email_enabled = true)
      AND (
        (EXTRACT(MONTH FROM bp.birth_date) = ${month} AND EXTRACT(DAY FROM bp.birth_date) = ${day})
        ${leapDayCondition}
      )
  `;
  let processed = 0;
  let sent = 0;
  let errors = 0;
  let skipped = 0;
  for (const user of users) {
    processed++;
    try {
      const canSend = await checkAndMarkSent(user.id, year);
      if (!canSend) {
        skipped++;
        continue;
      }
      const lang = user.language || "bg";
      const isPremium = user.tier === "PREMIUM";
      const token = await ensureUnsubscribeToken(user.id);
      const unsubUrl = buildUnsubscribeUrl(token, lang);
      const ctaUrl = isPremium ? buildSolarReturnUrl(lang) : buildUpgradeUrl(lang);
      const sunSign = extractSunSign(user.chart_data);
      const variant = getSubjectVariant(user.id);
      const subject = buildSubject(variant, lang);
      console.log(`[SolarReturnBirthday] user=${user.id} tier=${user.tier} variant=${variant}`);
      const html = await (0, import_render.render)(
        (0, import_SolarReturnBirthdayEmail.SolarReturnBirthdayEmail)({
          firstName: user.full_name ?? void 0,
          sunSign,
          isPremium,
          solarReturnUrl: ctaUrl,
          unsubscribeUrl: unsubUrl
        })
      );
      const resend = getResend();
      await resend.emails.send({ from: FROM_EMAIL, to: user.email, subject, html });
      sent++;
    } catch (err) {
      errors++;
      await clearDedup(user.id, year);
      console.error(`[SolarReturnBirthday] Error sending to user ${user.id}:`, err);
    }
    await delay(2e3);
  }
  console.log(
    `[SolarReturnBirthday] month=${month} day=${day} includeLeapDay=${includeLeapDay}: processed=${processed}, sent=${sent}, skipped=${skipped}, errors=${errors}`
  );
  return { processed, sent, errors, skipped };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  sendSolarReturnBirthdayEmails
});
