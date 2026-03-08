/**
 * Error Message Database
 * US-39: Localized Error-Message Framework
 *
 * Centralized database of all error messages in Bulgarian and English.
 * Provides user-friendly error messages with consistent tone and actionable guidance.
 */
export type SupportedLanguage = 'bg' | 'en';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';
export interface ErrorMessage {
    code: string;
    title: Record<SupportedLanguage, string>;
    description: Record<SupportedLanguage, string>;
    action: Record<SupportedLanguage, string>;
    severity: ErrorSeverity;
    loggable: boolean;
    retryable: boolean;
    retryAfter?: number;
}
export interface ErrorMessageWithContext extends Omit<ErrorMessage, 'title' | 'description' | 'action'> {
    title: string;
    description: string;
    action: string;
}
/**
 * Get error message for a specific error code and language
 */
export declare function getErrorMessage(errorCode: string, language?: SupportedLanguage, context?: Record<string, any>): ErrorMessageWithContext;
/**
 * Format error message with context variables
 */
export declare function formatErrorMessage(template: string, context: Record<string, any>): string;
/**
 * Check if error code exists in database
 */
export declare function isValidErrorCode(code: string): boolean;
/**
 * Get all error codes
 */
export declare function getAllErrorCodes(): string[];
/**
 * Get error severity for monitoring/alerting
 */
export declare function getErrorSeverity(code: string): ErrorSeverity;
/**
 * Check if error is retryable
 */
export declare function isErrorRetryable(code: string): boolean;
declare const _default: {
    ERROR_MESSAGES: Record<string, ErrorMessage>;
    getErrorMessage: typeof getErrorMessage;
    formatErrorMessage: typeof formatErrorMessage;
    isValidErrorCode: typeof isValidErrorCode;
    getAllErrorCodes: typeof getAllErrorCodes;
    getErrorSeverity: typeof getErrorSeverity;
    isErrorRetryable: typeof isErrorRetryable;
};
export default _default;
//# sourceMappingURL=errorMessages.d.ts.map