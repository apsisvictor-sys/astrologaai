/**
 * Error Code Taxonomy
 *
 * Defines the hierarchical error code structure for AstroLogAI
 * Format: CATEGORY_SPECIFIC_ERROR (e.g., AUTH_INVALID_TOKEN)
 */
export declare enum ErrorCategory {
    AUTH = "AUTH",// Authentication & Authorization errors
    VALIDATION = "VALID",// Input validation errors
    API = "API",// External API errors
    RATE_LIMIT = "RATE",// Rate limiting errors
    SERVER = "SERVER",// Internal server errors
    DATABASE = "DB",// Database errors
    NOT_FOUND = "NOTFOUND",// Resource not found errors
    PERMISSION = "PERM",// Permission/Access denied errors
    WEBSOCKET = "WS"
}
export declare const AuthErrors: {
    readonly INVALID_TOKEN: "AUTH_INVALID_TOKEN";
    readonly EXPIRED_TOKEN: "AUTH_EXPIRED_TOKEN";
    readonly MISSING_TOKEN: "AUTH_MISSING_TOKEN";
    readonly INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS";
    readonly USER_NOT_FOUND: "AUTH_USER_NOT_FOUND";
    readonly USER_DISABLED: "AUTH_USER_DISABLED";
    readonly ACCOUNT_LOCKED: "AUTH_ACCOUNT_LOCKED";
    readonly EMAIL_NOT_VERIFIED: "AUTH_EMAIL_NOT_VERIFIED";
    readonly OAUTH_FAILED: "AUTH_OAUTH_FAILED";
    readonly SESSION_EXPIRED: "AUTH_SESSION_EXPIRED";
    readonly REFRESH_TOKEN_INVALID: "AUTH_REFRESH_TOKEN_INVALID";
};
export declare const ValidationErrors: {
    readonly INVALID_FORMAT: "VALID_INVALID_FORMAT";
    readonly REQUIRED_FIELD: "VALID_REQUIRED_FIELD";
    readonly MIN_LENGTH: "VALID_MIN_LENGTH";
    readonly MAX_LENGTH: "VALID_MAX_LENGTH";
    readonly INVALID_EMAIL: "VALID_INVALID_EMAIL";
    readonly INVALID_DATE: "VALID_INVALID_DATE";
    readonly INVALID_TIMEZONE: "VALID_INVALID_TIMEZONE";
    readonly INVALID_BIRTH_DATA: "VALID_INVALID_BIRTH_DATA";
    readonly INVALID_COORDINATES: "VALID_INVALID_COORDINATES";
    readonly INVALID_LANGUAGE: "VALID_INVALID_LANGUAGE";
    readonly OUT_OF_RANGE: "VALID_OUT_OF_RANGE";
    readonly INVALID_TYPE: "VALID_INVALID_TYPE";
    readonly MALFORMED_JSON: "VALID_MALFORMED_JSON";
};
export declare const ApiErrors: {
    readonly EXTERNAL_FAILED: "API_EXTERNAL_FAILED";
    readonly AI_SERVICE_UNAVAILABLE: "API_AI_SERVICE_UNAVAILABLE";
    readonly AI_QUOTA_EXCEEDED: "API_AI_QUOTA_EXCEEDED";
    readonly AI_TIMEOUT: "API_AI_TIMEOUT";
    readonly ASTRO_CALCULATION_FAILED: "API_ASTRO_CALCULATION_FAILED";
    readonly CHART_GENERATION_FAILED: "API_CHART_GENERATION_FAILED";
    readonly PDF_GENERATION_FAILED: "API_PDF_GENERATION_FAILED";
    readonly EXPORT_FAILED: "API_EXPORT_FAILED";
    readonly IMPORT_FAILED: "API_IMPORT_FAILED";
};
export declare const RateLimitErrors: {
    readonly QUOTA_EXCEEDED: "RATE_QUOTA_EXCEEDED";
    readonly BURST_LIMIT_EXCEEDED: "RATE_BURST_LIMIT_EXCEEDED";
    readonly DAILY_LIMIT_EXCEEDED: "RATE_DAILY_LIMIT_EXCEEDED";
    readonly MONTHLY_LIMIT_EXCEEDED: "RATE_MONTHLY_LIMIT_EXCEEDED";
    readonly WEBHOOK_RATE_LIMIT: "RATE_WEBHOOK_RATE_LIMIT";
};
export declare const ServerErrors: {
    readonly INTERNAL_ERROR: "SERVER_INTERNAL_ERROR";
    readonly NOT_IMPLEMENTED: "SERVER_NOT_IMPLEMENTED";
    readonly SERVICE_UNAVAILABLE: "SERVER_SERVICE_UNAVAILABLE";
    readonly MAINTENANCE_MODE: "SERVER_MAINTENANCE_MODE";
    readonly CONFIGURATION_ERROR: "SERVER_CONFIGURATION_ERROR";
    readonly UNKNOWN_ERROR: "SERVER_UNKNOWN_ERROR";
};
export declare const DatabaseErrors: {
    readonly CONNECTION_FAILED: "DB_CONNECTION_FAILED";
    readonly QUERY_FAILED: "DB_QUERY_FAILED";
    readonly TRANSACTION_FAILED: "DB_TRANSACTION_FAILED";
    readonly RECORD_NOT_FOUND: "DB_RECORD_NOT_FOUND";
    readonly DUPLICATE_ENTRY: "DB_DUPLICATE_ENTRY";
    readonly CONSTRAINT_VIOLATION: "DB_CONSTRAINT_VIOLATION";
    readonly MIGRATION_FAILED: "DB_MIGRATION_FAILED";
};
export declare const NotFoundErrors: {
    readonly USER: "NOTFOUND_USER";
    readonly CHART: "NOTFOUND_CHART";
    readonly CONVERSATION: "NOTFOUND_CONVERSATION";
    readonly MESSAGE: "NOTFOUND_MESSAGE";
    readonly PREFERENCE: "NOTFOUND_PREFERENCE";
    readonly RESOURCE: "NOTFOUND_RESOURCE";
};
export declare const PermissionErrors: {
    readonly ACCESS_DENIED: "PERM_ACCESS_DENIED";
    readonly INSUFFICIENT_TIER: "PERM_INSUFFICIENT_TIER";
    readonly PREMIUM_REQUIRED: "PERM_PREMIUM_REQUIRED";
    readonly ADMIN_REQUIRED: "PERM_ADMIN_REQUIRED";
    readonly SELF_MODIFICATION: "PERM_SELF_MODIFICATION";
    readonly CANNOT_DELETE_OWN: "PERM_CANNOT_DELETE_OWN";
};
export declare const WebSocketErrors: {
    readonly CONNECTION_FAILED: "WS_CONNECTION_FAILED";
    readonly AUTH_FAILED: "WS_AUTH_FAILED";
    readonly INVALID_MESSAGE: "WS_INVALID_MESSAGE";
    readonly MESSAGE_QUEUE_FULL: "WS_MESSAGE_QUEUE_FULL";
    readonly STREAM_INTERRUPTED: "WS_STREAM_INTERRUPTED";
    readonly HEARTBEAT_TIMEOUT: "WS_HEARTBEAT_TIMEOUT";
};
export type ErrorCode = typeof AuthErrors[keyof typeof AuthErrors] | typeof ValidationErrors[keyof typeof ValidationErrors] | typeof ApiErrors[keyof typeof ApiErrors] | typeof RateLimitErrors[keyof typeof RateLimitErrors] | typeof ServerErrors[keyof typeof ServerErrors] | typeof DatabaseErrors[keyof typeof DatabaseErrors] | typeof NotFoundErrors[keyof typeof NotFoundErrors] | typeof PermissionErrors[keyof typeof PermissionErrors] | typeof WebSocketErrors[keyof typeof WebSocketErrors];
export declare const ErrorHttpStatus: Record<ErrorCode, number>;
//# sourceMappingURL=error-codes.d.ts.map