# AstroLogAI Frontend Redesign — Design Document
**Date:** 2026-03-07
**Approach:** Clean rebuild (Approach B) — new UI from scratch, preserve auth-context, socket-client, api-client integrations
**Process:** Iterative step-by-step — each step delivered, reviewed with Stitch references, then next step begins

---

## Product Vision

AstroLogAI is a chat-first AI astrology platform. The Oracle (Claude AI) is the product. Everything else — chart, transits, partners — supports and deepens that conversation. The experience should feel like opening a direct line to a brilliant personal astrologer, not navigating an app.

Design reference: Claude.ai and ChatGPT for structural elegance. Void Prism aesthetic (dark, neon, cosmic) for visual identity.

---

## Design System — Void Prism Tokens

### Colors
```
Background deep:   #0D0010   (void black-purple, base layer)
Background dark:   #1a0b1c   (surface, sidebar)
Surface:           #2d1633   (cards, panels, glass)
Primary:           #e41aff   (neon fuchsia — Oracle identity color)
Accent cyan:       #00f0ff   (harmony, highlights)
Accent pink:       #ff0080   (tension, alerts, CTA)
Accent amber:      #FBBF24   (Sun, warmth, premium)
Text primary:      #FAFAFA
Text secondary:    #CBD5E1
Text muted:        #64748B
Border:            rgba(255, 255, 255, 0.07)
Glass panel:       rgba(255, 255, 255, 0.03) background + border above
```

### Typography
- Font: **Inter** (all weights, display + body)
- Display headings: `font-weight: 700–800`, tight tracking
- Body: `font-weight: 400–500`, relaxed line height

### Blur Spheres (ambient depth)
- Fixed position, `border-radius: 50%`, `filter: blur(80–120px)`, `opacity: 0.3–0.5`
- Used on homepage, auth, and as panel backgrounds
- Colors rotate: primary (fuchsia), accent-blue (cyan), accent-pink

### Components
- **Glass panel:** `background: rgba(255,255,255,0.03)`, `border: 1px solid rgba(255,255,255,0.07)`, `border-radius: 16px`, `backdrop-filter: blur(12px)`
- **Glow border:** `box-shadow: 0 0 20px rgba(228,26,255,0.25)`, `border: 1px solid rgba(228,26,255,0.3)`
- **Neon button:** gradient `#ff0080 → #00f0ff` or `#e41aff → #00f0ff`, `border-radius: 9999px`
- **Input oval:** `border-radius: 9999px`, glass background, neon border on focus

---

## Information Architecture

### Public Routes (unauthenticated)
```
/              Homepage — dormant Oracle hero + visitor chat + footer
/features      Product differentiation — why this beats free ChatGPT
/pricing       3-tier pricing cards + monthly/yearly toggle
/login         Auth — minimal, dark
/register      Auth — minimal, dark
/auth/callback OAuth callback (unchanged)
```

### Authenticated App Shell
All authenticated routes share a persistent shell:
- **Desktop:** fixed left sidebar + main content area
- **Mobile:** bottom navigation bar + full-screen content

```
/chat                  Home — new chat session
/chat/[sessionId]      Resume specific session
/chart                 My Chart panel
/transits              Today's cosmic weather  [PRO+ / locked FREE]
/partners              Partner list + synastry [PRO+ / locked FREE]
/partners/[id]         Partner detail
/settings              Profile, birth data, subscription, notifications
```

### Admin (separate auth context, admin-only)
```
/admin                 Admin dashboard
/admin/users           User list + stats
/admin/settings        Model config, system prompts
```

---

## Conversion Funnel

### Visitor → Free Account
1. Land on homepage → see dormant Oracle (pill input + avatar above)
2. Click/tap chat area → avatar disappears, chat expands, Oracle introduces itself
3. Oracle's first message asks for birth data via inline widget (date picker + time picker + location autocomplete)
4. User chats freely — no account required
5. After **3rd user message**: soft prompt appears in chat — *"Save your chart and chat history — create a free account"*
6. After **4th user message**: stronger push — modal or inline CTA blocks further conversation
7. Account creation → unlocks: persistent chat history (left sidebar), natal chart panel, usage counter

### Free → PRO / PREMIUM
- Transits and Partners sections show **PRO badge** on sidebar icon / bottom tab
- Clicking locked section → upgrade modal slides in with 3 tier cards, relevant feature highlighted
- Usage counter pressure: as FREE user approaches 10 query/month limit, banner appears
- Settings > Subscription always accessible for self-serve upgrade

---

## Page Designs

