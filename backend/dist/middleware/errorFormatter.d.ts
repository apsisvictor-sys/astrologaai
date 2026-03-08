/**
 * Error Formatter Middleware
 * US-39: Localized Error-Message Framework
 *
 * Middleware that formats errors with localized messages and consistent structure.
 * Detects user language preference and returns user-friendly error responses.
 */
import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../utils/error-codes';
import { SupportedLanguage } from '../services/errorMessages';
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
/**
 * Detect user's preferred language from request
 * Priority: user preference > Accept-Language header > default (bg)
 */
export declare function detectLanguage(req: Request): SupportedLanguage;
/**
 * Format error response with localized messages
 */
export declare function formatErrorResponse(error: AppError, language: SupportedLanguage, requestId: string, context?: Record<string, any>): ErrorResponse;
/**
 * Error formatter middleware for Express
 * Should be added after all routes and before default error handler
 */
export declare function errorFormatterMiddleware(error: AppError, req: Request, res: Response, next: NextFunction): void;
/**
 * 404 Not Found handler
 * Should be added after all routes
 */
export declare function notFoundMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Global error handler wrapper
 * Catches unhandled errors and formats them
 */
export declare function globalErrorHandler(): (error: AppError, req: Request, res: Response, next: NextFunction) => void;
/**
 * Create an AppError with proper formatting
 */
export declare function createAppError(code: ErrorCode, message?: string, options?: {
    statusCode?: number;
    context?: Record<string, any>;
    retryAfter?: number;
}): AppError;
/**
 * Validation error helper
 */
export declare function validationError(field: string, message: string, context?: Record<string, any>): AppError;
/**
 * Authentication error helper
 */
export declare function authError(code: ErrorCode, message?: string, context?: Record<string, any>): AppError;
/**
 * Permission error helper
 */
export declare function permissionError(code: ErrorCode, message?: string, context?: Record<string, any>): AppError;
/**
 * Not found error helper
 */
export declare function notFoundError(resource: string, identifier: string, context?: Record<string, any>): AppError;
/**
 * Rate limit error helper
 */
export declare function rateLimitError(code: ErrorCode, retryAfter: number, context?: Record<string, any>): AppError;
declare const _default: {
    errorFormatterMiddleware: typeof errorFormatterMiddleware;
    notFoundMiddleware: typeof notFoundMiddleware;
    globalErrorHandler: typeof globalErrorHandler;
    createAppError: typeof createAppError;
    validationError: typeof validationError;
    authError: typeof authError;
    permissionError: typeof permissionError;
    notFoundError: typeof notFoundError;
    rateLimitError: typeof rateLimitError;
    detectLanguage: typeof detectLanguage;
    formatErrorResponse: typeof formatErrorResponse;
};
export default _default;
//# sourceMappingURL=errorFormatter.d.ts.map