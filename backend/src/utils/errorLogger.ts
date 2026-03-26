/**
 * Structured Error Logger
 * US-39: Localized Error-Message Framework
 * 
 * Provides structured error logging with context capture for monitoring and debugging.
 * Supports different severity levels and environment-aware logging.
 */

import * as Sentry from '@sentry/node';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Types
// ============================================

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

// ============================================
// Winston Logger Configuration
// ============================================

const { combine, timestamp, json, colorize, printf } = winston.format;

// Console format for development
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// JSON format for production
const jsonFormat = combine(
  timestamp(),
  json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: {
    service: 'astrologaai-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
    }),
    // File transport for errors in production
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: jsonFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 10,
          }),
          new winston.transports.File({
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
function buildLogEntry(
  severity: LogSeverity,
  message: string,
  errorCode?: string,
  options: ErrorLogOptions = {}
): LogEntry {
  const entry: LogEntry = {
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
export function debug(message: string, context?: Record<string, any>): void {
  if (process.env.NODE_ENV !== 'production') {
    const entry = buildLogEntry('debug', message, undefined, { context });
    logger.debug(entry.message, entry);
  }
}

/**
 * Log informational message
 */
export function info(message: string, context?: Record<string, any>): void {
  const entry = buildLogEntry('info', message, undefined, { context });
  logger.info(entry.message, entry);
}

/**
 * Log warning message
 */
export function warn(message: string, context?: Record<string, any>): void {
  const entry = buildLogEntry('warn', message, undefined, { context });
  logger.warn(entry.message, entry);
}

/**
 * Log error with full context
 */
export function error(
  message: string,
  errorCode?: string,
  options: ErrorLogOptions = {}
): void {
  const entry = buildLogEntry('error', message, errorCode, options);
  logger.error(entry.message, entry);
  Sentry.captureMessage(message, 'error');
}

/**
 * Log fatal error (system-critical)
 */
export function fatal(
  message: string,
  errorCode?: string,
  options: ErrorLogOptions = {}
): void {
  const entry = buildLogEntry('fatal', message, errorCode, options);
  logger.error(entry.message, entry); // Winston doesn't have fatal level, use error
  Sentry.captureMessage(message, 'fatal');
}

/**
 * Log HTTP request error
 */
export function httpError(
  errorCode: string,
  message: string,
  options: ErrorLogOptions & {
    method: string;
    url: string;
    statusCode: number;
  }
): void {
  const entry = buildLogEntry('error', message, errorCode, options);
  logger.error(entry.message, entry);
}

/**
 * Log authentication error
 */
export function authError(
  errorCode: string,
  message: string,
  options: ErrorLogOptions & {
    userId?: string;
    ipAddress: string;
    userAgent: string;
  }
): void {
  const entry = buildLogEntry('warn', message, errorCode, options);
  logger.warn(entry.message, entry);
}

/**
 * Log rate limit error
 */
export function rateLimitError(
  errorCode: string,
  message: string,
  options: ErrorLogOptions & {
    userId: string;
    ipAddress: string;
    retryAfter: number;
  }
): void {
  const entry = buildLogEntry('info', message, errorCode, {
    ...options,
    context: { ...options.context, retryAfter: options.retryAfter },
  });
  logger.info(entry.message, entry);
}

/**
 * Log database error
 */
export function databaseError(
  errorCode: string,
  message: string,
  options: ErrorLogOptions & {
    query?: string;
    table?: string;
    operation?: string;
  }
): void {
  const entry = buildLogEntry('error', message, errorCode, options);
  logger.error(entry.message, entry);
}

/**
 * Log WebSocket error
 */
export function websocketError(
  errorCode: string,
  message: string,
  options: ErrorLogOptions & {
    socketId: string;
    eventType?: string;
  }
): void {
  const entry = buildLogEntry('error', message, errorCode, options);
  logger.error(entry.message, entry);
}

/**
 * Log AI service error
 */
export function aiServiceError(
  errorCode: string,
  message: string,
  options: ErrorLogOptions & {
    provider: string;
    model?: string;
    tokensUsed?: number;
  }
): void {
  const entry = buildLogEntry('error', message, errorCode, options);
  logger.error(entry.message, entry);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate request ID for logging correlation
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * Sanitize sensitive data from log context
 */
export function sanitizeContext(context: Record<string, any>): Record<string, any> {
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
export function getLogLevel(): string {
  return logger.level;
}

/**
 * Set log level dynamically
 */
export function setLogLevel(level: string): void {
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
export function initializeMonitoring(): void {
  if (process.env.NODE_ENV === 'production') {
    info('Error monitoring initialized', {
      service: 'error-monitoring',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Capture exception for monitoring
 */
export function captureException(
  error: Error,
  context?: Record<string, any>
): void {
  const errorId = uuidv4();
  
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
  
  Sentry.captureException(error, { extra: { errorId, ...context } });
}

// ============================================
// Exports
// ============================================

export const errorLogger = {
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

export default errorLogger;