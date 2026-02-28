# Error Handling Standards

**Project:** AstroLogAI  
**Document Version:** 1.0  
**Created:** 2026-02-27  
**Last Updated:** 2026-02-27

## 1. Overview

This document defines the error handling standards for the AstroLogAI application. All errors must follow these standards to ensure consistency, user-friendliness, and maintainability.

## 2. Error Code Taxonomy

### 2.1 Error Code Format
- **Format:** `CATEGORY_SPECIFIC_ERROR`
- **Example:** `AUTH_INVALID_TOKEN`, `VALID_REQUIRED_FIELD`

### 2.2 Error Categories

| Category | Prefix | Description | HTTP Status |
|----------|--------|-------------|-------------|
| Authentication | `AUTH_` | Authentication & authorization errors | 401, 403 |
| Validation | `VALID_` | Input validation errors | 400 |
| API | `API_` | External API errors | 502, 503, 429 |
| Rate Limit | `RATE_` | Rate limiting errors | 429 |
| Server | `SERVER_` | Internal server errors | 500 |
| Database | `DB_` | Database errors | 500, 503 |
| Not Found | `NOTFOUND_` | Resource not found errors | 404 |
| Permission | `PERM_` | Permission/access denied errors | 403 |
| WebSocket | `WS_` | WebSocket connection errors | 400, 1011 |

### 2.3 Error Code Registry
All error codes are defined in `backend/src/utils/error-codes.ts`. New error codes must be added to this file.

## 3. Error Message Requirements

### 3.1 Language Support
All error messages must be available in:
- **Bulgarian (bg):** Primary language for Bulgarian market
- **English (en):** Secondary language for international users

### 3.2 Message Structure
Each error message must have:
- **Title:** Short, clear title (1-3 words)
- **Description:** User-friendly explanation of the error
- **Action:** Clear, actionable next steps for the user

### 3.3 Tone and Style
- **User-friendly:** Avoid technical jargon
- **Actionable:** Tell users what they can do next
- **Consistent:** Maintain consistent tone across all errors
- **Professional:** Respectful and helpful

### 3.4 Context Variables
Error messages can include context variables:
- Use `{variable}` syntax (e.g., `{limit}`, `{field}`)
- Variables are replaced with actual values at runtime
- All variables must be documented in the error message

## 4. Error Response Format

### 4.1 JSON Structure
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly message in user's language",
    "title": "Error title in user's language",
    "action": "Suggested action in user's language",
    "timestamp": "2026-02-27T15:32:00Z",
    "requestId": "req_abc123",
    "userFriendly": true,
    "retryable": true,
    "retryAfter": 60,
    "documentationUrl": "/docs/errors/ERROR_CODE"
  }
}
```

### 4.2 Response Headers
- `X-Request-ID`: Unique request identifier
- `Content-Language`: Language of the error response
- `Retry-After`: Seconds to wait before retrying (if applicable)
- `Content-Type`: `application/json`

## 5. Error Logging Standards

### 5.1 Log Entry Structure
```typescript
interface LogEntry {
  timestamp: string;
  errorCode?: string;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  userId?: string;
  requestId: string;
  userAgent?: string;
  ipAddress?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  language?: string;
  stackTrace?: string;
  context: Record<string, any>;
}
```

### 5.2 Severity Levels

| Level | When to Use | Production Logging |
|-------|-------------|-------------------|
| DEBUG | Development only | Never |
| INFO | Informational messages | Yes |
| WARN | Non-critical errors | Yes |
| ERROR | Application errors | Yes |
| FATAL | System-critical errors | Yes (with alerts) |

### 5.3 Context Capture
Always include:
- Request ID for correlation
- User ID (if authenticated)
- HTTP method and URL
- Timestamp
- Error code

Optional but recommended:
- User agent
- IP address (anonymized in production)
- Language preference
- Relevant business context

### 5.4 Security Considerations
- **Never log:** Passwords, tokens, API keys, PII
- **Sanitize:** Use `sanitizeContext()` function
- **Anonymize:** Hash user IDs in production logs
- **Environment-aware:** Different logging in dev vs prod

## 6. Error Handling Implementation

### 6.1 Backend Error Flow
1. **Error occurs** in controller/service
2. **Create AppError** with code and context
3. **Error formatter middleware** catches error
4. **Detect language** from user preference or headers
5. **Get localized message** from error database
6. **Log error** with full context
7. **Return formatted response** to client

### 6.2 Creating New Errors
```typescript
// 1. Add error code to error-codes.ts
export const NewCategoryErrors = {
  NEW_ERROR: 'CATEGORY_NEW_ERROR',
} as const;