### 1. Homepage `/`

**State 1 — Dormant Oracle (initial load)**
- Full viewport dark background with animated blur spheres
- Center: Oracle avatar visualization (animated cosmic sphere/mandala, ~200px)
- Below avatar: pill-shaped single-line input field, send arrow on right
- Subtle label: *"Ask the Oracle..."*
- Top-right: minimal nav links — Features | Pricing | Login
- No scrolling visible initially — pure focus on the Oracle

**State 2 — Awakened (on click/focus)**
- Avatar fades out with smooth opacity + scale transition (~300ms)
- Input expands upward into a full chat window (height animation ~400ms)
- Oracle sends first message: introduction + birth data widget
- Birth data widget: inline card with date picker, time picker (with "unknown" toggle), location autocomplete
- Send button activates once birth data captured

**Below the fold (scroll):**
- Brief product differentiators (3 cards): Mathematical accuracy / Full chart context / Personal astrologer reasoning
- How It Works (3 steps): Enter birth data → Chart calculated → Ask anything
- Social proof (2–3 testimonials)
- Final CTA → pricing or register

**Footer (all public pages):**
- Left: AstroLogAI logo + tagline
- Right: Terms of Use | Privacy Policy | Refund Policy | Company
- Ultra-minimal: muted text, no borders, no padding excess

---

### 2. Auth Pages `/login` `/register`

- Centered card on dark background with blur sphere behind
- Logo at top
- Minimal form: email + password (+ full name for register)
- Google OAuth button
- Link to /pricing for upsell context
- No navigation — pure focus on conversion

---

### 3. Authenticated Shell

**Desktop sidebar (fixed left, ~260px wide):**
```
[Oracle logo + wordmark]          ← top

[+ New Chat]                      ← prominent button

[Chat History]                    ← scrollable list
  Today
    · "What does my Venus..."
    · "Tell me about my..."
  Yesterday
    · "My relationship with..."
  Older
    · ...

[Bottom nav icons]                ← fixed at bottom of sidebar
  ✦  My Chart
  ◎  Transits        [PRO badge if FREE]
  ♡  Partners        [PRO badge if FREE]
  ⚙  Settings

[User + Tier badge]               ← very bottom
  Avatar · Name
  "THE SEEKER" / "NAVIGATOR" / "ORACLE"
  [Upgrade] button for FREE/PRO
```

**Mobile bottom navigation bar:**
```
[Chat] [Chart] [Transits*] [Partners*] [Settings]
         center tab = home (Chat)
         * = PRO badge if FREE tier
```

---

### 4. Chat Interface `/chat` `/chat/[sessionId]`

- Main content area fills remaining space after sidebar
- Message list: user messages right-aligned (glass bubble), Oracle messages left-aligned (no bubble — clean text like Claude)
- Oracle messages render markdown: **bold**, *italic*, bullet lists, code blocks
- Tool call events shown as subtle inline indicators: *"Calculating your natal chart..."* spinner
- Input: pill-shaped at bottom, auto-expanding textarea, send button, abort button during streaming
- Empty state (new chat): centered Oracle greeting + suggested prompts
- Chat history grouped by date in sidebar, sorted by last activity (most recent at top)
- If user sends message in old session → session bumps to top of list

---

### 5. My Chart Panel `/chart`

**Hero:** Natal chart SVG wheel (keep existing `NatalChartCanvas`, add touch events + data adapter)
**Below wheel:** Data cards grid:
- **Big 3 card:** Sun / Moon / Rising — sign symbol, name, house
- **Dominant energy card:** Element (Fire/Earth/Air/Water bar chart) + Modality
- **Chart ruler card:** Ruling planet, its sign and house
- **Planet placements table:** All 10 planets + Nodes + Chiron — sign, house, degree, retrograde badge
- **Aspects summary:** Top 5 tightest aspects with nature (harmonious/challenging)

All cards: glass panel, Void Prism styling, mobile-responsive grid.

---

### 6. Transits Panel `/transits` (PRO+ / locked)

**FREE tier:** Locked state — blurred preview + PRO badge + upgrade modal on click
**PRO+ tier:**
- Today's date header
- Moon phase indicator (emoji + phase name + illumination %)
- Overall daily theme card (gradient, prominent)
- Transit list: each active transit with planet → aspect → natal point, influence color (green/amber/red)
- Energy level indicator (High/Medium/Low)
- Life areas (Love / Career / Health) — brief forecast text

---

### 7. Partners Panel `/partners` (PRO+ / locked)

