# ARCH-01 — WebSocket → HTTP POST + SSE Migration Plan
> Status: READY TO IMPLEMENT
> Context: Clear this after reading. Implement step by step, commit after each phase.

---

## WHY THIS IS SAFE

The SSE path **already exists and works**:
- Backend: `POST /api/v1/chat/message` in `chatController.ts` already streams SSE (lines 379–504)
- Frontend: `sendMessageSSE()` in `chat-context-ws.tsx` (lines 438–548) already reads the stream

WebSocket is used **ONLY for chat** — no other feature touches it. Zero risk to any other functionality.

---

## COMPLETE FILE MANIFEST

### DELETE these files entirely:
- `frontend/src/lib/socket-client.ts`
- `backend/src/socket/index.ts`
- `backend/src/socket/chat-handler.ts`

### REWRITE these files:
- `frontend/src/lib/chat-context-ws.tsx` — remove all WS code, promote SSE path to primary
- `frontend/src/components/chat/connection-status.tsx` — simplify (no more reconnecting state)

### EDIT these files (targeted changes):
- `backend/src/index.ts` — remove Socket.io init, revert to plain `app.listen`
- `backend/src/controllers/chatController.ts` — add abort/cancel support
- `frontend/src/components/chat/chat-window.tsx` — remove WS-specific context props usage
- `frontend/package.json` — remove `socket.io-client`
- `backend/package.json` — remove `socket.io`

### NO CHANGES NEEDED:
- `frontend/src/lib/chat-context.tsx` — just re-exports, unchanged
- `frontend/src/components/chat/message-list.tsx` — no WS deps
- `frontend/src/components/chat/message-item.tsx` — no WS deps
- `frontend/src/components/chat/chat-input-bar.tsx` — uses `sendMessage` + `cancelGeneration` only (check for queuedMessagesCount reference)

---

## PHASE 1 — Backend Cleanup

### 1A. Edit `backend/src/index.ts`

**Remove these imports (lines 40–41):**
```ts
import { initializeSocketServer, registerChatHandlers } from './socket';
import type { AuthenticatedSocket } from './socket';
```

**Remove this import (line 13):**
```ts
import { createServer } from 'http';
```

**Remove this line (line 57):**
```ts
const httpServer = createServer(app);
```

**Remove the entire Socket.io section (lines 266–274):**
```ts
// ============================================
// INITIALIZE SOCKET.IO
// ============================================
const io = initializeSocketServer(httpServer);
io.on('connection', (socket: AuthenticatedSocket) => {
  registerChatHandlers(socket);
});
```

**Change `httpServer.listen` → `app.listen` (line 280):**
```ts
// BEFORE:
httpServer.listen(PORT, () => {

// AFTER:
app.listen(PORT, () => {
```

**Update health endpoint (line 121–128) — remove websocket field:**
```ts
// BEFORE:
res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0', websocket: 'enabled' });

// AFTER:
res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
```

**Update startup log (line 287):**
```ts
// Remove this line:
console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
```

**Update exports (line 308):**
```ts
// BEFORE:
export default app;
export { httpServer, io };

// AFTER:
export default app;
```

### 1B. Edit `backend/src/controllers/chatController.ts` — add abort support

In `sendMessage` handler, right after `res.setHeader('X-Accel-Buffering', 'no');` and before the `for await` loop, add:

```ts
// Handle client disconnect — abort the stream
let aborted = false;
req.on('close', () => { aborted = true; });
```

Inside the `for await (const chunk of streamChatCompletion(messages))` loop, add abort check at the top:

```ts
for await (const chunk of streamChatCompletion(messages)) {
  if (aborted) break;  // ← ADD THIS LINE FIRST
  if (chunk.error) {
    // ... existing code
```

### 1C. Delete `backend/src/socket/` directory

Delete both files:
- `backend/src/socket/index.ts`
- `backend/src/socket/chat-handler.ts`

### 1D. Remove socket.io from backend

```bash
cd backend && npm uninstall socket.io
```

---

## PHASE 2 — Frontend: Rewrite `chat-context-ws.tsx`

This is the main work. The new file keeps ALL the HTTP logic, removes ALL WebSocket logic.

**New `ChatContextType` interface** — remove these fields:
- `connectionState: ConnectionState` → replace with `connectionState: 'connected' | 'error'`
- `useWebSocket: boolean` → REMOVE
- `queuedMessagesCount: number` → REMOVE
- `reconnect: () => Promise<void>` → REMOVE
- `toggleWebSocket: (enabled: boolean) => void` → REMOVE

