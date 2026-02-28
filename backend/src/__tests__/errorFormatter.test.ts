/**
 * Error Formatter Middleware Tests
 * US-39: Localized Error-Message Framework
 */

import { Request, Response, NextFunction } from 'express';
import {
  errorFormatterMiddleware,
  formatErrorResponse,
  detectLanguage,
  createAppError,
  validationError,
  authError,
  notFoundError,
  rateLimitError,
} from '../middleware/errorFormatter';

// Mock Express request/response
const mockRequest = (headers: any = {}, user: any = null) => ({
  headers,
  user,
  ip: '127.0.0.1',
  method: 'GET',
  url: '/api/test',
  get: (name: string) => headers[name.toLowerCase()],
}) as Request;

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockNext = jest.fn() as NextFunction;

describe('Error Formatter Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectLanguage', () => {
    test('should use user language preference first', () => {
      const req = mockRequest({}, { language: 'en' });
      expect(detectLanguage(req)).toBe('en');
    });

    test('should use Accept-Language header when no user preference', () => {
      const req = mockRequest({ 'accept-language': 'bg,en;q=0.9' });
      expect(detectLanguage(req)).toBe('bg');
    });

    test('should default to Bulgarian when no language detected', () => {
      const req = mockRequest({});
      expect(detectLanguage(req)).toBe('bg');
    });

    test('should handle quality values in Accept-Language header', () => {
      const req = mockRequest({ 'accept-language': 'en;q=0.8,bg;q=0.9' });
      expect(detectLanguage(req)).toBe('bg'); // bg has higher quality (0.9)
    });

    test('should handle language variants', () => {
      const req = mockRequest({ 'accept-language': 'en-US,en;q=0.9,bg-BG;q=0.8' });
      expect(detectLanguage(req)).toBe('en'); // en-US -> en
    });
  });

  describe('formatErrorResponse', () => {
    test('should format error response in Bulgarian', () => {
      const error = createAppError('AUTH_INVALID_TOKEN', 'Token is invalid');
      const response = formatErrorResponse(error, 'bg', 'req-123');
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('AUTH_INVALID_TOKEN');
      expect(response.error.title).toBe('Невалиден токен');
      expect(response.error.message).toContain('Вашият входен токен');
      expect(response.error.action).toContain('Моля, влезте отново');
      expect(response.error.requestId).toBe('req-123');
      expect(response.error.userFriendly).toBe(true);
      expect(response.error.retryable).toBe(true);
      expect(response.error.timestamp).toBeTruthy();
      expect(response.error.documentationUrl).toBe('/docs/errors/AUTH_INVALID_TOKEN');
    });

    test('should format error response in English', () => {
      const error = createAppError('AUTH_INVALID_TOKEN', 'Token is invalid');
      const response = formatErrorResponse(error, 'en', 'req-456');
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('AUTH_INVALID_TOKEN');
      expect(response.error.title).toBe('Invalid Token');
      expect(response.error.message).toContain('authentication token');
      expect(response.error.action).toContain('Please log in again');
      expect(response.error.requestId).toBe('req-456');
      expect(response.error.userFriendly).toBe(true);
      expect(response.error.retryable).toBe(true);
    });

    test('should include context variables in error message', () => {
      const error = createAppError('RATE_QUOTA_EXCEEDED', 'Limit reached', {
        context: { limit: 50 },
      });
      const response = formatErrorResponse(error, 'bg', 'req-789', { limit: 50 });
      
      expect(response.error.message).toContain('50');
      expect(response.error.message).toContain('лимита от');
    });

    test('should handle unknown error code with fallback', () => {
      const error = {
        name: 'Error',
        message: 'Unknown error',
        code: 'UNKNOWN_ERROR',
      } as any;
      
      const response = formatErrorResponse(error, 'bg', 'req-999');
      
      expect(response.error.code).toBe('SERVER_INTERNAL_ERROR');
      expect(response.error.title).toBe('Вътрешна грешка в сървъра');
    });
  });

  describe('createAppError', () => {
    test('should create error with code and status', () => {
      const error = createAppError('VALID_REQUIRED_FIELD', 'Field is required', {
        statusCode: 400,
        context: { field: 'email' },
      });
      
      expect(error.code).toBe('VALID_REQUIRED_FIELD');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Field is required');
      expect(error.context).toEqual({ field: 'email' });
    });

    test('should use default status code from error codes', () => {
      const error = createAppError('AUTH_INVALID_TOKEN', 'Invalid token');
      expect(error.statusCode).toBe(401); // From ErrorHttpStatus mapping
    });
  });

  describe('Helper Functions', () => {
    test('validationError should create validation error', () => {
      const error = validationError('email', 'Email is required', { value: '' });
      
      expect(error.code).toBe('VALID_INVALID_FORMAT');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ field: 'email', value: '' });
    });

    test('authError should create authentication error', () => {
      const error = authError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', {
        email: 'test@example.com',
      });
      
      expect(error.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(error.statusCode).toBe(401);
      expect(error.context).toEqual({ email: 'test@example.com' });
    });

    test('notFoundError should create not found error', () => {
      const error = notFoundError('User', 'user-123', { search: 'by-email' });
      
      expect(error.code).toBe('NOTFOUND_RESOURCE');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.context).toEqual({ resource: 'User', identifier: 'user-123', search: 'by-email' });
    });

    test('rateLimitError should create rate limit error', () => {
      const error = rateLimitError('RATE_BURST_LIMIT_EXCEEDED', 60, {
        userId: 'user-123',
        ipAddress: '127.0.0.1',
      });
      
      expect(error.code).toBe('RATE_BURST_LIMIT_EXCEEDED');
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
      expect(error.context).toEqual({ userId: 'user-123', ipAddress: '127.0.0.1' });
    });
  });

  describe('Middleware Integration', () => {
    test('should format and send error response', () => {
      const req = mockRequest({ 'accept-language': 'bg' });
      const res = mockResponse();
      const error = createAppError('VALID_REQUIRED_FIELD', 'Field is required');
      
      errorFormatterMiddleware(error, req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('Content-Language', 'bg');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      
      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALID_REQUIRED_FIELD');
    });

    test('should include retry-after header for retryable errors', () => {
      const req = mockRequest({ 'accept-language': 'en' });
      const res = mockResponse();
      const error = rateLimitError('RATE_BURST_LIMIT_EXCEEDED', 60, {});
      
      errorFormatterMiddleware(error, req, res, mockNext);
      
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    });

    test('should handle headers already sent', () => {
      const req = mockRequest();
      const res = mockResponse();
      res.headersSent = true;
      const error = createAppError('SERVER_INTERNAL_ERROR', 'Internal error');
      
      errorFormatterMiddleware(error, req, res, mockNext);
      
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    test('should provide fallback response on formatting error', () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Mock formatErrorResponse to throw error
      jest.spyOn(require('../middleware/errorFormatter'), 'formatErrorResponse')
        .mockImplementation(() => { throw new Error('Formatting failed'); });
      
      const error = createAppError('SERVER_INTERNAL_ERROR', 'Internal error');
      
      errorFormatterMiddleware(error, req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      
      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.error.code).toBe('SERVER_INTERNAL_ERROR');
      expect(response.error.message).toBe('An unexpected error occurred.');
    });
  });

  describe('Error Response Structure', () => {
    test('should have consistent error response structure', () => {
      const error = createAppError('AUTH_INVALID_TOKEN', 'Token invalid');
      const response = formatErrorResponse(error, 'en', 'test-request');
      
      // Check required fields
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.error).toHaveProperty('title');
      expect(response.error).toHaveProperty('action');
      expect(response.error).toHaveProperty('timestamp');
      expect(response.error).toHaveProperty('requestId');
      expect(response.error).toHaveProperty('userFriendly');
      expect(response.error).toHaveProperty('retryable');
      expect(response.error).toHaveProperty('documentationUrl');
      
      // Check types
      expect(typeof response.error.code).toBe('string');
      expect(typeof response.error.message).toBe('string');
      expect(typeof response.error.title).toBe('string');
      expect(typeof response.error.action).toBe('string');
      expect(typeof response.error.timestamp).toBe('string');
      expect(typeof response.error.requestId).toBe('string');
      expect(typeof response.error.userFriendly).toBe('boolean');
      expect(typeof response.error.retryable).toBe('boolean');
      expect(typeof response.error.documentationUrl).toBe('string');
      
      // Check timestamp format (ISO)
      expect(response.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});