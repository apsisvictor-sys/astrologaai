# Unified Real Chat Engine — Implementation Plan

> **For Claude:** Use superpowers:subagent-driven-development to implement task by task.

**Goal:** Replace the fake homepage oracle with a real AI chat engine, auto-compute natal charts on birth data save, migrate guest sessions to registered accounts seamlessly, and fix autoscroll.

**Architecture:** One chat backend serves both guest and authenticated users. Guests get a HMAC-signed session token (rate-limited), birth data is computed into a full chart summary inline per-request (ephemeral, no DB), and the same `buildSystemPrompt` + `streamChatCompletion` pipeline used by authenticated chat handles everything. On registration, guest messages are imported as the user's first real DB-persisted chat session so the conversation continues uninterrupted.

**Tech Stack:** Node/Express SSE streaming, existing `llm.ts` + `llm-helpers.ts`, `calculateNatalChart`, Redis session context, HMAC-SHA256 session tokens, React SSE fetch streaming, framer-motion countdown.

**Key files to know:**
- `backend/src/services/llm.ts` — `streamChatCompletion()` — the AI streaming function
- `backend/src/services/llm-helpers.ts` — `buildSystemPrompt()`, `generateChartSummary()`
- `backend/src/services/astrology.ts` — `calculateNatalChart(birthDataInput)`
- `backend/src/controllers/chatController.ts` — authenticated chat reference implementation
- `backend/src/middleware/rateLimiter.ts` — `rateLimiter(max, windowSeconds)` factory
- `backend/src/utils/redis.ts` — `redisClient`, `storeSessionContext`, `getSessionContext`
- `backend/src/index.ts` — where routes are registered (line ~170)
- `frontend/src/components/home/visitor-chat.tsx` — to be rewritten
- `frontend/src/lib/auth-context.tsx` — `signUp()` — where guest migration runs
- `frontend/src/components/chat/message-list.tsx` — autoscroll fix

---

## DECISIONS LOCKED (do not re-discuss)

1. **Guest chat = real AI.** Same `buildSystemPrompt` + `streamChatCompletion` as `/chat`. No templates.
2. **Guest session token**: HMAC-SHA256 signed `{ sessionId, createdAt, ip }`. Issued by dedicated start endpoint, rate-limited 3/IP/hour. Max 10 messages per session token.
3. **Bot protection (basic):** IP rate limits + HMAC session tokens. **Advanced** (Cloudflare Turnstile) is deferred — tracked in `memory/MEMORY.md` under Roadmap.
4. **Logged-in user hits homepage oracle:** Oracle sends personalized greeting using their name → 5-second animated countdown → redirect to `/chat`.
5. **Guest → registered migration:** On `signUp()`, all localStorage guest messages become the user's first real DB chat session. Session title = "My first reading". Conversation context is fully carried over. User lands at `/chat?session=<id>`.
6. **Chart computation:** `POST /api/v1/birth-data` auto-computes natal chart and saves `birth_charts` row inline. No separate call needed.
7. **Guest AI tools:** No agent tools for guest sessions — chart summary injected into system prompt directly (same quality of response, lower cost, simpler flow).

---

## Task 1: Auto-compute natal chart on birth profile save

**Why first:** Everything downstream (chat personalization) depends on having a `birth_charts` row. Fixes `/chat` responses immediately.

**Files:**
- Modify: `backend/src/controllers/birthDataController.ts` (after line 255 where profile is created)
- Modify: `backend/dist/controllers/birthDataController.js` (mirror in dist)

**What to do:**

After `prisma.birthProfile.create()` succeeds (currently line 252), add chart computation:

```typescript
// Auto-compute natal chart immediately after profile creation
try {
  const birthDate = new Date(input.birthDate);
  const birthTime = input.isUnknownTime ? null : (input.birthTime || null);
  const [hour, minute] = birthTime ? birthTime.split(':').map(Number) : [12, 0];

  const birthDataInput: BirthDataInput = {
    year: birthDate.getFullYear(),
    month: birthDate.getMonth() + 1,
    day: birthDate.getDate(),
    hour: hour || 12,
    minute: minute || 0,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone,
  };

  const chart = await calculateNatalChart(birthDataInput);

  await prisma.birthChart.create({
    data: {
      userId,
      birthProfileId: profile.id,
      chartData: chart as any,
    },
  });

  console.log(`[BirthData] Chart computed for profile ${profile.id}`);
} catch (chartError) {
  // Non-blocking: profile is saved, chart will be missing
  // Chat will use generic system prompt until chart is recomputed
  console.error('[BirthData] Chart computation failed (non-blocking):', chartError);
}
```

