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
var runtime_exports = {};
__export(runtime_exports, {
  isOriginAllowed: () => isOriginAllowed,
  runtimeConfig: () => runtimeConfig
});
module.exports = __toCommonJS(runtime_exports);
const DEFAULT_DEV_FRONTEND = "http://localhost:3000";
const DEFAULT_PROD_FRONTEND = "https://frontend-rust-nu-20.vercel.app";
function normalizeOrigin(origin) {
  return origin.trim().replace(/\/+$/, "");
}
function splitOrigins(value) {
  if (!value) return [];
  return value.split(",").map((origin) => normalizeOrigin(origin)).filter(Boolean);
}
function buildAllowedOrigins() {
  const configured = splitOrigins(process.env.FRONTEND_URLS);
  if (process.env.FRONTEND_URL) {
    configured.push(...splitOrigins(process.env.FRONTEND_URL));
  }
  if (process.env.NODE_ENV === "production") {
    configured.push(DEFAULT_PROD_FRONTEND);
  } else {
    configured.push(DEFAULT_DEV_FRONTEND);
    configured.push("http://localhost:3001");
    configured.push("http://localhost:3002");
    configured.push("http://localhost:3003");
  }
  return Array.from(new Set(configured));
}
const runtimeConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4e3),
  allowedOrigins: buildAllowedOrigins()
};
function isOriginAllowed(origin) {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  if (runtimeConfig.allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }
  if (/^https:\/\/astrologaai(-[a-z0-9]+)?\.vercel\.app$/i.test(normalizedOrigin)) {
    return true;
  }
  return false;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isOriginAllowed,
  runtimeConfig
});
