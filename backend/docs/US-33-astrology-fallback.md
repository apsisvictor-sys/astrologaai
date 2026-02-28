# US-33: Astrology API Fallback Strategy - Documentation

## Overview

This document describes the fallback strategy implemented for the Astrology API to ensure the AstroLogAI application remains functional even if the primary astrology API experiences issues.

## Architecture

### Provider Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Astrology Orchestrator                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Provider Selection                        │   │
│  │  - Health Monitoring                                         │   │
│  │  - Circuit Breaker Pattern                                   │   │
│  │  - Exponential Backoff                                       │   │
│  │  - Automatic Failover                                        │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│         ┌───────────────────┼───────────────────┐                  │
│         ▼                   ▼                    ▼                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │   Primary    │    │  Secondary   │    │  (Future)    │         │
│  │ Astrology-API│    │Swiss Ephemeris│    │   astro.com  │         │
│  │     .io      │    │   Fallback    │    │              │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Providers

| Provider | Type | Description | Availability |
|----------|------|-------------|--------------|
| **Astrology-API.io** | Primary | Professional astrology API with Swiss Ephemeris precision | Requires API key |
| **Swiss Ephemeris Fallback** | Secondary | Local calculation using Jean Meeus algorithms | Always available |

## Features

### 1. Abstraction Layer

The `AstrologyProvider` interface allows switching between providers seamlessly:

```typescript
interface AstrologyProvider {
  readonly name: string;
  readonly type: AstrologyProviderType;
  
  isAvailable(): boolean;
  healthCheck(): Promise<ProviderHealth>;
  calculateNatalChart(birthData: BirthDataInput): Promise<NatalChart>;
  getTransits(date: string): Promise<TransitData>;
  calculateSynastry(birthData1, birthData2): Promise<SynastryData>;
}
```

### 2. Health Monitoring

- **Periodic Health Checks**: Every 60 seconds (configurable)
- **Health Status**: HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN
- **Redis Caching**: 5-minute TTL to reduce API calls
- **Latency Tracking**: Monitors response time per provider

### 3. Circuit Breaker Pattern

Prevents repeated calls to a failing API:

```typescript
enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, requests blocked
  HALF_OPEN = 'half_open' // Testing if recovered
}
```

**Configuration:**
- Threshold: 3 consecutive failures
- Reset timeout: 30 seconds
- Recovery: 2 consecutive successes

### 4. Exponential Backoff

Retry with increasing delays:

| Attempt | Delay |
|---------|-------|
| 1 | 1 second |
| 2 | 2 seconds |
| 3 | 4 seconds |
| ... | ... |
| Max | 30 seconds |

**Formula:** `delay = min(1000 * 2^attempt, 30000)`

### 5. Automatic Failover

When a provider fails:
1. Log the failure with context
2. Track consecutive failures
3. If threshold reached, open circuit breaker
4. Switch to next healthy provider
5. Log provider switch event

### 6. Failure Logging

All failures are logged with:
- Timestamp
- Provider name
- Operation type
- Error message
- Retry attempt number
- Birth data (partial, for debugging)

Logs are stored in Redis (`astrology:failure_logs`) for monitoring.

## API Endpoints

### Health Check (Public)

```http
GET /api/v1/astrology/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "activeProvider": "astrology-api.io",
    "totalProviders": 2,
    "healthyProviders": 2,
    "providers": [...]
  }
}
```

### Detailed Status (Authenticated)

```http
GET /api/v1/astrology/status
Authorization: Bearer <token>
```

### Manual Override (Authenticated)

```http
POST /api/v1/astrology/override
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "swiss-ephemeris-fallback",
  "reason": "Testing fallback provider"
}
```

### Reset Circuit Breaker (Authenticated)

```http
POST /api/v1/astrology/circuit-breaker/reset
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "astrology-api.io"
}
```

### Failure Logs (Authenticated)

```http
GET /api/v1/astrology/failures?limit=100
Authorization: Bearer <token>
```

## Server Health Endpoints

```http
GET /health/astrology
```

**Response:**
```json
{
  "status": "ok",
  "astrology": {
    "activeProvider": "astrology-api.io",
    "healthyProviders": 2,
    "totalProviders": 2
  }
}
```

## Usage Examples

