"use strict";
/**
 * Error Logger Tests
 * US-39: Localized Error-Message Framework
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const errorLogger_1 = require("../utils/errorLogger");
// Mock winston logger
jest.mock('winston', () => {
    const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        level: 'info',
        transports: [],
        defaultMeta: {},
    };
    return {
        createLogger: jest.fn(() => mockLogger),
        format: {
            combine: jest.fn(),
            timestamp: jest.fn(),
            json: jest.fn(),
            colorize: jest.fn(),
            printf: jest.fn(),
        },
        transports: {
            Console: jest.fn(),
            File: jest.fn(),
        },
    };
});
describe('Error Logger', () => {
    let mockWinstonLogger;
    beforeEach(() => {
        jest.clearAllMocks();
        mockWinstonLogger = winston_1.default.createLogger();
    });
    describe('Basic Logging Functions', () => {
        test('debug should log in development only', () => {
            const originalEnv = process.env.NODE_ENV;
            // Test in development
            process.env.NODE_ENV = 'development';
            errorLogger_1.errorLogger.debug('Debug message', { test: 'data' });
            expect(mockWinstonLogger.debug).toHaveBeenCalled();
            // Reset mock
            mockWinstonLogger.debug.mockClear();
            // Test in production
            process.env.NODE_ENV = 'production';
            errorLogger_1.errorLogger.debug('Debug message', { test: 'data' });
            expect(mockWinstonLogger.debug).not.toHaveBeenCalled();
            process.env.NODE_ENV = originalEnv;
        });
        test('info should log informational message', () => {
            errorLogger_1.errorLogger.info('Info message', { context: 'data' });
            expect(mockWinstonLogger.info).toHaveBeenCalledWith('Info message', expect.objectContaining({
                severity: 'info',
                message: 'Info message',
                context: { context: 'data' },
            }));
        });
        test('warn should log warning message', () => {
            errorLogger_1.errorLogger.warn('Warning message', { issue: 'minor' });
            expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Warning message', expect.objectContaining({
                severity: 'warn',
                message: 'Warning message',
                context: { issue: 'minor' },
            }));
        });
        test('error should log error with code and context', () => {
            errorLogger_1.errorLogger.error('Error occurred', 'AUTH_INVALID_TOKEN', {
                userId: 'user-123',
                requestId: 'req-456',
                ipAddress: '127.0.0.1',
            });
            expect(mockWinstonLogger.error).toHaveBeenCalledWith('Error occurred', expect.objectContaining({
                severity: 'error',
                errorCode: 'AUTH_INVALID_TOKEN',
                message: 'Error occurred',
                userId: 'user-123',
                requestId: 'req-456',
                ipAddress: '127.0.0.1',
            }));
        });
        test('fatal should log fatal error', () => {
            errorLogger_1.errorLogger.fatal('System crash', 'SERVER_INTERNAL_ERROR');
            expect(mockWinstonLogger.error).toHaveBeenCalledWith('System crash', expect.objectContaining({
                severity: 'fatal',
                errorCode: 'SERVER_INTERNAL_ERROR',
                message: 'System crash',
                context: { component: 'database', reason: 'connection lost' },
            }));
        });
    });
    describe('Specialized Logging Functions', () => {
        test('httpError should log HTTP error with context', () => {
            errorLogger_1.errorLogger.httpError('VALID_REQUIRED_FIELD', 'Validation failed', {
                method: 'POST',
                url: '/api/auth/register',
                statusCode: 400,
                userId: 'user-123',
                requestId: 'req-789',
                userAgent: 'TestAgent',
                ipAddress: '192.168.1.1',
            });
            expect(mockWinstonLogger.error).toHaveBeenCalledWith('Validation failed', expect.objectContaining({
                severity: 'error',
                errorCode: 'VALID_REQUIRED_FIELD',
                message: 'Validation failed',
                method: 'POST',
                url: '/api/auth/register',
                statusCode: 400,
                userId: 'user-123',
                requestId: 'req-789',
                userAgent: 'TestAgent',
                ipAddress: '192.168.1.1',
            }));
        });
        test('authError should log authentication error', () => {
            errorLogger_1.errorLogger.authError('AUTH_INVALID_CREDENTIALS', 'Invalid login attempt', {
                userId: 'user-123',
                ipAddress: '10.0.0.1',
                userAgent: 'Mozilla/5.0',
            });
            expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Invalid login attempt', expect.objectContaining({
                severity: 'warn',
                errorCode: 'AUTH_INVALID_CREDENTIALS',
                message: 'Invalid login attempt',
                userId: 'user-123',
                ipAddress: '10.0.0.1',
                userAgent: 'Mozilla/5.0',
                context: { email: 'test@example.com' },
            }));
        });
        test('rateLimitError should log rate limit info', () => {
            errorLogger_1.errorLogger.rateLimitError('RATE_BURST_LIMIT_EXCEEDED', 'Too many requests', {
                userId: 'user-123',
                ipAddress: '192.168.1.100',
                retryAfter: 60,
            });
            expect(mockWinstonLogger.info).toHaveBeenCalledWith('Too many requests', expect.objectContaining({
                severity: 'info',
                errorCode: 'RATE_BURST_LIMIT_EXCEEDED',
                message: 'Too many requests',
                userId: 'user-123',
                ipAddress: '192.168.1.100',
                context: { retryAfter: 60, endpoint: '/api/chat' },
            }));
        });
        test('databaseError should log database error', () => {
            errorLogger_1.errorLogger.databaseError('DB_CONNECTION_FAILED', 'Database connection lost', {
                query: 'SELECT * FROM users',
                table: 'users',
                operation: 'read',
            });
            expect(mockWinstonLogger.error).toHaveBeenCalledWith('Database connection lost', expect.objectContaining({
                severity: 'error',
                errorCode: 'DB_CONNECTION_FAILED',
                message: 'Database connection lost',
                context: {
                    query: 'SELECT * FROM users',
                    table: 'users',
                    operation: 'read',
                    error: 'Connection timeout',
                },
            }));
        });
        test('websocketError should log WebSocket error', () => {
            errorLogger_1.errorLogger.websocketError('WS_CONNECTION_FAILED', 'WebSocket disconnected', {
                socketId: 'ws-abc123',
                eventType: 'disconnect',
                userId: 'user-456',
            });
            expect(mockWinstonLogger.error).toHaveBeenCalledWith('WebSocket disconnected', expect.objectContaining({
                severity: 'error',
                errorCode: 'WS_CONNECTION_FAILED',
                message: 'WebSocket disconnected',
                context: {
                    socketId: 'ws-abc123',
                    eventType: 'disconnect',
                    userId: 'user-456',
                    reason: 'heartbeat timeout',
                },
            }));
        });
        test('aiServiceError should log AI service error', () => {
            errorLogger_1.errorLogger.aiServiceError('API_AI_SERVICE_UNAVAILABLE', 'AI service down', {
                provider: 'openai',
                model: 'gpt-4',
                tokensUsed: 1500,
                requestId: 'ai-req-123',
            });
            expect(mockWinstonLogger.error).toHaveBeenCalledWith('AI service down', expect.objectContaining({
                severity: 'error',
                errorCode: 'API_AI_SERVICE_UNAVAILABLE',
                message: 'AI service down',
                context: {
                    provider: 'openai',
                    model: 'gpt-4',
                    tokensUsed: 1500,
                    requestId: 'ai-req-123',
                },
            }));
        });
    });
    describe('Helper Functions', () => {
        describe('sanitizeContext', () => {
            test('should redact sensitive fields', () => {
                const context = {
                    password: 'secret123',
                    token: 'jwt-token-abc',
                    accessToken: 'access-123',
                    refreshToken: 'refresh-456',
                    apiKey: 'api-key-789',
                    creditCard: '4111111111111111',
                    ssn: '123-45-6789',
                    personalId: '1234567890',
                    safeField: 'safe-value',
                    nested: {
                        password: 'nested-secret',
                        safe: 'nested-safe',
                    },
                };
                const sanitized = (0, errorLogger_1.sanitizeContext)(context);
                expect(sanitized.password).toBe('[REDACTED]');
                expect(sanitized.token).toBe('[REDACTED]');
                expect(sanitized.accessToken).toBe('[REDACTED]');
                expect(sanitized.refreshToken).toBe('[REDACTED]');
                expect(sanitized.apiKey).toBe('[REDACTED]');
                expect(sanitized.creditCard).toBe('[REDACTED]');
                expect(sanitized.ssn).toBe('[REDACTED]');
                expect(sanitized.personalId).toBe('[REDACTED]');
                expect(sanitized.safeField).toBe('safe-value');
                expect(sanitized.nested.password).toBe('[REDACTED]');
                expect(sanitized.nested.safe).toBe('nested-safe');
            });
            test('should handle empty context', () => {
                expect((0, errorLogger_1.sanitizeContext)({})).toEqual({});
                expect((0, errorLogger_1.sanitizeContext)(null)).toEqual({});
                expect((0, errorLogger_1.sanitizeContext)(undefined)).toEqual({});
            });
        });
        describe('generateRequestId', () => {
            test('should generate unique request IDs', () => {
                const id1 = (0, errorLogger_1.generateRequestId)();
                const id2 = (0, errorLogger_1.generateRequestId)();
                expect(typeof id1).toBe('string');
                expect(id1).toMatch(/^[0-9a-f-]{36}$/); // UUID format
                expect(id1).not.toBe(id2);
            });
        });
        describe('Log Level Management', () => {
            test('should get current log level', () => {
                mockWinstonLogger.level = 'debug';
                expect(errorLogger_1.errorLogger.getLogLevel()).toBe('debug');
                mockWinstonLogger.level = 'error';
                expect(errorLogger_1.errorLogger.getLogLevel()).toBe('error');
            });
            test('should set log level', () => {
                errorLogger_1.errorLogger.setLogLevel('warn');
                expect(mockWinstonLogger.level).toBe('warn');
                expect(mockWinstonLogger.transports.forEach).toBeDefined();
                // Note: We can't easily test transport level setting due to mock
            });
        });
    });
    describe('Error Monitoring', () => {
        test('captureException should log error with context', () => {
            const error = new Error('Test error');
            error.stack = 'Error: Test error\n    at test.js:1:1';
            errorLogger_1.errorLogger.captureException(error, {
                userId: 'user-123',
                action: 'test-action',
            });
            expect(mockWinstonLogger.error).toHaveBeenCalledWith('Test error', expect.objectContaining({
                severity: 'error',
                message: 'Test error',
                context: expect.objectContaining({
                    errorId: expect.any(String),
                    errorName: 'Error',
                    stackTrace: error.stack,
                    userId: 'user-123',
                    action: 'test-action',
                }),
            }));
        });
        test('initializeMonitoring should log initialization', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            errorLogger_1.errorLogger.initializeMonitoring();
            expect(mockWinstonLogger.info).toHaveBeenCalledWith('Error monitoring initialized', expect.objectContaining({
                severity: 'info',
                message: 'Error monitoring initialized',
                context: {
                    service: 'error-monitoring',
                    timestamp: expect.any(String),
                },
            }));
            process.env.NODE_ENV = originalEnv;
        });
    });
    describe('Log Entry Structure', () => {
        test('should create structured log entries', () => {
            errorLogger_1.errorLogger.info('Test log', {
                customField: 'value',
                numberField: 123,
                boolField: true,
                nullField: null,
                arrayField: [1, 2, 3],
            });
            const logEntry = mockWinstonLogger.info.mock.calls[0][1];
            // Check required fields
            expect(logEntry).toHaveProperty('timestamp');
            expect(logEntry).toHaveProperty('severity', 'info');
            expect(logEntry).toHaveProperty('message', 'Test log');
            expect(logEntry).toHaveProperty('context');
            // Check timestamp format
            expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            // Check context
            expect(logEntry.context).toEqual({
                customField: 'value',
                numberField: 123,
                boolField: true,
                nullField: null,
                arrayField: [1, 2, 3],
            });
        });
        test('should include error code when provided', () => {
            errorLogger_1.errorLogger.error('Error message', 'SERVER_INTERNAL_ERROR');
            const logEntry = mockWinstonLogger.error.mock.calls[0][1];
            expect(logEntry).toHaveProperty('errorCode', 'SERVER_INTERNAL_ERROR');
        });
        test('should include user context when provided', () => {
            errorLogger_1.errorLogger.warn('Warning', {
                userId: 'user-123',
                requestId: 'req-456',
                sessionId: 'session-789',
                userAgent: 'TestAgent/1.0',
                ipAddress: '10.0.0.1',
                method: 'POST',
                url: '/api/test',
                statusCode: 400,
                language: 'bg',
                stackTrace: 'stack trace here',
            });
            const logEntry = mockWinstonLogger.warn.mock.calls[0][1];
            expect(logEntry.userId).toBe('user-123');
            expect(logEntry.requestId).toBe('req-456');
            expect(logEntry.sessionId).toBe('session-789');
            expect(logEntry.userAgent).toBe('TestAgent/1.0');
            expect(logEntry.ipAddress).toBe('10.0.0.1');
            expect(logEntry.method).toBe('POST');
            expect(logEntry.url).toBe('/api/test');
            expect(logEntry.statusCode).toBe(400);
            expect(logEntry.language).toBe('bg');
            expect(logEntry.stackTrace).toBe('stack trace here');
        });
    });
});
//# sourceMappingURL=errorLogger.test.js.map