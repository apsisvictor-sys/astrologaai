/**
 * Structured Error Logger
 * US-39: Localized Error-Message Framework
 *
 * Provides structured error logging with context capture for monitoring and debugging.
 * Supports different severity levels and environment-aware logging.
 */
export type LogSeverity = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export interface LogEntry {
    timestamp: string;
    errorCode?: string;
    severity: LogSeverity;
    message: string;
    userId?: string;
    requestId?: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    language?: string;
    stackTrace?: string;
    context: Record<string, any>;
}
export interface ErrorLogOptions {
    userId?: string;
    requestId?: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    language?: string;
    stackTrace?: string;
    context?: Record<string, any>;
}
/**
 * Log debug message (development only)
 */
export declare function debug(message: string, context?: Record<string, any>): void;
/**
 * Log informational message
 */
export declare function info(message: string, context?: Record<string, any>): void;
/**
 * Log warning message
 */
export declare function warn(message: string, context?: Record<string, any>): void;
/**
 * Log error with full context
 */
export declare function error(message: string, errorCode?: string, options?: ErrorLogOptions): void;
/**
 * Log fatal error (system-critical)
 */
export declare function fatal(message: string, errorCode?: string, options?: ErrorLogOptions): void;
/**
 * Log HTTP request error
 */
export declare function httpError(errorCode: string, message: string, options: ErrorLogOptions & {
    method: string;
    url: string;
    statusCode: number;
}): void;
/**
 * Log authentication error
 */
export declare function authError(errorCode: string, message: string, options: ErrorLogOptions & {
    userId?: string;
    ipAddress: string;
    userAgent: string;
}): void;
/**
 * Log rate limit error
 */
export declare function rateLimitError(errorCode: string, message: string, options: ErrorLogOptions & {
    userId: string;
    ipAddress: string;
    retryAfter: number;
}): void;
/**
 * Log database error
 */
export declare function databaseError(errorCode: string, message: string, options: ErrorLogOptions & {
    query?: string;
    table?: string;
    operation?: string;
}): void;
/**
 * Log WebSocket error
 */
export declare function websocketError(errorCode: string, message: string, options: ErrorLogOptions & {
    socketId: string;
    eventType?: string;
}): void;
/**
 * Log AI service error
 */
export declare function aiServiceError(errorCode: string, message: string, options: ErrorLogOptions & {
    provider: string;
    model?: string;
    tokensUsed?: number;
}): void;
/**
 * Generate request ID for logging correlation
 */
export declare function generateRequestId(): string;
/**
 * Sanitize sensitive data from log context
 */
export declare function sanitizeContext(context: Record<string, any>): Record<string, any>;
/**
 * Get current log level
 */
export declare function getLogLevel(): string;
/**
 * Set log level dynamically
 */
export declare function setLogLevel(level: string): void;
/**
 * Initialize error monitoring (Sentry, etc.)
 */
export declare function initializeMonitoring(): void;
/**
 * Capture exception for monitoring
 */
export declare function captureException(error: Error, context?: Record<string, any>): void;
export declare const errorLogger: {
    debug: typeof debug;
    info: typeof info;
    warn: typeof warn;
    error: typeof error;
    fatal: typeof fatal;
    httpError: typeof httpError;
    authError: typeof authError;
    rateLimitError: typeof rateLimitError;
    databaseError: typeof databaseError;
    websocketError: typeof websocketError;
    aiServiceError: typeof aiServiceError;
    generateRequestId: typeof generateRequestId;
    sanitizeContext: typeof sanitizeContext;
    getLogLevel: typeof getLogLevel;
    setLogLevel: typeof setLogLevel;
    initializeMonitoring: typeof initializeMonitoring;
    captureException: typeof captureException;
};
export default errorLogger;
//# sourceMappingURL=errorLogger.d.ts.map