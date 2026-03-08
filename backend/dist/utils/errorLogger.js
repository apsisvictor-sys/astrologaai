"use strict";
/**
 * Structured Error Logger
 * US-39: Localized Error-Message Framework
 *
 * Provides structured error logging with context capture for monitoring and debugging.
 * Supports different severity levels and environment-aware logging.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = void 0;
exports.debug = debug;
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.fatal = fatal;
exports.httpError = httpError;
exports.authError = authError;
exports.rateLimitError = rateLimitError;
exports.databaseError = databaseError;
exports.websocketError = websocketError;
exports.aiServiceError = aiServiceError;
exports.generateRequestId = generateRequestId;
exports.sanitizeContext = sanitizeContext;
exports.getLogLevel = getLogLevel;
exports.setLogLevel = setLogLevel;
exports.initializeMonitoring = initializeMonitoring;
exports.captureException = captureException;
const winston_1 = __importDefault(require("winston"));
const uuid_1 = require("uuid");
// ============================================
// Winston Logger Configuration
// ============================================
const { combine, timestamp, json, colorize, printf } = winston_1.default.format;
// Console format for development
const consoleFormat = combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
}));
// JSON format for production
const jsonFormat = combine(timestamp(), json());
// Create logger instance
const logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    defaultMeta: {
        service: 'astrologaai-backend',
        environment: process.env.NODE_ENV || 'development',
    },
    transports: [
        // Console transport for all environments
        new winston_1.default.transports.Console({
            format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
        }),
        // File transport for errors in production
        ...(process.env.NODE_ENV === 'production'
            ? [
                new winston_1.default.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                    format: jsonFormat,
                    maxsize: 10485760, // 10MB
                    maxFiles: 10,
                }),
                new winston_1.default.transports.File({
                    filename: 'logs/combined.log',
                    format: jsonFormat,
                    maxsize: 10485760, // 10MB
                    maxFiles: 5,
                }),
            ]
            : []),
    ],
});
// ============================================
// Log Entry Builder
// ============================================
/**
 * Build log entry from options
 */
function buildLogEntry(severity, message, errorCode, options = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        severity,
        message,
        context: options.context || {},
    };
    // Add error code if provided
    if (errorCode) {
        entry.errorCode = errorCode;
    }
    // Add user context
    if (options.userId) {
        entry.userId = options.userId;
    }
    // Add request context
    if (options.requestId) {
        entry.requestId = options.requestId;
    }
    if (options.sessionId) {
        entry.sessionId = options.sessionId;
    }
    // Add HTTP context
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
    // Add language
    if (options.language) {
        entry.language = options.language;
    }
    // Add stack trace for errors
    if (options.stackTrace) {
        entry.stackTrace = options.stackTrace;
    }
    return entry;
}
// ============================================
// Public API
// ============================================
/**
 * Log debug message (development only)
 */
function debug(message, context) {
    if (process.env.NODE_ENV !== 'production') {
        const entry = buildLogEntry('debug', message, undefined, { context });
        logger.debug(entry.message, entry);
    }
}
/**
 * Log informational message
 */
function info(message, context) {
    const entry = buildLogEntry('info', message, undefined, { context });
    logger.info(entry.message, entry);
}
/**
 * Log warning message
 */
function warn(message, context) {
    const entry = buildLogEntry('warn', message, undefined, { context });
    logger.warn(entry.message, entry);
}
/**
 * Log error with full context
 */
function error(message, errorCode, options = {}) {
    const entry = buildLogEntry('error', message, errorCode, options);
    logger.error(entry.message, entry);
}
/**
 * Log fatal error (system-critical)
 */
function fatal(message, errorCode, options = {}) {
    const entry = buildLogEntry('fatal', message, errorCode, options);
    logger.error(entry.message, entry); // Winston doesn't have fatal level, use error
    // In production, also send to monitoring service
    if (process.env.NODE_ENV === 'production') {
        // TODO: Integrate with monitoring service (Sentry, Datadog, etc.)
        console.error('[FATAL ERROR]', entry);
    }
}
/**
 * Log HTTP request error
 */
function httpError(errorCode, message, options) {
    const entry = buildLogEntry('error', message, errorCode, options);
    logger.error(entry.message, entry);
}
/**
 * Log authentication error
 */
function authError(errorCode, message, options) {
    const entry = buildLogEntry('warn', message, errorCode, options);
    logger.warn(entry.message, entry);
}
/**
 * Log rate limit error
 */
function rateLimitError(errorCode, message, options) {
    const entry = buildLogEntry('info', message, errorCode, {
        ...options,
        context: { ...options.context, retryAfter: options.retryAfter },
    });
    logger.info(entry.message, entry);
}
/**
 * Log database error
 */
function databaseError(errorCode, message, options) {
    const entry = buildLogEntry('error', message, errorCode, options);
    logger.error(entry.message, entry);
}
/**
 * Log WebSocket error
 */
function websocketError(errorCode, message, options) {
    const entry = buildLogEntry('error', message, errorCode, options);
    logger.error(entry.message, entry);
}
/**
 * Log AI service error
 */
function aiServiceError(errorCode, message, options) {
    const entry = buildLogEntry('error', message, errorCode, options);
    logger.error(entry.message, entry);
}
// ============================================
// Helper Functions
// ============================================
/**
 * Generate request ID for logging correlation
 */
function generateRequestId() {
    return (0, uuid_1.v4)();
}
/**
 * Sanitize sensitive data from log context
 */
function sanitizeContext(context) {
    const sanitized = { ...context };
    // Remove sensitive fields
    const sensitiveFields = [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'apiKey',
        'secret',
        'creditCard',
        'ssn',
        'personalId',
    ];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    // Sanitize nested objects
    Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeContext(sanitized[key]);
        }
    });
    return sanitized;
}
/**
 * Get current log level
 */
function getLogLevel() {
    return logger.level;
}
/**
 * Set log level dynamically
 */
function setLogLevel(level) {
    logger.level = level;
    logger.transports.forEach(transport => {
        transport.level = level;
    });
}
// ============================================
// Error Monitoring Integration
// ============================================
/**
 * Initialize error monitoring (Sentry, etc.)
 */
function initializeMonitoring() {
    if (process.env.NODE_ENV === 'production') {
        // TODO: Initialize Sentry or other monitoring service
        info('Error monitoring initialized', {
            service: 'error-monitoring',
            timestamp: new Date().toISOString(),
        });
    }
}
/**
 * Capture exception for monitoring
 */
function captureException(error, context) {
    const errorId = (0, uuid_1.v4)();
    // Log locally
    const entry = buildLogEntry('error', error.message, undefined, {
        context: {
            errorId,
            errorName: error.name,
            stackTrace: error.stack,
            ...context,
        },
    });
    logger.error(entry.message, entry);
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
        // TODO: Send to Sentry/Datadog
        console.error(`[MONITORING] Exception captured: ${errorId}`);
    }
}
// ============================================
// Exports
// ============================================
exports.errorLogger = {
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
    captureException,
};
exports.default = exports.errorLogger;
//# sourceMappingURL=errorLogger.js.map