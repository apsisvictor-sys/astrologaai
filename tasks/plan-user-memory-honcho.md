# AstroLogAI — Per-User Memory System: autoDream + Honcho
> Spec written: 2026-04-02

## What already exists
- `memory-extraction-cron.ts` — nightly Haiku extraction of 1-3 facts → pgvector `user_memories`
- `memory-retrieval.ts` — cosine similarity retrieval at chat time (PRO: top 3/30d, PREMIUM: top 5/all)
- Aspect cooldown tracking in `aspect_cooldowns` table

## What we're adding
Two new layers that sit alongside the existing RAG system.

---

## Architecture: 3-Layer Memory

```
Oracle system prompt assembly
│
├── Layer 1  Birth chart + tier (always)                     ← live
├── Layer 2a ai_memory TEXT — narrative running summary      ← NEW
├── Layer 2b Honcho context — behavioral profile             ← NEW
├── Layer 2c RAG facts — cosine-retrieved user_memories      ← live
└── Layer 3  Conversation history
```

| Layer | What it holds | Size | Cost |
|-------|--------------|------|------|
| ai_memory | Life themes, narrative context, Oracle history | ~150 lines, always injected | Haiku consolidation ~$0.001/session |
| Honcho | Communication style, emotional patterns, engagement | ~200 tokens | FREE via get_context() |
| RAG | Specific stated facts (career, love, fears, growth) | top 3-5 facts | Embedding per message |

---

## Layer 2a — ai_memory (autoDream per user)

### Schema change
```prisma
model User {
  // ... existing fields
  aiMemory          String?   @map("ai_memory")
  aiMemoryUpdatedAt DateTime? @map("ai_memory_updated_at")
  aiMemorySessionCount Int    @default(0) @map("ai_memory_session_count")
}
```

### Consolidation job — runs async after each Oracle session ends

Trigger: session closes (user disconnects or explicit session end signal)

**Three gates before running:**
1. Time gate — skip if `ai_memory_updated_at` < 24h ago
2. Session gate — skip if `ai_memory_session_count` < 2 since last consolidation
3. Lock gate — Redis key `memory:consolidate:{userId}` with 5min TTL (prevent concurrent runs)

**Four phases (autoDream pattern):**
```
Orient    → fetch user.ai_memory (current state)
Gather    → fetch last session transcript (chatMessages for sessionId)
Consolidate → Haiku rewrites memory with new insights
Prune     → enforce 150-line / 5000-char hard limit
```

**Consolidation prompt:**
```
You maintain a persistent memory file for an AI astrologer's user.
The oracle uses this file to personalize every future reading.

CURRENT MEMORY (may be empty for new users):
{user.aiMemory || "(no memory yet — first session)"}

NEW SESSION TRANSCRIPT:
{transcript}

Rewrite the memory file following these rules:
- Maximum 150 lines, 5000 characters
- Remove contradicted or outdated entries
- Preserve the most emotionally significant revelations
- Add new themes, patterns, life context from this session
- Convert relative dates to absolute (e.g. "last month" → "March 2026")
- Write in third person about the user

Sections (use only what applies):
## Life Context
## Active Themes
## Emotional Patterns  
## Oracle Preferences
## Significant Revelations
## Recent (last 30 days)

Return only the memory file content. No explanation, no preamble.
```

**After consolidation:**
```typescript
await prisma.user.update({
  where: { id: userId },
  data: {
    aiMemory: consolidatedText,
    aiMemoryUpdatedAt: new Date(),
    aiMemorySessionCount: 0, // reset counter
  },
});
await redis.del(`memory:consolidate:${userId}`);
```

