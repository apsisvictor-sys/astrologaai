# AstroLogAI

Personal AI Astrologer Platform — Bulgarian market first, bilingual (BG/EN)

Live at [astrologa.bg](https://astrologa.bg)

## Overview

AstroLogAI is an AI-powered subscription SaaS where users interact with a personal astrologer chatbot ("The Oracle") that remembers their birth chart, past conversations, and life context. Features include natal chart analysis, daily/weekly forecasts, relationship compatibility (synastry/composite), transit predictions, and an 8-layer memory system that makes every conversation more personalized.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, TypeScript, next-intl (BG/EN)
- **Backend:** Express 4.18, TypeScript, Vercel AI SDK v6
- **AI:** Claude (Anthropic) primary, OpenAI fallback — with autonomous tool calling
- **Astrology:** astrology-api.io primary, Swiss Ephemeris fallback — multi-provider failover
- **Database:** PostgreSQL (Railway) + Prisma ORM + pgvector (memory embeddings)
- **Cache:** Redis (Upstash) — rate limiting, sessions, dedup
- **Auth:** JWT with refresh token rotation + Supabase OAuth (Google/Apple)
- **Payments:** Stripe (subscriptions + one-time credits + gift subscriptions)
- **Email:** Resend + React Email (transactional + lifecycle)
- **Analytics:** PostHog (funnel tracking) + Sentry (error monitoring)
- **Hosting:** Vercel (frontend) + Railway (backend)

## Getting Started

### Prerequisites

- Node.js 18+ (22 recommended)
- PostgreSQL 14+ with pgvector extension
- Redis (Upstash or local)

### Installation

```bash
git clone https://github.com/apsisvictor-sys/astrologaai.git
cd astrologaai

npm install               # Installs both frontend + backend (npm workspaces)
cp .env.example .env      # Configure environment variables
npx prisma generate       # Generate Prisma client
npx prisma db push        # Push schema to database
npm run dev               # Start both frontend + backend
```

### Environment Variables

See `.env.example` for all required variables. Key ones:
- `DATABASE_URL` — PostgreSQL connection
- `ANTHROPIC_API_KEY` — Claude API (primary LLM)
- `ASTROLOGY_API_KEY` — Astrology calculations
- `STRIPE_SECRET_KEY` — Payment processing
- `REDIS_URL` — Cache/rate limiting
- `RESEND_API_KEY` — Transactional email

## Project Structure

```
├── frontend/          # Next.js 14 frontend (Vercel)
├── backend/           # Express API server (Railway)
├── prisma/            # Database schema (32 models)
├── docs/              # Architecture & strategy docs
├── tasks/             # Roadmap & sprint planning
├── stitch/            # Design system spec
└── PROJECT.md         # Full project overview (start here)
```

For a comprehensive project walkthrough including architecture diagrams, API overview, Oracle AI system design, and sprint roadmap, see **[PROJECT.md](PROJECT.md)**.

## License

Proprietary — Pixel Automate Ltd.
