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
var envValidation_exports = {};
__export(envValidation_exports, {
  getEnvValidationReport: () => getEnvValidationReport
});
module.exports = __toCommonJS(envValidation_exports);
const REQUIRED_KEYS = ["DATABASE_URL", "JWT_SECRET", "CRON_SECRET"];
const OPTIONAL_KEYS = [
  "FRONTEND_URL",
  "FRONTEND_URLS",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "REDIS_URL"
];
function hasValue(value) {
  return Boolean(value && value.trim().length > 0);
}
function getEnvValidationReport() {
  const checks = [
    ...REQUIRED_KEYS.map((key) => ({ key, required: true, present: hasValue(process.env[key]) })),
    ...OPTIONAL_KEYS.map((key) => ({ key, required: false, present: hasValue(process.env[key]) }))
  ];
  const missingRequired = checks.filter((check) => check.required && !check.present).map((check) => check.key);
  return {
    nodeEnv: process.env.NODE_ENV || "development",
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    required: checks.filter((check) => check.required),
    optional: checks.filter((check) => !check.required),
    ok: missingRequired.length === 0,
    missingRequired
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getEnvValidationReport
});
