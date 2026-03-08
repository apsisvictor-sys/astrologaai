"use strict";
/**
 * Error Message Database
 * US-39: Localized Error-Message Framework
 *
 * Centralized database of all error messages in Bulgarian and English.
 * Provides user-friendly error messages with consistent tone and actionable guidance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = getErrorMessage;
exports.formatErrorMessage = formatErrorMessage;
exports.isValidErrorCode = isValidErrorCode;
exports.getAllErrorCodes = getAllErrorCodes;
exports.getErrorSeverity = getErrorSeverity;
exports.isErrorRetryable = isErrorRetryable;
// ============================================
// Error Message Database
// ============================================
const ERROR_MESSAGES = {
    // ====================
    // Authentication Errors
    // ====================
    AUTH_INVALID_TOKEN: {
        code: 'AUTH_INVALID_TOKEN',
        title: {
            bg: 'Невалиден токен',
            en: 'Invalid Token'
        },
        description: {
            bg: 'Вашият входен токен е невалиден или изтекъл.',
            en: 'Your authentication token is invalid or has expired.'
        },
        action: {
            bg: 'Моля, влезте отново в системата.',
            en: 'Please log in again.'
        },
        severity: 'error',
        loggable: true,
        retryable: true,
    },
    AUTH_EXPIRED_TOKEN: {
        code: 'AUTH_EXPIRED_TOKEN',
        title: {
            bg: 'Изтекъл токен',
            en: 'Expired Token'
        },
        description: {
            bg: 'Вашият входен токен е изтекъл.',
            en: 'Your authentication token has expired.'
        },
        action: {
            bg: 'Моля, влезте отново в системата.',
            en: 'Please log in again.'
        },
        severity: 'warning',
        loggable: true,
        retryable: true,
    },
    AUTH_MISSING_TOKEN: {
        code: 'AUTH_MISSING_TOKEN',
        title: {
            bg: 'Липсващ токен',
            en: 'Missing Token'
        },
        description: {
            bg: 'Не сте влезли в системата или вашият входен токен липсва.',
            en: 'You are not logged in or your authentication token is missing.'
        },
        action: {
            bg: 'Моля, влезте в системата, за да продължите.',
            en: 'Please log in to continue.'
        },
        severity: 'warning',
        loggable: true,
        retryable: true,
    },
    AUTH_INVALID_CREDENTIALS: {
        code: 'AUTH_INVALID_CREDENTIALS',
        title: {
            bg: 'Невалидни данни за вход',
            en: 'Invalid Credentials'
        },
        description: {
            bg: 'Имейлът или паролата, които въведохте, са неправилни.',
            en: 'The email or password you entered is incorrect.'
        },
        action: {
            bg: 'Моля, проверете вашите данни за вход и опитайте отново.',
            en: 'Please check your login details and try again.'
        },
        severity: 'warning',
        loggable: true,
        retryable: true,
    },
    AUTH_USER_NOT_FOUND: {
        code: 'AUTH_USER_NOT_FOUND',
        title: {
            bg: 'Потребител не е намерен',
            en: 'User Not Found'
        },
        description: {
            bg: 'Не съществува потребител с този имейл адрес.',
            en: 'No user exists with this email address.'
        },
        action: {
            bg: 'Моля, регистрирайте се или проверете имейл адреса.',
            en: 'Please sign up or check the email address.'
        },
        severity: 'warning',
        loggable: true,
        retryable: true,
    },
    AUTH_EMAIL_NOT_VERIFIED: {
        code: 'AUTH_EMAIL_NOT_VERIFIED',
        title: {
            bg: 'Имейлът не е потвърден',
            en: 'Email Not Verified'
        },
        description: {
            bg: 'Трябва да потвърдите имейл адреса си, преди да влезете.',
            en: 'You need to verify your email address before logging in.'
        },
        action: {
            bg: 'Моля, проверете имейла си за линк за потвърждение.',
            en: 'Please check your email for a verification link.'
        },
        severity: 'warning',
        loggable: true,
        retryable: true,
    },
    // ====================
    // Validation Errors
    // ====================
    VALID_REQUIRED_FIELD: {
        code: 'VALID_REQUIRED_FIELD',
        title: {
            bg: 'Задължително поле',
            en: 'Required Field'
        },
        description: {
            bg: 'Полето "{field}" е задължително.',
            en: 'The field "{field}" is required.'
        },
        action: {
            bg: 'Моля, попълнете задължителното поле и опитайте отново.',
            en: 'Please fill in the required field and try again.'
        },
        severity: 'warning',
        loggable: false,
        retryable: true,
    },
    VALID_INVALID_EMAIL: {
        code: 'VALID_INVALID_EMAIL',
        title: {
            bg: 'Невалиден имейл',
            en: 'Invalid Email'
        },
        description: {
            bg: 'Имейл адресът "{email}" не е валиден.',
            en: 'The email address "{email}" is not valid.'
        },
        action: {
            bg: 'Моля, въведете валиден имейл адрес.',
            en: 'Please enter a valid email address.'
        },
        severity: 'warning',
        loggable: false,
        retryable: true,
    },
    VALID_INVALID_DATE: {
        code: 'VALID_INVALID_DATE',
        title: {
            bg: 'Невалидна дата',
            en: 'Invalid Date'
        },
        description: {
            bg: 'Датата "{date}" не е валидна.',
            en: 'The date "{date}" is not valid.'
        },
        action: {
            bg: 'Моля, въведете валидна дата във формат ГГГГ-ММ-ДД.',
            en: 'Please enter a valid date in YYYY-MM-DD format.'
        },
        severity: 'warning',
        loggable: false,
        retryable: true,
    },
    VALID_MIN_LENGTH: {
        code: 'VALID_MIN_LENGTH',
        title: {
            bg: 'Твърде кратък текст',
            en: 'Text Too Short'
        },
        description: {
            bg: 'Полето "{field}" трябва да съдържа поне {min} символа.',
            en: 'The field "{field}" must contain at least {min} characters.'
        },
        action: {
            bg: 'Моля, въведете по-дълъг текст и опитайте отново.',
            en: 'Please enter a longer text and try again.'
        },
        severity: 'warning',
        loggable: false,
        retryable: true,
    },
    VALID_MAX_LENGTH: {
        code: 'VALID_MAX_LENGTH',
        title: {
            bg: 'Твърде дълъг текст',
            en: 'Text Too Long'
        },
        description: {
            bg: 'Полето "{field}" не може да надвишава {max} символа.',
            en: 'The field "{field}" cannot exceed {max} characters.'
        },
        action: {
            bg: 'Моля, съкратете текста и опитайте отново.',
            en: 'Please shorten the text and try again.'
        },
        severity: 'warning',
        loggable: false,
        retryable: true,
    },
    // ====================
    // API Errors
    // ====================
    API_EXTERNAL_FAILED: {
        code: 'API_EXTERNAL_FAILED',
        title: {
            bg: 'Външна услуга е недостъпна',
            en: 'External Service Unavailable'
        },
        description: {
            bg: 'Външната услуга, която използваме, е временно недостъпна.',
            en: 'The external service we use is temporarily unavailable.'
        },
        action: {
            bg: 'Моля, опитайте отново след няколко минути.',
            en: 'Please try again in a few minutes.'
        },
        severity: 'error',
        loggable: true,
        retryable: true,
        retryAfter: 60,
    },
    API_AI_SERVICE_UNAVAILABLE: {
        code: 'API_AI_SERVICE_UNAVAILABLE',
        title: {
            bg: 'AI услугата е недостъпна',
            en: 'AI Service Unavailable'
        },
        description: {
            bg: 'AI услугата, която генерира астрологични анализи, е временно недостъпна.',
            en: 'The AI service that generates astrological analyses is temporarily unavailable.'
        },
        action: {
            bg: 'Моля, опитайте отново след няколко минути.',
            en: 'Please try again in a few minutes.'
        },
        severity: 'error',
        loggable: true,
        retryable: true,
        retryAfter: 30,
    },
    API_AI_QUOTA_EXCEEDED: {
        code: 'API_AI_QUOTA_EXCEEDED',
        title: {
            bg: 'Достигнат лимит на AI заявки',
            en: 'AI Query Limit Reached'
        },
        description: {
            bg: 'Достигнахте лимита на AI заявки за вашия акаунт.',
            en: 'You have reached the AI query limit for your account.'
        },
        action: {
            bg: 'Моля, изчакайте до утре или надградете до Pro за неограничени заявки.',
            en: 'Please wait until tomorrow or upgrade to Pro for unlimited queries.'
        },
        severity: 'warning',
        loggable: true,
        retryable: true,
        retryAfter: 86400, // 24 hours
    },
    // ====================
    // Rate Limit Errors
    // ====================
    RATE_QUOTA_EXCEEDED: {
        code: 'RATE_QUOTA_EXCEEDED',
        title: {
            bg: 'Достигнат месечен лимит',
            en: 'Monthly Limit Reached'
        },
        description: {
            bg: 'Достигнахте лимита от {limit} въпроса за този месец.',
            en: 'You\'ve reached your monthly limit of {limit} queries.'
        },
        action: {
            bg: 'Надградете до Pro за неограничени въпроси или изчакайте до следващия месец.',
            en: 'Upgrade to Pro for unlimited queries or wait until next month.'
        },
        severity: 'warning',
        loggable: true,
        retryable: false,
    },
    RATE_BURST_LIMIT_EXCEEDED: {
        code: 'RATE_BURST_LIMIT_EXCEEDED',
        title: {
            bg: 'Твърде много заявки',
            en: 'Too Many Requests'
        },
        description: {
            bg: 'Твърде много заявки за кратко време. Моля, изчакайте малко преди да продължите.',
            en: 'Too many requests in a short time. Please wait a moment before continuing.'
        },
        action: {
            bg: 'Моля, изчакайте {retryAfter} секунди преди следващата заявка.',
            en: 'Please wait {retryAfter} seconds before your next request.'
        },
        severity: 'info',
        loggable: true,
        retryable: true,
        retryAfter: 60,
    },
    // ====================
    // Server Errors
    // ====================
    SERVER_INTERNAL_ERROR: {
        code: 'SERVER_INTERNAL_ERROR',
        title: {
            bg: 'Вътрешна грешка в сървъра',
            en: 'Internal Server Error'
        },
        description: {
            bg: 'Възникна неочаквана грешка в сървъра.',
            en: 'An unexpected error occurred on the server.'
        },
        action: {
            bg: 'Моля, опитайте отново след няколко минути. Ако проблемът продължава, свържете се с поддръжката.',
            en: 'Please try again in a few minutes. If the problem persists, contact support.'
        },
        severity: 'error',
        loggable: true,
        retryable: true,
        retryAfter: 30,
    },
    SERVER_SERVICE_UNAVAILABLE: {
        code: 'SERVER_SERVICE_UNAVAILABLE',
        title: {
            bg: 'Услугата е временно недостъпна',
            en: 'Service Temporarily Unavailable'
        },
        description: {
            bg: 'Услугата е временно недостъпна поради поддръжка или технически проблеми.',
            en: 'The service is temporarily unavailable due to maintenance or technical issues.'
        },
        action: {
            bg: 'Моля, опитайте отново след няколко минути.',
            en: 'Please try again in a few minutes.'
        },
        severity: 'error',
        loggable: true,
        retryable: true,
        retryAfter: 300,
    },
    // ====================
    // Database Errors
    // ====================
    DB_CONNECTION_FAILED: {
        code: 'DB_CONNECTION_FAILED',
        title: {
            bg: 'Грешка при връзка с базата данни',
            en: 'Database Connection Failed'
        },
        description: {
            bg: 'Неуспешна връзка с базата данни.',
            en: 'Failed to connect to the database.'
        },
        action: {
            bg: 'Моля, опитайте отново след няколко минути.',
            en: 'Please try again in a few minutes.'
        },
        severity: 'error',
        loggable: true,
        retryable: true,
        retryAfter: 30,
    },
    DB_RECORD_NOT_FOUND: {
        code: 'DB_RECORD_NOT_FOUND',
        title: {
            bg: 'Запис не е намерен',
            en: 'Record Not Found'
        },
        description: {
            bg: 'Записът, който търсите, не е намерен в базата данни.',
            en: 'The record you\'re looking for was not found in the database.'
        },
        action: {
            bg: 'Моля, проверете идентификатора и опитайте отново.',
            en: 'Please check the identifier and try again.'
        },
        severity: 'warning',
        loggable: true,
        retryable: false,
    },
    // ====================
    // Not Found Errors
    // ====================
    NOTFOUND_USER: {
        code: 'NOTFOUND_USER',
        title: {
            bg: 'Потребител не е намерен',
            en: 'User Not Found'
        },
        description: {
            bg: 'Потребителят с ID "{userId}" не е намерен.',
            en: 'The user with ID "{userId}" was not found.'
        },
        action: {
            bg: 'Моля, проверете идентификатора на потребителя.',
            en: 'Please check the user identifier.'
        },
        severity: 'warning',
        loggable: true,
        retryable: false,
    },
    NOTFOUND_CHART: {
        code: 'NOTFOUND_CHART',
        title: {
            bg: 'Натална карта не е намерена',
            en: 'Natal Chart Not Found'
        },
        description: {
            bg: 'Наталната карта, която търсите, не е намерена.',
            en: 'The natal chart you\'re looking for was not found.'
        },
        action: {
            bg: 'Моля, генерирайте натална карта първо или проверете идентификатора.',
            en: 'Please generate a natal chart first or check the identifier.'
        },
        severity: 'warning',
        loggable: true,
        retryable: false,
    },
    NOTFOUND_CONVERSATION: {
        code: 'NOTFOUND_CONVERSATION',
        title: {
            bg: 'Разговор не е намерен',
            en: 'Conversation Not Found'
        },
        description: {
            bg: 'Разговорът, който търсите, не е намерен.',
            en: 'The conversation you\'re looking for was not found.'
        },
        action: {
            bg: 'Моля, проверете идентификатора на разговора или започнете нов разговор.',
            en: 'Please check the conversation identifier or start a new conversation.'
        },
        severity: 'warning',
        loggable: true,
        retryable: false,
    },
    // ====================
    // Permission Errors
    // ====================
    PERM_ACCESS_DENIED: {
        code: 'PERM_ACCESS_DENIED',
        title: {
            bg: 'Достъп отказан',
            en: 'Access Denied'
        },
        description: {
            bg: 'Нямате разрешение да достъпите този ресурс.',
            en: 'You don\'t have permission to access this resource.'
        },
        action: {
            bg: 'Моля, влезте с друг акаунт или се свържете с администратор.',
            en: 'Please log in with a different account or contact an administrator.'
        },
        severity: 'error',
        loggable: true,
        retryable: false,
    },
    PERM_PREMIUM_REQUIRED: {
        code: 'PERM_PREMIUM_REQUIRED',
        title: {
            bg: 'Изисква се Pro акаунт',
            en: 'Pro Account Required'
        },
        description: {
            bg: 'Тази функция изисква Pro акаунт.',
            en: 'This feature requires a Pro account.'
        },
        action: {
            bg: 'Надградете до Pro, за да достъпите тази функция.',
            en: 'Upgrade to Pro to access this feature.'
        },
        severity: 'warning',
        loggable: true,
        retryable: false,
    },
    // ====================
    // WebSocket Errors
    // ====================
    WS_CONNECTION_FAILED: {
        code: 'WS_CONNECTION_FAILED',
        title: {
            bg: 'Връзката е неуспешна',
            en: 'Connection Failed'
        },
        description: {
            bg: 'Неуспешна връзка с WebSocket сървъра.',
            en: 'Failed to connect to the WebSocket server.'
        },
        action: {
            bg: 'Моля, опитайте отново след няколко секунди.',
            en: 'Please try again in a few seconds.'
        },
        severity: 'error',
        loggable: true,
        retryable: true,
        retryAfter: 5,
    },
    WS_HEARTBEAT_TIMEOUT: {
        code: 'WS_HEARTBEAT_TIMEOUT',
        title: {
            bg: 'Връзката е прекъсната',
            en: 'Connection Lost'
        },
        description: {
            bg: 'Връзката със сървъра е прекъсната поради неактивност.',
            en: 'The connection to the server was lost due to inactivity.'
        },
        action: {
            bg: 'Моля, опреснете страницата, за да се свържете отново.',
            en: 'Please refresh the page to reconnect.'
        },
        severity: 'warning',
        loggable: true,
        retryable: true,
    },
};
// ============================================
// Helper Functions
// ============================================
/**
 * Get error message for a specific error code and language
 */