// 2. Add HTTP status mapping
[NewCategoryErrors.NEW_ERROR]: 400,

// 3. Add error message to errorMessages.ts
CATEGORY_NEW_ERROR: {
  code: 'CATEGORY_NEW_ERROR',
  title: {
    bg: 'Българско заглавие',
    en: 'English Title'
  },
  description: {
    bg: 'Българско описание с {variable}.',
    en: 'English description with {variable}.'
  },
  action: {
    bg: 'Българско действие.',
    en: 'English action.'
  },
  severity: 'error',
  loggable: true,
  retryable: true,
},

// 4. Use in code
throw createAppError('CATEGORY_NEW_ERROR', 'Optional message', {
  statusCode: 400,
  context: { variable: 'value' },
});
```

### 6.3 Helper Functions
Use provided helper functions:
- `createAppError()`: Create standardized error
- `validationError()`: For validation failures
- `authError()`: For authentication errors
- `permissionError()`: For permission errors
- `notFoundError()`: For resource not found
- `rateLimitError()`: For rate limiting

## 7. Frontend Error Handling

### 7.1 Error Display Component
Use `ErrorDisplay` component for consistent error UI:
```tsx
<ErrorDisplay
  error={errorResponse.error}
  onRetry={handleRetry}
  onDismiss={handleDismiss}
  language={userLanguage}
/>
```

### 7.2 Error Handling Hook
Use `useErrorHandler` hook for common error patterns:
```typescript
const { handleError, showError, clearError } = useErrorHandler();

// Handle API errors
try {
  await apiCall();
} catch (error) {
  handleError(error, {
    onRetry: () => retryApiCall(),
    fallbackMessage: 'Custom fallback message',
  });
}
```

### 7.3 Error States
- **Loading:** Show loading indicator
- **Error:** Show error message with retry option
- **Success:** Show success message
- **Empty:** Show empty state message

## 8. Language Detection

### 8.1 Priority Order
1. **User preference:** From user profile (`user.language`)
2. **Accept-Language header:** From HTTP request
3. **Default:** Bulgarian (`bg`) for Bulgarian market

### 8.2 Implementation
```typescript
// In error formatter middleware
const language = detectLanguage(req);

