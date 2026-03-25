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
var auth_exports = {};
__export(auth_exports, {
  default: () => auth_default
});
module.exports = __toCommonJS(auth_exports);
var import_express = require("express");
var import_authController = require("../controllers/authController");
var import_oauthController = require("../controllers/oauthController");
var import_rateLimiter = require("../middleware/rateLimiter");
var import_auth = require("../middleware/auth");
const router = (0, import_express.Router)();
router.post("/register", import_rateLimiter.registrationLimiter, import_authController.register);
router.post("/login", import_rateLimiter.loginLimiter, import_authController.login);
router.post("/refresh", import_authController.refresh);
router.post("/logout", import_authController.logout);
router.post("/forgot-password", import_authController.forgotPassword);
router.post("/reset-password", import_authController.resetPassword);
router.get("/google", import_oauthController.googleLogin);
router.get("/apple", import_oauthController.appleLogin);
router.get("/oauth-url/:provider", import_oauthController.getOAuthUrl);
router.post("/callback", import_oauthController.oauthCallback);
router.get("/verify-email", import_authController.verifyEmail);
router.post("/resend-verification", import_auth.authMiddleware, import_authController.resendVerification);
var auth_default = router;