function getErrorMessage(errorCode, language = 'bg', context = {}) {
    const error = ERROR_MESSAGES[errorCode];
    if (!error) {
        // Fallback to internal server error
        const fallback = ERROR_MESSAGES.SERVER_INTERNAL_ERROR;
        return {
            code: fallback.code,
            title: fallback.title[language],
            description: fallback.description[language],
            action: fallback.action[language],
            severity: fallback.severity,
            loggable: fallback.loggable,
            retryable: fallback.retryable,
        };
    }
    // Format description and action with context variables
    const formatWithContext = (template) => {
        return Object.keys(context).reduce((result, key) => {
            return result.replace(new RegExp(`{${key}}`, 'g'), context[key]);
        }, template);
    };
    return {
        code: error.code,
        title: error.title[language],
        description: formatWithContext(error.description[language]),
        action: formatWithContext(error.action[language]),
        severity: error.severity,
        loggable: error.loggable,
        retryable: error.retryable,
    };
}
/**
 * Format error message with context variables
 */
function formatErrorMessage(template, context) {
    return Object.keys(context).reduce((result, key) => {
        return result.replace(new RegExp(`{${key}}`, 'g'), context[key]);
    }, template);
}
/**
 * Check if error code exists in database
 */
function isValidErrorCode(code) {
    return code in ERROR_MESSAGES;
}
/**
 * Get all error codes
 */
function getAllErrorCodes() {
    return Object.keys(ERROR_MESSAGES);
}
/**
 * Get error severity for monitoring/alerting
 */
function getErrorSeverity(code) {
    return ERROR_MESSAGES[code]?.severity || 'error';
}
/**
 * Check if error is retryable
 */
function isErrorRetryable(code) {
    return ERROR_MESSAGES[code]?.retryable || false;
}
// ============================================
// Exports
// ============================================
exports.default = {
    ERROR_MESSAGES,
    getErrorMessage,
    formatErrorMessage,
    isValidErrorCode,
    getAllErrorCodes,
    getErrorSeverity,
    isErrorRetryable,
};
//# sourceMappingURL=errorMessages.js.map