### Injection at chat time
In `buildSystemPrompt()`, after birth chart block:
```typescript
if (user.aiMemory && tier !== 'FREE') {
  systemPrompt += `\n\n## What you know about this user\n${user.aiMemory}`;
}
```

### Tier rules
- FREE — no ai_memory injection, no consolidation runs
- PRO — consolidation runs, injection enabled
- PREMIUM — same as PRO, longer retention

---

## Layer 2b — Honcho (behavioral profiling)

### What Honcho adds that ai_memory doesn't
ai_memory captures *what* the user talks about.
Honcho captures *how* they communicate — response patterns, emotional engagement style, what they lean into vs. avoid.

Example Honcho output:
> "User responds well to validation before advice. Avoids confrontational reframings. Engages deeply with relationship themes, skims career content. Tends to open with indirect questions before stating real concern."

### SDK
```bash
npm install honcho-ai  # check: @plastic-labs/honcho-node or honcho-ai on npm
```
⚠️ Verify the exact package name — the Python SDK is `honcho-ai`, the Node.js SDK may differ.

### Configuration
```typescript
// config/honcho.ts
const honcho = new Honcho({
  apiKey: process.env.HONCHO_API_KEY, // separate key — astrologaai-users workspace
  workspace: 'astrologaai-users',
});
```

Add to `.env` / Railway:
```
HONCHO_API_KEY=<new key from app.honcho.dev — different from Victor's personal key>
HONCHO_WORKSPACE=astrologaai-users
```

### Usage pattern

**Before Oracle responds (add to chat handler):**
```typescript
// Non-blocking — fail open if Honcho is down
let honchoContext = '';
try {
  const session = await honcho.apps.users.sessions.get(
    workspace, userId, sessionId
  );
  const ctx = await session.getContext({ reasoningLevel: 'low' }); // free
  honchoContext = ctx.content ?? '';
} catch {
  // Honcho down — Oracle continues without behavioral context
}
```

**After Oracle session ends:**
Messages auto-observed by Honcho (upload session transcript async).

### Injection
```typescript
if (honchoContext && tier !== 'FREE') {
  systemPrompt += `\n\n## How this user communicates\n${honchoContext}`;
}
```

### Cost
- `get_context()` — FREE, ~200ms
- Message ingestion — $2/million messages (negligible)
- Reasoning (Honcho's synthesis) — runs on their side automatically, no per-call cost for retrieval

### Tier rules
- FREE — no Honcho injection, but messages still observed (builds profile for when they upgrade)
- PRO/PREMIUM — full injection

---

## Implementation Phases

### Phase 1 — ai_memory scaffold (no agents needed, ~1 day)
- [ ] Prisma migration: add `ai_memory`, `ai_memory_updated_at`, `ai_memory_session_count` to users
- [ ] `services/memory-consolidation.ts` — consolidation function with 3 gates + Haiku prompt
- [ ] Redis lock key helper
- [ ] Hook into session-end event (or add to existing cron)
- [ ] Update `buildSystemPrompt()` to inject ai_memory block
- [ ] Unit test: consolidation with empty memory (cold start)
- [ ] Unit test: consolidation with existing memory (prune + merge)

### Phase 2 — Honcho integration (~1 day)
- [ ] Install Honcho Node.js SDK (verify package name first)
- [ ] `config/honcho.ts` — client singleton
- [ ] Add `HONCHO_API_KEY` + `HONCHO_WORKSPACE` to Railway env vars
- [ ] `services/honcho-context.ts` — `getHonchoContext(userId, sessionId)` with fail-open
- [ ] Update chat handler to call getHonchoContext before Oracle responds
- [ ] Update `buildSystemPrompt()` to inject Honcho block
- [ ] Test: Honcho down → Oracle still works

### Phase 3 — Validation (after 2 weeks live)
- [ ] Review sample ai_memory files for 5 active users — quality check
- [ ] Check Honcho workspace at app.honcho.dev — profile quality
- [ ] Evaluate: does Oracle reference memory naturally?
- [ ] Consider: move ai_memory consolidation to reasoningLevel "medium" if quality is low

---

## What NOT to change
- `memory-extraction-cron.ts` — keep as-is, it's well-built
- `memory-retrieval.ts` — keep as-is
- pgvector / `user_memories` table — keep as-is
- RAG retrieval happens at message time, ai_memory + Honcho inject at session start — no conflict

---

## Cold start handling
| Sessions | State |
|----------|-------|
| 0 | No memory, no Honcho context — Oracle uses birth chart only |
| 1 | ai_memory not yet created (session gate: need 2+), Honcho has first session |
| 2+ | ai_memory consolidation triggers, Honcho context grows |
| 10+ | Full system running — rich narrative + behavioral profile |

---

## Open question: Honcho account
AstroLogAI users need their OWN Honcho account/workspace, separate from Victor's personal account (info@pixelestate.bg). 
Create a third Honcho account (e.g. astrologaai@pixelestate.bg or similar) for production user data.
