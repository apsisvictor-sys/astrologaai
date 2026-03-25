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
var cost_calculator_exports = {};
__export(cost_calculator_exports, {
  calcMessageCostUsdCents: () => calcMessageCostUsdCents,
  getAdminPrices: () => getAdminPrices,
  getUserCostAlert: () => getUserCostAlert,
  getUserCostEurCents: () => getUserCostEurCents,
  invalidatePriceCache: () => invalidatePriceCache
});
module.exports = __toCommonJS(cost_calculator_exports);
var import_prisma = require("../utils/prisma");
let priceCache = {};
let priceCacheTime = 0;
const PRICE_CACHE_TTL_MS = 5 * 60 * 1e3;
async function getAdminPrices() {
  if (Date.now() - priceCacheTime < PRICE_CACHE_TTL_MS && Object.keys(priceCache).length > 0) {
    return priceCache;
  }
  const configs = await import_prisma.prisma.adminConfig.findMany();
  const prices = {};
  for (const c of configs) {
    const parsed = parseInt(c.value, 10);
    if (!isNaN(parsed)) prices[c.key] = parsed;
  }
  priceCache = prices;
  priceCacheTime = Date.now();
  return prices;
}
function invalidatePriceCache() {
  priceCacheTime = 0;
}
function calcMessageCostUsdCents(model, inputTokens, outputTokens, prices) {
  const inputPrice = prices[`price_input_${model}`] ?? 0;
  const outputPrice = prices[`price_output_${model}`] ?? 0;
  return Math.round((inputTokens * inputPrice + outputTokens * outputPrice) / 1e6);
}
async function getUserCostEurCents(userId, startDate, endDate) {
  const prices = await getAdminPrices();
  const eurUsdRate = prices["eur_usd_rate"] ?? 108;
  const sessions = await import_prisma.prisma.chatSession.findMany({
    where: { userId },
    select: { id: true }
  });
  if (sessions.length === 0) return 0;
  const sessionIds = sessions.map((s) => s.id);
  const messages = await import_prisma.prisma.chatMessage.findMany({
    where: {
      sessionId: { in: sessionIds },
      role: "ASSISTANT",
      createdAt: { gte: startDate, lte: endDate }
    },
    select: { metadata: true }
  });
  let totalUsdCents = 0;
  for (const msg of messages) {
    const meta = msg.metadata;
    if (!meta?.model) continue;
    totalUsdCents += calcMessageCostUsdCents(
      meta.model,
      meta.inputTokens ?? 0,
      meta.outputTokens ?? 0,
      prices
    );
  }
  return Math.round(totalUsdCents * 100 / eurUsdRate);
}
async function getUserCostAlert(userId, tier, billingStart) {
  const prices = await getAdminPrices();
  const thresholdKey = {
    FREE: "alert_threshold_free_eur_cents",
    PRO: "alert_threshold_pro_eur_cents",
    PREMIUM: "alert_threshold_premium_eur_cents"
  };
  const thresholdEurCents = prices[thresholdKey[tier] ?? ""] ?? Infinity;
  const costEurCents = await getUserCostEurCents(userId, billingStart, /* @__PURE__ */ new Date());
  return {
    aboveThreshold: costEurCents >= thresholdEurCents,
    costEurCents,
    thresholdEurCents
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calcMessageCostUsdCents,
  getAdminPrices,
  getUserCostAlert,
  getUserCostEurCents,
  invalidatePriceCache
});
