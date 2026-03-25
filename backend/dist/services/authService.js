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
var authService_exports = {};
__export(authService_exports, {
  AuthService: () => AuthService,
  default: () => authService_default
});
module.exports = __toCommonJS(authService_exports);
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var import_prisma = __toESM(require("../utils/prisma"));
var import_jwt = require("../utils/jwt");
const SALT_ROUNDS = 12;
class AuthService {
  /**
   * Register a new user
   */
  static async register(data) {
    const { email, password, fullName } = data;
    const existingUser = await import_prisma.default.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      throw {
        code: "EMAIL_EXISTS",
        message: "An account with this email already exists",
        statusCode: 409
      };
    }
    const passwordHash = await import_bcryptjs.default.hash(password, SALT_ROUNDS);
    const user = await import_prisma.default.user.create({
      data: {
        email,
        passwordHash,
        fullName: fullName || null,
        tier: "FREE",
        language: "bg",
        emailVerified: false
      }
    });
    await import_prisma.default.profile.create({
      data: {
        userId: user.id,
        notificationPrefs: {
          email: true,
          push: false,
          dailyHoroscope: true,
          weeklyForecast: true
        }
      }
    });
    const currentMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    await import_prisma.default.usageRecord.create({
      data: {
        userId: user.id,
        month: currentMonth,
        queryCount: 0
      }
    });
    const tokens = this.generateTokens(user.id, user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        tier: user.tier,
        language: user.language,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      session: tokens
    };
  }
  /**
   * Generate JWT access and refresh tokens
   * SECURITY FIX: Uses 'sub' claim for userId (standard JWT claim) and validated JWT_SECRET
   */
  static generateTokens(userId, email) {
    const accessToken = import_jsonwebtoken.default.sign(
      { sub: userId, email },
      // Use 'sub' claim for consistency with HTTP/WebSocket auth
      import_jwt.JWT_SECRET,
      { expiresIn: import_jwt.JWT_CONFIG.expiresIn }
    );
    const refreshToken = import_jsonwebtoken.default.sign(
      { sub: userId, email, type: "refresh" },
      // Use 'sub' claim for consistency
      import_jwt.JWT_SECRET,
      { expiresIn: import_jwt.JWT_CONFIG.refreshExpiresIn }
    );
    const expiresIn = this.parseExpiresIn(import_jwt.JWT_CONFIG.expiresIn);
    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }
  /**
   * Parse JWT expiresIn string to seconds
   */
  static parseExpiresIn(expiresIn) {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));
    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }
  /**
   * Verify password against hash
   */
  static async verifyPassword(password, hash) {
    return import_bcryptjs.default.compare(password, hash);
  }
  /**
   * Verify JWT token
   * SECURITY FIX: Uses validated JWT_SECRET and expects 'sub' claim
   */
  static verifyToken(token) {
    try {
      const decoded = import_jsonwebtoken.default.verify(token, import_jwt.JWT_SECRET);
      return { userId: decoded.sub, email: decoded.email };
    } catch {
      return null;
    }
  }
}
var authService_default = AuthService;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AuthService
});
