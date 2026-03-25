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
var admin_defaults_exports = {};
__export(admin_defaults_exports, {
  seedAdminDefaults: () => seedAdminDefaults
});
module.exports = __toCommonJS(admin_defaults_exports);
var import_prisma = require("../utils/prisma");
const SYSTEM_ADMIN = "system";
const DEFAULTS = [
  // ── Anthropic model prices (as of 2026-03) ──────────────────────────────────
  // claude-haiku-4-5-20251001
  { key: "price_input_claude-haiku-4-5-20251001", value: "80" },
  // $0.80/1M
  { key: "price_output_claude-haiku-4-5-20251001", value: "400" },
  // $4.00/1M
  // claude-sonnet-4-6
  { key: "price_input_claude-sonnet-4-6", value: "300" },
  // $3.00/1M
  { key: "price_output_claude-sonnet-4-6", value: "1500" },
  // $15.00/1M
  // claude-opus-4-6
  { key: "price_input_claude-opus-4-6", value: "1500" },
  // $15.00/1M
  { key: "price_output_claude-opus-4-6", value: "7500" },
  // $75.00/1M
  // ── Currency ──────────────────────────────────────────────────────────────
  { key: "eur_usd_rate", value: "108" },
  // 1.08 × 100
  // ── Cost alert thresholds (EUR cents) ────────────────────────────────────
  { key: "alert_threshold_free_eur_cents", value: "200" },
  // 2.00€ — flag heavy free users
  { key: "alert_threshold_pro_eur_cents", value: "500" },
  // 5.00€ — 50% of 10€ subscription
  { key: "alert_threshold_premium_eur_cents", value: "1000" },
  // 10.00€ — 50% of 20€ subscription
  // ── FREE tier limits ────────────────────────────────────────────────────
  { key: "free_tier_daily_query_limit", value: "3" }
  // Oracle questions per day for FREE users
];
async function seedAdminDefaults() {
  const data = DEFAULTS.map((d) => ({
    key: d.key,
    value: d.value,
    updatedBy: SYSTEM_ADMIN
  }));
  await import_prisma.prisma.adminConfig.createMany({
    data,
    skipDuplicates: true
    // never overwrite values the admin has already set
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  seedAdminDefaults
});
