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
var errorFormatter_exports = {};
__export(errorFormatter_exports, {
  authError: () => authError,
  createAppError: () => createAppError,
  default: () => errorFormatter_default,
  detectLanguage: () => detectLanguage,
  errorFormatterMiddleware: () => errorFormatterMiddleware,
  formatErrorResponse: () => formatErrorResponse,
  globalErrorHandler: () => globalErrorHandler,
  notFoundError: () => notFoundError,
  notFoundMiddleware: () => notFoundMiddleware,
  permissionError: () => permissionError,
  rateLimitError: () => rateLimitError,
  validationError: () => validationError
});
module.exports = __toCommonJS(errorFormatter_exports);
var import_error_codes = require("../utils/error-codes");
var import_errorMessages = require("../services/errorMessages");
var import_uuid = require("uuid");
var import_errorLogger = require("../utils/errorLogger");
function detectLanguage(req) {
  if (req.user?.language) {
    const userLang = req.user.language.toLowerCase();
    if (userLang === "bg" || userLang === "en") {
      return userLang;
    }
  }
  const acceptLanguage = req.headers["accept-language"];
  if (acceptLanguage) {
    const languages = acceptLanguage.split(",").map((lang) => {
      const [code, qualityStr] = lang.trim().split(";");
      const quality = qualityStr ? parseFloat(qualityStr.replace("q=", "")) : 1;
      return {
        code: code?.toLowerCase().split("-")[0] || "",
        quality
      };
    });
    languages.sort((a, b) => b.quality - a.quality);
    for (const lang of languages) {
      if (lang.code === "bg" || lang.code === "en") {
        return lang.code;
      }
    }
  }
  return "bg";
}
function getRequestId(req) {
  return req.headers["x-request-id"] || (0, import_uuid.v4)();
}
function formatErrorResponse(error, language, requestId, context) {
  const errorCode = error.code || "SERVER_INTERNAL_ERROR";
  const statusCode = error.statusCode || import_error_codes.ErrorHttpStatus[errorCode] || 500;
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const errorMessage = (0, import_errorMessages.getErrorMessage)(errorCode, language, {
    ...context,
    ...error.context,
    retryAfter: error.retryAfter
  });
  const documentationUrl = `/docs/errors/${errorCode}`;
  return {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage.description,
      title: errorMessage.title,
      action: errorMessage.action,
      timestamp,
      requestId,
      userFriendly: true,
      retryable: errorMessage.retryable,
      retryAfter: error.retryAfter || errorMessage.retryAfter || null,
      documentationUrl
    }
  };
}
function logError(error, req, requestId, language, response) {
  const errorCode = error.code || "SERVER_INTERNAL_ERROR";
  const statusCode = error.statusCode || import_error_codes.ErrorHttpStatus[errorCode] || 500;
  import_errorLogger.errorLogger.error(
    error.message || "Unknown error",
    errorCode,
    {
      userId: req.user?.id,
      requestId,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      method: req.method,
      url: req.url,
      statusCode,
      language,
      context: {
        ...error.context,
        stack: process.env.NODE_ENV === "development" ? error.stack : void 0,
        response: process.env.NODE_ENV === "development" ? response : void 0
      }
    }
  );
}
function errorFormatterMiddleware(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }
  try {
    const language = detectLanguage(req);
    const requestId = getRequestId(req);
    const errorResponse = formatErrorResponse(error, language, requestId);
    const statusCode = error.statusCode || import_error_codes.ErrorHttpStatus[error.code] || 500;
    setTimeout(() => {
      logError(error, req, requestId, language, errorResponse);
    }, 0);
    res.setHeader("X-Request-ID", requestId);
    res.setHeader("Content-Language", language);
    res.setHeader("Content-Type", "application/json");
    if (errorResponse.error.retryAfter) {
      res.setHeader("Retry-After", errorResponse.error.retryAfter.toString());
    }
    res.status(statusCode).json(errorResponse);
  } catch (formatError) {
    console.error("[Error Formatter] Failed to format error:", formatError);
    const fallbackResponse = {
      success: false,
      error: {
        code: "SERVER_INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        title: "Internal Error",
        action: "Please try again later.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        requestId: (0, import_uuid.v4)(),
        userFriendly: true,
        retryable: true,
        retryAfter: 30,
        documentationUrl: "/docs/errors/SERVER_INTERNAL_ERROR"
      }
    };
    res.status(500).json(fallbackResponse);
  }
}
function notFoundMiddleware(req, res, next) {
  const language = detectLanguage(req);
  const requestId = getRequestId(req);
  const notFoundError2 = {
    name: "NotFoundError",
    message: `Route ${req.method} ${req.url} not found`,
    code: "NOTFOUND_RESOURCE",
    statusCode: 404
  };
  const errorResponse = formatErrorResponse(notFoundError2, language, requestId, {
    method: req.method,
    url: req.url
  });
  import_errorLogger.errorLogger.warn(
    notFoundError2.message,
    {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      errorCode: "NOTFOUND_RESOURCE",
      userId: req.user?.id,
      requestId,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      method: req.method,
      url: req.url,
      statusCode: 404,
      language
    }
  );
  res.setHeader("X-Request-ID", requestId);
  res.setHeader("Content-Language", language);
  res.status(404).json(errorResponse);
}
function globalErrorHandler() {
  return errorFormatterMiddleware;
}
function createAppError(code, message, options) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = options?.statusCode || import_error_codes.ErrorHttpStatus[code] || 500;
  error.context = options?.context;
  error.retryAfter = options?.retryAfter;
  return error;
}
function validationError(field, message, context) {
  return createAppError("VALID_INVALID_FORMAT", message, {
    statusCode: 400,
    context: { field, ...context }
  });
}
function authError(code, message, context) {
  return createAppError(code, message, {
    statusCode: 401,
    context
  });
}
function permissionError(code, message, context) {
  return createAppError(code, message, {
    statusCode: 403,
    context
  });
}
function notFoundError(resource, identifier, context) {
  return createAppError("NOTFOUND_RESOURCE", `${resource} not found`, {
    statusCode: 404,
    context: { resource, identifier, ...context }
  });
}
function rateLimitError(code, retryAfter, context) {
  return createAppError(code, "Rate limit exceeded", {
    statusCode: 429,
    retryAfter,
    context
  });
}
var errorFormatter_default = {
  errorFormatterMiddleware,
  notFoundMiddleware,
  globalErrorHandler,
  createAppError,
  validationError,
  authError,
  permissionError,
  notFoundError,
  rateLimitError,
  detectLanguage,
  formatErrorResponse
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  authError,
  createAppError,
  detectLanguage,
  errorFormatterMiddleware,
  formatErrorResponse,
  globalErrorHandler,
  notFoundError,
  notFoundMiddleware,
  permissionError,
  rateLimitError,
  validationError
});
