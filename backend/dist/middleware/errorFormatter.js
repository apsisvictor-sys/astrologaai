"use strict";
/**
 * Error Formatter Middleware
 * US-39: Localized Error-Message Framework
 *
 * Middleware that formats errors with localized messages and consistent structure.
 * Detects user language preference and returns user-friendly error responses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = detectLanguage;
exports.formatErrorResponse = formatErrorResponse;
exports.errorFormatterMiddleware = errorFormatterMiddleware;
exports.notFoundMiddleware = notFoundMiddleware;
exports.globalErrorHandler = globalErrorHandler;
exports.createAppError = createAppError;
exports.validationError = validationError;
exports.authError = authError;
exports.permissionError = permissionError;
exports.notFoundError = notFoundError;
exports.rateLimitError = rateLimitError;
const error_codes_1 = require("../utils/error-codes");
const errorMessages_1 = require("../services/errorMessages");
const uuid_1 = require("uuid");
const errorLogger_1 = require("../utils/errorLogger");
// ============================================
// Language Detection
// ============================================
/**
 * Detect user's preferred language from request
 * Priority: user preference > Accept-Language header > default (bg)
 */
function detectLanguage(req) {
    // Priority 1: User's stored language preference
    if (req.user?.language) {
        const userLang = req.user.language.toLowerCase();
        if (userLang === 'bg' || userLang === 'en') {
            return userLang;
        }
    }
    // Priority 2: Accept-Language header
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
        // Parse Accept-Language header (e.g., "bg,en;q=0.9,en-US;q=0.8")
        const languages = acceptLanguage.split(',').map(lang => {
            const [code, qualityStr] = lang.trim().split(';');
            const quality = qualityStr ? parseFloat(qualityStr.replace('q=', '')) : 1.0;
            return {
                code: code?.toLowerCase().split('-')[0] || '',
                quality,
            };
        });
        // Sort by quality (highest first)
        languages.sort((a, b) => b.quality - a.quality);
        // Find first supported language
        for (const lang of languages) {
            if (lang.code === 'bg' || lang.code === 'en') {
                return lang.code;
            }
        }
    }
    // Priority 3: Default to Bulgarian for BG market
    return 'bg';
}
/**
 * Get request ID from headers or generate new one
 */
function getRequestId(req) {
    return req.headers['x-request-id'] || (0, uuid_1.v4)();
}
// ============================================
// Error Formatter
// ============================================
/**
 * Format error response with localized messages
 */
function formatErrorResponse(error, language, requestId, context) {
    const errorCode = error.code || 'SERVER_INTERNAL_ERROR';
    const statusCode = error.statusCode || error_codes_1.ErrorHttpStatus[errorCode] || 500;
    const timestamp = new Date().toISOString();
    // Get error message with context
    const errorMessage = (0, errorMessages_1.getErrorMessage)(errorCode, language, {
        ...context,
        ...error.context,
        retryAfter: error.retryAfter,
    });
    // Build documentation URL
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
            documentationUrl,
        },
    };
}
/**
 * Log error with full context
 */
function logError(error, req, requestId, language, response) {
    const errorCode = error.code || 'SERVER_INTERNAL_ERROR';
    const statusCode = error.statusCode || error_codes_1.ErrorHttpStatus[errorCode] || 500;
    errorLogger_1.errorLogger.error(error.message || 'Unknown error', errorCode, {
        userId: req.user?.id,
        requestId,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        method: req.method,
        url: req.url,
        statusCode,
        language,
        context: {
            ...error.context,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            response: process.env.NODE_ENV === 'development' ? response : undefined,
        },
    });
}
// ============================================
// Express Middleware
// ============================================
/**
 * Error formatter middleware for Express
 * Should be added after all routes and before default error handler
 */