### Basic Chart Calculation

```typescript
import { getAstrologyOrchestrator } from './services/astrology';

const orchestrator = getAstrologyOrchestrator();

const chart = await orchestrator.calculateNatalChart({
  year: 1990,
  month: 5,
  day: 15,
  hour: 14,
  minute: 30,
  latitude: 42.6977,
  longitude: 23.3219,
  timezone: 'Europe/Sofia',
});

console.log(`Sun: ${chart.sun.sign} (${chart.sun.signBg})`);
console.log(`Source: ${chart.source}`);
```

### Check Provider Health

```typescript
const health = await orchestrator.checkAllHealth();
health.forEach(h => {
  console.log(`${h.status}: ${h.latencyMs}ms`);
});
```

### Manual Override

```typescript
// Switch to fallback provider
orchestrator.setActiveProvider('swiss-ephemeris-fallback', 'Maintenance');

// Clear override
orchestrator.clearOverride();
```

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Provider Health Status**
   - Alert if all providers are unhealthy
   - Alert if primary provider degraded for > 5 minutes

2. **Circuit Breaker State**
   - Track open circuits
   - Alert if circuit opens frequently

3. **Provider Switches**
   - Log all switches
   - Alert on frequent switching (potential instability)

4. **Latency**
   - Track p50, p95, p99
   - Alert if latency > 5 seconds

5. **Failure Rate**
   - Track failures per hour
   - Alert if failure rate > 10%

### Redis Keys

| Key | Description | TTL |
|-----|-------------|-----|
| `astrology:provider_health` | Cached health status | 5 min |
| `astrology:switch_history` | Provider switch events | Persistent |
| `astrology:failure_logs` | API failure logs | Persistent |

## Troubleshooting

### Primary API Down

1. Check health endpoint: `GET /api/v1/astrology/health`
2. If primary is unhealthy, orchestrator automatically switches to fallback
3. Verify fallback is working: Check `activeProvider` in status

### Circuit Breaker Stuck Open

1. Identify provider: `GET /api/v1/astrology/status`
2. Reset circuit breaker: `POST /api/v1/astrology/circuit-breaker/reset`
3. Monitor for recovery

### High Latency

1. Check provider metrics in status endpoint
2. Consider manual override to fallback if primary is slow
3. Check network connectivity to primary API

### Fallback Inaccurate

The Swiss Ephemeris fallback uses simplified algorithms:
- Sun position: ~1° accuracy
- Moon position: ~2° accuracy
- Outer planets: Approximate

For production, always prefer primary API when available.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ASTROLOGY_API_URL` | Primary API URL | `https://json.astrology-api.io/v1` |
| `ASTROLOGY_API_KEY` | Primary API key | Required for primary |
| `ASTROLOGY_HEALTH_CHECK_INTERVAL` | Health check interval (ms) | `60000` |
| `ASTROLOGY_HEALTH_CACHE_TTL` | Health cache TTL (seconds) | `300` |

### Circuit Breaker Configuration

Located in `astrology-orchestrator.ts`:

```typescript
const CIRCUIT_BREAKER_THRESHOLD = 3;      // Failures before open
const CIRCUIT_BREAKER_RESET_TIMEOUT = 30000; // 30 seconds
```

### Retry Configuration

```typescript
const INITIAL_RETRY_DELAY_MS = 1000;  // 1 second
const MAX_RETRY_DELAY_MS = 30000;     // 30 seconds
const BACKOFF_MULTIPLIER = 2;
const MAX_RETRIES = 3;
```

## Testing

Run tests:

```bash
cd backend
npm test -- astrology-fallback.test.ts
```

Test coverage includes:
- Provider initialization
- Exponential backoff calculation
- Circuit breaker state transitions
- Natal chart calculation
- Transit calculation
- Synastry calculation
- Provider switching
- Health checks
- Manual override

## Future Improvements

1. **Add astro.com as tertiary provider** - Professional alternative
2. **Implement request queuing** - Buffer requests during failover
3. **Add request deduplication** - Prevent duplicate calculations
4. **Implement batch requests** - Optimize for multiple charts
5. **Add response validation** - Verify chart data integrity
6. **Implement predictive failover** - Switch before complete failure

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-27  
**Author:** Lorenzo (US-33 Implementation)