**FREE tier:** Locked state
**PRO+ tier:**
- Partner cards: name, relationship type, Big 3, compatibility score ring
- [+ Add Partner] button → inline form (name, birth data, relationship type)
- Click partner → detail page with synastry aspects grouped by theme (romantic, communicative, transformative, tension)

---

### 8. Tier Lock Mechanic (universal)

When a FREE user clicks a PRO/PREMIUM locked section:
- A panel slides up (mobile) or over (desktop)
- Shows 3 tier cards: The Seeker (FREE) / The Navigator (PRO) / The Oracle (PREMIUM)
- Relevant locked feature is highlighted on the PRO/PREMIUM card
- Monthly/yearly pricing toggle (same as /pricing page)
- CTA: "Upgrade to Navigator" → Stripe checkout

---

### 9. Settings `/settings`

Sub-sections (sidebar within settings or tabbed):
- **Profile:** Full name, avatar, email change
- **Birth Data:** View/edit birth profile (triggers chart recalculation)
- **Subscription:** Current tier, usage this month, billing info, cancel/upgrade
- **Notifications:** Email toggles (daily horoscope, weekly forecast, etc.)
- **Language:** BG / EN toggle

---

### 10. Features Page `/features`

Sections:
- Hero: "Why The Oracle beats free ChatGPT for astrology"
- Deep chart reasoning: full 14-body natal chart in context, not just Sun sign
- 10 astrological tools: natal, transits, synastry, progressions, solar return, etc.
- Tier comparison table (simplified)
- CTA → /pricing

---

### 11. Pricing Page `/pricing`

- Monthly/yearly toggle at top (yearly = ~20% discount, aggressive display)
- 3 tier cards side by side (desktop) / stacked (mobile):
  - **The Seeker** (FREE): 10 queries/month, natal chart only
  - **The Navigator** (PRO): Unlimited, + transits, solar return, lunar return
  - **The Oracle** (PREMIUM): Unlimited, all 10 tools
- PRO card: slightly elevated / highlighted as recommended
- Feature list per card: checkmarks for included, muted for excluded
- CTA buttons → Stripe checkout or register

---

### 12. Admin Dashboard `/admin`

Accessible only to admin users (separate role check).

Sections:
- **Overview:** Total users, DAU, MAU, tier distribution chart, monthly revenue
- **Users:** Searchable table — email, tier, usage, joined date, last active
- **Conversions:** FREE→PRO, PRO→PREMIUM funnel, churn rate
- **System:** Model per tier config (MODEL_FREE / MODEL_PRO / MODEL_PREMIUM env override UI), system prompt editor per tier (editable textarea, save to DB)
- **Provider health:** Astrology API primary/fallback status, circuit breaker state, latency graph

---

## Natal Chart Engine — Keep & Adapt

**Keep:** `NatalChartCanvas.tsx` — SVG-based, 4 layered rings, glow filters, hover tooltips, aspect color coding. Well-built, visually aligned.

**Adapt:**
- Write `adaptNatalChart(chart: NatalChart): NatalChartData` to map backend response to component props
- Add `onTouchStart/onTouchEnd` for mobile hover equivalent
- Add conjunction aspect type (currently missing)
- Add retrograde indicator (small ℞ symbol on retrograde planet dots)
- Add conjunction to aspect lines (currently only trine/square/opposition/sextile)

---

## Preserved Integrations (not rebuilt)

| File | Reason to keep |
|------|---------------|
| `lib/auth-context.tsx` | Supabase auth, JWT, user state — tested |
| `lib/socket-client.ts` | WebSocket connection + event handling — tested |
| `lib/api-client.ts` | REST API calls with auth headers — tested |
| `lib/chat-context-ws.tsx` | WebSocket chat state management |

---

## Build Order (Iterative — Stitch review between each step)

| Step | Deliverable |
|------|-------------|
| 1 | Tailwind config, design tokens, global CSS, base components (Button, GlassPanel, Input, Badge) |
| 2 | Homepage — dormant Oracle + awakening animation + visitor chat + footer |
| 3 | Auth pages — login + register |
| 4 | Authenticated shell — sidebar (desktop) + bottom nav (mobile) + layout wrapper |
| 5 | Chat interface — streaming, history sidebar, session management |
| 6 | My Chart panel — natal wheel + Big 3 + planet cards |
| 7 | Transits panel + tier lock mechanic + upgrade modal |
| 8 | Partners panel + synastry |
| 9 | Settings pages |
| 10 | Features + Pricing public pages |
| 11 | Admin dashboard |

Each step: design reviewed with Stitch references → implementation → user review → next step.
