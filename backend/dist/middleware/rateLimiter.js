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
var rateLimiter_exports = {};
__export(rateLimiter_exports, {
  apiLimiter: () => apiLimiter,
  default: () => rateLimiter_default,
  loginLimiter: () => loginLimiter,
  rateLimiter: () => rateLimiter,
  registrationLimiter: () => registrationLimiter
});
module.exports = __toCommonJS(rateLimiter_exports);
var import_express_rate_limit = __toESM(require("express-rate-limit"));
function rateLimiter(max, windowSeconds) {
  return (0, import_express_rate_limit.default)({
    windowMs: windowSeconds * 1e3,
    max,
    message: {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later."
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.user?.id || req.ip || req.connection.remoteAddress || "unknown";
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many requests. Please try again in ${Math.ceil(windowSeconds / 60)} minutes.`
        }
      });
    }
  });
}
const registrationLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  max: 5,
  // 5 requests per window
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many registration attempts. Please try again later.",
      retryAfter: "1 hour"
    }
  },
  standardHeaders: true,
  // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || "unknown";
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many registration attempts from this IP. Please try again in 1 hour.",
        retryAfter: "1 hour"
      }
    });
  }
});
const loginLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 10,
  // 10 requests per window
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many login attempts. Please try again later.",
      retryAfter: "15 minutes"
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || "unknown";
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many login attempts from this IP. Please try again in 15 minutes.",
        retryAfter: "15 minutes"
      }
    });
  }
});
const apiLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 100,
  // 100 requests per window
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later."
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
var rateLimiter_default = {
  rateLimiter,
  registrationLimiter,
  loginLimiter,
  apiLimiter
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  apiLimiter,
  loginLimiter,
  rateLimiter,
  registrationLimiter
});
