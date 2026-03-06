# AstroLogAI Autonomous Agent Upgrade: Changelog

This document tracks all changes made during the transition to an Autonomous Agent using the Vercel AI SDK and Tool Calling architecture.

## Phase 1: Infrastructure Prep
### Date: 2026-03-04
- **Dependencies Installed:** `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `zod` added to the Express backend.
- **Directory Created:** `/backend/src/services/agent-tools/` to house the encapsulated astrology calculators.
- **Task List Updated:** Added Phase 6 for finalizing Subscription Tiers logic.

## Phase 2: Tool Wrapping (Zod + Vercel AI)
### Date: 2026-03-04
- **Tools Created:** Added `calculateNatalChartTool`, `analyzeTransitsTool`, and `calculateSynastryTool` in `src/services/agent-tools/index.ts`.
- **Validation:** Tools are Zod-typed and fetch live data directly from the astrology-api orchestrator.

## Phase 3: Engine Rewrite
### Date: 2026-03-04
- **LLM Engine Upgraded:** Completely rewrote `src/services/llm.ts` to deprecate custom manual streaming.
- **Vercel AI SDK Integration:** Implemented `streamText` and native tool-calling looping. Supporting both OpenAI and Anthropic models dynamically based on `.env`.
- **CoreMessage Mapping:** Added mapping utilities to translate ancient custom ChatMessage types to the modern Vercel SDK format.

## Phase 4: Redis Caching & WebSocket Integration
### Date: 2026-03-04
- **Redis Context Upgrade:** Modified `src/utils/redis.ts` `storeSessionContext` to accept generic `any[]` array types, ensuring massive multi-step Vercel Agent tool call arrays persist correctly without schema parsing failures.
- **WebSocket Telemetry:** Hooked the Next.js `onToolCall` callbacks deep into `src/socket/chat-handler.ts`, which now fires a `chat:tool_call` live telemetry socket event whenever the astrology tools are executed mid-stream.

## Phase 5: Verification & Safety
### Date: 2026-03-04
- **Lint Cleanup:** Fixed implicit any/unknown typing errors around Vercel's `textDelta` and generic `args` mappings in the loop handler.
- **Telemetry Update:** Updated DB schema logic in `chat-handler.ts` to log proper model names (`claude-3.5-agent` vs `gpt-4o-agent`) into PostgreSQL via Prisma.

## Phase 6: Subscription Tier Segregation
### Date: 2026-03-04
- **Feature Matrix Update:** Modified `src/config/subscription-tiers.ts` features arrays to specifically list authorized Vercel Agent Tools (`tool:get_natal_chart`, `tool:get_transits`, `tool:get_synastry`).
- **Engine Gating:** Updated `streamChatCompletion` to dynamically inject only the specific tools a user is authorized for based on their database Tier.
  - **FREE:** Only accesses `get_natal_chart`.
  - **PRO:** Accesses `get_natal_chart` + `get_transits` for live timing predictions.
  - **PREMIUM:** Unlocks `get_synastry` for relationship compatibility analysis.

---
**Status:** The Root Upgrade is 100% complete. AstroLogAI is now a fully Autonomous Agent capable of calling professional astrology-api.io routines directly over WebSockets, strictly gated by Stripe subscription tiers.