function errorFormatterMiddleware(error, req, res, next) {
    // Skip if headers already sent
    if (res.headersSent) {
        return next(error);
    }
    try {
        const language = detectLanguage(req);
        const requestId = getRequestId(req);
        // Format error response
        const errorResponse = formatErrorResponse(error, language, requestId);
        const statusCode = error.statusCode || error_codes_1.ErrorHttpStatus[error.code] || 500;
        // Log error (async, non-blocking)
        setTimeout(() => {
            logError(error, req, requestId, language, errorResponse);
        }, 0);
        // Set response headers
        res.setHeader('X-Request-ID', requestId);
        res.setHeader('Content-Language', language);
        res.setHeader('Content-Type', 'application/json');
        // Add retry-after header if applicable
        if (errorResponse.error.retryAfter) {
            res.setHeader('Retry-After', errorResponse.error.retryAfter.toString());
        }
        // Send error response
        res.status(statusCode).json(errorResponse);
    }
    catch (formatError) {
        // Fallback error response if formatting fails
        console.error('[Error Formatter] Failed to format error:', formatError);
        const fallbackResponse = {
            success: false,
            error: {
                code: 'SERVER_INTERNAL_ERROR',
                message: 'An unexpected error occurred.',
                title: 'Internal Error',
                action: 'Please try again later.',
                timestamp: new Date().toISOString(),
                requestId: (0, uuid_1.v4)(),
                userFriendly: true,
                retryable: true,
                retryAfter: 30,
                documentationUrl: '/docs/errors/SERVER_INTERNAL_ERROR',
            },
        };
        res.status(500).json(fallbackResponse);
    }
}
/**
 * 404 Not Found handler
 * Should be added after all routes
 */
function notFoundMiddleware(req, res, next) {
    const language = detectLanguage(req);
    const requestId = getRequestId(req);
    const notFoundError = {
        name: 'NotFoundError',
        message: `Route ${req.method} ${req.url} not found`,
        code: 'NOTFOUND_RESOURCE',
        statusCode: 404,
    };
    const errorResponse = formatErrorResponse(notFoundError, language, requestId, {
        method: req.method,
        url: req.url,
    });
    // Log 404 (as warning, not error)
    errorLogger_1.errorLogger.warn(notFoundError.message, {
        timestamp: new Date().toISOString(),
        errorCode: 'NOTFOUND_RESOURCE',
        userId: req.user?.id,
        requestId,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        method: req.method,
        url: req.url,
        statusCode: 404,
        language,
    });
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('Content-Language', language);
    res.status(404).json(errorResponse);
}
/**
 * Global error handler wrapper
 * Catches unhandled errors and formats them
 */
function globalErrorHandler() {
    return errorFormatterMiddleware;
}
// ============================================
// Helper Functions
// ============================================
/**
 * Create an AppError with proper formatting
 */
function createAppError(code, message, options) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = options?.statusCode || error_codes_1.ErrorHttpStatus[code] || 500;
    error.context = options?.context;
    error.retryAfter = options?.retryAfter;
    return error;
}
/**
 * Validation error helper
 */
function validationError(field, message, context) {
    return createAppError('VALID_INVALID_FORMAT', message, {
        statusCode: 400,
        context: { field, ...context },
    });
}
/**
 * Authentication error helper
 */
function authError(code, message, context) {
    return createAppError(code, message, {
        statusCode: 401,
        context,
    });
}
/**
 * Permission error helper
 */
function permissionError(code, message, context) {
    return createAppError(code, message, {
        statusCode: 403,
        context,
    });
}
/**
 * Not found error helper
 */
function notFoundError(resource, identifier, context) {
    return createAppError('NOTFOUND_RESOURCE', `${resource} not found`, {
        statusCode: 404,
        context: { resource, identifier, ...context },
    });
}
/**
 * Rate limit error helper
 */
function rateLimitError(code, retryAfter, context) {
    return createAppError(code, 'Rate limit exceeded', {
        statusCode: 429,
        retryAfter,
        context,
    });
}
// ============================================
// Exports
// ============================================
exports.default = {
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
    formatErrorResponse,
};
//# sourceMappingURL=errorFormatter.js.map