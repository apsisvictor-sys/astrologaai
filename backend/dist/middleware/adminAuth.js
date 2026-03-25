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
var adminAuth_exports = {};
__export(adminAuth_exports, {
  adminAuthMiddleware: () => adminAuthMiddleware,
  default: () => adminAuth_default
});
module.exports = __toCommonJS(adminAuth_exports);
if (!process.env.ADMIN_EMAILS) {
  console.warn("[STARTUP] WARNING: ADMIN_EMAILS is not set \u2014 admin panel will be inaccessible to all users");
}
async function adminAuthMiddleware(req, res, next) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required"
        }
      });
      return;
    }
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
    const isAdmin = adminEmails.includes(req.user.email);
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Admin access required"
        }
      });
      return;
    }
    next();
  } catch (error) {
    console.error("[Admin Auth] Error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Authorization check failed"
      }
    });
  }
}
var adminAuth_default = adminAuthMiddleware;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  adminAuthMiddleware
});