// Helper function
function detectLanguage(req: Request): SupportedLanguage {
  // Implementation in errorFormatter.ts
}
```

## 9. Security Guidelines

### 9.1 Error Information Disclosure

| Environment | Stack Traces | Detailed Errors | Sensitive Data |
|-------------|--------------|-----------------|----------------|
| Development | Yes | Yes | No |
| Staging | Limited | Yes | No |
| Production | Never | Generic only | Never |

### 9.2 Production Error Messages
- **Security errors:** Generic messages only
- **Validation errors:** Specific to field, not values
- **System errors:** "Please try again later"
- **Authentication errors:** "Invalid credentials" (not which one)

### 9.3 Rate Limiting
- Error endpoints must be rate limited
- Prevent error message enumeration attacks
- Log failed authentication attempts
- Implement exponential backoff

## 10. Monitoring and Maintenance

### 10.1 Error Monitoring
- **Track:** Error frequency by code and endpoint
- **Alert:** On error spikes or fatal errors
- **Analyze:** Error trends and patterns
- **Report:** Weekly error reports

### 10.2 Error Resolution
1. **Identify:** Error code and context
2. **Investigate:** Logs and monitoring data
3. **Fix:** Code or configuration issue
4. **Verify:** Error no longer occurs
5. **Document:** Root cause and solution

### 10.3 Adding New Languages
1. Add language code to `SupportedLanguage` type
2. Add translations to all error messages
3. Update language detection logic
4. Test with language headers
5. Update documentation

## 11. Testing Requirements

### 11.1 Unit Tests
- **Error messages:** Test all error codes in both languages
- **Error formatter:** Test language detection and formatting
- **Error logger:** Test context capture and severity levels
- **Frontend component:** Test display and interaction

### 11.2 Integration Tests
- API endpoints return localized errors
- Language detection works correctly
- Error logging captures full context
- Frontend displays errors properly

### 11.3 Manual Testing
- Test with Bulgarian language preference
- Test with English language preference
- Test with Accept-Language headers
- Test error component on all devices
- Test accessibility (screen reader, keyboard)

## 12. Performance Considerations

### 12.1 Message Loading
- Error messages loaded once at startup
- In-memory cache for fast lookups
- No database queries for error messages

### 12.2 Language Detection
- Fast header parsing (< 1ms)
- User preference cached in request
- Optimized fallback logic

### 12.3 Logging Performance
- Async logging (non-blocking)
- Batch processing for high volume
- Environment-specific optimizations

## 13. Compliance Requirements

### 13.1 Design System
All error displays must comply with:
- **Colors:** Cosmic Black (#050510), Nebula Dark (#0A0A1F)
- **Primary:** Stellar Purple (#8B5CF6)
- **Secondary:** Nebula Pink (#EC4899)
- **Typography:** Inter font
- **Border Radius:** 12px-16px
- **Spacing:** Consistent with design system

### 13.2 Accessibility
- **ARIA labels:** For screen readers
- **Keyboard navigation:** All actions accessible
- **Color contrast:** WCAG 2.1 AA compliant
- **Focus management:** Proper focus handling

## 14. Change Management

### 14.1 Adding New Error Codes
1. **Proposal:** Document need and use case
2. **Implementation:** Add code, messages, tests
3. **Review:** Peer review of implementation
4. **Testing:** Unit and integration tests
5. **Deployment:** Deploy to staging then production
6. **Monitoring:** Monitor error frequency

### 14.2 Modifying Error Messages
1. **Assessment:** Impact on users
2. **Translation:** Update all languages
3. **Testing:** Verify in all contexts
4. **Deployment:** Deploy changes
5. **Communication:** Notify support team if significant

### 14.3 Deprecating Error Codes
1. **Mark deprecated:** Add `@deprecated` tag
2. **Maintain backward compatibility:** Keep in codebase
3. **Update references:** Replace with new codes
4. **Monitor usage:** Track deprecated code usage
5. **Remove:** After sufficient migration period

## 15. Appendix

### 15.1 Common Error Patterns

#### Authentication Flow
```typescript
try {
  await authenticateUser(credentials);
} catch (error) {
  if (error.code === 'AUTH_INVALID_CREDENTIALS') {
    throw authError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
  }
  if (error.code === 'AUTH_EMAIL_NOT_VERIFIED') {
    throw authError('AUTH_EMAIL_NOT_VERIFIED', 'Please verify your email');
  }
  throw createAppError('AUTH_INVALID_CREDENTIALS');
}
```

#### Validation Flow
```typescript
if (!email) {
  throw validationError('email', 'Email is required');
}

if (!isValidEmail(email)) {
  throw validationError('email', 'Invalid email format');
}
```

#### API Integration Flow
```typescript
try {
  const result = await externalApi.call();
  return result;
} catch (error) {
  if (error.status === 429) {
    throw rateLimitError('API_QUOTA_EXCEEDED', 60, {
      provider: 'external-api',
    });
  }
  throw createAppError('API_EXTERNAL_FAILED', error.message, {
    context: { provider: 'external-api' },
  });
}
```

### 15.2 Error Code Quick Reference

#### Authentication (AUTH_*)
- `AUTH_INVALID_TOKEN`: Invalid or expired token
- `AUTH_INVALID_CREDENTIALS`: Wrong email/password
- `AUTH_EMAIL_NOT_VERIFIED`: Email not verified

#### Validation (VALID_*)
- `VALID_REQUIRED_FIELD`: Required field missing
- `VALID_INVALID_EMAIL`: Invalid email format
- `VALID_MIN_LENGTH`: Text too short

#### Rate Limit (RATE_*)
- `RATE_QUOTA_EXCEEDED`: Monthly limit reached
- `RATE_BURST_LIMIT_EXCEEDED`: Too many requests

#### Server (SERVER_*)
- `SERVER_INTERNAL_ERROR`: Unexpected server error
- `SERVER_SERVICE_UNAVAILABLE`: Service down for maintenance

### 15.3 Useful Commands

#### Check Error Coverage
```bash
# Count error codes
grep -c "code:" backend/src/services/errorMessages.ts

# Count tests
find backend/src/__tests__ -name "*.test.ts" -exec grep -c "test(" {} \;

# Run error tests
npm test -- errorMessages.test.ts
```

#### Monitor Errors in Production
```bash
# Tail error logs
tail -f logs/error.log | jq '.'

# Count errors by code
cat logs/error.log | jq -r '.errorCode' | sort | uniq -c | sort -nr

# Find frequent errors
cat logs/error.log | jq -r 'select(.severity == "error") | .errorCode' | sort | uniq -c
```

---

**Document Maintainer:** Engineering Team  
**Review Cycle:** Quarterly  
**Next Review:** 2026-05-27