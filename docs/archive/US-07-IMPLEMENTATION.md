# US-07: Send Message to AI Astrologer - Implementation

**User Story:** As a logged-in user, I want to send natural language questions to the AI astrologer so that I can receive personalized astrological guidance.

**Status:** ✅ Completed  
**Date:** 2026-02-27

---

## Implementation Summary

### Backend Changes

#### 1. Database Schema Updates (`prisma/schema.prisma`)

Added new `ChatSession` model for conversation management:

```prisma
model ChatSession {
  id                String    @id @default(uuid())
  userId            String    @map("user_id")
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title             String?
  summary           String?   // Context compression after 20+ messages
  birthProfileId    String?   // Optional: which chart to use
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  messages          ChatMessage[]
}

model ChatMessage {
  id                String    @id @default(uuid())
  sessionId         String    @map("session_id")
  session           ChatSession @relation(...)
  role              MessageRole
  content           String
  metadata          Json?     // { tokensUsed, model, processingTime }
  createdAt         DateTime  @default(now())
}
```

#### 2. LLM Service (`backend/src/services/llm.ts`)

Created comprehensive LLM integration service with:
- **Multi-provider support:** GLM-5, MiniMax M2.5, OpenAI fallback
- **Streaming responses:** AsyncGenerator pattern for real-time token delivery
- **Chart context injection:** Automatic natal chart summary generation
- **Language directives:** Bulgarian/English response control
- **Error handling:** Graceful fallback between providers

Key features:
```typescript
// Stream chat completion with automatic provider selection
export async function* streamChatCompletion(
  messages: ChatMessage[],
  config: Partial<LLMConfig> = {}
): AsyncGenerator<StreamChunk>

// Generate compact chart summary for context
export function generateChartSummary(chart: NatalChart, language: 'bg' | 'en'): string

// Build system prompt with context
export function buildSystemPrompt(context: ChatContext): string
```

#### 3. Chat Controller (`backend/src/controllers/chatController.ts`)

Implemented full chat functionality:
- **Rate limiting:** Per-tier limits (Free: 5/month, Pro/Premium: unlimited)
- **Burst protection:** Per-minute burst limits
- **Session management:** Auto-create, persist, and manage sessions
- **Streaming responses:** Server-Sent Events (SSE) for real-time delivery
- **Usage tracking:** Redis-based counters with TTL

Endpoints:
- `POST /api/v1/chat/message` - Send message with streaming response
- `GET /api/v1/chat/sessions` - List user sessions
- `POST /api/v1/chat/sessions` - Create new session
- `GET /api/v1/chat/sessions/:id` - Get session with messages
- `DELETE /api/v1/chat/sessions/:id` - Delete session
- `GET /api/v1/chat/usage` - Get usage statistics

#### 4. Chat Routes (`backend/src/routes/chat.ts`)

Updated routes with authentication middleware.

### Frontend Changes

#### 1. Chat Context (`frontend/src/lib/chat-context.tsx`)

Created React context for chat state management:
- **Session management:** Auto-create and persist sessions
- **SSE streaming:** Real-time message updates
- **Usage tracking:** Display remaining queries
- **Error handling:** User-friendly error display

#### 2. Chat Components

**ChatMessage (`components/chat/chat-message.tsx`)**
- Displays user and assistant messages
- Streaming indicator for live responses
- Cosmic styling with gradients
- Timestamp display

**ChatInput (`components/chat/chat-input.tsx`)**
- Auto-resizing textarea
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Disabled state handling
- Cosmic button styling

**UsageCounter (`components/chat/usage-counter.tsx`)**
- Remaining queries display for free tier
- Progress bar visualization
- Upgrade prompt when limit reached
- Reset date information

**ChatInterface (`components/chat/chat-interface.tsx`)**
- Full chat UI with message history
- Empty state with suggestions
- Loading and streaming indicators
- Error display and recovery
- Auto-scroll to latest message

#### 3. Chat Page (`app/chat/page.tsx`)

Main chat page with authentication guard.

---

## API Specification

### POST /api/v1/chat/message

**Request:**
```json
{
  "content": "Какво показва картата ми за кариерата?",
  "sessionId": "optional-session-id",
  "birthProfileId": "optional-profile-id"
}
```

**Response (Server-Sent Events):**
```
event: metadata
data: {"sessionId":"...","messageId":"...","rateLimit":{"remaining":4,"limit":5}}

event: chunk
data: {"content":"Гледайки ","done":false}

event: chunk
data: {"content":"твоята карта, ","done":false}

event: complete
data: {"messageId":"...","content":"...","hasError":false}
```

**Error Response (429 Rate Limited):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Достигнахте лимита на заявките...",
    "limit": 5,
    "remaining": 0,
    "resetAt": "2026-03-01T00:00:00Z",
    "upgradeUrl": "/subscription"
  }
}
```

---

## Rate Limiting

| Tier | Monthly Limit | Burst (per min) |
|------|---------------|-----------------|
| FREE | 5 queries     | 3               |
| PRO  | Unlimited     | 30              |
| PREMIUM | Unlimited  | 60              |

Rate limits are enforced via Redis with automatic TTL:
- Burst limits: 60 second window
- Monthly limits: Reset on 1st of each month

---

## Design System Compliance

All components follow the design specifications from `06-ux-ui-design.md`:

| Element | Value |
|---------|-------|
| Background | #050510 (Cosmic Black) |
| Surface | #0A0A1F (Nebula Dark) |
| Primary | #8B5CF6 (Stellar Purple) |
| Secondary | #EC4899 (Nebula Pink) |
| Text Primary | #F8FAFC |
| Text Secondary | #CBD5E1 |
| Gradients | linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%) |
| Border Radius | 12px-16px |

---

## Testing Checklist

- [x] User can type and send message via text input
- [x] Message is sent to AI model with user's natal chart context
- [x] AI response streams in real-time (token-by-token)
- [x] Free tier users see remaining queries counter
- [x] Free tier users see upgrade prompt when limit reached
- [x] Response includes reference to chart data when relevant
- [x] Message and response are saved to chat history

---

## Environment Variables Required

```bash
# LLM Provider (at least one required)
GLM_API_KEY=your-glm-api-key
GLM_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions

MINIMAX_API_KEY=your-minimax-api-key
MINIMAX_GROUP_ID=your-group-id

OPENAI_API_KEY=your-openai-api-key  # Fallback

# Model Selection
LLM_MODEL=glm-5
LLM_FALLBACK_MODEL=abab6.5-chat

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://...
```

---

## Files Created/Modified

### Backend (New)
- `backend/src/services/llm.ts` - LLM integration service
- `backend/src/controllers/chatController.ts` - Chat controller

### Backend (Modified)
- `prisma/schema.prisma` - Added ChatSession and ChatMessage models
- `backend/src/routes/chat.ts` - Updated routes

### Frontend (New)
- `frontend/src/lib/chat-context.tsx` - Chat state management
- `frontend/src/components/chat/chat-message.tsx` - Message display
- `frontend/src/components/chat/chat-input.tsx` - Input component
- `frontend/src/components/chat/usage-counter.tsx` - Usage display
- `frontend/src/components/chat/chat-interface.tsx` - Main interface
- `frontend/src/components/chat/index.ts` - Exports
- `frontend/src/app/chat/page.tsx` - Chat page

---

## Next Steps (US-08)

The next user story (US-08) will focus on:
- Conversation history management
- Session titles and search
- Context compression for long conversations
- Multi-profile chat support
