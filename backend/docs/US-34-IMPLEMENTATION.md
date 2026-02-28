# US-34: LLM Provider Fallback Strategy - Implementation Documentation

**Story ID:** US-34  
**Epic:** Core Chat Experience  
**Points:** 5  
**Status:** ✅ Complete  
**Implementation Date:** 2026-02-27

---

## Overview

This document describes the implementation of the LLM Provider Fallback Strategy for AstroLogAI. The system provides automatic failover between multiple LLM providers with health monitoring, latency tracking, and provider switch logging.

## Architecture

### Component Structure

```
backend/src/services/llm/
├── llm-provider.interface.ts   # Abstraction layer and types
├── openai-provider.ts          # OpenAI GPT-5.3/GPT-4o implementation
├── glm-provider.ts             # GLM-4 and MiniMax implementations
├── llm-orchestrator.ts         # Failover orchestration
└── index.ts                    # Exports
```

### Provider Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    LLM Orchestrator                              │
│  - Manages provider selection                                   │
│  - Implements failover logic                                    │
│  - Health check polling (30s interval)                          │
│  - Latency monitoring                                           │
│  - Switch logging                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  GLM-4      │  │  OpenAI     │  │  MiniMax    │
│  (Primary)  │  │  (Secondary)│  │  (Tertiary) │
│  glm-4-flash│  │  gpt-4o     │  │  abab6.5s   │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Implementation Details

### 1. LLM Abstraction Layer

**File:** `llm-provider.interface.ts`

Defines the core interfaces and types:

- `LLMProvider` - Interface all providers must implement
- `BaseLLMProvider` - Abstract class with common functionality
- `ProviderType` enum: PRIMARY, SECONDARY, TERTIARY
- `ProviderStatus` enum: HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN
- `ProviderHealth` - Health check result structure
- `ProviderMetrics` - Provider performance metrics
- `ProviderSwitchEvent` - Switch event logging structure

### 2. OpenAI Provider

**File:** `openai-provider.ts`

Implements OpenAI GPT-5.3 (primary) and GPT-4o (fallback):

- Streaming chat completion
- Health check via minimal request
- Latency tracking
- Error handling and status updates

**Configuration:**
```env
OPENAI_API_KEY=sk-...
OPENAI_PRIMARY_MODEL=gpt-4o  # GPT-5.3 when available
OPENAI_FALLBACK_MODEL=gpt-4o
```

### 3. GLM Provider

**File:** `glm-provider.ts`

Implements GLM-4 (primary) and MiniMax (alternative fallback):

- GLM-4-flash for fast, cost-effective responses
- MiniMax abab6.5s as tertiary fallback
- Same interface as OpenAI provider

**Configuration:**
```env
GLM_API_KEY=...
GLM_PRIMARY_MODEL=glm-4-flash
GLM_FALLBACK_MODEL=glm-4

MINIMAX_API_KEY=...
MINIMAX_GROUP_ID=...
MINIMAX_MODEL=abab6.5s-chat
```

### 4. LLM Orchestrator

**File:** `llm-orchestrator.ts`

Core orchestration logic:

#### Provider Selection
- Initializes providers based on available API keys
- Priority order: GLM → OpenAI → MiniMax
- Active provider tracked by index

#### Automatic Failover
```typescript
// Failover triggers:
// 1. Provider health check fails
// 2. Streaming request fails
// 3. 3 consecutive failures (UNHEALTHY_THRESHOLD)

// Recovery triggers:
// 2 consecutive successes (RECOVERY_THRESHOLD)
```

#### Health Check Polling
- Default interval: 30 seconds
- Automatic provider switching on health degradation
- Configurable via `LLM_HEALTH_CHECK_INTERVAL`

#### Switch Logging
- In-memory history (last 100 events)
- Redis persistence for long-term storage
- Timestamp, from/to providers, reason, error details

### 5. Health Check API

**Endpoint:** `GET /api/v1/llm/health`

Returns health status of all providers:

```json
{
  "success": true,
  "data": {
    "overallStatus": "operational",
    "providers": [
      {
        "provider": "glm",
        "type": "primary",
        "status": "healthy",
        "latencyMs": 150,
        "lastCheck": "2026-02-27T08:00:00Z",
        "errorCount": 0,
        "successCount": 42,
        "totalRequests": 42,
        "successfulRequests": 42,
        "failedRequests": 0,
        "averageLatencyMs": 145
      }
    ],
    "summary": {
      "total": 3,
      "healthy": 3,
      "degraded": 0,
      "unhealthy": 0
    }
  }
}
```

