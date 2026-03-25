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
var subscription_tiers_exports = {};
__export(subscription_tiers_exports, {
  TIER_CONFIG: () => TIER_CONFIG,
  default: () => subscription_tiers_default,
  getBurstLimit: () => getBurstLimit,
  getEffectiveMonthlyLimit: () => getEffectiveMonthlyLimit,
  getMonthlyQueryLimit: () => getMonthlyQueryLimit,
  getMonthlyResetDay: () => getMonthlyResetDay,
  getTierLimits: () => getTierLimits,
  hasFeature: () => hasFeature,
  isUnlimitedBurst: () => isUnlimitedBurst,
  isUnlimitedTier: () => isUnlimitedTier
});
module.exports = __toCommonJS(subscription_tiers_exports);
const TIER_CONFIG = {
  FREE: {
    tier: "FREE",
    name: { bg: "\u0411\u0435\u0437\u043F\u043B\u0430\u0442\u0435\u043D", en: "Free" },
    dailyQueries: 3,
    burstLimit: 3,
    features: [
      "3_queries_day",
      "tool:get_natal_chart"
      // Free users can only ask about their static birth chart
    ],
    price: {
      monthly: 0,
      yearly: 0,
      currency: "EUR"
    }
  },
  PRO: {
    tier: "PRO",
    name: { bg: "\u041F\u0440\u043E", en: "Pro" },
    burstLimit: 10,
    features: [
      "unlimited_queries",
      "tool:get_natal_chart",
      "tool:get_transits",
      // Live transit timing predictions
      "tool:get_solar_return",
      // Annual solar return / year-ahead forecast
      "tool:get_lunar_return"
      // Monthly lunar return cycle
    ],
    price: {
      monthly: 9.99,
      yearly: 89.88,
      // 25% off: 9.99 * 12 * 0.75
      currency: "EUR"
    }
  },
  PREMIUM: {
    tier: "PREMIUM",
    name: { bg: "\u041F\u0440\u0435\u043C\u0438\u0443\u043C", en: "Premium" },
    burstLimit: 10,
    // 10 req/min — realistic for human use, protects against abuse
    features: [
      "everything_in_pro",
      "tool:get_natal_chart",
      "tool:get_transits",
      "tool:get_synastry",
      // Premium users unlock relationship compatibility
      "tool:get_progressions",
      // Advanced Psychological Timing
      "tool:get_solar_return",
      // Year Ahead Forecast
      "tool:get_relocation",
      // Astrocartography / Moving
      "tool:get_composite",
      // Destiny of Relationship
      "tool:get_lunar_return",
      // Monthly lunar return cycle
      "tool:get_venus_return",
      // Precise Love timing
      "tool:get_solar_arc",
      // Long-term solar arc directions
      "priority_support"
    ],
    price: {
      monthly: 19.99,
      yearly: 179.88,
      // 25% off: 19.99 * 12 * 0.75
      currency: "EUR"
    }
  }
};
function getTierLimits(tier) {
  return TIER_CONFIG[tier] || TIER_CONFIG.FREE;
}
function isUnlimitedTier(tier) {
  return tier === "PRO" || tier === "PREMIUM";
}
function getBurstLimit(tier) {
  return TIER_CONFIG[tier]?.burstLimit ?? 10;
}
function isUnlimitedBurst(tier) {
  return TIER_CONFIG[tier]?.burstLimit === -1;
}
function hasFeature(tier, feature) {
  return TIER_CONFIG[tier]?.features.includes(feature) ?? false;
}
function getMonthlyQueryLimit(tier) {
  return isUnlimitedTier(tier) ? -1 : TIER_CONFIG[tier]?.dailyQueries ?? 3;
}
function getEffectiveMonthlyLimit(tier) {
  return getMonthlyQueryLimit(tier);
}
function getMonthlyResetDay() {
  const envDay = process.env.FREE_TIER_RESET_DAY;
  if (envDay) {
    const day = parseInt(envDay, 10);
    if (!isNaN(day) && day >= 1 && day <= 28) {
      return day;
    }
  }
  return 1;
}
var subscription_tiers_default = TIER_CONFIG;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TIER_CONFIG,
  getBurstLimit,
  getEffectiveMonthlyLimit,
  getMonthlyQueryLimit,
  getMonthlyResetDay,
  getTierLimits,
  hasFeature,
  isUnlimitedBurst,
  isUnlimitedTier
});
