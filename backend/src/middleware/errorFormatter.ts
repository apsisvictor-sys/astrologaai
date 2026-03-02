/**
 * Error Formatter Middleware
 * US-39: Localized Error-Message Framework
 * 
 * Middleware that formats errors with localized messages and consistent structure.
 * Detects user language preference and returns user-friendly error responses.
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorCode, ErrorHttpStatus } from '../utils/error-codes';
import { getErrorMessage, formatErrorMessage, SupportedLanguage } from '../services/errorMessages';
import { v4 as uuidv4 } from 'uuid';
import { errorLogger } from '../utils/errorLogger';

// ============================================
// Types
// ============================================

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    title: string;
    action: string;
    timestamp: string;
    requestId: string;
    userFriendly: boolean;
    retryable: boolean;
    retryAfter: number | null;
    documentationUrl: string;
  };
}

export interface AppError extends Error {
  code?: ErrorCode | string;
  statusCode?: number;
  context?: Record<string, any>;
  retryAfter?: number;
}

// ============================================
// Language Detection
// ============================================

/**
 * Detect user's preferred language from request
 * Priority: user preference > Accept-Language header > default (bg)
 */
export function detectLanguage(req: Request): SupportedLanguage {
  // Priority 1: User's stored language preference
  if (req.user?.language) {
    const userLang = req.user.language.toLowerCase();
    if (userLang === 'bg' || userLang === 'en') {
      return userLang as SupportedLanguage;
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
        return lang.code as SupportedLanguage;
      }
    }
  }
  
  // Priority 3: Default to Bulgarian for BG market
  return 'bg';
}

/**
 * Get request ID from headers or generate new one
 */
function getRequestId(req: Request): string {
  return (req.headers['x-request-id'] as string) || uuidv4();
}

// ============================================
// Error Formatter
// ============================================

/**
 * Format error response with localized messages
 */
export function formatErrorResponse(
  error: AppError,
  language: SupportedLanguage,
  requestId: string,
  context?: Record<string, any>
): ErrorResponse {
  const errorCode = error.code as ErrorCode || 'SERVER_INTERNAL_ERROR';
  const statusCode = error.statusCode || ErrorHttpStatus[errorCode] || 500;
  const timestamp = new Date().toISOString();
  
  // Get error message with context
  const errorMessage = getErrorMessage(errorCode, language, {
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
function logError(
  error: AppError,
  req: Request,
  requestId: string,
  language: SupportedLanguage,
  response: ErrorResponse
): void {
  const errorCode = error.code as ErrorCode || 'SERVER_INTERNAL_ERROR';
  const statusCode = error.statusCode || ErrorHttpStatus[errorCode] || 500;
  
  errorLogger.error(
    error.message || 'Unknown error',
    errorCode,
    {
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
    }
  );
}

// ============================================
// Express Middleware
// ============================================

/**
 * Error formatter middleware for Express
 * Should be added after all routes and before default error handler
 */
export function errorFormatterMiddleware(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip if headers already sent
  if (res.headersSent) {
    return next(error);
  }
  
  try {
    const language = detectLanguage(req);
    const requestId = getRequestId(req);
    
    // Format error response
    const errorResponse = formatErrorResponse(error, language, requestId);
    const statusCode = error.statusCode || ErrorHttpStatus[error.code as ErrorCode] || 500;
    
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
  } catch (formatError) {
    // Fallback error response if formatting fails
    console.error('[Error Formatter] Failed to format error:', formatError);
    
    const fallbackResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'SERVER_INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        title: 'Internal Error',
        action: 'Please try again later.',
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
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
export function notFoundMiddleware(req: Request, res: Response, next: NextFunction): void {
  const language = detectLanguage(req);
  const requestId = getRequestId(req);
  
  const notFoundError: AppError = {
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
  errorLogger.warn(
    notFoundError.message,
    {
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
    }
  );
  
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('Content-Language', language);
  res.status(404).json(errorResponse);
}

/**
 * Global error handler wrapper
 * Catches unhandled errors and formats them
 */
export function globalErrorHandler(): (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return errorFormatterMiddleware;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create an AppError with proper formatting
 */
export function createAppError(
  code: ErrorCode,
  message?: string,
  options?: {
    statusCode?: number;
    context?: Record<string, any>;
    retryAfter?: number;
  }
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = options?.statusCode || ErrorHttpStatus[code] || 500;
  error.context = options?.context;
  error.retryAfter = options?.retryAfter;
  return error;
}

/**
 * Validation error helper
 */
export function validationError(
  field: string,
  message: string,
  context?: Record<string, any>
): AppError {
  return createAppError('VALID_INVALID_FORMAT', message, {
    statusCode: 400,
    context: { field, ...context },
  });
}

/**
 * Authentication error helper
 */
export function authError(
  code: ErrorCode,
  message?: string,
  context?: Record<string, any>
): AppError {
  return createAppError(code, message, {
    statusCode: 401,
    context,
  });
}

/**
 * Permission error helper
 */
export function permissionError(
  code: ErrorCode,
  message?: string,
  context?: Record<string, any>
): AppError {
  return createAppError(code, message, {
    statusCode: 403,
    context,
  });
}

/**
 * Not found error helper
 */
export function notFoundError(
  resource: string,
  identifier: string,
  context?: Record<string, any>
): AppError {
  return createAppError('NOTFOUND_RESOURCE', `${resource} not found`, {
    statusCode: 404,
    context: { resource, identifier, ...context },
  });
}

/**
 * Rate limit error helper
 */
export function rateLimitError(
  code: ErrorCode,
  retryAfter: number,
  context?: Record<string, any>
): AppError {
  return createAppError(code, 'Rate limit exceeded', {
    statusCode: 429,
    retryAfter,
    context,
  });
}

// ============================================
// Exports
// ============================================

export default {
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