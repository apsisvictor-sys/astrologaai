/**
 * Error Code Taxonomy
 * 
 * Defines the hierarchical error code structure for AstroLogAI
 * Format: CATEGORY_SPECIFIC_ERROR (e.g., AUTH_INVALID_TOKEN)
 */

export enum ErrorCategory {
  AUTH = 'AUTH',           // Authentication & Authorization errors
  VALIDATION = 'VALID',    // Input validation errors
  API = 'API',            // External API errors
  RATE_LIMIT = 'RATE',    // Rate limiting errors
  SERVER = 'SERVER',      // Internal server errors
  DATABASE = 'DB',        // Database errors
  NOT_FOUND = 'NOTFOUND', // Resource not found errors
  PERMISSION = 'PERM',    // Permission/Access denied errors
  WEBSOCKET = 'WS',       // WebSocket connection errors
}

// Authentication Errors (AUTH_*)
export const AuthErrors = {
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
} as const;

// Validation Errors (VALID_*)
export const ValidationErrors = {
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
} as const;

// API Errors (API_*)
export const ApiErrors = {
  EXTERNAL_FAILED: 'API_EXTERNAL_FAILED',
  AI_SERVICE_UNAVAILABLE: 'API_AI_SERVICE_UNAVAILABLE',
  AI_QUOTA_EXCEEDED: 'API_AI_QUOTA_EXCEEDED',
  AI_TIMEOUT: 'API_AI_TIMEOUT',
  ASTRO_CALCULATION_FAILED: 'API_ASTRO_CALCULATION_FAILED',
  CHART_GENERATION_FAILED: 'API_CHART_GENERATION_FAILED',
  PDF_GENERATION_FAILED: 'API_PDF_GENERATION_FAILED',
  EXPORT_FAILED: 'API_EXPORT_FAILED',
  IMPORT_FAILED: 'API_IMPORT_FAILED',
} as const;

// Rate Limit Errors (RATE_*)
export const RateLimitErrors = {
  QUOTA_EXCEEDED: 'RATE_QUOTA_EXCEEDED',
  BURST_LIMIT_EXCEEDED: 'RATE_BURST_LIMIT_EXCEEDED',
  DAILY_LIMIT_EXCEEDED: 'RATE_DAILY_LIMIT_EXCEEDED',
  MONTHLY_LIMIT_EXCEEDED: 'RATE_MONTHLY_LIMIT_EXCEEDED',
  WEBHOOK_RATE_LIMIT: 'RATE_WEBHOOK_RATE_LIMIT',
} as const;

// Server Errors (SERVER_*)
export const ServerErrors = {
  INTERNAL_ERROR: 'SERVER_INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'SERVER_NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE: 'SERVER_SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'SERVER_MAINTENANCE_MODE',
  CONFIGURATION_ERROR: 'SERVER_CONFIGURATION_ERROR',
  UNKNOWN_ERROR: 'SERVER_UNKNOWN_ERROR',
} as const;

// Database Errors (DB_*)
export const DatabaseErrors = {
  CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  QUERY_FAILED: 'DB_QUERY_FAILED',
  TRANSACTION_FAILED: 'DB_TRANSACTION_FAILED',
  RECORD_NOT_FOUND: 'DB_RECORD_NOT_FOUND',
  DUPLICATE_ENTRY: 'DB_DUPLICATE_ENTRY',
  CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  MIGRATION_FAILED: 'DB_MIGRATION_FAILED',
} as const;

// Not Found Errors (NOTFOUND_*)
export const NotFoundErrors = {
  USER: 'NOTFOUND_USER',
  CHART: 'NOTFOUND_CHART',
  CONVERSATION: 'NOTFOUND_CONVERSATION',
  MESSAGE: 'NOTFOUND_MESSAGE',
  PREFERENCE: 'NOTFOUND_PREFERENCE',
  RESOURCE: 'NOTFOUND_RESOURCE',
} as const;

// Permission Errors (PERM_*)
export const PermissionErrors = {
  ACCESS_DENIED: 'PERM_ACCESS_DENIED',
  INSUFFICIENT_TIER: 'PERM_INSUFFICIENT_TIER',
  PREMIUM_REQUIRED: 'PERM_PREMIUM_REQUIRED',
  ADMIN_REQUIRED: 'PERM_ADMIN_REQUIRED',
  SELF_MODIFICATION: 'PERM_SELF_MODIFICATION',
  CANNOT_DELETE_OWN: 'PERM_CANNOT_DELETE_OWN',
} as const;

// WebSocket Errors (WS_*)
export const WebSocketErrors = {
  CONNECTION_FAILED: 'WS_CONNECTION_FAILED',
  AUTH_FAILED: 'WS_AUTH_FAILED',
  INVALID_MESSAGE: 'WS_INVALID_MESSAGE',
  MESSAGE_QUEUE_FULL: 'WS_MESSAGE_QUEUE_FULL',
  STREAM_INTERRUPTED: 'WS_STREAM_INTERRUPTED',
  HEARTBEAT_TIMEOUT: 'WS_HEARTBEAT_TIMEOUT',
} as const;

// Type for any error code
export type ErrorCode = 
  | typeof AuthErrors[keyof typeof AuthErrors]
  | typeof ValidationErrors[keyof typeof ValidationErrors]
  | typeof ApiErrors[keyof typeof ApiErrors]
  | typeof RateLimitErrors[keyof typeof RateLimitErrors]
  | typeof ServerErrors[keyof typeof ServerErrors]
  | typeof DatabaseErrors[keyof typeof DatabaseErrors]
  | typeof NotFoundErrors[keyof typeof NotFoundErrors]
  | typeof PermissionErrors[keyof typeof PermissionErrors]
  | typeof WebSocketErrors[keyof typeof WebSocketErrors];

