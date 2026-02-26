# AstroLogAI 🌟

Personal AI Astrologer Platform - Bulgarian market first

## Overview

AstroLogAI is an AI-powered subscription platform where users get a personal astrologer chatbot with persistent memory of their birth chart. Features include natal analysis, daily/weekly forecasts, relationship compatibility, and full astrological consultation.

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, TypeScript
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT + Supabase Auth
- **AI:** GLM-5, MiniMax M2.5
- **Payments:** Stripe
- **Astrology API:** astrology-api.io

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)

### Installation

```bash
# Clone the repo
git clone https://github.com/apsisvictor-sys/astrologaai.git
cd astrologaai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Start development
npm run dev
```

### Environment Variables

See `.env.example` for required variables.

## Project Structure

```
├── frontend/          # Next.js frontend
├── backend/           # Express API
├── prisma/           # Database schema
└── scripts/          # Utility scripts
```

## License

MIT
