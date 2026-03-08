"use strict";
/**
 * Error Code Taxonomy
 *
 * Defines the hierarchical error code structure for AstroLogAI
 * Format: CATEGORY_SPECIFIC_ERROR (e.g., AUTH_INVALID_TOKEN)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHttpStatus = exports.WebSocketErrors = exports.PermissionErrors = exports.NotFoundErrors = exports.DatabaseErrors = exports.ServerErrors = exports.RateLimitErrors = exports.ApiErrors = exports.ValidationErrors = exports.AuthErrors = exports.ErrorCategory = void 0;
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["AUTH"] = "AUTH";
    ErrorCategory["VALIDATION"] = "VALID";
    ErrorCategory["API"] = "API";
    ErrorCategory["RATE_LIMIT"] = "RATE";
    ErrorCategory["SERVER"] = "SERVER";
    ErrorCategory["DATABASE"] = "DB";
    ErrorCategory["NOT_FOUND"] = "NOTFOUND";
    ErrorCategory["PERMISSION"] = "PERM";
    ErrorCategory["WEBSOCKET"] = "WS";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
// Authentication Errors (AUTH_*)
exports.AuthErrors = {
    INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
    EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
    MISSING_TOKEN: 'AUTH_MISSING_TOKEN',
    INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
    USER_DISABLED: 'AUTH_USER_DISABLED',
    ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
    EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
    OAUTH_FAILED: 'AUTH_OAUTH_FAILED',
    SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
    REFRESH_TOKEN_INVALID: 'AUTH_REFRESH_TOKEN_INVALID',
};
// Validation Errors (VALID_*)
exports.ValidationErrors = {
    INVALID_FORMAT: 'VALID_INVALID_FORMAT',
    REQUIRED_FIELD: 'VALID_REQUIRED_FIELD',
    MIN_LENGTH: 'VALID_MIN_LENGTH',
    MAX_LENGTH: 'VALID_MAX_LENGTH',
    INVALID_EMAIL: 'VALID_INVALID_EMAIL',
    INVALID_DATE: 'VALID_INVALID_DATE',
    INVALID_TIMEZONE: 'VALID_INVALID_TIMEZONE',
    INVALID_BIRTH_DATA: 'VALID_INVALID_BIRTH_DATA',
    INVALID_COORDINATES: 'VALID_INVALID_COORDINATES',
    INVALID_LANGUAGE: 'VALID_INVALID_LANGUAGE',
    OUT_OF_RANGE: 'VALID_OUT_OF_RANGE',
    INVALID_TYPE: 'VALID_INVALID_TYPE',
    MALFORMED_JSON: 'VALID_MALFORMED_JSON',
};
// API Errors (API_*)
exports.ApiErrors = {
    EXTERNAL_FAILED: 'API_EXTERNAL_FAILED',
    AI_SERVICE_UNAVAILABLE: 'API_AI_SERVICE_UNAVAILABLE',
    AI_QUOTA_EXCEEDED: 'API_AI_QUOTA_EXCEEDED',
    AI_TIMEOUT: 'API_AI_TIMEOUT',
    ASTRO_CALCULATION_FAILED: 'API_ASTRO_CALCULATION_FAILED',
    CHART_GENERATION_FAILED: 'API_CHART_GENERATION_FAILED',
    PDF_GENERATION_FAILED: 'API_PDF_GENERATION_FAILED',
    EXPORT_FAILED: 'API_EXPORT_FAILED',
    IMPORT_FAILED: 'API_IMPORT_FAILED',
};
// Rate Limit Errors (RATE_*)
exports.RateLimitErrors = {
    QUOTA_EXCEEDED: 'RATE_QUOTA_EXCEEDED',
    BURST_LIMIT_EXCEEDED: 'RATE_BURST_LIMIT_EXCEEDED',
    DAILY_LIMIT_EXCEEDED: 'RATE_DAILY_LIMIT_EXCEEDED',
    MONTHLY_LIMIT_EXCEEDED: 'RATE_MONTHLY_LIMIT_EXCEEDED',
    WEBHOOK_RATE_LIMIT: 'RATE_WEBHOOK_RATE_LIMIT',
};
// Server Errors (SERVER_*)
exports.ServerErrors = {
    INTERNAL_ERROR: 'SERVER_INTERNAL_ERROR',
    NOT_IMPLEMENTED: 'SERVER_NOT_IMPLEMENTED',
    SERVICE_UNAVAILABLE: 'SERVER_SERVICE_UNAVAILABLE',
    MAINTENANCE_MODE: 'SERVER_MAINTENANCE_MODE',
    CONFIGURATION_ERROR: 'SERVER_CONFIGURATION_ERROR',
    UNKNOWN_ERROR: 'SERVER_UNKNOWN_ERROR',
};
// Database Errors (DB_*)
exports.DatabaseErrors = {
    CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
    QUERY_FAILED: 'DB_QUERY_FAILED',
    TRANSACTION_FAILED: 'DB_TRANSACTION_FAILED',
    RECORD_NOT_FOUND: 'DB_RECORD_NOT_FOUND',
    DUPLICATE_ENTRY: 'DB_DUPLICATE_ENTRY',
    CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
    MIGRATION_FAILED: 'DB_MIGRATION_FAILED',
};
// Not Found Errors (NOTFOUND_*)
exports.NotFoundErrors = {
    USER: 'NOTFOUND_USER',
    CHART: 'NOTFOUND_CHART',
    CONVERSATION: 'NOTFOUND_CONVERSATION',
    MESSAGE: 'NOTFOUND_MESSAGE',
    PREFERENCE: 'NOTFOUND_PREFERENCE',
    RESOURCE: 'NOTFOUND_RESOURCE',
};
// Permission Errors (PERM_*)
exports.PermissionErrors = {
    ACCESS_DENIED: 'PERM_ACCESS_DENIED',
    INSUFFICIENT_TIER: 'PERM_INSUFFICIENT_TIER',
    PREMIUM_REQUIRED: 'PERM_PREMIUM_REQUIRED',
    ADMIN_REQUIRED: 'PERM_ADMIN_REQUIRED',
    SELF_MODIFICATION: 'PERM_SELF_MODIFICATION',
    CANNOT_DELETE_OWN: 'PERM_CANNOT_DELETE_OWN',
};
// WebSocket Errors (WS_*)
exports.WebSocketErrors = {
    CONNECTION_FAILED: 'WS_CONNECTION_FAILED',
    AUTH_FAILED: 'WS_AUTH_FAILED',
    INVALID_MESSAGE: 'WS_INVALID_MESSAGE',
    MESSAGE_QUEUE_FULL: 'WS_MESSAGE_QUEUE_FULL',
    STREAM_INTERRUPTED: 'WS_STREAM_INTERRUPTED',
    HEARTBEAT_TIMEOUT: 'WS_HEARTBEAT_TIMEOUT',
};
// HTTP Status mapping
exports.ErrorHttpStatus = {
    // Auth - 401
    [exports.AuthErrors.INVALID_TOKEN]: 401,
    [exports.AuthErrors.EXPIRED_TOKEN]: 401,
    [exports.AuthErrors.MISSING_TOKEN]: 401,
    [exports.AuthErrors.INVALID_CREDENTIALS]: 401,
    [exports.AuthErrors.USER_NOT_FOUND]: 401,
    [exports.AuthErrors.USER_DISABLED]: 403,
    [exports.AuthErrors.ACCOUNT_LOCKED]: 403,
    [exports.AuthErrors.EMAIL_NOT_VERIFIED]: 403,
    [exports.AuthErrors.OAUTH_FAILED]: 401,
    [exports.AuthErrors.SESSION_EXPIRED]: 401,
    [exports.AuthErrors.REFRESH_TOKEN_INVALID]: 401,
    // Validation - 400
    [exports.ValidationErrors.INVALID_FORMAT]: 400,
    [exports.ValidationErrors.REQUIRED_FIELD]: 400,
    [exports.ValidationErrors.MIN_LENGTH]: 400,
    [exports.ValidationErrors.MAX_LENGTH]: 400,
    [exports.ValidationErrors.INVALID_EMAIL]: 400,
    [exports.ValidationErrors.INVALID_DATE]: 400,
    [exports.ValidationErrors.INVALID_TIMEZONE]: 400,
    [exports.ValidationErrors.INVALID_BIRTH_DATA]: 400,
    [exports.ValidationErrors.INVALID_COORDINATES]: 400,
    [exports.ValidationErrors.INVALID_LANGUAGE]: 400,
    [exports.ValidationErrors.OUT_OF_RANGE]: 400,
    [exports.ValidationErrors.INVALID_TYPE]: 400,
    [exports.ValidationErrors.MALFORMED_JSON]: 400,
    // API - 502/503
    [exports.ApiErrors.EXTERNAL_FAILED]: 502,
    [exports.ApiErrors.AI_SERVICE_UNAVAILABLE]: 503,
    [exports.ApiErrors.AI_QUOTA_EXCEEDED]: 429,
    [exports.ApiErrors.AI_TIMEOUT]: 504,
    [exports.ApiErrors.ASTRO_CALCULATION_FAILED]: 500,
    [exports.ApiErrors.CHART_GENERATION_FAILED]: 500,
    [exports.ApiErrors.PDF_GENERATION_FAILED]: 500,
    [exports.ApiErrors.EXPORT_FAILED]: 500,
    [exports.ApiErrors.IMPORT_FAILED]: 500,
    // Rate Limit - 429
    [exports.RateLimitErrors.QUOTA_EXCEEDED]: 429,
    [exports.RateLimitErrors.BURST_LIMIT_EXCEEDED]: 429,
    [exports.RateLimitErrors.DAILY_LIMIT_EXCEEDED]: 429,
    [exports.RateLimitErrors.MONTHLY_LIMIT_EXCEEDED]: 429,
    [exports.RateLimitErrors.WEBHOOK_RATE_LIMIT]: 429,
    // Server - 500
    [exports.ServerErrors.INTERNAL_ERROR]: 500,
    [exports.ServerErrors.NOT_IMPLEMENTED]: 501,
    [exports.ServerErrors.SERVICE_UNAVAILABLE]: 503,
    [exports.ServerErrors.MAINTENANCE_MODE]: 503,
    [exports.ServerErrors.CONFIGURATION_ERROR]: 500,
    [exports.ServerErrors.UNKNOWN_ERROR]: 500,
    // Database - 500
    [exports.DatabaseErrors.CONNECTION_FAILED]: 503,
    [exports.DatabaseErrors.QUERY_FAILED]: 500,
    [exports.DatabaseErrors.TRANSACTION_FAILED]: 500,
    [exports.DatabaseErrors.RECORD_NOT_FOUND]: 404,
    [exports.DatabaseErrors.DUPLICATE_ENTRY]: 409,
    [exports.DatabaseErrors.CONSTRAINT_VIOLATION]: 400,
    [exports.DatabaseErrors.MIGRATION_FAILED]: 500,
    // Not Found - 404
    [exports.NotFoundErrors.USER]: 404,
    [exports.NotFoundErrors.CHART]: 404,
    [exports.NotFoundErrors.CONVERSATION]: 404,
    [exports.NotFoundErrors.MESSAGE]: 404,
    [exports.NotFoundErrors.PREFERENCE]: 404,
    [exports.NotFoundErrors.RESOURCE]: 404,
    // Permission - 403
    [exports.PermissionErrors.ACCESS_DENIED]: 403,
    [exports.PermissionErrors.INSUFFICIENT_TIER]: 403,
    [exports.PermissionErrors.PREMIUM_REQUIRED]: 403,
    [exports.PermissionErrors.ADMIN_REQUIRED]: 403,
    [exports.PermissionErrors.SELF_MODIFICATION]: 403,
    [exports.PermissionErrors.CANNOT_DELETE_OWN]: 403,
    // WebSocket - 400/1011
    [exports.WebSocketErrors.CONNECTION_FAILED]: 400,
    [exports.WebSocketErrors.AUTH_FAILED]: 400,
    [exports.WebSocketErrors.INVALID_MESSAGE]: 400,
    [exports.WebSocketErrors.MESSAGE_QUEUE_FULL]: 400,
    [exports.WebSocketErrors.STREAM_INTERRUPTED]: 1011,
    [exports.WebSocketErrors.HEARTBEAT_TIMEOUT]: 1011,
};
//# sourceMappingURL=error-codes.js.map