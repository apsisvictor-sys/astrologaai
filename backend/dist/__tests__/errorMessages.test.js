"use strict";
/**
 * Error Messages Service Tests
 * US-39: Localized Error-Message Framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
const errorMessages_1 = require("../services/errorMessages");
describe('Error Messages Service', () => {
    describe('getErrorMessage', () => {
        test('should return Bulgarian message for AUTH_INVALID_TOKEN', () => {
            const message = (0, errorMessages_1.getErrorMessage)('AUTH_INVALID_TOKEN', 'bg');
            expect(message.code).toBe('AUTH_INVALID_TOKEN');
            expect(message.title).toBe('Невалиден токен');
            expect(message.description).toContain('Вашият входен токен');
            expect(message.action).toContain('Моля, влезте отново');
            expect(message.severity).toBe('error');
            expect(message.retryable).toBe(true);
        });
        test('should return English message for AUTH_INVALID_TOKEN', () => {
            const message = (0, errorMessages_1.getErrorMessage)('AUTH_INVALID_TOKEN', 'en');
            expect(message.code).toBe('AUTH_INVALID_TOKEN');
            expect(message.title).toBe('Invalid Token');
            expect(message.description).toContain('authentication token');
            expect(message.action).toContain('Please log in again');
            expect(message.severity).toBe('error');
            expect(message.retryable).toBe(true);
        });
        test('should handle context variables in Bulgarian', () => {
            const message = (0, errorMessages_1.getErrorMessage)('RATE_QUOTA_EXCEEDED', 'bg', { limit: 50 });
            expect(message.description).toContain('50');
            expect(message.description).toContain('лимита от');
        });
        test('should handle context variables in English', () => {
            const message = (0, errorMessages_1.getErrorMessage)('RATE_QUOTA_EXCEEDED', 'en', { limit: 100 });
            expect(message.description).toContain('100');
            expect(message.description).toContain('monthly limit');
        });
        test('should return fallback for unknown error code', () => {
            const message = (0, errorMessages_1.getErrorMessage)('UNKNOWN_ERROR_CODE', 'bg');
            expect(message.code).toBe('SERVER_INTERNAL_ERROR');
            expect(message.title).toBe('Вътрешна грешка в сървъра');
        });
    });
    describe('isValidErrorCode', () => {
        test('should return true for valid error code', () => {
            expect((0, errorMessages_1.isValidErrorCode)('AUTH_INVALID_TOKEN')).toBe(true);
            expect((0, errorMessages_1.isValidErrorCode)('VALID_REQUIRED_FIELD')).toBe(true);
            expect((0, errorMessages_1.isValidErrorCode)('RATE_QUOTA_EXCEEDED')).toBe(true);
        });
        test('should return false for invalid error code', () => {
            expect((0, errorMessages_1.isValidErrorCode)('UNKNOWN_ERROR')).toBe(false);
            expect((0, errorMessages_1.isValidErrorCode)('')).toBe(false);
            expect((0, errorMessages_1.isValidErrorCode)('INVALID')).toBe(false);
        });
    });
    describe('getAllErrorCodes', () => {
        test('should return array of error codes', () => {
            const codes = (0, errorMessages_1.getAllErrorCodes)();
            expect(Array.isArray(codes)).toBe(true);
            expect(codes.length).toBeGreaterThan(0);
            expect(codes).toContain('AUTH_INVALID_TOKEN');
            expect(codes).toContain('VALID_REQUIRED_FIELD');
            expect(codes).toContain('SERVER_INTERNAL_ERROR');
        });
    });
    describe('getErrorSeverity', () => {
        test('should return correct severity for error codes', () => {
            expect((0, errorMessages_1.getErrorSeverity)('AUTH_INVALID_TOKEN')).toBe('error');
            expect((0, errorMessages_1.getErrorSeverity)('RATE_BURST_LIMIT_EXCEEDED')).toBe('info');
            expect((0, errorMessages_1.getErrorSeverity)('VALID_REQUIRED_FIELD')).toBe('warning');
            expect((0, errorMessages_1.getErrorSeverity)('SERVER_INTERNAL_ERROR')).toBe('error');
        });
        test('should return "error" for unknown error code', () => {
            expect((0, errorMessages_1.getErrorSeverity)('UNKNOWN_ERROR')).toBe('error');
        });
    });
    describe('isErrorRetryable', () => {
        test('should return correct retryable status', () => {
            expect((0, errorMessages_1.isErrorRetryable)('AUTH_INVALID_TOKEN')).toBe(true);
            expect((0, errorMessages_1.isErrorRetryable)('RATE_QUOTA_EXCEEDED')).toBe(false);
            expect((0, errorMessages_1.isErrorRetryable)('VALID_REQUIRED_FIELD')).toBe(true);
            expect((0, errorMessages_1.isErrorRetryable)('PERM_ACCESS_DENIED')).toBe(false);
        });
        test('should return false for unknown error code', () => {
            expect((0, errorMessages_1.isErrorRetryable)('UNKNOWN_ERROR')).toBe(false);
        });
    });
    describe('Error Message Coverage', () => {
        test('should have messages for all error categories', () => {
            const codes = (0, errorMessages_1.getAllErrorCodes)();
            // Check authentication errors
            expect(codes.filter(code => code.startsWith('AUTH_')).length).toBeGreaterThan(0);
            // Check validation errors
            expect(codes.filter(code => code.startsWith('VALID_')).length).toBeGreaterThan(0);
            // Check API errors
            expect(codes.filter(code => code.startsWith('API_')).length).toBeGreaterThan(0);
            // Check rate limit errors
            expect(codes.filter(code => code.startsWith('RATE_')).length).toBeGreaterThan(0);
            // Check server errors
            expect(codes.filter(code => code.startsWith('SERVER_')).length).toBeGreaterThan(0);
            // Check database errors
            expect(codes.filter(code => code.startsWith('DB_')).length).toBeGreaterThan(0);
            // Check not found errors
            expect(codes.filter(code => code.startsWith('NOTFOUND_')).length).toBeGreaterThan(0);
            // Check permission errors
            expect(codes.filter(code => code.startsWith('PERM_')).length).toBeGreaterThan(0);
            // Check WebSocket errors
            expect(codes.filter(code => code.startsWith('WS_')).length).toBeGreaterThan(0);
        });
        test('should have both Bulgarian and English translations', () => {
            const codes = (0, errorMessages_1.getAllErrorCodes)();
            for (const code of codes.slice(0, 10)) { // Test first 10 codes
                const bgMessage = (0, errorMessages_1.getErrorMessage)(code, 'bg');
                const enMessage = (0, errorMessages_1.getErrorMessage)(code, 'en');
                expect(bgMessage.title).toBeTruthy();
                expect(bgMessage.description).toBeTruthy();
                expect(bgMessage.action).toBeTruthy();
                expect(enMessage.title).toBeTruthy();
                expect(enMessage.description).toBeTruthy();
                expect(enMessage.action).toBeTruthy();
                // Titles should be different between languages
                expect(bgMessage.title).not.toBe(enMessage.title);
            }
        });
    });
});
//# sourceMappingURL=errorMessages.test.js.map