// HTTP Status mapping
export const ErrorHttpStatus: Record<ErrorCode, number> = {
  // Auth - 401
  [AuthErrors.INVALID_TOKEN]: 401,
  [AuthErrors.EXPIRED_TOKEN]: 401,
  [AuthErrors.MISSING_TOKEN]: 401,
  [AuthErrors.INVALID_CREDENTIALS]: 401,
  [AuthErrors.USER_NOT_FOUND]: 401,
  [AuthErrors.USER_DISABLED]: 403,
  [AuthErrors.ACCOUNT_LOCKED]: 403,
  [AuthErrors.EMAIL_NOT_VERIFIED]: 403,
  [AuthErrors.OAUTH_FAILED]: 401,
  [AuthErrors.SESSION_EXPIRED]: 401,
  [AuthErrors.REFRESH_TOKEN_INVALID]: 401,
  
  // Validation - 400
  [ValidationErrors.INVALID_FORMAT]: 400,
  [ValidationErrors.REQUIRED_FIELD]: 400,
  [ValidationErrors.MIN_LENGTH]: 400,
  [ValidationErrors.MAX_LENGTH]: 400,
  [ValidationErrors.INVALID_EMAIL]: 400,
  [ValidationErrors.INVALID_DATE]: 400,
  [ValidationErrors.INVALID_TIMEZONE]: 400,
  [ValidationErrors.INVALID_BIRTH_DATA]: 400,
  [ValidationErrors.INVALID_COORDINATES]: 400,
  [ValidationErrors.INVALID_LANGUAGE]: 400,
  [ValidationErrors.OUT_OF_RANGE]: 400,
  [ValidationErrors.INVALID_TYPE]: 400,
  [ValidationErrors.MALFORMED_JSON]: 400,
  
  // API - 502/503
  [ApiErrors.EXTERNAL_FAILED]: 502,
  [ApiErrors.AI_SERVICE_UNAVAILABLE]: 503,
  [ApiErrors.AI_QUOTA_EXCEEDED]: 429,
  [ApiErrors.AI_TIMEOUT]: 504,
  [ApiErrors.ASTRO_CALCULATION_FAILED]: 500,
  [ApiErrors.CHART_GENERATION_FAILED]: 500,
  [ApiErrors.PDF_GENERATION_FAILED]: 500,
  [ApiErrors.EXPORT_FAILED]: 500,
  [ApiErrors.IMPORT_FAILED]: 500,
  
  // Rate Limit - 429
  [RateLimitErrors.QUOTA_EXCEEDED]: 429,
  [RateLimitErrors.BURST_LIMIT_EXCEEDED]: 429,
  [RateLimitErrors.DAILY_LIMIT_EXCEEDED]: 429,
  [RateLimitErrors.MONTHLY_LIMIT_EXCEEDED]: 429,
  [RateLimitErrors.WEBHOOK_RATE_LIMIT]: 429,
  
  // Server - 500
  [ServerErrors.INTERNAL_ERROR]: 500,
  [ServerErrors.NOT_IMPLEMENTED]: 501,
  [ServerErrors.SERVICE_UNAVAILABLE]: 503,
  [ServerErrors.MAINTENANCE_MODE]: 503,
  [ServerErrors.CONFIGURATION_ERROR]: 500,
  [ServerErrors.UNKNOWN_ERROR]: 500,
  
  // Database - 500
  [DatabaseErrors.CONNECTION_FAILED]: 503,
  [DatabaseErrors.QUERY_FAILED]: 500,
  [DatabaseErrors.TRANSACTION_FAILED]: 500,
  [DatabaseErrors.RECORD_NOT_FOUND]: 404,
  [DatabaseErrors.DUPLICATE_ENTRY]: 409,
  [DatabaseErrors.CONSTRAINT_VIOLATION]: 400,
  [DatabaseErrors.MIGRATION_FAILED]: 500,
  
  // Not Found - 404
  [NotFoundErrors.USER]: 404,
  [NotFoundErrors.CHART]: 404,
  [NotFoundErrors.CONVERSATION]: 404,
  [NotFoundErrors.MESSAGE]: 404,
  [NotFoundErrors.PREFERENCE]: 404,
  [NotFoundErrors.RESOURCE]: 404,
  
  // Permission - 403
  [PermissionErrors.ACCESS_DENIED]: 403,
  [PermissionErrors.INSUFFICIENT_TIER]: 403,
  [PermissionErrors.PREMIUM_REQUIRED]: 403,
  [PermissionErrors.ADMIN_REQUIRED]: 403,
  [PermissionErrors.SELF_MODIFICATION]: 403,
  [PermissionErrors.CANNOT_DELETE_OWN]: 403,
  
  // WebSocket - 400/1011
  [WebSocketErrors.CONNECTION_FAILED]: 400,
  [WebSocketErrors.AUTH_FAILED]: 400,
  [WebSocketErrors.INVALID_MESSAGE]: 400,
  [WebSocketErrors.MESSAGE_QUEUE_FULL]: 400,
  [WebSocketErrors.STREAM_INTERRUPTED]: 1011,
  [WebSocketErrors.HEARTBEAT_TIMEOUT]: 1011,
};