The response stays the same (`data: { profile }`) — no API contract change.

**Mirror in dist:** Copy equivalent JS to `backend/dist/controllers/birthDataController.js` — find the `exports.createBirthProfile` function, add the same logic after the `profile` creation in the try block.

**How to verify:**
```bash
curl -s -X POST http://localhost:4000/api/v1/birth-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test","birthDate":"1990-10-15","birthTime":"14:30","locationName":"Sofia, Bulgaria","latitude":42.698,"longitude":23.322,"isUnknownTime":false}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['success'])"
# Expected: true

# Then verify birth_charts row exists:
# Check backend logs for "[BirthData] Chart computed for profile ..."
```

**Commit:** `fix: auto-compute natal chart on birth profile creation`

---

## Task 2: Guest chat session token endpoint (backend security layer)

**Files:**
- Create: `backend/src/routes/guestChat.ts`
- Create: `backend/dist/routes/guestChat.js`
- Modify: `backend/src/index.ts` (register the route)
- Modify: `backend/dist/index.js` (mirror)

**What the start endpoint does:**
- `POST /api/v1/chat/guest/start` — no auth, IP rate-limited 3/hour
- Generates UUID sessionId
- Signs token: `HMAC-SHA256(JSON.stringify({ sessionId, createdAt: Date.now(), ip }), GUEST_CHAT_SECRET)`
- Returns `{ sessionId, token, maxMessages: 10 }`
- Token expires in 24h (checked at message time)

**`backend/src/routes/guestChat.ts`:**

```typescript
import { Router, Request, Response } from 'express';
import { rateLimiter } from '../middleware/rateLimiter';
import { createHmac, randomUUID } from 'crypto';

const router = Router();

const GUEST_CHAT_SECRET = process.env.GUEST_CHAT_SECRET || 'guest-chat-secret-change-in-prod';
const MAX_GUEST_MESSAGES = 10;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function signGuestToken(sessionId: string, ip: string): string {
  const payload = JSON.stringify({ sessionId, createdAt: Date.now(), ip });
  const sig = createHmac('sha256', GUEST_CHAT_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + sig;
}

export function verifyGuestToken(token: string, ip: string): { sessionId: string; createdAt: number } | null {
  try {
    const [payloadB64, sig] = token.split('.');
    const payload = Buffer.from(payloadB64, 'base64').toString();
    const expectedSig = createHmac('sha256', GUEST_CHAT_SECRET).update(payload).digest('hex');
    if (sig !== expectedSig) return null;
    const parsed = JSON.parse(payload);
    if (Date.now() - parsed.createdAt > TOKEN_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

// POST /api/v1/chat/guest/start — issues signed session token
// Rate limited: 3 sessions per IP per hour
router.post(
  '/start',
  rateLimiter(3, 3600),
  (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    const sessionId = randomUUID();
    const token = signGuestToken(sessionId, ip);
    res.json({ success: true, data: { sessionId, token, maxMessages: MAX_GUEST_MESSAGES } });
  }
);

export { MAX_GUEST_MESSAGES, router };
export default router;
```

**Register in `backend/src/index.ts`** (add after existing routes, around line 170):
```typescript
import guestChatRoutes from './routes/guestChat';
// ...
app.use('/api/v1/chat/guest', guestChatRoutes);
```

**Mirror `backend/dist/routes/guestChat.js`** — compile the TypeScript above to JS manually (see pattern from other dist files).

**Mirror `backend/dist/index.js`** — add the same route registration.

**How to verify:**
```bash
curl -s -X POST http://localhost:4000/api/v1/chat/guest/start \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['success'], len(d['data']['token']) > 10)"
# Expected: True True
```

**Commit:** `feat: guest chat session token endpoint with rate limiting`

---

## Task 3: Guest chat message endpoint (backend AI streaming)

**Files:**
- Modify: `backend/src/routes/guestChat.ts` (add message route)
- Modify: `backend/dist/routes/guestChat.js` (mirror)

