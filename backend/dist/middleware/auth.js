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
var auth_exports = {};
__export(auth_exports, {
  authMiddleware: () => authMiddleware,
  default: () => auth_default,
  optionalAuthMiddleware: () => optionalAuthMiddleware
});
module.exports = __toCommonJS(auth_exports);
var jwt = __toESM(require("jsonwebtoken"));
var import_jwt = require("../utils/jwt");
var import_prisma = require("../utils/prisma");
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "No token provided. Please login to access this resource."
        }
      });
      return;
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, import_jwt.JWT_SECRET);
    const user = await import_prisma.prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, tier: true, language: true }
    });
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found. Please login again."
        }
      });
      return;
    }
    req.user = {
      id: user.id,
      email: user.email,
      tier: user.tier,
      language: user.language || "bg"
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "Your session has expired. Please login again."
        }
      });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid token. Please login again."
        }
      });
      return;
    }
    console.error("[Auth Middleware] Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An error occurred during authentication."
      }
    });
  }
}
async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, import_jwt.JWT_SECRET);
    const user = await import_prisma.prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, tier: true, language: true }
    });
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        tier: user.tier,
        language: user.language || "bg"
      };
    }
    next();
  } catch {
    next();
  }
}
var auth_default = authMiddleware;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  authMiddleware,
  optionalAuthMiddleware
});
