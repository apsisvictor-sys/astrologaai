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
var jwt_exports = {};
__export(jwt_exports, {
  JWT_CONFIG: () => JWT_CONFIG,
  JWT_SECRET: () => JWT_SECRET,
  getJWTSecret: () => getJWTSecret
});
module.exports = __toCommonJS(jwt_exports);
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      `SECURITY ERROR: JWT_SECRET environment variable is not set. Please configure JWT_SECRET before starting the server. Generate a secure secret with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }
  if (secret.length < 32) {
    console.warn(
      "[SECURITY WARNING] JWT_SECRET is less than 32 characters. Consider using a longer secret for better security."
    );
  }
  return secret;
}
const JWT_CONFIG = {
  expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
};
const JWT_SECRET = getJWTSecret();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JWT_CONFIG,
  JWT_SECRET,
  getJWTSecret
});
