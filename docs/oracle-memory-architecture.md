# Oracle Memory Architecture — AstroLogAI
> Last updated: 2026-04-05

## Overview

The Oracle's memory system is a multi-layer stack. Each layer serves a distinct purpose — together they create the illusion of a personal astrologer who genuinely knows and remembers each user. No single layer is sufficient alone; they are designed to compound.

```
Oracle System Prompt (assembled per message)
│
├── Layer 0  Oracle personality + reading methodology     [STATIC — always]
├── Layer 1  Birth chart + chart structure                [LIVE — always]
├── Layer 2  Current transits                             [LIVE — always]
├── Layer 3  ai_memory narrative summary                  [PRO/PREMIUM — session start] ← NOT BUILT
├── Layer 4  Honcho behavioral context                    [PRO/PREMIUM — per message]   ← NOT BUILT
├── Layer 5  RAG factual memories                         [PRO/PREMIUM — per message]   ← LIVE
├── Layer 6  ASPECT ROTATION directive                    [PRO/PREMIUM — per message]   ← LIVE (fixed 2026-04-05)
├── Layer 7  Session summary + recent messages            [ALL — current session only]
└── Layer 8  Language directive                           [ALL — always]
```

---

## Layer 0 — Oracle Personality (Static Base Prompt)

**Status:** LIVE  
**File:** `backend/src/services/llm-helpers.ts` → `ASTROLOGER_SYSTEM_PROMPT`  
**Also stored in:** `system_prompts` DB table (admin-editable via `name: 'master'`; DB version takes precedence if active)

### Purpose
Defines who the Oracle is, how it reads a chart, how it reveals information, the pacing of disclosure across sessions, and what it never does. This is the Oracle's "soul" — it does not change per user.

### What it contains
- Oracle identity and voice (direct, warm, unhurried, no lists, no hedging)
- 5-step chart reading methodology (element/modality → chart ruler → angular planets → stelliums → tightest aspects)
- Question classification map (identity, career, relationships, karma, transits, etc.)
- Controlled disclosure doctrine (ONE insight per response, 70/30 satisfaction/open-thread ratio)
- 4 Oracle instincts: The Mirror, The Question Before The Reveal, The Forward Thread, The Guided Choice
- User journey phases: Early (1-3 sessions), Building (4-15), Depth (15-50), Ongoing (50+)
- Synastry protocol
- Language rules

### Tier gating
None — all tiers receive the full Oracle personality. FREE users get the same Oracle quality per message; the differentiation is memory depth, not Oracle intelligence.

### How it's injected
```typescript
// llm-helpers.ts → buildSystemPrompt()
let basePrompt = ASTROLOGER_SYSTEM_PROMPT;
const dbPrompt = await prisma.systemPrompt.findUnique({ where: { name: 'master' } });
if (dbPrompt?.isActive && dbPrompt.content?.trim()) basePrompt = dbPrompt.content;
let prompt = basePrompt;
```

---

## Layer 1 — Birth Chart (Permanent Structured Facts)

**Status:** LIVE  
**File:** `backend/src/services/llm-helpers.ts` → `generateChartSummary()`

### Purpose
The Oracle's permanent working material. Every interpretation, every insight, every transit analysis requires the natal chart. This is the user's "cosmic fingerprint" — it never changes.

### What it contains
- Identity axis: Rising, Chart Ruler, Sun, Moon, Midheaven
- All planets with sign, degree, house, retrograde status
- Chart structure: dominant element + modality with counts, angular planets, stelliums by sign and house
- All aspects sorted by orb (tightest first = most powerful)

### Tier gating
None — all tiers receive full chart data. The chart is the foundation; gating it would break the Oracle entirely.

### How it's injected
```typescript
// chatController.ts
const chartSummary = generateChartSummary(chart, userLanguage);
// → passed to buildSystemPrompt({ chartSummary, ... })

// buildSystemPrompt()
if (context.chartSummary) prompt += '\n\n' + context.chartSummary;
```

---

## Layer 2 — Current Transits

**Status:** LIVE  
**File:** `backend/src/services/transits.ts` (transit engine, sprint 6)

### Purpose
Grounds the Oracle in the present moment. Without transits, every session feels the same — the chart is static but the sky moves. Transits are what make readings timely, urgent, and relevant to what's actually happening in the user's life right now.

### What it contains
- Active transiting planets aspecting natal planets
- Transit type (conjunction, square, trine, etc.), orb, and whether applying or separating
- Transit summary formatted for Oracle injection