**New `ChatContextType` interface** — keep these fields (unchanged):
- `currentSession`, `messages`, `isLoading`, `isStreaming`, `streamingContent`
- `error`, `usage`, `hasMoreMessages`, `isLoadingMore`
- `createSession`, `loadSession`, `loadMoreMessages`, `sendMessage`
- `clearError`, `resetChat`, `startNewConversation`, `cancelGeneration`

**New state in `ChatProvider`** — remove:
- `connectionState` state (replace with constant `'connected'`)
- `useWebSocket` state
- `queuedMessagesCount` state
- `socketInitialized` ref

**New state in `ChatProvider`** — add:
- `abortControllerRef = useRef<AbortController | null>(null)`

**Remove these functions entirely:**
- `initializeWebSocket()`
- `sendMessageWebSocket()`
- `reconnect()`
- `toggleWebSocket()`

**Remove these useEffects entirely:**
- The queued count update interval (`setInterval(updateQueuedCount, 5000)`)
- The WS preference loader (`localStorage.getItem(USE_WEBSOCKET_KEY)`)
- The WS initializer (`if (useWebSocket && getAccessToken()) initializeWebSocket()`)
- The conversation subscriber (`getSocketClient().subscribeToConversation(...)`)

**Rename `sendMessageSSE` → `sendMessage`** and enhance it:

Add AbortController support to the fetch call:
```ts
// Create new AbortController for this request
abortControllerRef.current = new AbortController();

const response = await fetch(`${API_URL}/api/v1/chat/message`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ content, sessionId }),
  signal: abortControllerRef.current.signal,  // ← ADD THIS
});
```

Fix the SSE event parser to handle named events (current parser misses `event: error` and `event: complete`):

```ts
// Replace the simple line parser with an event-aware parser:
let currentEvent = '';
for (const line of lines) {
  if (line.startsWith('event: ')) {
    currentEvent = line.slice(7).trim();
  } else if (line.startsWith('data: ')) {
    const dataStr = line.slice(6);
    try {
      const data = JSON.parse(dataStr);

      if (currentEvent === 'metadata' || data.rateLimit) {
        // Rate limit info from metadata event
        if (data.rateLimit) {
          setUsage(prev => prev ? {
            ...prev,
            remaining: data.rateLimit.remaining,
            used: typeof prev.used === 'number' ? prev.used + 1 : prev.used,
          } : null);
        }
      } else if (currentEvent === 'chunk' || (data.content && !data.done)) {
        // Token chunk
        assistantContent += data.content;
        setStreamingContent(assistantContent);
      } else if (currentEvent === 'error') {
        // Stream error from backend
        setError(data.message || 'Stream error');
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      } else if (currentEvent === 'complete' || data.messageId) {
        // Stream complete
        assistantMessageId = data.messageId || assistantMessageId;
      }
    } catch {
      // Skip invalid JSON
    }
    currentEvent = ''; // Reset after consuming data
  }
}
```

Wrap the entire fetch in try/catch that handles AbortError gracefully:
```ts
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') {
    // User cancelled — keep the partial content if any, don't show error
    if (assistantContent) {
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantContent + ' [cancelled]',
        createdAt: new Date().toISOString(),
      }]);
    } else {
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    }
  } else {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    setError(message);
    setMessages(prev => prev.filter(m => m.id !== userMessage.id));
  }
} finally {
  setIsStreaming(false);
  setStreamingContent('');
  abortControllerRef.current = null;
}
```

**Update `cancelGeneration`:**
```ts
const cancelGeneration = useCallback(() => {
  abortControllerRef.current?.abort();
  setIsStreaming(false);
  setStreamingContent('');
}, []);
```

**Update `sendMessage`** — remove the WS/SSE routing logic, just call SSE directly:
```ts
const sendMessage = useCallback(async (content: string): Promise<void> => {
  let sessionId = currentSession?.id;
  if (!sessionId) {
    const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
    if (storedSessionId) {
      sessionId = storedSessionId;
    } else {
      try {
        const newSession = await createSession();
        sessionId = newSession.id;
      } catch {
        setError('Failed to create chat session');
        return;
      }
    }
  }
  await sendMessageSSE(content, sessionId);  // renamed internal function
}, [currentSession, createSession, sendMessageSSE]);
```

