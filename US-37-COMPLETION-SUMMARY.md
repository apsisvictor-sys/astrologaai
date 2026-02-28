# US-37: API Rate-Limit Burst/Retry Behavior - Completion Summary

**Completed:** 2026-02-27T15:15:00Z
**Points:** 3
**Status:** ✅ COMPLETE

## Acceptance Criteria - All Met

- [x] Free tier: 10 requests/minute burst limit
- [x] 429 response includes Retry-After header
- [x] Client implements exponential backoff (1s, 2s, 4s, max 30s)
- [x] Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- [x] Works with both REST and WebSocket connections
- [x] Unit tests passing (23 tests)

## Technical Implementation

### 1. Rate Limit Tiers in Config (`subscription-tiers.ts`)

```typescript
FREE: {
  burstLimit: 10,  // 10 requests per minute
  monthlyQueries: 10,
}
PRO: {
  burstLimit: 60,  // 60 requests per minute
  monthlyQueries: -1, // unlimited
}
PREMIUM: {
  burstLimit: -1,  // Unlimited (no rate limiting)
  monthlyQueries: -1, // unlimited
}
```

### 2. Redis-Based Rate Limiting (`queryLimit.ts`)

- Burst counter stored in Redis with 60-second TTL
- Key format: `ratelimit:burst:{userId}`
- Atomic increment with automatic expiry
- PREMIUM tier skips burst limiting entirely

### 3. Rate Limit Headers Middleware (`rateLimitHeaders.ts`)

New middleware adds standard headers to all API responses:

- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests in window
- `X-RateLimit-Reset` - Unix timestamp when limit resets
- `Retry-After` - Seconds until retry (on 429)
- `X-RateLimit-Tier` - User's subscription tier

### 4. 429 Response Format

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please wait a moment.",
    "limitType": "burst",
    "retryAfter": 45,
    "limit": 10,
    "remaining": 0,
    "resetAt": "2026-02-27T15:15:45Z"
  }
}
```

### 5. Client-Side Retry Logic (`api-client.ts`)

Exponential backoff implementation:

```typescript
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000,    // 1 second
  maxDelay: 30000,       // 30 seconds cap
  backoffMultiplier: 2,  // Double each time
  retryableStatusCodes: [429, 503, 502, 504],
};

// Pattern: 1s → 2s → 4s → 8s → 16s → capped at 30s
```

Features:
- Automatic retry on 429 responses
- Respects `Retry-After` header when present
- Cap at 30 seconds maximum delay
- Configurable max retries

### 6. WebSocket Support (`socket-client.ts`)

New method: `sendMessageWithRetry()` with:
- Automatic retry on rate limit errors
- Same exponential backoff pattern
- Promise-based API for async/await usage

## Files Created

| File | Purpose |
|------|---------|
| `backend/src/middleware/rateLimitHeaders.ts` | Rate limit headers middleware |
| `backend/tests/us37-rate-limit.test.ts` | Unit tests (23 tests) |

## Files Modified

| File | Changes |
|------|---------|
| `backend/src/config/subscription-tiers.ts` | Updated burst limits, added `isUnlimitedBurst()` |
| `backend/src/middleware/queryLimit.ts` | Added `retryAfter` to responses, proper headers |
| `backend/src/socket/chat-handler.ts` | Pass tier to increment function |
| `frontend/src/lib/api-client.ts` | Exponential backoff retry logic |
| `frontend/src/lib/socket-client.ts` | `sendMessageWithRetry()` method |
| `backend/src/index.ts` | Import and use rate limit headers middleware |

## Test Results

```
 ✓ tests/us37-rate-limit.test.ts  (23 tests) 21ms

 Test Files  1 passed (1)
      Tests  23 passed (23)
   Duration  671ms
```

### Test Coverage

- Tier configuration tests (6 tests)
- Burst rate limiting tests (3 tests)
- 429 response generation tests (4 tests)
- WebSocket rate limiting tests (2 tests)
- Query increment tests (2 tests)
- Usage stats tests (2 tests)
- Exponential backoff tests (2 tests)
- Header name tests (1 test)
- Frontend retry logic reference (1 test)

## Design Specifications Followed

All error messages localized in both Bulgarian and English:
- Burst limit error: "Твърде много заявки. Моля, изчакайте малко."
- Monthly limit error: "Достигнахте лимита от {limit} въпроса за този месец."

## Integration Points

1. **REST API**: All endpoints return rate limit headers via middleware
2. **WebSocket**: Chat handler checks burst limits before processing messages
3. **Frontend**: API client automatically retries on 429 responses

## Dependencies

- Uses existing Redis connection from `utils/redis.ts`
- Extends existing subscription-tiers.ts from US-36
- Works with existing auth middleware for user context

---

**Next Story:** US-38 (Status set to IN_PROGRESS in PROGRESS.json)