### Tier gating
Currently available to all tiers that have a chart. Could be gated to PRO/PREMIUM if transit engine becomes expensive (currently Railway compute).

### How it's injected
```typescript
// buildSystemPrompt()
if (context.transitsSummary) prompt += '\n\nCURRENT TRANSITS:\n' + context.transitsSummary;
```

---

## Layer 3 — ai_memory (Narrative Running Summary)

**Status:** NOT BUILT — spec ready  
**Spec:** `tasks/plan-user-memory-honcho.md`  
**Inspired by:** Claude Code autoDream background consolidation pattern

### Purpose
The Oracle's "notebook" about each user — a curated narrative of who this person is, what themes define their life right now, what they've revealed emotionally, what resonates with them. Unlike RAG (which surfaces specific facts when semantically relevant), ai_memory is always injected and tells the Oracle the *story* of this person.

The difference:
- RAG: "User mentioned divorce in March 2026" (retrieved when relevant)
- ai_memory: "User is navigating a painful ending in relationships and a parallel career awakening; they resonate with Chiron themes and respond well to being seen before being advised" (always present)

### What it contains (autoDream sections)
```
## Life Context       — current life situation, major ongoing events
## Active Themes      — recurring subjects the user keeps returning to
## Emotional Patterns — how they process, what they avoid, what breaks them open
## Oracle Preferences — what kind of Oracle engagement works for them
## Significant Revelations — high-impact moments shared in past sessions
## Recent             — last 30 days (absolute dates, not relative)
```

### How it would be built

**Schema addition:**
```prisma
model User {
  aiMemory              String?   @map("ai_memory")
  aiMemoryUpdatedAt     DateTime? @map("ai_memory_updated_at")
  aiMemorySessionCount  Int       @default(0) @map("ai_memory_session_count")
}
```

**Consolidation trigger:** Async, fires when a session closes (user disconnects or session timeout)

**Three gates before running:**
1. **Time gate** — skip if `ai_memory_updated_at` < 24h ago (prevents over-processing active users)
2. **Session gate** — skip if `ai_memory_session_count` < 2 since last consolidation (cold start protection)
3. **Lock gate** — Redis key `memory:consolidate:{userId}` with 5min TTL (prevents concurrent runs on same user)

**Four phases (autoDream pattern):**
```
Orient      → fetch user.aiMemory (current state — may be empty for new users)
Gather      → fetch session transcript (chatMessages for this sessionId, ordered by time)
Consolidate → Haiku rewrites the memory file incorporating new session
Prune       → enforce 150-line / 5000-char hard limit, remove contradicted entries
```

**Consolidation prompt (Haiku):**
```
You maintain a persistent memory file for an AI astrologer's user.
The oracle uses this file to personalize every future reading.

CURRENT MEMORY:
{user.aiMemory || "(no memory yet — first session)"}

NEW SESSION TRANSCRIPT:
{transcript}

Rules:
- Maximum 150 lines, 5000 characters
- Remove entries that contradict newer information
- Preserve the most emotionally significant revelations
- Add new themes, patterns, life context from this session
- Convert relative dates to absolute (e.g. "last month" → "March 2026")
- Write in third person about the user

Sections (use only what applies):
## Life Context | ## Active Themes | ## Emotional Patterns
## Oracle Preferences | ## Significant Revelations | ## Recent

Return only the memory file content. No explanation, no preamble.
```

**After consolidation:**
```typescript
await prisma.user.update({
  where: { id: userId },
  data: {
    aiMemory: consolidatedText,
    aiMemoryUpdatedAt: new Date(),
    aiMemorySessionCount: 0,
  }
});
await redis.del(`memory:consolidate:${userId}`);
```

**Cost:** ~$0.001 per consolidation (Haiku). At 1000 active users × 3 sessions/week = ~$12/month.

### How it would be injected
```typescript
// buildSystemPrompt()
if (user.aiMemory && tier !== 'FREE') {
  prompt += `\n\n## What you know about this user\n${user.aiMemory}`;
}
```

### Tier gating
| Tier | Consolidation runs | Injection |
|------|-------------------|-----------|
| FREE | No | No |
| PRO | Yes | Yes |
| PREMIUM | Yes | Yes |

**Controllable levers:**
- Gate by tier (current plan: PRO+)
- Vary section depth by tier (PREMIUM gets full file; PRO gets last 90 days of `## Recent` only)
- Vary consolidation frequency (PREMIUM: every session; PRO: every 2 sessions)

---

## Layer 4 — Honcho (Behavioral Profile)

