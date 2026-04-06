# AstroLogAI — Project Overview

**Personal AI Astrologer Platform** | Bulgarian market first, bilingual (BG/EN)

Live at **[astrologa.bg](https://astrologa.bg)**

---

## What Is AstroLogAI?

AstroLogAI is an AI-powered subscription SaaS where users interact with a personal astrologer ("The Oracle") that knows their birth chart, remembers past conversations, and provides personalized astrological guidance. It combines real astronomical calculations with LLM-generated interpretations.

**No other astrology app has persistent memory of the user's life story.** This is the competitive moat — the Oracle gets better with every conversation.

### Core User Flow

```
Register → Enter birth data → Chat with The Oracle → Get readings/forecasts
                                      ↓
                              [Birth chart calculated via astrology-api.io]
                                      ↓
                              [Oracle has: chart data + transits + memories + aspect cooldowns]
                                      ↓
                              [Response streamed via SSE with tool calls for live calculations]
```

### Business Model

| Tier | Price | Limits | AI Model | Features |
|------|-------|--------|----------|----------|
| **FREE** | €0 | 3 queries/day | Claude Haiku | Natal chart only |
| **PRO** | €9.99/mo | 10 queries/day | Claude Sonnet | + Transits, lunar returns, memory (90d) |
| **PREMIUM** | €19.99/mo | Unlimited | Claude Opus | + Solar return, synastry, composite, progressions, relocation, full memory |

One-time credit packs also available: €2.99 (3 credits), €7.99 (10), €14.99 (25).

Gift subscriptions: 1/3/6/12 month PREMIUM gifts via Stripe.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 14 (App Router) • Tailwind CSS • next-intl (BG/EN)│
│  Deployed: Vercel (astrologa.bg)                             │
│  Auth: Supabase OAuth + JWT Bearer tokens                    │
│  Analytics: PostHog • Errors: Sentry                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (SSE streaming for chat)
                           │ REST API v1
┌──────────────────────────▼──────────────────────────────────┐
│                        BACKEND                               │
│  Express 4.18 • TypeScript • Vercel AI SDK v6                │
│  Deployed: Railway                                           │
│  LLM: Claude (primary) → OpenAI (fallback)                   │
│  Astrology: astrology-api.io → Swiss Ephemeris (fallback)    │
│  Email: Resend + React Email                                 │
│  Payments: Stripe (subscriptions + one-time credits)         │
└──┬───────────────┬───────────────┬──────────────────────────┘
   │               │               │
   ▼               ▼               ▼
PostgreSQL      Redis           Sentry
(Railway)    (Upstash)      (Error tracking)
+ pgvector   (sessions,
(embeddings)  rate limits,
              dedup)
```

### Key Design Decisions

- **SSE over WebSocket** — simpler, Vercel-compatible, sufficient for chat streaming
- **Vercel AI SDK v6 tool calling** — Oracle autonomously decides which astrology tool to invoke
- **Multi-provider failover** — both LLM and astrology API have automatic fallback with circuit breakers
- **Tier-gated tools** — FREE users only get natal chart; PRO/PREMIUM unlock progressively more tools
- **pgvector for memory** — user memories embedded and retrieved by semantic similarity
- **Aspect cooldown system** — prevents Oracle from repeating the same chart aspects across sessions

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18, TypeScript | App Router, Server Components |
| Styling | Tailwind CSS (custom "Ethereal Oracle" theme) | Dark cosmic design system |
| i18n | next-intl | Bulgarian (default) + English |
| Backend | Express 4.18, TypeScript | REST API |
| AI | Vercel AI SDK v6, Anthropic Claude, OpenAI | Chat streaming + tool calling |
| Astrology | astrology-api.io, Swiss Ephemeris | Chart calculations, transits |
| Database | PostgreSQL + Prisma ORM | User data, charts, sessions |
| Vectors | pgvector extension | Memory embeddings (cosine similarity) |
| Cache | Redis (Upstash) | Rate limiting, session state, dedup |
| Auth | JWT + Supabase OAuth | Email/password + Google/Apple |
| Payments | Stripe | Subscriptions, credits, gifts |
| Email | Resend + React Email | Transactional + lifecycle |
| Analytics | PostHog | Funnel tracking, feature flags |
| Errors | Sentry | Error tracking (frontend + backend) |
| Hosting | Vercel (frontend), Railway (backend) | Auto-deploy from git |

---

## Repository Structure

```
astrologaai/
├── frontend/                    # Next.js 14 App Router
│   ├── src/
│   │   ├── app/[locale]/        # Pages (50+ routes)
│   │   │   ├── (app)/           # Protected: chat, dashboard, chart, settings...
│   │   │   ├── (admin)/         # Admin: users, revenue, prompts, config
│   │   │   ├── login/           # Auth pages
│   │   │   └── pricing/         # Public pages
│   │   ├── components/          # 70+ UI components
│   │   │   ├── chat/            # Oracle chat interface (16 files)
│   │   │   ├── chart/           # Zodiac wheel, aspects, planets (25 files)
│   │   │   ├── shell/           # App layout, sidebar, navigation
│   │   │   ├── credits/         # Purchase modal, balance indicator
│   │   │   └── ui/              # Button, badge, spinner primitives
│   │   ├── lib/                 # Auth context, API client, analytics
│   │   ├── messages/            # Translation files (en.json, bg.json)
│   │   └── i18n/                # Locale routing config
│   └── package.json
│
├── backend/                     # Express API server
│   ├── src/
│   │   ├── routes/              # 20 API route groups
│   │   ├── controllers/         # 16 HTTP handlers
│   │   ├── services/            # 46 domain logic modules
│   │   │   ├── llm.ts           # AI streaming + tool calling
│   │   │   ├── llm-helpers.ts   # System prompt builder (8-layer Oracle)
│   │   │   ├── astrology/       # Multi-provider with failover
│   │   │   ├── agent-tools/     # 10 AI SDK tool definitions
│   │   │   ├── memory-*.ts      # Memory extraction + retrieval (pgvector)
│   │   │   └── forecast-cron.ts # Nightly horoscope pre-generation
│   │   ├── middleware/          # Auth, rate limiting, query limits
│   │   ├── emails/              # 17 React Email templates
│   │   └── config/              # Tier config, env validation
│   ├── tests/                   # Vitest (integration + unit + user stories)
│   └── package.json
│
├── prisma/
│   └── schema.prisma            # 32 models (588 lines)
│
├── docs/                        # Architecture & strategy docs
│   ├── oracle-memory-architecture.md   # 8-layer memory system spec
│   ├── oracle-engagement-strategy.md   # Retention psychology (70/30 rule)
│   ├── CACHING_STRATEGY.md             # Dual-key natal chart caching
│   ├── ERROR_HANDLING_STANDARDS.md     # Error taxonomy + i18n messages
│   └── archive/                        # Historical sprint docs
│
├── tasks/                       # Roadmap & planning
│   ├── master_roadmap_todo.md   # Single source of truth (8 sprints)
│   └── archive/                 # Completed sprint plans
│
└── stitch/                      # Design system spec
    └── DESIGN.md                # "Ethereal Oracle" color/typography/spacing
```

---

## The Oracle — AI Architecture

The Oracle is an agentic LLM with 8 context layers assembled per request:

```
Layer 0 — Oracle personality          (static system prompt)               [LIVE]
Layer 1 — Birth chart facts           (permanent, from calculation)        [LIVE]
Layer 2 — Current transits            (real-time planet positions)         [LIVE]
Layer 3 — ai_memory narrative         (consolidated life themes)           [PLANNED]
Layer 4 — Honcho behavioral           (communication style profiling)      [PLANNED]
Layer 5 — RAG factual memories        (pgvector semantic retrieval)        [LIVE]
Layer 6 — Aspect cooldowns            (anti-repetition rotation)           [LIVE]
Layer 7 — Session context             (current conversation history)       [LIVE]
Layer 8 — Language directive           (BG/EN response language)           [LIVE]
```

### Tool Calling

The Oracle autonomously decides which astrology tool to call based on user questions:

```typescript
// backend/src/services/agent-tools/index.ts
// 10 Vercel AI SDK tools available to the Oracle:
get_natal_chart      // Birth chart positions + interpretations
get_transits         // Current planet positions vs natal chart
get_solar_return     // Year-ahead forecast (annual birthday chart)
get_synastry         // Relationship compatibility (two charts)
get_composite        // Combined relationship chart
get_lunar_return     // Monthly cycle forecast
get_venus_return     // Love timing predictions
get_progressions     // Psychological development timing
get_relocation       // Astrocartography (best places to live)
get_solar_arc        // Long-term directional timing
```

Tools are tier-gated — FREE gets `get_natal_chart` only, PRO adds transits + lunar, PREMIUM unlocks all.

### Memory System

```
User chats with Oracle → messages stored in ChatMessage table
                              ↓
Nightly cron (03:00 UTC) → Claude Haiku extracts 1-3 memorable facts
                              ↓
Facts embedded via Haiku → stored in user_memories with pgvector
                              ↓
Next chat → query embeds user's question → cosine similarity retrieval
                              ↓
Top 5 memories injected into Oracle context → personalized response
```

Memory categories: `love`, `career`, `health`, `fears`, `growth`, `high_impact`

Aspect cooldowns prevent the Oracle from leading with the same chart aspect across sessions (mandatory rotation directive in system prompt).

---

## Background Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Forecast cron | 02:00 UTC daily | Pre-generate horoscopes for PRO/PREMIUM users |
| Transit forecast cron | 03:00 UTC daily | Pre-generate transit forecasts |
| Memory extraction | 03:00 UTC daily | Extract memorable facts from yesterday's chats |
| Chart regeneration | On demand | Queue recalculation when birth data changes |
| Monthly reset | 1st of month | Reset bonus query counters |

---

## API Overview

All endpoints under `/api/v1/`:

| Group | Key Endpoints | Auth Required |
|-------|--------------|---------------|
| `/auth` | register, login, refresh, OAuth, verify-email | No |
| `/chat` | POST /message (SSE stream), sessions CRUD, share, rate | Yes |
| `/birth-chart` | calculate, positions, recalculate | Yes |
| `/birth-data` | profiles CRUD (multi-profile support) | Yes |
| `/partners` | add/list/update/delete partners | Yes |
| `/compatibility` | synastry analysis, relationship reports | Yes |
| `/transits` | current transits, forecast | Yes |
| `/forecasts` | daily/weekly/monthly, best-days calendar | Yes |
| `/solar-return` | annual forecast | Yes |
| `/credits` | balance, purchase (Stripe checkout), spend | Yes |
| `/subscription` | plans, status, upgrade/downgrade | Yes |
| `/admin` | config, prompts, discounts, referrals | Admin only |
| `/cron` | monthly-reset, forecast, transits | CRON_SECRET |

---

## Design System — "Ethereal Oracle"

Dark cosmic theme with neon accents:

- **Background**: Pitch black (#0D0010) with blurred neon orbs
- **Primary**: Electric magenta (#E41AFF)
- **Accents**: Cyan (#00F0FF), Pink (#FF0080), Amber (#FBBF24)
- **Surfaces**: Deep purple gradients (#1a0b1c → #3d1f45)
- **Typography**: Space Grotesk (headlines + body), JetBrains Mono (code)
- **Corners**: 12-32px border radius
- **Glows**: Magenta/cyan drop-shadow on interactive elements

---

## Development

### Prerequisites

- Node.js 18+ (22 recommended)
- PostgreSQL 14+ with pgvector extension
- Redis (Upstash or local)

### Quick Start

```bash
git clone https://github.com/apsisvictor-sys/astrologaai.git
cd astrologaai
npm install                    # Installs both frontend + backend (workspaces)
cp .env.example .env           # Configure environment variables
npx prisma generate            # Generate Prisma client
npx prisma db push             # Push schema to database
npm run dev                    # Start both frontend + backend
```

### Key Commands

```bash
# Frontend (Next.js)
cd frontend && npm run dev     # http://localhost:3000
cd frontend && npm run build   # Production build

# Backend (Express)
cd backend && npm run dev      # http://localhost:3001
cd backend && npm run build    # esbuild compilation (not tsc — OOM on Railway)
cd backend && npm test         # Vitest test suite

# Database
npx prisma studio              # Visual DB browser
npx prisma db push             # Push schema changes
npx prisma validate            # Validate schema (use instead of tsc --noEmit)
```

### Build Note

Railway uses `esbuild` for backend compilation because `tsc` runs out of memory. The esbuild config is in `backend/package.json`. Always use `npx prisma validate` instead of `tsc --noEmit` for type checking.

---

## Sprint Roadmap (8 Sprints)

| Sprint | Name | Status | Key Deliverables |
|--------|------|--------|------------------|
| Fix | Security Hardening | DONE | 56 security bugs fixed |
| 1 | Lockdown | DONE | JWT rotation, Stripe webhook security, tier enforcement |
| 2 | Trust | DONE | Email verification, PostHog analytics, Sentry integration |
| 3 | Retain | DONE | Lifecycle emails, streak system, daily engagement |
| 4 | Polish | DONE | Share cards, OG meta tags, terms/privacy, chat UX |
| 5 | Differentiate | DONE | Suggested prompts, aspect grid, solar return |
| 6 | Ecosystem | IN PROGRESS | Transit engine (deployed), credits, gifts (PR open) |
| 7 | Intelligence | PARTIAL | Memory extraction (live), RAG retrieval (live), ai_memory + Honcho (planned) |
| 8 | Depth | NOT STARTED | Secondary progressions, Chiron, planetary hours, astrocartography |

Full roadmap: [`tasks/master_roadmap_todo.md`](tasks/master_roadmap_todo.md)

---

## Key Metrics (Target)

- \>8 messages per Oracle session (engagement)
- <48h return rate (retention)
- <5% monthly churn (PRO/PREMIUM)
- Users report: "it knew things I never told it" (memory working)

---

## License

Proprietary — Pixel Automate Ltd.