### 6. Status API

**Endpoint:** `GET /api/v1/llm/status`

Returns orchestrator status:

```json
{
  "success": true,
  "data": {
    "activeProvider": "glm",
    "totalProviders": 3,
    "healthyProviders": 3,
    "recentSwitches": [],
    "lastSwitch": null
  }
}
```

### 7. Switch History API

**Endpoint:** `GET /api/v1/llm/history`

Returns provider switch events:

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "timestamp": "2026-02-27T07:45:00Z",
        "fromProvider": "glm",
        "toProvider": "openai",
        "reason": "Provider failure",
        "error": "Connection timeout"
      }
    ],
    "total": 1
  }
}
```

### 8. Chat Integration

Updated `chatController.ts` to use the orchestrator:

**Response Headers:**
```
X-Provider: glm
X-Latency: 150ms
```

**Complete Event (SSE):**
```json
{
  "messageId": "msg_123",
  "content": "Your response...",
  "hasError": false,
  "provider": "glm",
  "latencyMs": 150
}
```

## Configuration

### Environment Variables

```env
# Primary Provider (GLM)
GLM_API_KEY=your_glm_api_key
GLM_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
GLM_PRIMARY_MODEL=glm-4-flash
GLM_FALLBACK_MODEL=glm-4

# Secondary Provider (OpenAI)
OPENAI_API_KEY=sk-your_openai_api_key
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_PRIMARY_MODEL=gpt-4o
OPENAI_FALLBACK_MODEL=gpt-4o

# Tertiary Provider (MiniMax)
MINIMAX_API_KEY=your_minimax_api_key
MINIMAX_GROUP_ID=your_group_id
MINIMAX_API_URL=https://api.minimax.chat/v1/text/chatcompletion_v2
MINIMAX_MODEL=abab6.5s-chat

# Orchestrator Settings
LLM_HEALTH_CHECK_INTERVAL=30000
LLM_MODEL=glm-4-flash
LLM_FALLBACK_MODEL=gpt-4o
```

## Failover Scenarios

### Scenario 1: Primary Provider Timeout
1. Request to GLM times out
2. Orchestrator tracks failure (errorCount++)
3. If errorCount >= 3, marks GLM as UNHEALTHY
4. Switches to OpenAI
5. Logs switch event with reason

### Scenario 2: All Providers Degraded
1. Health check marks all providers as DEGRADED
2. Orchestrator selects provider with best latency
3. Continues operation with monitoring

### Scenario 3: Automatic Recovery
1. GLM provider starts succeeding
2. successCount incremented
3. After 2 successes, marked HEALTHY
4. Orchestrator may switch back to primary

## Monitoring

### Key Metrics to Track

1. **Provider Health**
   - Status (healthy/degraded/unhealthy)
   - Latency (p50, p95, p99)
   - Error rate

2. **Failover Events**
   - Frequency of switches
   - Most common failure reasons
   - Recovery time

3. **Request Distribution**
   - Requests per provider
   - Success rate per provider

### Logging

All provider switches are logged:
```
[LLM Orchestrator] Provider switch: glm → openai (Provider failure)
```

Health check results logged:
```
[LLM Orchestrator] Health check: glm healthy (150ms)
```

## Testing

### Unit Tests

Located in `src/__tests__/llm-orchestrator.test.ts`:

- Provider management tests
- Failover logic tests
- Health check tests
- Chat with failover tests

### Manual Testing

```bash
# Check health
curl http://localhost:4000/api/v1/llm/health

# Check status
curl http://localhost:4000/api/v1/llm/status

# View switch history
curl http://localhost:4000/api/v1/llm/history

# Force health check
curl -X POST http://localhost:4000/api/v1/llm/health/check
```

## Backward Compatibility

The new implementation maintains backward compatibility:

- Existing `streamChatCompletion()` function works unchanged
- Same `ChatMessage` and `StreamChunk` types
- `chatController.ts` requires minimal changes

## Future Improvements

1. **Circuit Breaker Pattern**
   - Implement proper circuit breaker for faster failover

2. **Cost-Based Routing**
   - Route to cheaper providers when quality allows

3. **A/B Testing**
   - Compare provider quality for different query types

4. **Predictive Failover**
   - Use ML to predict provider issues before they occur

---

**Implementation completed by:** Lorenzo (AI Assistant)  
**Review status:** Ready for QA
