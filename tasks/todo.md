# Sprint 5 — FUTURE-06: Suggested Prompts

## Plan
Full implementation plan: `docs/superpowers/plans/2026-03-21-suggested-prompts.md`
Execute with: `superpowers:subagent-driven-development`

## Architecture
- **Empty state**: static question bank (62 questions, tier-gated) — 2 eligible + 1 always-locked from next tier
- **Mid-conversation**: Oracle appends `[SUGGESTIONS]...[/SUGGESTIONS]` block → frontend strips from display, parses after stream, renders as clickable chips that prefill the input

## Tasks
- [x] **T1** `frontend/src/lib/question-bank.ts` — 62 questions + `selectQuestions(tier)` function (7374018)
- [x] **T2** `frontend/src/components/chat/empty-state.tsx` — question bank + lock UI (tooltip on hover) (f9ccaee)
- [x] **T3** `backend/src/services/llm.ts` — append [SUGGESTIONS] instruction to Oracle system prompt (tier-aware) (a395203)
- [x] **T4** `frontend/src/lib/chat-context-ws.tsx` — strip [SUGGESTIONS] from streaming display, parse after complete, expose `suggestions` state + `clearSuggestions`
- [x] **T5** `frontend/src/components/chat/suggestion-chips.tsx` — new component, clickable chips (50f6896)
- [x] **T6** `frontend/src/components/chat/chat-window.tsx` + `chat-input-bar.tsx` — wire prefill + render chips (058b0cf)
- [x] **T7** Update `tasks/todo.md` + `tasks/master_roadmap_todo.md`

## Review

**FUTURE-06 complete** (2026-03-21). All 7 tasks done across 7 commits.

**New files:**
- `frontend/src/lib/question-bank.ts` — 62 tier-gated questions (30 FREE, 20 PRO, 12 PREMIUM), `selectQuestions()` returns 2 unlocked + 1 locked for FREE/PRO, 3 unlocked for PREMIUM
- `frontend/src/components/chat/suggestion-chips.tsx` — clickable pill chips with purple accent

**Modified files:**
- `frontend/src/components/chat/empty-state.tsx` — replaces 3 hardcoded prompts with question bank; locked questions disabled + tooltip
- `backend/src/services/llm.ts` — Oracle appends `[SUGGESTIONS]...[/SUGGESTIONS]` block after every response (tier-aware topic restrictions)
- `frontend/src/lib/chat-context-ws.tsx` — strips suggestions block from display, parses after stream, exposes `suggestions` + `clearSuggestions` via context
- `frontend/src/components/chat/chat-window.tsx` — renders SuggestionChips above input when not streaming
- `frontend/src/components/chat/chat-input-bar.tsx` — `prefill` + `onPrefillConsumed` props for chip click-to-prefill

**Notable fix caught in review:** SUGGESTION_INSTRUCTION was initially only appended to PREMIUM tier; fixed by wrapping ternary in parens so it applies to all tiers.

## Key details
- `ChatInputBar` needs new `prefill?: string` + `onPrefillConsumed?: () => void` props
- `ChatContextType` needs `suggestions: string[]` + `clearSuggestions: () => void`
- Suggestion block format: `[SUGGESTIONS]\nq1\nq2\nq3\n[/SUGGESTIONS]`
- Strip from display: `assistantContent.split('[SUGGESTIONS]')[0]`
- Parse: `assistantContent.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/)`
- Clear suggestions when user sends next message (top of sendMessageSSE)
- PREMIUM user empty state: 3 unlocked, no locks
- FREE/PRO: always 2 unlocked + 1 locked (shuffle so lock not always last)
