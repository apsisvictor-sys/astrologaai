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
var errorMessages_exports = {};
__export(errorMessages_exports, {
  default: () => errorMessages_default,
  formatErrorMessage: () => formatErrorMessage,
  getAllErrorCodes: () => getAllErrorCodes,
  getErrorMessage: () => getErrorMessage,
  getErrorSeverity: () => getErrorSeverity,
  isErrorRetryable: () => isErrorRetryable,
  isValidErrorCode: () => isValidErrorCode
});
module.exports = __toCommonJS(errorMessages_exports);
const ERROR_MESSAGES = {
  // ====================
  // Authentication Errors
  // ====================
  AUTH_INVALID_TOKEN: {
    code: "AUTH_INVALID_TOKEN",
    title: {
      bg: "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0442\u043E\u043A\u0435\u043D",
      en: "Invalid Token"
    },
    description: {
      bg: "\u0412\u0430\u0448\u0438\u044F\u0442 \u0432\u0445\u043E\u0434\u0435\u043D \u0442\u043E\u043A\u0435\u043D \u0435 \u043D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0438\u043B\u0438 \u0438\u0437\u0442\u0435\u043A\u044A\u043B.",
      en: "Your authentication token is invalid or has expired."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0432\u043B\u0435\u0437\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0430\u0442\u0430.",
      en: "Please log in again."
    },
    severity: "error",
    loggable: true,
    retryable: true
  },
  AUTH_EXPIRED_TOKEN: {
    code: "AUTH_EXPIRED_TOKEN",
    title: {
      bg: "\u0418\u0437\u0442\u0435\u043A\u044A\u043B \u0442\u043E\u043A\u0435\u043D",
      en: "Expired Token"
    },
    description: {
      bg: "\u0412\u0430\u0448\u0438\u044F\u0442 \u0432\u0445\u043E\u0434\u0435\u043D \u0442\u043E\u043A\u0435\u043D \u0435 \u0438\u0437\u0442\u0435\u043A\u044A\u043B.",
      en: "Your authentication token has expired."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0432\u043B\u0435\u0437\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0430\u0442\u0430.",
      en: "Please log in again."
    },
    severity: "warning",
    loggable: true,
    retryable: true
  },
  AUTH_MISSING_TOKEN: {
    code: "AUTH_MISSING_TOKEN",
    title: {
      bg: "\u041B\u0438\u043F\u0441\u0432\u0430\u0449 \u0442\u043E\u043A\u0435\u043D",
      en: "Missing Token"
    },
    description: {
      bg: "\u041D\u0435 \u0441\u0442\u0435 \u0432\u043B\u0435\u0437\u043B\u0438 \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0430\u0442\u0430 \u0438\u043B\u0438 \u0432\u0430\u0448\u0438\u044F\u0442 \u0432\u0445\u043E\u0434\u0435\u043D \u0442\u043E\u043A\u0435\u043D \u043B\u0438\u043F\u0441\u0432\u0430.",
      en: "You are not logged in or your authentication token is missing."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0432\u043B\u0435\u0437\u0442\u0435 \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0430\u0442\u0430, \u0437\u0430 \u0434\u0430 \u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435.",
      en: "Please log in to continue."
    },
    severity: "warning",
    loggable: true,
    retryable: true
  },
  AUTH_INVALID_CREDENTIALS: {
    code: "AUTH_INVALID_CREDENTIALS",
    title: {
      bg: "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0438 \u0434\u0430\u043D\u043D\u0438 \u0437\u0430 \u0432\u0445\u043E\u0434",
      en: "Invalid Credentials"
    },
    description: {
      bg: "\u0418\u043C\u0435\u0439\u043B\u044A\u0442 \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u0430\u0442\u0430, \u043A\u043E\u0438\u0442\u043E \u0432\u044A\u0432\u0435\u0434\u043E\u0445\u0442\u0435, \u0441\u0430 \u043D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u043D\u0438.",
      en: "The email or password you entered is incorrect."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u0442\u0435 \u0432\u0430\u0448\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u0438 \u0437\u0430 \u0432\u0445\u043E\u0434 \u0438 \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E.",
      en: "Please check your login details and try again."
    },
    severity: "warning",
    loggable: true,
    retryable: true
  },
  AUTH_USER_NOT_FOUND: {
    code: "AUTH_USER_NOT_FOUND",
    title: {
      bg: "\u041F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B \u043D\u0435 \u0435 \u043D\u0430\u043C\u0435\u0440\u0435\u043D",
      en: "User Not Found"
    },
    description: {
      bg: "\u041D\u0435 \u0441\u044A\u0449\u0435\u0441\u0442\u0432\u0443\u0432\u0430 \u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B \u0441 \u0442\u043E\u0437\u0438 \u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441.",
      en: "No user exists with this email address."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0430\u0439\u0442\u0435 \u0441\u0435 \u0438\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u0442\u0435 \u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441\u0430.",
      en: "Please sign up or check the email address."
    },
    severity: "warning",
    loggable: true,
    retryable: true
  },
  AUTH_EMAIL_NOT_VERIFIED: {
    code: "AUTH_EMAIL_NOT_VERIFIED",
    title: {
      bg: "\u0418\u043C\u0435\u0439\u043B\u044A\u0442 \u043D\u0435 \u0435 \u043F\u043E\u0442\u0432\u044A\u0440\u0434\u0435\u043D",
      en: "Email Not Verified"
    },
    description: {
      bg: "\u0422\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u043F\u043E\u0442\u0432\u044A\u0440\u0434\u0438\u0442\u0435 \u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441\u0430 \u0441\u0438, \u043F\u0440\u0435\u0434\u0438 \u0434\u0430 \u0432\u043B\u0435\u0437\u0435\u0442\u0435.",
      en: "You need to verify your email address before logging in."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u0442\u0435 \u0438\u043C\u0435\u0439\u043B\u0430 \u0441\u0438 \u0437\u0430 \u043B\u0438\u043D\u043A \u0437\u0430 \u043F\u043E\u0442\u0432\u044A\u0440\u0436\u0434\u0435\u043D\u0438\u0435.",
      en: "Please check your email for a verification link."
    },
    severity: "warning",
    loggable: true,
    retryable: true
  },
  // ====================
  // Validation Errors
  // ====================
  VALID_REQUIRED_FIELD: {
    code: "VALID_REQUIRED_FIELD",
    title: {
      bg: "\u0417\u0430\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E \u043F\u043E\u043B\u0435",
      en: "Required Field"
    },
    description: {
      bg: '\u041F\u043E\u043B\u0435\u0442\u043E "{field}" \u0435 \u0437\u0430\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E.',
      en: 'The field "{field}" is required.'
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043F\u043E\u043F\u044A\u043B\u043D\u0435\u0442\u0435 \u0437\u0430\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E\u0442\u043E \u043F\u043E\u043B\u0435 \u0438 \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E.",
      en: "Please fill in the required field and try again."
    },
    severity: "warning",
    loggable: false,
    retryable: true
  },
  VALID_INVALID_EMAIL: {
    code: "VALID_INVALID_EMAIL",
    title: {
      bg: "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0438\u043C\u0435\u0439\u043B",
      en: "Invalid Email"
    },
    description: {
      bg: '\u0418\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441\u044A\u0442 "{email}" \u043D\u0435 \u0435 \u0432\u0430\u043B\u0438\u0434\u0435\u043D.',
      en: 'The email address "{email}" is not valid.'
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0432\u044A\u0432\u0435\u0434\u0435\u0442\u0435 \u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441.",
      en: "Please enter a valid email address."
    },
    severity: "warning",
    loggable: false,
    retryable: true
  },
  VALID_INVALID_DATE: {
    code: "VALID_INVALID_DATE",
    title: {
      bg: "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u0434\u0430\u0442\u0430",
      en: "Invalid Date"
    },
    description: {
      bg: '\u0414\u0430\u0442\u0430\u0442\u0430 "{date}" \u043D\u0435 \u0435 \u0432\u0430\u043B\u0438\u0434\u043D\u0430.',
      en: 'The date "{date}" is not valid.'
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0432\u044A\u0432\u0435\u0434\u0435\u0442\u0435 \u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u0434\u0430\u0442\u0430 \u0432\u044A\u0432 \u0444\u043E\u0440\u043C\u0430\u0442 \u0413\u0413\u0413\u0413-\u041C\u041C-\u0414\u0414.",
      en: "Please enter a valid date in YYYY-MM-DD format."
    },
    severity: "warning",
    loggable: false,
    retryable: true
  },
  VALID_MIN_LENGTH: {
    code: "VALID_MIN_LENGTH",
    title: {
      bg: "\u0422\u0432\u044A\u0440\u0434\u0435 \u043A\u0440\u0430\u0442\u044A\u043A \u0442\u0435\u043A\u0441\u0442",
      en: "Text Too Short"
    },
    description: {
      bg: '\u041F\u043E\u043B\u0435\u0442\u043E "{field}" \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 \u043F\u043E\u043D\u0435 {min} \u0441\u0438\u043C\u0432\u043E\u043B\u0430.',
      en: 'The field "{field}" must contain at least {min} characters.'
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0432\u044A\u0432\u0435\u0434\u0435\u0442\u0435 \u043F\u043E-\u0434\u044A\u043B\u044A\u0433 \u0442\u0435\u043A\u0441\u0442 \u0438 \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E.",
      en: "Please enter a longer text and try again."
    },
    severity: "warning",
    loggable: false,
    retryable: true
  },
  VALID_MAX_LENGTH: {
    code: "VALID_MAX_LENGTH",
    title: {
      bg: "\u0422\u0432\u044A\u0440\u0434\u0435 \u0434\u044A\u043B\u044A\u0433 \u0442\u0435\u043A\u0441\u0442",
      en: "Text Too Long"
    },
    description: {
      bg: '\u041F\u043E\u043B\u0435\u0442\u043E "{field}" \u043D\u0435 \u043C\u043E\u0436\u0435 \u0434\u0430 \u043D\u0430\u0434\u0432\u0438\u0448\u0430\u0432\u0430 {max} \u0441\u0438\u043C\u0432\u043E\u043B\u0430.',
      en: 'The field "{field}" cannot exceed {max} characters.'
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0441\u044A\u043A\u0440\u0430\u0442\u0435\u0442\u0435 \u0442\u0435\u043A\u0441\u0442\u0430 \u0438 \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E.",
      en: "Please shorten the text and try again."
    },
    severity: "warning",
    loggable: false,
    retryable: true
  },
  // ====================
  // API Errors
  // ====================
  API_EXTERNAL_FAILED: {
    code: "API_EXTERNAL_FAILED",
    title: {
      bg: "\u0412\u044A\u043D\u0448\u043D\u0430 \u0443\u0441\u043B\u0443\u0433\u0430 \u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u044A\u043F\u043D\u0430",
      en: "External Service Unavailable"
    },
    description: {
      bg: "\u0412\u044A\u043D\u0448\u043D\u0430\u0442\u0430 \u0443\u0441\u043B\u0443\u0433\u0430, \u043A\u043E\u044F\u0442\u043E \u0438\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u043C\u0435, \u0435 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u044A\u043F\u043D\u0430.",
      en: "The external service we use is temporarily unavailable."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E \u0441\u043B\u0435\u0434 \u043D\u044F\u043A\u043E\u043B\u043A\u043E \u043C\u0438\u043D\u0443\u0442\u0438.",
      en: "Please try again in a few minutes."
    },
    severity: "error",
    loggable: true,
    retryable: true,
    retryAfter: 60
  },
  API_AI_SERVICE_UNAVAILABLE: {
    code: "API_AI_SERVICE_UNAVAILABLE",
    title: {
      bg: "AI \u0443\u0441\u043B\u0443\u0433\u0430\u0442\u0430 \u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u044A\u043F\u043D\u0430",
      en: "AI Service Unavailable"
    },
    description: {
      bg: "AI \u0443\u0441\u043B\u0443\u0433\u0430\u0442\u0430, \u043A\u043E\u044F\u0442\u043E \u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u043D\u0438 \u0430\u043D\u0430\u043B\u0438\u0437\u0438, \u0435 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u044A\u043F\u043D\u0430.",
      en: "The AI service that generates astrological analyses is temporarily unavailable."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E \u0441\u043B\u0435\u0434 \u043D\u044F\u043A\u043E\u043B\u043A\u043E \u043C\u0438\u043D\u0443\u0442\u0438.",
      en: "Please try again in a few minutes."
    },
    severity: "error",
    loggable: true,
    retryable: true,
    retryAfter: 30
  },
  API_AI_QUOTA_EXCEEDED: {
    code: "API_AI_QUOTA_EXCEEDED",
    title: {
      bg: "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0430\u0442 \u043B\u0438\u043C\u0438\u0442 \u043D\u0430 AI \u0437\u0430\u044F\u0432\u043A\u0438",
      en: "AI Query Limit Reached"
    },
    description: {
      bg: "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0430\u0445\u0442\u0435 \u043B\u0438\u043C\u0438\u0442\u0430 \u043D\u0430 AI \u0437\u0430\u044F\u0432\u043A\u0438 \u0437\u0430 \u0432\u0430\u0448\u0438\u044F \u0430\u043A\u0430\u0443\u043D\u0442.",
      en: "You have reached the AI query limit for your account."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0438\u0437\u0447\u0430\u043A\u0430\u0439\u0442\u0435 \u0434\u043E \u0443\u0442\u0440\u0435 \u0438\u043B\u0438 \u043D\u0430\u0434\u0433\u0440\u0430\u0434\u0435\u0442\u0435 \u0434\u043E Pro \u0437\u0430 \u043D\u0435\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438 \u0437\u0430\u044F\u0432\u043A\u0438.",
      en: "Please wait until tomorrow or upgrade to Pro for unlimited queries."
    },
    severity: "warning",
    loggable: true,
    retryable: true,
    retryAfter: 86400
    // 24 hours
  },
  // ====================
  // Rate Limit Errors
  // ====================
  RATE_QUOTA_EXCEEDED: {
    code: "RATE_QUOTA_EXCEEDED",
    title: {
      bg: "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0430\u0442 \u043C\u0435\u0441\u0435\u0447\u0435\u043D \u043B\u0438\u043C\u0438\u0442",
      en: "Monthly Limit Reached"
    },
    description: {
      bg: "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0430\u0445\u0442\u0435 \u043B\u0438\u043C\u0438\u0442\u0430 \u043E\u0442 {limit} \u0432\u044A\u043F\u0440\u043E\u0441\u0430 \u0437\u0430 \u0442\u043E\u0437\u0438 \u043C\u0435\u0441\u0435\u0446.",
      en: "You've reached your monthly limit of {limit} queries."
    },
    action: {
      bg: "\u041D\u0430\u0434\u0433\u0440\u0430\u0434\u0435\u0442\u0435 \u0434\u043E Pro \u0437\u0430 \u043D\u0435\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438 \u0432\u044A\u043F\u0440\u043E\u0441\u0438 \u0438\u043B\u0438 \u0438\u0437\u0447\u0430\u043A\u0430\u0439\u0442\u0435 \u0434\u043E \u0441\u043B\u0435\u0434\u0432\u0430\u0449\u0438\u044F \u043C\u0435\u0441\u0435\u0446.",
      en: "Upgrade to Pro for unlimited queries or wait until next month."
    },
    severity: "warning",
    loggable: true,
    retryable: false
  },
  RATE_BURST_LIMIT_EXCEEDED: {
    code: "RATE_BURST_LIMIT_EXCEEDED",
    title: {
      bg: "\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u044F\u0432\u043A\u0438",
      en: "Too Many Requests"
    },
    description: {
      bg: "\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u044F\u0432\u043A\u0438 \u0437\u0430 \u043A\u0440\u0430\u0442\u043A\u043E \u0432\u0440\u0435\u043C\u0435. \u041C\u043E\u043B\u044F, \u0438\u0437\u0447\u0430\u043A\u0430\u0439\u0442\u0435 \u043C\u0430\u043B\u043A\u043E \u043F\u0440\u0435\u0434\u0438 \u0434\u0430 \u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435.",
      en: "Too many requests in a short time. Please wait a moment before continuing."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0438\u0437\u0447\u0430\u043A\u0430\u0439\u0442\u0435 {retryAfter} \u0441\u0435\u043A\u0443\u043D\u0434\u0438 \u043F\u0440\u0435\u0434\u0438 \u0441\u043B\u0435\u0434\u0432\u0430\u0449\u0430\u0442\u0430 \u0437\u0430\u044F\u0432\u043A\u0430.",
      en: "Please wait {retryAfter} seconds before your next request."
    },
    severity: "info",
    loggable: true,
    retryable: true,
    retryAfter: 60
  },
  // ====================
  // Server Errors
  // ====================
  SERVER_INTERNAL_ERROR: {
    code: "SERVER_INTERNAL_ERROR",
    title: {
      bg: "\u0412\u044A\u0442\u0440\u0435\u0448\u043D\u0430 \u0433\u0440\u0435\u0448\u043A\u0430 \u0432 \u0441\u044A\u0440\u0432\u044A\u0440\u0430",
      en: "Internal Server Error"
    },
    description: {
      bg: "\u0412\u044A\u0437\u043D\u0438\u043A\u043D\u0430 \u043D\u0435\u043E\u0447\u0430\u043A\u0432\u0430\u043D\u0430 \u0433\u0440\u0435\u0448\u043A\u0430 \u0432 \u0441\u044A\u0440\u0432\u044A\u0440\u0430.",
      en: "An unexpected error occurred on the server."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E \u0441\u043B\u0435\u0434 \u043D\u044F\u043A\u043E\u043B\u043A\u043E \u043C\u0438\u043D\u0443\u0442\u0438. \u0410\u043A\u043E \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044A\u0442 \u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0430\u0432\u0430, \u0441\u0432\u044A\u0440\u0436\u0435\u0442\u0435 \u0441\u0435 \u0441 \u043F\u043E\u0434\u0434\u0440\u044A\u0436\u043A\u0430\u0442\u0430.",
      en: "Please try again in a few minutes. If the problem persists, contact support."
    },
    severity: "error",
    loggable: true,
    retryable: true,
    retryAfter: 30
  },
  SERVER_SERVICE_UNAVAILABLE: {
    code: "SERVER_SERVICE_UNAVAILABLE",
    title: {
      bg: "\u0423\u0441\u043B\u0443\u0433\u0430\u0442\u0430 \u0435 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u044A\u043F\u043D\u0430",
      en: "Service Temporarily Unavailable"
    },
    description: {
      bg: "\u0423\u0441\u043B\u0443\u0433\u0430\u0442\u0430 \u0435 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u044A\u043F\u043D\u0430 \u043F\u043E\u0440\u0430\u0434\u0438 \u043F\u043E\u0434\u0434\u0440\u044A\u0436\u043A\u0430 \u0438\u043B\u0438 \u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0438.",
      en: "The service is temporarily unavailable due to maintenance or technical issues."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E \u0441\u043B\u0435\u0434 \u043D\u044F\u043A\u043E\u043B\u043A\u043E \u043C\u0438\u043D\u0443\u0442\u0438.",
      en: "Please try again in a few minutes."
    },
    severity: "error",
    loggable: true,
    retryable: true,
    retryAfter: 300
  },
  // ====================
  // Database Errors
  // ====================
  DB_CONNECTION_FAILED: {
    code: "DB_CONNECTION_FAILED",
    title: {
      bg: "\u0413\u0440\u0435\u0448\u043A\u0430 \u043F\u0440\u0438 \u0432\u0440\u044A\u0437\u043A\u0430 \u0441 \u0431\u0430\u0437\u0430\u0442\u0430 \u0434\u0430\u043D\u043D\u0438",
      en: "Database Connection Failed"
    },
    description: {
      bg: "\u041D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430 \u0441 \u0431\u0430\u0437\u0430\u0442\u0430 \u0434\u0430\u043D\u043D\u0438.",
      en: "Failed to connect to the database."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E \u0441\u043B\u0435\u0434 \u043D\u044F\u043A\u043E\u043B\u043A\u043E \u043C\u0438\u043D\u0443\u0442\u0438.",
      en: "Please try again in a few minutes."
    },
    severity: "error",
    loggable: true,
    retryable: true,
    retryAfter: 30
  },
  DB_RECORD_NOT_FOUND: {
    code: "DB_RECORD_NOT_FOUND",
    title: {
      bg: "\u0417\u0430\u043F\u0438\u0441 \u043D\u0435 \u0435 \u043D\u0430\u043C\u0435\u0440\u0435\u043D",
      en: "Record Not Found"
    },
    description: {
      bg: "\u0417\u0430\u043F\u0438\u0441\u044A\u0442, \u043A\u043E\u0439\u0442\u043E \u0442\u044A\u0440\u0441\u0438\u0442\u0435, \u043D\u0435 \u0435 \u043D\u0430\u043C\u0435\u0440\u0435\u043D \u0432 \u0431\u0430\u0437\u0430\u0442\u0430 \u0434\u0430\u043D\u043D\u0438.",
      en: "The record you're looking for was not found in the database."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0430 \u0438 \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E.",
      en: "Please check the identifier and try again."
    },
    severity: "warning",
    loggable: true,
    retryable: false
  },
  // ====================
  // Not Found Errors
  // ====================
  NOTFOUND_USER: {
    code: "NOTFOUND_USER",
    title: {
      bg: "\u041F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B \u043D\u0435 \u0435 \u043D\u0430\u043C\u0435\u0440\u0435\u043D",
      en: "User Not Found"
    },
    description: {
      bg: '\u041F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u044F\u0442 \u0441 ID "{userId}" \u043D\u0435 \u0435 \u043D\u0430\u043C\u0435\u0440\u0435\u043D.',
      en: 'The user with ID "{userId}" was not found.'
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0430 \u043D\u0430 \u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u044F.",
      en: "Please check the user identifier."
    },
    severity: "warning",
    loggable: true,
    retryable: false
  },
  NOTFOUND_CHART: {
    code: "NOTFOUND_CHART",
    title: {
      bg: "\u041D\u0430\u0442\u0430\u043B\u043D\u0430 \u043A\u0430\u0440\u0442\u0430 \u043D\u0435 \u0435 \u043D\u0430\u043C\u0435\u0440\u0435\u043D\u0430",
      en: "Natal Chart Not Found"
    },
    description: {
      bg: "\u041D\u0430\u0442\u0430\u043B\u043D\u0430\u0442\u0430 \u043A\u0430\u0440\u0442\u0430, \u043A\u043E\u044F\u0442\u043E \u0442\u044A\u0440\u0441\u0438\u0442\u0435, \u043D\u0435 \u0435 \u043D\u0430\u043C\u0435\u0440\u0435\u043D\u0430.",
      en: "The natal chart you're looking for was not found."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0430\u0439\u0442\u0435 \u043D\u0430\u0442\u0430\u043B\u043D\u0430 \u043A\u0430\u0440\u0442\u0430 \u043F\u044A\u0440\u0432\u043E \u0438\u043B\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0430.",
      en: "Please generate a natal chart first or check the identifier."
    },
    severity: "warning",
    loggable: true,
    retryable: false
  },
  NOTFOUND_CONVERSATION: {
    code: "NOTFOUND_CONVERSATION",
    title: {
      bg: "\u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440 \u043D\u0435 \u0435 \u043D\u0430\u043C\u0435\u0440\u0435\u043D",
      en: "Conversation Not Found"
    },
    description: {
      bg: "\u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u044A\u0442, \u043A\u043E\u0439\u0442\u043E \u0442\u044A\u0440\u0441\u0438\u0442\u0435, \u043D\u0435 \u0435 \u043D\u0430\u043C\u0435\u0440\u0435\u043D.",
      en: "The conversation you're looking for was not found."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0430 \u043D\u0430 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430 \u0438\u043B\u0438 \u0437\u0430\u043F\u043E\u0447\u043D\u0435\u0442\u0435 \u043D\u043E\u0432 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440.",
      en: "Please check the conversation identifier or start a new conversation."
    },
    severity: "warning",
    loggable: true,
    retryable: false
  },
  // ====================
  // Permission Errors
  // ====================
  PERM_ACCESS_DENIED: {
    code: "PERM_ACCESS_DENIED",
    title: {
      bg: "\u0414\u043E\u0441\u0442\u044A\u043F \u043E\u0442\u043A\u0430\u0437\u0430\u043D",
      en: "Access Denied"
    },
    description: {
      bg: "\u041D\u044F\u043C\u0430\u0442\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0434\u0430 \u0434\u043E\u0441\u0442\u044A\u043F\u0438\u0442\u0435 \u0442\u043E\u0437\u0438 \u0440\u0435\u0441\u0443\u0440\u0441.",
      en: "You don't have permission to access this resource."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u0432\u043B\u0435\u0437\u0442\u0435 \u0441 \u0434\u0440\u0443\u0433 \u0430\u043A\u0430\u0443\u043D\u0442 \u0438\u043B\u0438 \u0441\u0435 \u0441\u0432\u044A\u0440\u0436\u0435\u0442\u0435 \u0441 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440.",
      en: "Please log in with a different account or contact an administrator."
    },
    severity: "error",
    loggable: true,
    retryable: false
  },
  PERM_PREMIUM_REQUIRED: {
    code: "PERM_PREMIUM_REQUIRED",
    title: {
      bg: "\u0418\u0437\u0438\u0441\u043A\u0432\u0430 \u0441\u0435 Pro \u0430\u043A\u0430\u0443\u043D\u0442",
      en: "Pro Account Required"
    },
    description: {
      bg: "\u0422\u0430\u0437\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u0438\u0437\u0438\u0441\u043A\u0432\u0430 Pro \u0430\u043A\u0430\u0443\u043D\u0442.",
      en: "This feature requires a Pro account."
    },
    action: {
      bg: "\u041D\u0430\u0434\u0433\u0440\u0430\u0434\u0435\u0442\u0435 \u0434\u043E Pro, \u0437\u0430 \u0434\u0430 \u0434\u043E\u0441\u0442\u044A\u043F\u0438\u0442\u0435 \u0442\u0430\u0437\u0438 \u0444\u0443\u043D\u043A\u0446\u0438\u044F.",
      en: "Upgrade to Pro to access this feature."
    },
    severity: "warning",
    loggable: true,
    retryable: false
  },
  // ====================
  // WebSocket Errors
  // ====================
  WS_CONNECTION_FAILED: {
    code: "WS_CONNECTION_FAILED",
    title: {
      bg: "\u0412\u0440\u044A\u0437\u043A\u0430\u0442\u0430 \u0435 \u043D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u0430",
      en: "Connection Failed"
    },
    description: {
      bg: "\u041D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430 \u0441 WebSocket \u0441\u044A\u0440\u0432\u044A\u0440\u0430.",
      en: "Failed to connect to the WebSocket server."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043E\u043F\u0438\u0442\u0430\u0439\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E \u0441\u043B\u0435\u0434 \u043D\u044F\u043A\u043E\u043B\u043A\u043E \u0441\u0435\u043A\u0443\u043D\u0434\u0438.",
      en: "Please try again in a few seconds."
    },
    severity: "error",
    loggable: true,
    retryable: true,
    retryAfter: 5
  },
  WS_HEARTBEAT_TIMEOUT: {
    code: "WS_HEARTBEAT_TIMEOUT",
    title: {
      bg: "\u0412\u0440\u044A\u0437\u043A\u0430\u0442\u0430 \u0435 \u043F\u0440\u0435\u043A\u044A\u0441\u043D\u0430\u0442\u0430",
      en: "Connection Lost"
    },
    description: {
      bg: "\u0412\u0440\u044A\u0437\u043A\u0430\u0442\u0430 \u0441\u044A\u0441 \u0441\u044A\u0440\u0432\u044A\u0440\u0430 \u0435 \u043F\u0440\u0435\u043A\u044A\u0441\u043D\u0430\u0442\u0430 \u043F\u043E\u0440\u0430\u0434\u0438 \u043D\u0435\u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442.",
      en: "The connection to the server was lost due to inactivity."
    },
    action: {
      bg: "\u041C\u043E\u043B\u044F, \u043E\u043F\u0440\u0435\u0441\u043D\u0435\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430\u0442\u0430, \u0437\u0430 \u0434\u0430 \u0441\u0435 \u0441\u0432\u044A\u0440\u0436\u0435\u0442\u0435 \u043E\u0442\u043D\u043E\u0432\u043E.",
      en: "Please refresh the page to reconnect."
    },
    severity: "warning",
    loggable: true,
    retryable: true
  }
};
function getErrorMessage(errorCode, language = "bg", context = {}) {
  const error = ERROR_MESSAGES[errorCode];
  if (!error) {
    const fallback = ERROR_MESSAGES.SERVER_INTERNAL_ERROR;
    return {
      code: fallback.code,
      title: fallback.title[language],
      description: fallback.description[language],
      action: fallback.action[language],
      severity: fallback.severity,
      loggable: fallback.loggable,
      retryable: fallback.retryable
    };
  }
  const formatWithContext = (template) => {
    return Object.keys(context).reduce((result, key) => {
      return result.replace(new RegExp(`{${key}}`, "g"), context[key]);
    }, template);
  };
  return {
    code: error.code,
    title: error.title[language],
    description: formatWithContext(error.description[language]),
    action: formatWithContext(error.action[language]),
    severity: error.severity,
    loggable: error.loggable,
    retryable: error.retryable
  };
}
function formatErrorMessage(template, context) {
  return Object.keys(context).reduce((result, key) => {
    return result.replace(new RegExp(`{${key}}`, "g"), context[key]);
  }, template);
}
function isValidErrorCode(code) {
  return code in ERROR_MESSAGES;
}
function getAllErrorCodes() {
  return Object.keys(ERROR_MESSAGES);
}
function getErrorSeverity(code) {
  return ERROR_MESSAGES[code]?.severity || "error";
}
function isErrorRetryable(code) {
  return ERROR_MESSAGES[code]?.retryable || false;
}
var errorMessages_default = {
  ERROR_MESSAGES,
  getErrorMessage,
  formatErrorMessage,
  isValidErrorCode,
  getAllErrorCodes,
  getErrorSeverity,
  isErrorRetryable
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatErrorMessage,
  getAllErrorCodes,
  getErrorMessage,
  getErrorSeverity,
  isErrorRetryable,
  isValidErrorCode
});