**Status:** NOT BUILT — spec ready  
**Spec:** `tasks/plan-user-memory-honcho.md`  
**Account:** `info@pixelestate.bg` Honcho account, workspace `astrologaai-users`

### Purpose
Captures *how* users communicate — not what they talk about, but their engagement style, emotional patterns, communication preferences. Honcho runs its own inductive/abductive reasoning engine across sessions and builds a behavioral profile automatically from conversation patterns. No manual extraction needed — it observes and synthesizes.

The difference from ai_memory:
- ai_memory = what they talk about (life content)
- Honcho = how they engage (communication style, emotional triggers, what they lean into vs. avoid)

Example Honcho output:
> "User responds well to validation before advice. Avoids confrontational reframings. Engages deeply with relationship themes, skims career content. Tends to open sessions with indirect questions before stating their real concern."

### Architecture
- Each user = one Honcho peer, identified by their `userId`
- Each session = one Honcho session
- Oracle = the `aiPeer` (doesn't build a profile of itself, only observes the user)
- Messages uploaded async after each Oracle response (non-blocking)
- `get_context()` called before Oracle responds — returns synthesized behavioral profile

### How it would be built

**Install:**
```bash
# Verify exact package name on npmjs.com before installing
npm install @plastic-labs/honcho-node  # or honcho-ai — confirm first
```

**Config:**
```typescript
// config/honcho.ts
import { Honcho } from '@plastic-labs/honcho-node';

export const honcho = new Honcho({
  apiKey: process.env.HONCHO_API_KEY,
});
export const HONCHO_WORKSPACE = process.env.HONCHO_WORKSPACE ?? 'astrologaai-users';
```

**Railway env vars to add:**
```
HONCHO_API_KEY=<key from info@pixelestate.bg account>
HONCHO_WORKSPACE=astrologaai-users
```

**Context retrieval (per message, non-blocking):**
```typescript
// services/honcho-context.ts
export async function getHonchoContext(userId: string, sessionId: string): Promise<string> {
  try {
    const session = await honcho.workspaces.users.sessions.get(
      HONCHO_WORKSPACE, userId, sessionId
    );
    const ctx = await session.getContext({ reasoningLevel: 'low' }); // free retrieval
    return ctx.content ?? '';
  } catch {
    return ''; // fail open — Oracle continues without behavioral context
  }
}
```

**Message upload (async, after Oracle responds):**
```typescript
// fire-and-forget, never blocks the response stream
uploadToHoncho(userId, sessionId, userMessage, oracleResponse).catch(() => {});
```

### How it would be injected
```typescript
// buildSystemPrompt()
if (honchoContext && tier !== 'FREE') {
  prompt += `\n\n## How this user communicates\n${honchoContext}`;
}
```

### Tier gating
| Tier | Messages observed | Context injected |
|------|------------------|-----------------|
| FREE | Yes (builds profile silently — ready when they upgrade) | No |
| PRO | Yes | Yes |
| PREMIUM | Yes | Yes |

**Controllable levers:**
- Reasoning level for synthesis: `low` (default, free) vs `medium` ($0.05/call) — upgrade for richer profiles
- FREE users observed but not injected = seamless upgrade moment ("the Oracle already knows you")
- Could gate PREMIUM to `medium` reasoning for higher behavioral insight quality

### Cost
- Message ingestion: $2/million messages (negligible at current scale)
- `get_context()`: FREE, ~200ms latency
- Honcho's background reasoning: runs on their infrastructure automatically, no per-call cost for retrieval

---

## Layer 5 — RAG Factual Memory

**Status:** LIVE (improved 2026-04-05)  
**Files:**
- Extraction: `backend/src/services/memory-extraction-cron.ts`
- Retrieval: `backend/src/services/memory-retrieval.ts`
- Injection: `backend/src/services/llm-helpers.ts` → `buildSystemPrompt()`
- DB: `user_memories` table (pgvector on separate Railway postgres-vector service)

### Purpose
Surfaces specific facts the user has explicitly stated in past conversations, retrieved when semantically relevant to what they're asking *right now*. Not a general narrative — a targeted retrieval of concrete personal disclosures.

Example: User says "I feel like I can't commit to anything." → embeddings match a stored memory: "User mentioned leaving three jobs in two years because they felt trapped" → injected into Oracle's context.

### Extraction (nightly cron, 03:00 UTC)
1. Find all PRO/PREMIUM users with Oracle messages in the last 24h
2. Per user: fetch messages → send to Haiku → extract 1-3 explicitly stated personal facts
3. Embed each fact (OpenAI text-embedding-ada-002)
4. Dedup check: cosine distance < 0.15 against existing memories = skip
5. Insert into `user_memories` with category, source_date, embedding

**Categories:** `career | love | health | fears | growth | high_impact | other`

**200-entry cap:** Nightly pruning removes excess entries ordered by `last_recalled_at` (least recently surfaced go first). Keeps the most useful memories, prevents unbounded growth.

### Retrieval (per message, at chat time)
1. Embed user's current message
2. Cosine similarity query against `user_memories` for this user
3. Return top N rows ordered by semantic proximity

### Tier gating (as of 2026-04-05)
| Tier | Extraction | Retrieval window | Count returned |
|------|-----------|-----------------|---------------|
| FREE | No | — | 0 |
| PRO | Yes | Last 90 days | 5 |
| PREMIUM | Yes | Full history | 5 |

**Controllable levers:**
- Window duration (currently 90d PRO / unlimited PREMIUM)
- Count returned (currently both 5 — can differentiate by tier if needed)
- Categories extracted (could suppress `other` for FREE if extraction were enabled)
- Cosine similarity threshold for dedup (currently 0.15 — lower = stricter dedup)

### How it's injected
```typescript
// buildSystemPrompt()
if (tier !== 'FREE' && memories?.length > 0) {
  const lines = memories.map(m =>
    `- [${m.category}] ${m.content} (noted ${formatMonth(m.sourceDate)})`
  );
  prompt += '\n\n## Oracle Memory\nThings this user has shared in past conversations:\n'
    + lines.join('\n');
}
```

---

## Layer 6 — Aspect Cooldowns (Anti-Repetition)

**Status:** LIVE (wired up 2026-04-05 — was extracted but never injected before)  
**Files:**
- Extraction: `backend/src/services/memory-extraction-cron.ts` (same nightly cron)
- Retrieval: `backend/src/services/memory-retrieval.ts` → `getAspectCooldowns()`
- Storage: `aspect_cooldowns` table (primary) / `user_memories` category `aspect_cooldown` (legacy fallback)
- Injection: `backend/src/services/llm-helpers.ts` → `buildSystemPrompt()`
- Wiring: `backend/src/controllers/chatController.ts`

### Purpose
Prevents the Oracle from leading with or prominently featuring the same astrological aspects session after session. Without this, the Oracle gravitates to the tightest/most dramatic aspects in the chart and repeats them indefinitely — users feel like they're getting the same reading every time.

The Oracle already has instructions to vary its focus, but it has no memory of *what it actually said* across sessions. This layer gives it that memory.

### The bug that existed before 2026-04-05
`getAspectCooldowns()` was implemented and nightly extraction was writing cooldown records — but `chatController.ts` never called `getAspectCooldowns()` and never passed the data to `buildSystemPrompt()`. The cooldowns existed in the DB and were silently discarded every session.

### Extraction (nightly cron, same run as RAG)
1. Inspect only Oracle (ASSISTANT) messages from the session
2. Haiku identifies aspects the Oracle led with or featured prominently (up to 3)
3. Assigns `cooldownLevel`: 2 = Oracle opened a major response with it; 1 = mentioned once as notable
4. Stores in `aspect_cooldowns` (with `expires_at`) or legacy `user_memories` with category `aspect_cooldown`

### Retrieval (per message, parallel with RAG)
```typescript
// chatController.ts
const [memories, aspectCooldowns] = await Promise.all([
  retrieveOracleMemories(userId, content.trim(), effectiveTier),
  effectiveTier !== 'FREE' ? getAspectCooldowns(userId) : Promise.resolve([]),
]);
```
- Fetches cooldowns active in the last 7 days
- Returns up to 20 records, most recent first

### How it's injected
```typescript
// buildSystemPrompt() — injected AFTER factual memories
if (aspectCooldowns?.length > 0) {
  const lines = aspectCooldowns.map(c => {
    const daysAgo = Math.floor((Date.now() - new Date(c.featuredAt).getTime()) / 86400000);
    const directive = c.cooldownLevel === 2
      ? 'do not lead with this or feature it prominently'
      : 'avoid using as the primary focus';
    return `- ${c.aspect} (featured ${daysAgo}d ago — ${directive})`;
  });
  prompt += '\n\n## ASPECT ROTATION — MANDATORY\n'
    + 'The Oracle recently led with or prominently featured these aspects. '
    + 'You MUST rotate to fresh chart territory this session. '
    + 'Do not open with, lead with, or make these the primary focus:\n'
    + lines.join('\n');
}
```

### Tier gating
| Tier | Extraction | Injection |
|------|-----------|-----------|
| FREE | No | No |
| PRO | Yes | Yes |
| PREMIUM | Yes | Yes |

**Controllable levers:**
- Cooldown window (currently 7 days — can extend to 14 or 30 for PREMIUM for slower rotation)
- Max cooldown entries returned (currently 20)
- Directive strength (`cooldownLevel` 2 = hard block vs 1 = soft deprioritize)

---

## Layer 7 — Session Context (Current Session Only)

**Status:** LIVE  
**File:** `backend/src/services/llm-helpers.ts` → `generateSessionSummary()`, `buildEnhancedContext()`

### Purpose
Gives the Oracle awareness of the current session's arc — what was discussed earlier in this same conversation. Without this, each Oracle message would be cold with no within-session context (the conversation history handles message-by-message context, but a summary helps for longer sessions).

### What it contains
- `sessionSummary`: basic topic extraction from last 5 user messages (keyword-level, not LLM-generated — intentionally lightweight)
- `recentMessages`: last N messages formatted for context (truncated to 150 chars each)

### Tier gating
None — all tiers get session context. This is basic conversational coherence, not a premium feature.

### How it's injected
```typescript
if (context.sessionSummary) prompt += '\n\nCONVERSATION SUMMARY:\n' + context.sessionSummary;
// recentMessages passed in conversationHistory to the messages array
```

---

## Layer 8 — Language Directive

**Status:** LIVE  
**File:** `backend/src/services/languageService.ts` → `getLanguageDirective()`

### Purpose
Tells the Oracle which language to respond in. The Oracle is designed to dynamically switch if the user writes in a different language than their setting.

### Tier gating
None — language is a UX baseline, not a premium feature.

---

## Complete Tier Gate Summary

| Memory Layer | FREE | PRO | PREMIUM |
|-------------|------|-----|---------|
| Oracle personality | ✓ | ✓ | ✓ |
| Birth chart | ✓ | ✓ | ✓ |
| Transits | ✓ | ✓ | ✓ |
| ai_memory narrative | — | ✓ | ✓ |
| Honcho behavioral | Observed only | ✓ | ✓ |
| RAG factual memories | — | ✓ (90d, top 5) | ✓ (full, top 5) |
| Aspect cooldowns | — | ✓ | ✓ |
| Session context | ✓ | ✓ | ✓ |
| Language directive | ✓ | ✓ | ✓ |

**Key insight:** FREE users get a fully functioning Oracle with chart + transits + session context. The Oracle is good for every single user. PRO/PREMIUM is not about Oracle intelligence — it's about depth of personalization and the Oracle's memory of who this specific person is.

---

## What Remains to Be Built

### Priority 1 — Deploy current fixes (no code needed)
Railway redeploy to activate:
- Aspect cooldown wiring (3-file change, 2026-04-05)
- RAG tier logic fix (PRO: 30d→90d, count 3→5)
- 200-entry pruning in nightly cron

### Priority 2 — ai_memory consolidation
**Effort:** ~1 day  
**Files to create:** `services/memory-consolidation.ts`  
**Files to modify:** `prisma/schema.prisma` (migration), `controllers/chatController.ts` (trigger on session end), `services/llm-helpers.ts` (injection)  
**Blockers:** None — can be built immediately

### Priority 3 — Honcho behavioral integration
**Effort:** ~1 day  
**Files to create:** `config/honcho.ts`, `services/honcho-context.ts`  
**Files to modify:** `controllers/chatController.ts`, `services/llm-helpers.ts`  
**Blockers:** Verify Node.js SDK package name (`@plastic-labs/honcho-node` or similar), add `HONCHO_API_KEY` + `HONCHO_WORKSPACE=astrologaai-users` to Railway env vars

---

## Cold Start Behavior (New User Journey)

| Sessions completed | Memory state |
|-------------------|-------------|
| 0 | Chart + transits only. Oracle cold but still effective. |
| 1 | RAG extraction runs nightly — first facts extracted if user shared personal details. Honcho observes first session silently. |
| 2 | ai_memory consolidation triggers (session gate: 2+). ai_memory created. Honcho starts building behavioral profile. |
| 5-10 | ai_memory has 2-3 consolidation passes. Honcho context starts showing pattern recognition. RAG has growing fact base. |
| 20+ | Full system running. Oracle feels like a trusted advisor who has known the user for months. |
