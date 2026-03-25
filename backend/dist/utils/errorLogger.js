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
var errorLogger_exports = {};
__export(errorLogger_exports, {
  aiServiceError: () => aiServiceError,
  authError: () => authError,
  captureException: () => captureException,
  databaseError: () => databaseError,
  debug: () => debug,
  default: () => errorLogger_default,
  error: () => error,
  errorLogger: () => errorLogger,
  fatal: () => fatal,
  generateRequestId: () => generateRequestId,
  getLogLevel: () => getLogLevel,
  httpError: () => httpError,
  info: () => info,
  initializeMonitoring: () => initializeMonitoring,
  rateLimitError: () => rateLimitError,
  sanitizeContext: () => sanitizeContext,
  setLogLevel: () => setLogLevel,
  warn: () => warn,
  websocketError: () => websocketError
});
module.exports = __toCommonJS(errorLogger_exports);
var import_winston = __toESM(require("winston"));
var import_uuid = require("uuid");
const { combine, timestamp, json, colorize, printf } = import_winston.default.format;
const consoleFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  printf(({ timestamp: timestamp2, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp2} ${level}: ${message}${metaStr}`;
  })
);
const jsonFormat = combine(
  timestamp(),
  json()
);
const logger = import_winston.default.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  defaultMeta: {
    service: "astrologaai-backend",
    environment: process.env.NODE_ENV || "development"
  },
  transports: [
    // Console transport for all environments
    new import_winston.default.transports.Console({
      format: process.env.NODE_ENV === "production" ? jsonFormat : consoleFormat
    }),
    // File transport for errors in production
    ...process.env.NODE_ENV === "production" ? [
      new import_winston.default.transports.File({
        filename: "logs/error.log",
        level: "error",
        format: jsonFormat,
        maxsize: 10485760,
        // 10MB
        maxFiles: 10
      }),
      new import_winston.default.transports.File({
        filename: "logs/combined.log",
        format: jsonFormat,
        maxsize: 10485760,
        // 10MB
        maxFiles: 5
      })
    ] : []
  ]
});
function buildLogEntry(severity, message, errorCode, options = {}) {
  const entry = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    severity,
    message,
    context: options.context || {}
  };
  if (errorCode) {
    entry.errorCode = errorCode;
  }
  if (options.userId) {
    entry.userId = options.userId;
  }
  if (options.requestId) {
    entry.requestId = options.requestId;
  }
  if (options.sessionId) {
    entry.sessionId = options.sessionId;
  }
  if (options.userAgent) {
    entry.userAgent = options.userAgent;
  }
  if (options.ipAddress) {
    entry.ipAddress = options.ipAddress;
  }
  if (options.method) {
    entry.method = options.method;
  }
  if (options.url) {
    entry.url = options.url;
  }
  if (options.statusCode) {
    entry.statusCode = options.statusCode;
  }
  if (options.language) {
    entry.language = options.language;
  }
  if (options.stackTrace) {
    entry.stackTrace = options.stackTrace;
  }
  return entry;
}
function debug(message, context) {
  if (process.env.NODE_ENV !== "production") {
    const entry = buildLogEntry("debug", message, void 0, { context });
    logger.debug(entry.message, entry);
  }
}
function info(message, context) {
  const entry = buildLogEntry("info", message, void 0, { context });
  logger.info(entry.message, entry);
}
function warn(message, context) {
  const entry = buildLogEntry("warn", message, void 0, { context });
  logger.warn(entry.message, entry);
}
function error(message, errorCode, options = {}) {
  const entry = buildLogEntry("error", message, errorCode, options);
  logger.error(entry.message, entry);
}
function fatal(message, errorCode, options = {}) {
  const entry = buildLogEntry("fatal", message, errorCode, options);
  logger.error(entry.message, entry);
  if (process.env.NODE_ENV === "production") {
    console.error("[FATAL ERROR]", entry);
  }
}
function httpError(errorCode, message, options) {
  const entry = buildLogEntry("error", message, errorCode, options);
  logger.error(entry.message, entry);
}
function authError(errorCode, message, options) {
  const entry = buildLogEntry("warn", message, errorCode, options);
  logger.warn(entry.message, entry);
}
function rateLimitError(errorCode, message, options) {
  const entry = buildLogEntry("info", message, errorCode, {
    ...options,
    context: { ...options.context, retryAfter: options.retryAfter }
  });
  logger.info(entry.message, entry);
}
function databaseError(errorCode, message, options) {
  const entry = buildLogEntry("error", message, errorCode, options);
  logger.error(entry.message, entry);
}
function websocketError(errorCode, message, options) {
  const entry = buildLogEntry("error", message, errorCode, options);
  logger.error(entry.message, entry);
}
function aiServiceError(errorCode, message, options) {
  const entry = buildLogEntry("error", message, errorCode, options);
  logger.error(entry.message, entry);
}
function generateRequestId() {
  return (0, import_uuid.v4)();
}
function sanitizeContext(context) {
  const sanitized = { ...context };
  const sensitiveFields = [
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "apiKey",
    "secret",
    "creditCard",
    "ssn",
    "personalId"
  ];
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });
  Object.keys(sanitized).forEach((key) => {
    if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeContext(sanitized[key]);
    }
  });
  return sanitized;
}
function getLogLevel() {
  return logger.level;
}
function setLogLevel(level) {
  logger.level = level;
  logger.transports.forEach((transport) => {
    transport.level = level;
  });
}
function initializeMonitoring() {
  if (process.env.NODE_ENV === "production") {
    info("Error monitoring initialized", {
      service: "error-monitoring",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function captureException(error2, context) {
  const errorId = (0, import_uuid.v4)();
  const entry = buildLogEntry("error", error2.message, void 0, {
    context: {
      errorId,
      errorName: error2.name,
      stackTrace: error2.stack,
      ...context
    }
  });
  logger.error(entry.message, entry);
  if (process.env.NODE_ENV === "production") {
    console.error(`[MONITORING] Exception captured: ${errorId}`);
  }
}
const errorLogger = {
  debug,
  info,
  warn,
  error,
  fatal,
  httpError,
  authError,
  rateLimitError,
  databaseError,
  websocketError,
  aiServiceError,
  generateRequestId,
  sanitizeContext,
  getLogLevel,
  setLogLevel,
  initializeMonitoring,
  captureException
};
var errorLogger_default = errorLogger;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  aiServiceError,
  authError,
  captureException,
  databaseError,
  debug,
  error,
  errorLogger,
  fatal,
  generateRequestId,
  getLogLevel,
  httpError,
  info,
  initializeMonitoring,
  rateLimitError,
  sanitizeContext,
  setLogLevel,
  warn,
  websocketError
});