**What it does:**
- `POST /api/v1/chat/guest/message`
- No auth middleware
- Rate limited: 30 requests/IP/hour (second layer beyond session token)
- Validates session token (HMAC, expiry, IP match — IP check is soft: log mismatch but allow, since proxies/mobile IPs can shift)
- Checks message count from Redis: `guest_msg_count:<sessionId>` — if >= MAX_GUEST_MESSAGES, return 429
- Retrieves prior conversation context from Redis: `guest_context:<sessionId>`
- Calculates chart from inline birth data (if provided in first message): calls `calculateNatalChart`, caches result in Redis as `guest_chart:<sessionId>` (TTL 24h)
- Builds system prompt with `buildSystemPrompt({ chartSummary, language })`
- Streams response via SSE using `streamChatCompletion`
- After response: increments message count, stores updated context in Redis

**Add to `backend/src/routes/guestChat.ts`:**

```typescript
import { calculateNatalChart, BirthDataInput } from '../services/astrology';
import { buildSystemPrompt, generateChartSummary } from '../services/llm-helpers';
import { streamChatCompletion } from '../services/llm';
import { redisClient } from '../utils/redis';

interface GuestBirthData {
  birthDate: string;    // ISO YYYY-MM-DD
  birthTime: string | null; // HH:MM or null
  latitude: number;
  longitude: number;
  timezone?: string;
}

// POST /api/v1/chat/guest/message — streaming AI response for guests
// Rate limited: 30/IP/hour
router.post(
  '/message',
  rateLimiter(30, 3600),
  async (req: Request, res: Response) => {
    const { token, sessionId, content, birthData } = req.body as {
      token: string;
      sessionId: string;
      content: string;
      birthData?: GuestBirthData;
    };

    // Validate inputs
    if (!token || !sessionId || !content?.trim()) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'token, sessionId, and content are required' } });
      return;
    }

    // Verify session token
    const tokenData = verifyGuestToken(token, req.ip || 'unknown');
    if (!tokenData || tokenData.sessionId !== sessionId) {
      res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired session token' } });
      return;
    }

    // Check message count
    const countKey = `guest_msg_count:${sessionId}`;
    const countStr = await redisClient.get(countKey) || '0';
    const count = parseInt(countStr, 10);
    if (count >= MAX_GUEST_MESSAGES) {
      res.status(429).json({ success: false, error: { code: 'GUEST_LIMIT_REACHED', message: 'Guest message limit reached. Create a free account to continue.', maxMessages: MAX_GUEST_MESSAGES } });
      return;
    }

    // Get or compute chart summary
    let chartSummary: string | undefined;
    const chartKey = `guest_chart:${sessionId}`;
    const cachedChart = await redisClient.get(chartKey);
    if (cachedChart) {
      chartSummary = cachedChart;
    } else if (birthData) {
      try {
        const birthDate = new Date(birthData.birthDate);
        const [hour, minute] = birthData.birthTime ? birthData.birthTime.split(':').map(Number) : [12, 0];
        const birthDataInput: BirthDataInput = {
          year: birthDate.getFullYear(),
          month: birthDate.getMonth() + 1,
          day: birthDate.getDate(),
          hour: hour || 12,
          minute: minute || 0,
          latitude: birthData.latitude,
          longitude: birthData.longitude,
          timezone: birthData.timezone,
        };
        const chart = await calculateNatalChart(birthDataInput);
        chartSummary = generateChartSummary(chart, 'en');
        // Cache for 24 hours so we don't recompute on every message
        await redisClient.setEx(chartKey, 86400, chartSummary);
      } catch (err) {
        console.error('[GuestChat] Chart calculation error (non-blocking):', err);
      }
    }

    // Get prior conversation context from Redis
    const contextKey = `guest_context:${sessionId}`;
    const contextStr = await redisClient.get(contextKey);
    const conversationHistory: Array<{ role: string; content: string }> = contextStr ? JSON.parse(contextStr) : [];

    // Build system prompt (same astrologer master prompt as authenticated chat)
    const systemPrompt = buildSystemPrompt({ chartSummary, language: 'en' });

    // Build messages array
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: content.trim() },
    ];

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Stream AI response (no tools for guest — chart is in system prompt)
    let fullResponse = '';
    try {
      fullResponse = await streamChatCompletion({
        messages,
        model: process.env.DEFAULT_AI_MODEL || 'claude-sonnet-4-6',
        userId: `guest:${sessionId}`,
        sessionId,
        tools: {},  // No agent tools for guests
        res,
      });
    } catch (err) {
      console.error('[GuestChat] Stream error:', err);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream error' })}\n\n`);
      res.end();
      return;
    }

    // Update context and message count in Redis (TTL 24h)
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: content.trim() },
      { role: 'assistant', content: fullResponse },
    ].slice(-20); // Keep last 20 messages max
    await redisClient.setEx(contextKey, 86400, JSON.stringify(updatedHistory));
    await redisClient.setEx(countKey, 86400, String(count + 1));
  }
);
```

**How to verify:**
```bash
# 1. Get token
TOKEN_RESP=$(curl -s -X POST http://localhost:4000/api/v1/chat/guest/start)
TOKEN=$(echo $TOKEN_RESP | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['token'])")
SID=$(echo $TOKEN_RESP | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['sessionId'])")

# 2. Send a message (should stream SSE)
curl -s -X POST http://localhost:4000/api/v1/chat/guest/message \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"sessionId\":\"$SID\",\"content\":\"Hello oracle\",\"birthData\":{\"birthDate\":\"1990-10-15\",\"birthTime\":\"14:30\",\"latitude\":42.698,\"longitude\":23.322}}" \
  | head -5
# Expected: data: {"type":"metadata",...} then data: {"type":"chunk","content":"..."} ...
```

**Commit:** `feat: guest chat message endpoint with AI streaming and Redis context`

---

## Task 4: Logged-in user detection + beautiful countdown redirect

**Files:**
- Modify: `frontend/src/components/home/visitor-chat.tsx`

**What to add at top of component (before return):**

```tsx
import { useAuth } from '@/lib/auth-context';
import { useRouter } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion'; // already imported
import { useEffect, useState } from 'react'; // already imported

// Inside the component, at the top:
const { user, isAuthenticated, isLoading: authLoading } = useAuth();
const router = useRouter();
const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

useEffect(() => {
  if (authLoading || !isAuthenticated) return;
  // User is logged in — start oracle recognition sequence
  setRedirectCountdown(5);
}, [isAuthenticated, authLoading]);

useEffect(() => {
  if (redirectCountdown === null) return;
  if (redirectCountdown === 0) {
    router.push('/chat');
    return;
  }
  const timer = setTimeout(() => setRedirectCountdown(c => (c !== null ? c - 1 : null)), 1000);
  return () => clearTimeout(timer);
}, [redirectCountdown, router]);
```

**Replace the entire return JSX with a conditional:**

```tsx
// If logged-in redirect is in progress, show the oracle recognition screen
if (isAuthenticated && redirectCountdown !== null) {
  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Seeker';
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6">
      {/* Oracle glyph — same as OracleWelcome */}
      <div className="relative mb-8">
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(228,26,255,0.20) 0%, transparent 70%)', filter: 'blur(32px)', transform: 'scale(2.5)' }}
        />
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(228,26,255,0.08)', border: '1px solid rgba(228,26,255,0.30)' }}
        >
          <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 12px rgba(228,26,255,0.8))' }}>✦</span>
        </div>
      </div>

      {/* Oracle message */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center text-base text-white/90 max-w-xs leading-relaxed mb-10"
      >
        <span className="text-primary font-medium">{firstName}</span>
        {' '}— I recognize you. Let me take you to{' '}
        <span className="text-primary font-semibold">The Inner Sanctum</span>.
      </motion.p>

      {/* Countdown */}
      <motion.div
        key={redirectCountdown}
        initial={{ opacity: 0, scale: 1.4 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.4 }}
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold text-primary"
        style={{ border: '2px solid rgba(228,26,255,0.40)', background: 'rgba(228,26,255,0.06)', boxShadow: '0 0 28px rgba(228,26,255,0.18)' }}
      >
        {redirectCountdown}
      </motion.div>

      <p className="text-xs text-text-muted mt-4">Taking you inside...</p>
    </div>
  );
}
```

**The existing guest chat JSX remains unchanged below this block.**

**How to verify:**
- Log in, visit `/` (homepage)
- Should see oracle glyph, "Victor — I recognize you. Let me take you to The Inner Sanctum."
- Countdown 5 → 4 → 3 → 2 → 1 → redirect to `/chat`

**Commit:** `feat: logged-in user recognition + countdown redirect from homepage oracle`

---

## Task 5: Rewrite visitor-chat.tsx to use real AI (guest flow)

**Files:**
- Modify: `frontend/src/components/home/visitor-chat.tsx`

This is the biggest frontend change. The component keeps the same visual structure but replaces all mock setTimeout logic with real SSE streaming calls.

**Key changes:**

1. **On mount**: call `POST /api/v1/chat/guest/start` to get session token. Store `{ sessionId, token }` in localStorage under `astrologaai_guest_session`.

2. **`handleBirthData`**: still saves to `GUEST_BIRTH_KEY` localStorage. No change here.

3. **`sendMessage`**: instead of setTimeout + `ORACLE_RESPONSES`, call `POST /api/v1/chat/guest/message` with SSE streaming. Include `birthData` from localStorage on every request so the backend can use/refresh chart context.

4. **SSE streaming in frontend**: Use `fetch` with `ReadableStream` — same pattern as the existing SSE fallback in `chat-context-ws.tsx`.

**New state to add:**
```tsx
const [sessionToken, setSessionToken] = useState<{ sessionId: string; token: string } | null>(null);
const [streamingContent, setStreamingContent] = useState('');
```

**On mount (add to existing useEffect):**
```tsx
useEffect(() => {
  if (typeof window === 'undefined') return;
  // If logged in, skip — countdown handles it
  const stored = localStorage.getItem('astrologaai_guest_session');
  if (stored) {
    try { setSessionToken(JSON.parse(stored)); return; } catch {}
  }
  // Get new session token
  fetch(`${API_URL}/api/v1/chat/guest/start`, { method: 'POST' })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        const sess = { sessionId: d.data.sessionId, token: d.data.token };
        localStorage.setItem('astrologaai_guest_session', JSON.stringify(sess));
        setSessionToken(sess);
      }
    })
    .catch(() => {}); // fail silently — user can still see oracle but won't be able to send msgs
}, []);
```

**Replace `sendMessage` setTimeout block with real SSE call:**
```tsx
const sendMessage = async () => {
  if (!input.trim() || isLoading || !birthDataCollected || isBlocked || !sessionToken) return;
  const userContent = input.trim();
  setInput('');

  const newUserCount = userCount + 1;
  setUserCount(newUserCount);
  localStorage.setItem(USER_COUNT_KEY, String(newUserCount));
  persistMessage({ role: 'user', content: userContent });
  setMessages(prev => [...prev, { role: 'user', content: userContent }]);

  if (newUserCount >= 6) { setIsBlocked(true); return; }

  setIsLoading(true);
  setStreamingContent('');

  // Get birth data for chart context
  const storedBirthData = localStorage.getItem(GUEST_BIRTH_KEY);
  const birthData = storedBirthData ? JSON.parse(storedBirthData) : null;

  try {
    const response = await fetch(`${API_URL}/api/v1/chat/guest/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: sessionToken.token,
        sessionId: sessionToken.sessionId,
        content: userContent,
        birthData: birthData ? {
          birthDate: birthData.birthDate,
          birthTime: birthData.birthTime,
          latitude: birthData.latitude,
          longitude: birthData.longitude,
        } : undefined,
      }),
    });

    if (!response.ok || !response.body) {
      const err = await response.json().catch(() => ({}));
      if (err?.error?.code === 'GUEST_LIMIT_REACHED') {
        setIsBlocked(true);
        setIsLoading(false);
        return;
      }
      throw new Error('Stream failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === 'chunk' && evt.content) {
            accumulated += evt.content;
            setStreamingContent(accumulated);
          } else if (evt.type === 'done') {
            break;
          }
        } catch {}
      }
    }

    // Finalize — move streaming content into messages
    const newOracleCount = oracleCount + 1;
    setOracleCount(newOracleCount);
    localStorage.setItem(ORACLE_COUNT_KEY, String(newOracleCount));
    persistMessage({ role: 'oracle', content: accumulated });

    const regPrompt: 'soft' | 'urgent' | undefined =
      newOracleCount === 3 ? 'soft' :
      newOracleCount === 5 ? 'urgent' :
      undefined;

    setMessages(prev => [...prev, { role: 'oracle', content: accumulated, regPrompt }]);
    setStreamingContent('');
  } catch {
    setMessages(prev => [...prev, { role: 'oracle', content: "The stars are momentarily quiet. Please try again." }]);
    setStreamingContent('');
  } finally {
    setIsLoading(false);
  }
};
```

**In the JSX render**, show `streamingContent` as a live oracle bubble when `isLoading && streamingContent`:
```tsx
{isLoading && streamingContent && (
  <div className="flex justify-start">
    <div className="px-4 py-3 rounded-2xl text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-w-[85%]"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {streamingContent}
    </div>
  </div>
)}
```

**Remove `ORACLE_RESPONSES` constant entirely.**

**Commit:** `feat: visitor-chat uses real AI streaming via guest endpoint`

---

## Task 6: Guest → registered session migration on sign-up

**Files:**
- Modify: `frontend/src/lib/auth-context.tsx` (in `signUp()` function, after tokens are stored)

**Current state:** After `signUp`, existing code already tries to upload `GUEST_BIRTH_KEY` to `/api/v1/birth-data`. We need to also create a real chat session with all guest messages.

**Add after birth data upload, before `router.push('/chat')`:**

```typescript
// Migrate guest chat session to real DB session
const guestMsgsStr = localStorage.getItem('astrologaai_guest_messages');
const guestSession = localStorage.getItem('astrologaai_guest_session');

if (guestMsgsStr && guestSession) {
  try {
    const guestMsgs: Array<{ role: string; content: string; timestamp: string }> = JSON.parse(guestMsgsStr);
    const { sessionId: guestSessionId } = JSON.parse(guestSession);

    if (guestMsgs.length > 0) {
      // Create a new chat session
      const sessionRes = await fetch(`${getApiBaseUrl()}/api/v1/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.accessToken}` },
        body: JSON.stringify({ title: 'My first reading' }),
      });
      const sessionData = await sessionRes.json();
      const newSessionId = sessionData.data?.session?.id;

      if (newSessionId) {
        // Import all guest messages in order
        // Use the import endpoint (or insert individually)
        await fetch(`${getApiBaseUrl()}/api/v1/chat/sessions/${newSessionId}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.accessToken}` },
          body: JSON.stringify({ messages: guestMsgs }),
        });

        // Also copy Redis guest context so AI has full continuity
        // (backend does this in the import endpoint)

        // Clear guest session data
        localStorage.removeItem('astrologaai_guest_messages');
        localStorage.removeItem('astrologaai_guest_session');
        localStorage.removeItem('astrologaai_guest_oracle_count');
        localStorage.removeItem('astrologaai_guest_user_count');
        // Note: GUEST_BIRTH_KEY already cleared by birth data upload step above

        // Redirect to the imported session so user lands right in their reading
        router.push(localePath(`/chat?session=${newSessionId}`));
        return;
      }
    }
  } catch (err) {
    console.error('[Auth] Guest session migration failed (non-blocking):', err);
  }
}

// Default redirect if no guest session to migrate
router.push(localePath('/chat'));
```

**This requires a new backend import endpoint (Task 7 below).**

**Commit:** `feat: migrate guest chat messages to first registered session on sign-up`

---

## Task 7: Backend — chat session import endpoint

**Files:**
- Modify: `backend/src/routes/chat.ts` (add import route)
- Modify: `backend/dist/routes/chat.js` (mirror)
- Modify: `backend/src/controllers/chatController.ts` (add `importGuestMessages` handler)
- Modify: `backend/dist/controllers/chatController.js` (mirror)

**What it does:**
- `POST /api/v1/chat/sessions/:id/import`
- Auth required
- Accepts `{ messages: Array<{ role: string; content: string; timestamp?: string }> }`
- Validates messages are `user` or `oracle`/`assistant` roles
- Inserts all messages into `chat_messages` table for the session
- Copies Redis guest context to authenticated session context so AI retains memory

**Handler in `chatController.ts`:**

```typescript
export async function importGuestMessages(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { id: sessionId } = req.params;
  const { messages } = req.body as {
    messages: Array<{ role: string; content: string; timestamp?: string }>;
  };

  if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } }); return; }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'messages array required' } }); return;
  }

  // Verify session belongs to user
  const session = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }

  // Normalize roles: 'oracle' → 'assistant'
  const normalizedMsgs = messages
    .filter(m => m.content?.trim())
    .map(m => ({
      sessionId,
      role: m.role === 'oracle' ? 'ASSISTANT' : 'USER',
      content: m.content.trim(),
      createdAt: m.timestamp ? new Date(m.timestamp) : undefined,
    }));

  await prisma.chatMessage.createMany({ data: normalizedMsgs });

  // Update session title if still default
  if (!session.title || session.title === 'New conversation') {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: 'My first reading', updatedAt: new Date() },
    });
  }

  console.log(`[Chat] Imported ${normalizedMsgs.length} guest messages to session ${sessionId}`);

  res.json({ success: true, data: { imported: normalizedMsgs.length } });
}
```

**Add route in `chat.ts`:**
```typescript
router.post('/sessions/:id/import', authMiddleware, importGuestMessages);
```

**Commit:** `feat: chat session guest message import endpoint`

---

## Task 8: Fix autoscroll — scroll-container-aware, only when at bottom

**Files:**
- Modify: `frontend/src/components/chat/message-list.tsx`

**Replace the entire scroll logic:**

```tsx
const containerRef = useRef<HTMLDivElement>(null);
const bottomRef = useRef<HTMLDivElement>(null);
const isAtBottomRef = useRef(true);

// Track whether user is near the bottom
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const el = e.currentTarget;
  isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;

  // Load more when scrolled to very top
  if (el.scrollTop < 50 && hasMoreMessages && !isLoadingMore) {
    onLoadMore();
  }
};

// Scroll to bottom only when user is already at the bottom
useEffect(() => {
  if (isLoadingMore) return;
  if (isAtBottomRef.current) {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}, [messages, isLoadingMore]);

// During streaming: only scroll when at bottom, but debounced (not every token)
const streamScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
useEffect(() => {
  if (!isStreaming || !streamingContent) return;
  if (!isAtBottomRef.current) return;
  if (streamScrollTimer.current) clearTimeout(streamScrollTimer.current);
  streamScrollTimer.current = setTimeout(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 150);
  return () => {
    if (streamScrollTimer.current) clearTimeout(streamScrollTimer.current);
  };
}, [streamingContent, isStreaming]);
```

**Apply `containerRef` to the scrollable div:**
```tsx
<div
  ref={containerRef}
  className="flex-1 overflow-y-auto px-4 py-6 space-y-5"
  onScroll={handleScroll}
>
```

**Key behavior changes:**
- No autoscroll if user has scrolled up (reading history)
- Streaming tokens: scroll only every 150ms max (not every token), only if at bottom
- New message arrives: scroll only if already at bottom
- Load older messages: no scroll (preserves position)
- `scrollIntoView` with `block: 'end'` scrolls within container, not outer viewport

**Commit:** `fix: autoscroll only when at bottom, debounced during streaming`

---

## Task 9: Add GUEST_CHAT_SECRET to backend .env and Railway

**Files:**
- Modify: `backend/.env` (local dev)

**Add:**
```
GUEST_CHAT_SECRET=<generate with: openssl rand -hex 32>
```

**Railway:** Add `GUEST_CHAT_SECRET` env var to the Railway backend service.

**Note in memory:** Railway env var needs to be set manually.

**Commit:** `chore: document GUEST_CHAT_SECRET env var requirement`

---

## Deferred — Track in Roadmap

**Advanced bot protection (Cloudflare Turnstile):**
- Add invisible CAPTCHA challenge on `POST /api/v1/chat/guest/start`
- Turnstile token sent from frontend with session start request
- Backend verifies with Cloudflare API before issuing session token
- Blocks automated bot farms while keeping UX seamless for real users
- **Priority:** Implement when guest usage exceeds ~100 sessions/day or if abuse is detected
- Estimated effort: 1 day (Cloudflare account + 2 code changes)

---

## Execution Order

Run tasks 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 in sequence. Each builds on the previous.

Tasks 1 and 8 are independent and can be done in any order (no dependencies).
Tasks 2 and 3 must come before Task 5.
Tasks 6 and 7 must come together.