**Update context value** — remove WS-specific fields:
```ts
// Remove from value object:
// connectionState — replace with 'connected' constant
// useWebSocket
// queuedMessagesCount
// reconnect
// toggleWebSocket

// Keep providing connectionState for backward compat but hardcode it:
connectionState: 'connected' as const,
```

**Remove imports:**
```ts
// Remove entire import:
import {
  getSocketClient,
  initializeSocketClient,
  disconnectSocketClient,
  ConnectionState
} from '@/lib/socket-client';
```

**Remove constants:**
```ts
// Remove:
const USE_WEBSOCKET_KEY = 'astrologaai_use_websocket';
```

---

## PHASE 3 — Frontend: Simplify `connection-status.tsx`

The component imports `ConnectionState` from `socket-client` which is being deleted.

**Option A (recommended):** Delete `connection-status.tsx` entirely if `chat-window.tsx` and `chat-input-bar.tsx` can be checked to not render it for a `'connected'` state (since with SSE we're always "connected" per HTTP).

**Option B:** Inline the type and simplify:

Replace the import:
```ts
// REMOVE:
import { ConnectionState } from '@/lib/socket-client';

// ADD:
type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
```

This keeps the component working but it will always receive `'connected'` from context so it effectively renders nothing or the green dot.

---

## PHASE 4 — Frontend: Clean up `chat-window.tsx`

Check and remove any usage of:
- `queuedMessagesCount` from `useChat()`
- `useWebSocket` from `useChat()`
- `reconnect` from `useChat()`
- `toggleWebSocket` from `useChat()`
- Any rendering of `<ConnectionStatus>` or `<ConnectionBanner>` that relies on disconnected states

If `ConnectionBanner` is rendered, it will never show (since state is always `'connected'`), which is fine — but remove the import if it's only used for disconnected states.

---

## PHASE 5 — Package cleanup

```bash
# Backend
cd /home/victor/.openclaw/workspace/astrologaai/backend
npm uninstall socket.io

# Frontend
cd /home/victor/.openclaw/workspace/astrologaai/frontend
npm uninstall socket.io-client
```

---

## PHASE 6 — TypeScript compile check

```bash
cd /home/victor/.openclaw/workspace/astrologaai/backend && npx tsc --noEmit
cd /home/victor/.openclaw/workspace/astrologaai/frontend && npx tsc --noEmit
```

Both should exit with 0 errors.

---

## TESTING AFTER IMPLEMENTATION

1. Send a message in chat → should stream normally
2. Send a second message in same session → streaming should work
3. Start a new chat (`+ New Chat`) → new session created, chat works
4. Load a previous session from history → messages load, new messages stream
5. Cancel a streaming message → stream stops, partial content preserved or removed cleanly
6. Rate limit display → usage counter updates after each message
7. Check Railway logs — no Socket.io errors

---

## WHAT IS INTENTIONALLY REMOVED (NOT BUGS)

- **Auto-reconnect**: HTTP requests never "reconnect" — they just succeed or fail. No reconnection loop needed.
- **Message queue during disconnect**: Network failure = request fails. User sees error, text preserved in input (BUG-14 fix handles this). User can resend.
- **Typing indicators**: Were WebSocket broadcasts between sockets. Removed. The Oracle's streaming response IS the typing indicator.
- **`queuedMessagesCount` UI**: No queue exists. The counter showed 0 most of the time anyway.
- **`useWebSocket` toggle**: The hidden debug toggle in the UI can be removed.

---

## SSE EVENT FORMAT REFERENCE (backend → frontend)

```
event: metadata
data: {"sessionId":"xxx","messageId":"xxx","rateLimit":{"remaining":9,"limit":10}}

event: chunk
data: {"content":"token text here","done":false}

event: chunk
data: {"content":"","done":true}

event: error
data: {"message":"Error description"}

event: complete
data: {"messageId":"xxx","content":"full response","hasError":false,"provider":"anthropic","latencyMs":2341}
```

---

## NOTES

- `chat-context.tsx` re-exports only `ChatProvider` and `useChat` — no changes needed there
- The `SESSION_ID_KEY` localStorage management stays unchanged
- All REST endpoints (sessions CRUD, history, usage) are already HTTP — unchanged
- `startNewConversation` and `createSession` are already HTTP — unchanged
- Redis session context caching continues to work identically (backend unchanged)
