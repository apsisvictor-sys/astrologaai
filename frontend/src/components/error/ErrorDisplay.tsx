/**
 * Error Display Component
 * US-39: Localized Error-Message Framework
 * 
 * User-friendly error display component that shows localized error messages
 * with consistent styling following the AstroLogAI design system.
 */

import React from 'react';
import styles from './ErrorDisplay.module.css';
import { formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================

export interface ErrorDetails {
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
}

export interface ErrorDisplayProps {
  error: ErrorDetails;
  onRetry?: () => void;
  onDismiss?: () => void;
  language?: 'bg' | 'en';
  compact?: boolean;
  className?: string;
}

// ============================================
// Component
// ============================================

/**
 * ErrorDisplay Component
 * 
 * Displays user-friendly error messages with consistent styling.
 * Supports both Bulgarian and English languages.
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  language = 'bg',
  compact = false,
  className = '',
}: ErrorDisplayProps) {
  // Determine error severity based on code
  const getSeverity = (code: string): 'info' | 'warning' | 'error' | 'fatal' => {
    if (code.startsWith('RATE_')) return 'info';
    if (code.startsWith('VALID_') || code.startsWith('AUTH_')) return 'warning';
    if (code.startsWith('SERVER_') || code.startsWith('DB_') || code.startsWith('API_')) return 'error';
    return 'error';
  };

  const severity = getSeverity(error.code);
  const hasActions = onRetry || onDismiss;

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return formatDateTime(date);
    } catch {
      return timestamp;
    }
  };

  // Get severity icon
  const getSeverityIcon = (): string => {
    switch (severity) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'fatal':
        return '💥';
      default:
        return '❌';
    }
  };

  // Get severity color class
  const getSeverityColorClass = (): string => {
    switch (severity) {
      case 'info':
        return styles.severityInfo;
      case 'warning':
        return styles.severityWarning;
      case 'error':
        return styles.severityError;
      case 'fatal':
        return styles.severityFatal;
      default:
        return styles.severityError;
    }
  };

  // Get action button text
  const getActionText = (type: 'retry' | 'dismiss'): string => {
    if (language === 'bg') {
      return type === 'retry' ? 'Опитайте отново' : 'Затвори';
    }
    return type === 'retry' ? 'Try Again' : 'Dismiss';
  };

  // Get help text
  const getHelpText = (): string => {
    if (language === 'bg') {
      return 'Ако проблемът продължава, моля свържете се с поддръжката.';
    }
    return 'If the problem persists, please contact support.';
  };

  return (
    <div
      className={`${styles.errorContainer} ${getSeverityColorClass()} ${
        compact ? styles.compact : ''
      } ${className}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.severityIcon}>{getSeverityIcon()}</div>
        <div className={styles.titleContainer}>
          <h3 className={styles.title}>{error.title}</h3>
          {!compact && (
            <div className={styles.metadata}>
              <span className={styles.code}>{error.code}</span>
              <span className={styles.timestamp}>
                {formatTimestamp(error.timestamp)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        <p className={styles.message}>{error.message}</p>
        
        {error.action && (
          <div className={styles.actionContainer}>
            <p className={styles.action}>{error.action}</p>
            
            {error.retryAfter && error.retryAfter > 0 && (
              <div className={styles.retryInfo}>
                {language === 'bg' ? (
                  <>Можете да опитате отново след {error.retryAfter} секунди.</>
                ) : (
                  <>You can try again in {error.retryAfter} seconds.</>
                )}
              </div>
            )}
          </div>
        )}

        {/* Technical details (collapsible) */}
        {!compact && (
          <details className={styles.details}>
            <summary className={styles.detailsSummary}>
              {language === 'bg' ? 'Технически детайли' : 'Technical Details'}
            </summary>
            <div className={styles.detailsContent}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>
                  {language === 'bg' ? 'Код на грешката:' : 'Error Code:'}
                </span>
                <code className={styles.detailValue}>{error.code}</code>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>
                  {language === 'bg' ? 'ID на заявката:' : 'Request ID:'}
                </span>
                <code className={styles.detailValue}>{error.requestId}</code>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>
                  {language === 'bg' ? 'Време:' : 'Time:'}
                </span>
                <span className={styles.detailValue}>{error.timestamp}</span>
              </div>
              {error.documentationUrl && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>
                    {language === 'bg' ? 'Документация:' : 'Documentation:'}
                  </span>
                  <a
                    href={error.documentationUrl}
                    className={styles.documentationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {language === 'bg' ? 'Вижте документацията' : 'View documentation'}
                  </a>
                </div>
              )}
            </div>
          </details>
        )}
      </div>

      {/* Footer with actions */}
      {hasActions && (
        <div className={styles.footer}>
          <div className={styles.actions}>
            {onRetry && error.retryable && (
              <button
                type="button"
                onClick={onRetry}
                className={styles.retryButton}
                disabled={error.retryAfter ? error.retryAfter > 0 : false}
              >
                {getActionText('retry')}
                {error.retryAfter && error.retryAfter > 0 && (
                  <span className={styles.retryCountdown}>
                    ({error.retryAfter}s)
                  </span>
                )}
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className={styles.dismissButton}
              >
                {getActionText('dismiss')}
              </button>
            )}
          </div>
          
          {!compact && (
            <div className={styles.helpText}>
              {getHelpText()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

/**
 * LoadingError component for common loading errors
 */
export function LoadingError({
  message,
  onRetry,
  language = 'bg',
}: {
  message?: string;
  onRetry?: () => void;
  language?: 'bg' | 'en';
}) {
  const error: ErrorDetails = {
    code: 'API_EXTERNAL_FAILED',
    title: language === 'bg' ? 'Грешка при зареждане' : 'Loading Error',
    message: message || (language === 'bg' 
      ? 'Неуспешно зареждане на данните. Моля, опитайте отново.'
      : 'Failed to load data. Please try again.'
    ),
    action: language === 'bg'
      ? 'Проверете интернет връзката си и опитайте отново.'
      : 'Check your internet connection and try again.',
    timestamp: new Date().toISOString(),
    requestId: `load_${Date.now()}`,
    userFriendly: true,
    retryable: true,
    retryAfter: null,
    documentationUrl: '/docs/errors/API_EXTERNAL_FAILED',
  };

  return <ErrorDisplay error={error} onRetry={onRetry} language={language} />;
}

/**
 * AuthError component for authentication errors
 */
export function AuthError({
  code = 'AUTH_INVALID_TOKEN',
  onRetry,
  language = 'bg',
}: {
  code?: string;
  onRetry?: () => void;
  language?: 'bg' | 'en';
}) {
  const error: ErrorDetails = {
    code,
    title: language === 'bg' ? 'Грешка при удостоверяване' : 'Authentication Error',
    message: language === 'bg'
      ? 'Има проблем с вашата сесия. Моля, влезте отново.'
      : 'There is an issue with your session. Please log in again.',
    action: language === 'bg'
      ? 'Моля, влезте отново в системата.'
      : 'Please log in again.',
    timestamp: new Date().toISOString(),
    requestId: `auth_${Date.now()}`,
    userFriendly: true,
    retryable: true,
    retryAfter: null,
    documentationUrl: `/docs/errors/${code}`,
  };

  return <ErrorDisplay error={error} onRetry={onRetry} language={language} />;
}

/**
 * ValidationError component for form validation errors
 */
export function ValidationError({
  field,
  message,
  language = 'bg',
}: {
  field?: string;
  message?: string;
  language?: 'bg' | 'en';
}) {
  const error: ErrorDetails = {
    code: 'VALID_INVALID_FORMAT',
    title: language === 'bg' ? 'Грешка при валидация' : 'Validation Error',
    message: message || (language === 'bg'
      ? field
        ? `Полето "${field}" съдържа невалидни данни.`
        : 'Формата съдържа невалидни данни.'
      : field
        ? `The field "${field}" contains invalid data.`
        : 'The form contains invalid data.'
    ),
    action: language === 'bg'
      ? 'Моля, поправете отбелязаните полета и опитайте отново.'
      : 'Please correct the marked fields and try again.',
    timestamp: new Date().toISOString(),
    requestId: `val_${Date.now()}`,
    userFriendly: true,
    retryable: true,
    retryAfter: null,
    documentationUrl: '/docs/errors/VALID_INVALID_FORMAT',
  };

  return <ErrorDisplay error={error} language={language} compact />;
}

/**
 * RateLimitError component for rate limiting errors
 */
export function RateLimitError({
  retryAfter,
  language = 'bg',
}: {
  retryAfter?: number;
  language?: 'bg' | 'en';
}) {
  const error: ErrorDetails = {
    code: 'RATE_BURST_LIMIT_EXCEEDED',
    title: language === 'bg' ? 'Твърде много заявки' : 'Too Many Requests',
    message: language === 'bg'
      ? 'Твърде много заявки за кратко време. Моля, изчакайте.'
      : 'Too many requests in a short time. Please wait.',
    action: language === 'bg'
      ? 'Моля, изчакайте преди следващата заявка.'
      : 'Please wait before your next request.',
    timestamp: new Date().toISOString(),
    requestId: `rate_${Date.now()}`,
    userFriendly: true,
    retryable: true,
    retryAfter: retryAfter || 60,
    documentationUrl: '/docs/errors/RATE_BURST_LIMIT_EXCEEDED',
  };

  return <ErrorDisplay error={error} language={language} />;
}

export default ErrorDisplay;