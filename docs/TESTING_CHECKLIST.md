# AstroLogAI — Complete Production Testing Checklist

> **Written from actual codebase on 2026-03-16. This replaces all outdated US-story documents.**
> Frontend: `https://astrologaai-frontend.vercel.app`
> Backend: `https://astrologaai-backend-production.up.railway.app`
> Use a fresh incognito window for each flow unless stated otherwise.
> `TOKEN` below = `astrologaai_access_token` from localStorage after login.

---

## LEGEND
- ✅ Pass
- ❌ Fail (note what happened)
- ⚠️ Partial / degraded
- N/A Not applicable / not yet built

---

## BEFORE YOU START — TEST ACCOUNTS TO PREPARE

| Account | How to prepare |
|---------|---------------|
| **FREE** | Fresh register, no birth data added yet |
| **FREE+data** | Fresh register + add birth data |
| **PRO** | Register + upgrade via Stripe test card `4242 4242 4242 4242` |
| **PREMIUM** | Register + upgrade to PREMIUM via test card |
| **Admin** | `apsis.victor@gmail.com` — already in `ADMIN_EMAILS` env var |

---

## SECTION 1 — INFRASTRUCTURE HEALTH

Run these before anything else. If these fail, nothing else will work.

```bash
curl https://astrologaai-backend-production.up.railway.app/health
curl https://astrologaai-backend-production.up.railway.app/health/db
curl https://astrologaai-backend-production.up.railway.app/health/redis
curl https://astrologaai-backend-production.up.railway.app/health/astrology
```

| # | Test | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 1.1 | `GET /health` | `{ status: "ok" }` 200 | | |
| 1.2 | `GET /health/db` | DB connected, 200 | | |
| 1.3 | `GET /health/redis` | Redis connected (or in-memory fallback noted) | | |
| 1.4 | `GET /health/astrology` | Astrology API reachable, 200 | | |
| 1.5 | Homepage loads in browser | No white screen, no JS errors in console | | |
| 1.6 | Backend CORS — preflight from Vercel domain | 200 OK, `Access-Control-Allow-Origin` header present | | |

---

## SECTION 2 — PUBLIC PAGES (no login required)

| # | Page | What to check | Expected | Result |
|---|------|--------------|----------|--------|
| 2.1 | `/` | Page loads | OracleHero visible, ambient blur spheres, star dots | |
| 2.2 | `/` | PublicNav | Logo + nav links + Login button | |
| 2.3 | `/` | CTA button (Start for free) | Navigates to `/register` | |
| 2.4 | `/` | PublicFooter | Footer renders at bottom of page | |
| 2.5 | `/` | Console errors | None | |
| 2.6 | `/pricing` | Loads | 3 tier cards: FREE / PRO (€10/mo) / PREMIUM (€20/mo) | |
| 2.7 | `/pricing` | FREE "Get Started" | Goes to `/register` | |
| 2.8 | `/pricing` | PRO/PREMIUM upgrade CTA | Goes to `/register` (or checkout if logged in) | |
| 2.9 | `/pricing` | BGN prices shown | PRO = 20 BGN/mo, PREMIUM = 40 BGN/mo | |
| 2.10 | `/pricing` | PRO marked as popular | "Popular" badge on PRO card | |
| 2.11 | `/features` | Loads without error | Features page renders | |
| 2.12 | `/zodiac` | Loads | 12 sign cards visible | |
| 2.13 | `/zodiac/aries` | Loads | Aries sign page renders | |
| 2.14 | `/bg/` | Bulgarian locale | All text in Bulgarian | |
| 2.15 | `/en/` | English locale | All text in English | |
| 2.16 | `/` (no locale) | Default locale | Serves English (as-needed strategy, no prefix) | |
| 2.17 | `/shared-chart/[any-token]` | Invalid token | 404 or "chart not found", not a crash | |

---

## SECTION 3 — AUTHENTICATION

### 3A. Registration

| # | Test | Expected | Result |
|---|------|----------|--------|
| 3A.1 | Load `/register` | AuthShell + RegistrationForm renders, no errors | |
| 3A.2 | Submit empty form | Validation errors on name, email, password fields | |
| 3A.3 | Submit with invalid email format | Email validation error | |
| 3A.4 | Submit with password < minimum length | Password too short error | |
| 3A.5 | Submit with valid email + strong password | Account created → redirected to `/dashboard` | |
| 3A.6 | Check localStorage after register | `astrologaai_access_token` AND `astrologaai_refresh_token` present | |
| 3A.7 | Register duplicate email | "Email already in use" error (not a crash) | |
| 3A.8 | Visit `/register` when already logged in | Auto-redirected to `/dashboard` | |
| 3A.9 | Registration rate limit — 6th attempt in 1 hour from same IP | 429 Too Many Requests | |

### 3B. Login

| # | Test | Expected | Result |
|---|------|----------|--------|
| 3B.1 | Load `/login` | Login form renders with email + password | |
| 3B.2 | Wrong password | Generic "Invalid credentials" (not "wrong password") | |
| 3B.3 | Non-existent email | Same generic "Invalid credentials" (no user enumeration) | |
| 3B.4 | Valid credentials | JWT stored in localStorage, redirect to `/dashboard` | |
| 3B.5 | Check localStorage after login | `astrologaai_access_token` present | |
| 3B.6 | Visit `/login` while authenticated | Auto-redirected to `/dashboard` | |
| 3B.7 | "Forgot password?" link | Navigates to `/forgot-password` | |
| 3B.8 | "Register" link | Navigates to `/register` | |

### 3C. Google OAuth

| # | Test | Expected | Result |
|---|------|----------|--------|
| 3C.1 | "Continue with Google" on login page | Google OAuth window opens | |
| 3C.2 | Complete Google login | Redirected to `/auth/callback` then `/dashboard` | |
| 3C.3 | JWT in localStorage after OAuth | `astrologaai_access_token` present | |
| 3C.4 | `/auth/callback` URL works | No locale prefix in URL (outside `[locale]` route) — doesn't loop | |

### 3D. Password Reset

| # | Test | Expected | Result |
|---|------|----------|--------|
| 3D.1 | `/forgot-password` loads | Email input form renders | |
| 3D.2 | Submit valid email | "Check your email" confirmation shown | |
| 3D.3 | Submit unknown email | Still shows confirmation (no user enumeration) | |
| 3D.4 | `/reset-password` with valid token in URL | New password form renders | |
| 3D.5 | Submit new password that matches confirm | Password updated, redirect to `/login` | |
| 3D.6 | `/reset-password` with missing/invalid token | Error shown, not a crash | |

### 3E. Logout

| # | Test | Expected | Result |
|---|------|----------|--------|
| 3E.1 | Logout from any authenticated page | `astrologaai_access_token` cleared from localStorage | |
| 3E.2 | After logout, visit `/dashboard` | Redirected to `/login` | |
| 3E.3 | After logout, visit `/chat` | Redirected to `/login` | |

---

## SECTION 4 — ONBOARDING (NEW USER, NO BIRTH DATA)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 4.1 | New user lands on `/dashboard` | Oracle Welcome screen shown (no chart rendered) | |
| 4.2 | "Add Birth Data" prompt | Visible with clear CTA | |
| 4.3 | Load `/birth-data/new` | Form with: name, birth date, birth time, location, "time unknown" checkbox | |
| 4.4 | Start typing city in location field | Autocomplete dropdown appears with city suggestions | |
| 4.5 | Select a city from autocomplete | Lat/lng captured, city name filled in | |
| 4.6 | Submit with all fields valid | Birth data saved, chart generated, redirected to dashboard or chart page | |
| 4.7 | Submit with "time unknown" checked | Accepted — houses may be approximated, warning shown | |
| 4.8 | Submit without location | Validation error (location required) | |
| 4.9 | Submit without birth date | Validation error | |
| 4.10 | After adding birth data — dashboard | Chart wheel now renders | |

---

## SECTION 5 — DASHBOARD

> Logged in as FREE user with birth data added.

| # | Test | Expected | Result |
|---|------|----------|--------|
| 5.1 | Load `/dashboard` | "Cosmic Dashboard" title, chart wheel renders | |
| 5.2 | Natal chart wheel | All 12 signs, 12 house lines, planets visible | |
| 5.3 | Hover planet on chart | Tooltip: planet name + sign + degree + retrograde if applicable | |
| 5.4 | Language switcher | BG/EN toggle visible in header area | |
| 5.5 | Tier badge | "The Seeker (Free)" displayed | |
| 5.6 | Usage counter | "X queries remaining" shows correct count | |
| 5.7 | Quick action cards | Chat / Chart / Forecast / Partners links visible | |
| 5.8 | DailyHoroscopeCard — FREE tier | Identity, Communication, Relationships, Travel shown (4); remaining 8 locked with upgrade CTA | |
| 5.9 | DailyHoroscopeCard — PRO tier | 8 areas shown (adds Career, Health, Finance, Home); 4 locked with "Upgrade to PREMIUM" CTA | |
| 5.9b | DailyHoroscopeCard — PREMIUM | All 12 life areas shown, "View full reading" link visible | |
| 5.10 | Dashboard primary CTA (FREE) | "Chat with the Oracle" button → `/chat` | |
| 5.11 | Dashboard in Bulgarian (`/bg/dashboard`) | All text in Bulgarian | |
| 5.12 | Console errors | None | |
| 5.13 | Scroll zoom on chart | Scroll to zoom in/out | |
| 5.14 | "Reset Zoom" button | Chart zoom resets to default | |

---

## SECTION 6 — CHAT (THE ORACLE)

### 6A. Core Chat Functionality

| # | Test | Expected | Result |
|---|------|----------|--------|
| 6A.1 | Load `/chat` | ChatWindow renders, Oracle Welcome shown if no history | |
| 6A.2 | Type in input bar | Characters appear, send button active | |
| 6A.3 | Send a message (Enter or button) | Message appears in thread immediately | |
| 6A.4 | AI starts streaming | Response renders token by token | |
| 6A.5 | Tool call fires (e.g. "what's my rising sign?") | Tool indicator badge shown during tool execution | |
| 6A.6 | Stream completes | Full response shown, input re-enabled, cursor gone | |
| 6A.7 | Typing indicator | Animated dots visible during AI response | |
| 6A.8 | Cancel during stream | Stop button appears while streaming; clicking it halts response | |
| 6A.9 | Send failure recovers input | If send fails (e.g. no network), typed message restored to input bar, error banner shown | |
| 6A.10 | Send multiple messages in sequence | Each message/response correct, context maintained | |
| 6A.11 | Ask about natal chart | Oracle uses natal chart tool, response includes planet/sign data | |

### 6B. Tier Gating in Chat

| # | Test | Expected | Result |
|---|------|----------|--------|
| 6B.1 | FREE user — ask about transits | Upsell message (transit analysis = PRO+) | |
| 6B.2 | FREE user — ask synastry question | Upsell (synastry = PREMIUM) | |
| 6B.3 | FREE user — 5th message today | 429 rate limit error shown gracefully, not crash | |
| 6B.4 | FREE user — 11th query this month | Monthly limit message shown | |
| 6B.5 | Rate limit response includes Retry-After | Check network tab: `Retry-After` header present | |
| 6B.6 | 80% usage — warning shown | Usage warning appears in chat or header | |
| 6B.7 | PRO user — ask about solar return | Tool fires, solar return analysis returned | |
| 6B.8 | PREMIUM user — ask for synastry (with partner added) | Full synastry report returned | |

### 6C. Chat History

| # | Test | Expected | Result |
|---|------|----------|--------|
| 6C.1 | Load `/chat/history` | List of past sessions with title + date | |
| 6C.2 | Chat session has auto-generated title | Title reflects first message content | |
| 6C.3 | Click past session | Loads at `/chat/[sessionId]` with all messages | |
| 6C.4 | Continue conversation in resumed session | New messages added, AI has context of prior conversation | |
| 6C.5 | Load `/chat/[nonexistent-id]` | Error/empty state, not a crash | |

### 6D. Guest Chat (logged out)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 6D.1 | Open homepage as logged-out | OracleHero widget present on homepage | |
| 6D.2 | Interact with OracleHero widget | Sends guest chat message, response streams | |
| 6D.3 | Register/login after guest chat | Session migrated to new account | |

---

## SECTION 7 — MY CHART

| # | Test | Expected | Result |
|---|------|----------|--------|
| 7.1 | Load `/chart` | ChartPanel renders — chart wheel + side panels | |
| 7.2 | Chart wheel full render | All 14 planetary bodies visible (including Chiron, Nodes, Lilith) | |
| 7.3 | BigThreeCard | Sun sign + Moon sign + Rising sign correct | |
| 7.4 | PlanetTable | All planets: name, sign, degree, retrograde R if applicable | |
| 7.5 | House numbers in PlanetTable | H.I through H.XII badges on planet rows | |
| 7.6 | ElementsCard | Fire/Earth/Air/Water balance with percentages | |
| 7.7 | AspectsSummary | Top aspects listed (Conjunction, Trine, Square, etc.) | |
| 7.8 | Aspect lines on chart | Colored lines: gold=conjunction, cyan=trine, fuchsia=square, etc. | |
| 7.9 | Aspect Explorer | Filter by aspect type — chart aspect lines filter accordingly | |
| 7.10 | Click aspect in Aspect Explorer | Modal or detail panel with interpretation | |
| 7.11 | Planet hover tooltip | Shows: name, sign, degree, house, retrograde indicator | |
| 7.12 | "Download PNG" | PNG file downloads with chart image | |
| 7.13 | "Download PDF" | PDF downloads OR graceful "not available" message (not crash) | |
| 7.14 | `/birth-data/[id]/chart` | Chart for specific birth profile renders | |
| 7.15 | Loading state | Chart loading animation shows while fetching | |
| 7.16 | No birth data → `/chart` | Prompt to add birth data, not crash | |

---

## SECTION 8 — FORECAST

| # | Test | Expected | Result |
|---|------|----------|--------|
| 8.1 | Load `/forecast` | "Your Daily Reading" heading, DailyHoroscopeCard + ForecastPanel | |
| 8.2 | DailyHoroscopeCard loads | Horoscope content visible (not blank) | |
| 8.3 | FREE tier DailyHoroscope | Identity, Communication, Relationships, Travel shown; 8 locked | |
| 8.4 | PRO DailyHoroscope | 8 areas shown; Love, Creativity, Spirituality, Learning locked with PREMIUM CTA | |
| 8.4b | PREMIUM DailyHoroscope | All 12 life areas shown with personalized content | |
| 8.5 | ForecastPanel | Transit list renders — each transit: planet, aspect, sign | |
| 8.6 | House badges on transit rows | H.I–H.XII badges present (from natal chart computation) | |
| 8.7 | MoonPhaseCard | Current moon phase icon + phase name (New Moon, Waxing, etc.) | |
| 8.8 | FREE user — locked section | "Upgrade" prompt visible for premium forecast features | |
| 8.9 | Load `/forecast/weekly` | Weekly forecast content renders | |
| 8.10 | FREE user → `/forecast/weekly` | Paywall / locked content shown | |
| 8.11 | No birth data → `/forecast` | Prompt to add birth data, not blank | |

---

## SECTION 9 — PARTNERS & COMPATIBILITY

| # | Test | Expected | Result |
|---|------|----------|--------|
| 9.1 | Load `/partners` as FREE user | Empty state + "Partners is a PREMIUM feature" | |
| 9.2 | Load `/partners` as PRO user | Similar restriction (partners = PREMIUM only) | |
| 9.3 | Load `/partners` as PREMIUM user | Partner list (empty if none added) + "Add Partner" button | |
| 9.4 | PREMIUM: Add partner form | Name, birth date, birth time, location, time-unknown option | |
| 9.5 | PREMIUM: Submit valid partner | Partner saved, appears in list | |
| 9.6 | PREMIUM: `/partners/[id]/synastry` | Synastry chart renders — dual chart overlay or combined wheel | |
| 9.7 | PREMIUM: `/partners/[id]/report` | Compatibility report: Love / Communication / Trust / Adventure / Values | |
| 9.8 | All 5 scores shown | Percentage bars for each category | |
| 9.9 | Report has LLM interpretation | Paragraph text beneath the scores | |
| 9.10 | Add 11th partner (limit = 10) | Error shown: "Max 10 partners reached" | |
| 9.11 | Delete partner | Partner removed from list | |

---

## SECTION 10 — SETTINGS

### 10A. Settings Hub

| # | Test | Expected | Result |
|---|------|----------|--------|
| 10A.1 | Load `/settings` | Hub with links: Profile, Birth Data, Language, Notifications, Subscription, Privacy | |

### 10B. Profile

| # | Test | Expected | Result |
|---|------|----------|--------|
| 10B.1 | Load `/settings/profile` | Name + email fields pre-filled with account data | |
| 10B.2 | Update display name | Save → success confirmation | |
| 10B.3 | Try updating email (if allowed) | Either updates or shows "contact support" | |

### 10C. Birth Data

| # | Test | Expected | Result |
|---|------|----------|--------|
| 10C.1 | Load `/settings/birth-data` | Current birth data shown (date, time, location) | |
| 10C.2 | Edit birth date | Form accepts new date | |
| 10C.3 | Save changes | Chart recalculated, old chart archived, success shown | |
| 10C.4 | Multiple birth profiles | Switch between profiles (e.g. for family members) | |
| 10C.5 | Add second birth profile | "Add profile" creates new entry | |

### 10D. Language

| # | Test | Expected | Result |
|---|------|----------|--------|
| 10D.1 | Load `/settings/language` | BG / EN toggle visible | |
| 10D.2 | Switch to Bulgarian | Page re-renders in BG, URL changes to `/bg/settings/language` | |
| 10D.3 | Switch to English | Page re-renders in EN | |
| 10D.4 | Refresh page after switching | Still in selected language | |

### 10E. Notifications

| # | Test | Expected | Result |
|---|------|----------|--------|
| 10E.1 | Load `/settings/notifications` | Email / Push / SMS toggles | |
| 10E.2 | Toggle email on/off | Saves without error | |
| 10E.3 | Refresh after toggling | Toggle state persists | |

### 10F. Subscription

| # | Test | Expected | Result |
|---|------|----------|--------|
| 10F.1 | Load `/settings/subscription` — FREE user | Current plan shown: Free, usage stats, upgrade button | |
| 10F.2 | Load `/settings/subscription` — PRO user | PRO plan, billing period, period end date, cancel button | |
| 10F.3 | Billing history (paid user) | Invoice list: date, amount, status, PDF download link | |
| 10F.4 | PDF download link on invoice | Opens invoice PDF in new tab | |
| 10F.5 | "Manage Billing" / Stripe Portal button | Opens Stripe customer portal | |
| 10F.6 | Cancel subscription button | Confirmation dialog appears before cancelling | |
| 10F.7 | After cancel: UI shows "cancels on [date]" | `cancelAtPeriodEnd = true` reflected in UI | |
| 10F.8 | Reactivate (if cancelled) | "Reactivate" option appears, removes cancel | |

### 10G. Privacy / Account

| # | Test | Expected | Result |
|---|------|----------|--------|
| 10G.1 | Load `/settings/privacy` | Privacy settings page renders | |
| 10G.2 | "Delete Account" | Requires confirmation before proceeding | |
| 10G.3 | Data export (if implemented) | Triggers data download | |

---

## SECTION 11 — SUBSCRIPTION & STRIPE FLOWS

### 11A. Upgrade Flow

| # | Test | Expected | Result |
|---|------|----------|--------|
| 11A.1 | Logged-in FREE user clicks upgrade to PRO | POST `/api/v1/subscription/checkout` called | |
| 11A.2 | Checkout session created | `checkoutUrl` returned, redirect to Stripe | |
| 11A.3 | Stripe checkout page | Correct product shown: "AstroLogAI Pro — €10/month" | |
| 11A.4 | Enter test card `4242 4242 4242 4242` (any future expiry, any CVC) | Payment succeeds | |
| 11A.5 | Post-checkout redirect | `success_url` → `/dashboard?checkout=success&session_id=...` | |
| 11A.6 | Dashboard after checkout | Tier badge updated to PRO | |
| 11A.7 | Confirmation email received | Subscription confirmed email sent to registered email | |
| 11A.8 | Cancel checkout midway | `cancel_url` → `/pricing?checkout=cancel` | |
| 11A.9 | Upgrade to PREMIUM | Same flow with PREMIUM price — €20/month | |

### 11B. Stripe Webhook

| # | Test | Expected | Result |
|---|------|----------|--------|
| 11B.1 | Webhook endpoint reachable | `POST /api/v1/subscription/webhook` returns 200 (no sig = 400 expected) | |
| 11B.2 | `checkout.session.completed` event | User tier updated in DB, confirmation email sent | |
| 11B.3 | `customer.subscription.deleted` event | User tier reverted to FREE in DB | |
| 11B.4 | `invoice.payment_failed` event | Subscription status set to PAST_DUE | |

### 11C. Subscription API (direct curl tests)

```bash
# Plans — public
curl https://astrologaai-backend-production.up.railway.app/api/v1/subscription/plans

# Status — authenticated
curl -H "Authorization: Bearer $TOKEN" \
  https://astrologaai-backend-production.up.railway.app/api/v1/subscription/status

# Invoices — authenticated
curl -H "Authorization: Bearer $TOKEN" \
  https://astrologaai-backend-production.up.railway.app/api/v1/subscription/invoices
```

| # | Test | Expected | Result |
|---|------|----------|--------|
| 11C.1 | `GET /subscription/plans` | Returns 3 plans: FREE, PRO, PREMIUM with prices | |
| 11C.2 | `GET /subscription/status` (FREE) | `tier: FREE`, usage stats, `canMakeQuery: true` (if under limit) | |
| 11C.3 | `GET /subscription/status` (PRO) | `tier: PRO`, `limits.monthly: unlimited` | |
| 11C.4 | `GET /subscription/invoices` (no subscription) | Returns `{ invoices: [] }` | |
| 11C.5 | `GET /subscription/invoices` (paid user) | Returns invoice list from Stripe | |

---

## SECTION 12 — BACKEND API TESTS (direct curl)

Set `TOKEN` first:
```bash
# Login and grab token
TOKEN=$(curl -s -X POST https://astrologaai-backend-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['accessToken'])")
```

### 12A. Auth Endpoints

| # | Endpoint | Test | Expected | Result |
|---|----------|------|----------|--------|
| 12A.1 | `POST /auth/register` | Valid new user | 201, `accessToken` + `refreshToken` in body | |
| 12A.2 | `POST /auth/register` | Duplicate email | 400, `EMAIL_ALREADY_EXISTS` | |
| 12A.3 | `POST /auth/login` | Valid credentials | 200, `accessToken` in body | |
| 12A.4 | `POST /auth/login` | Wrong password | 401, `INVALID_CREDENTIALS` | |
| 12A.5 | `POST /auth/refresh` | Valid refresh token | 200, new `accessToken` | |
| 12A.6 | `POST /auth/logout` | Valid token | 200, session cleared | |
| 12A.7 | `POST /auth/forgot-password` | Valid email | 200 (no enumeration even if not found) | |

### 12B. Birth Data & Charts

| # | Endpoint | Test | Expected | Result |
|---|----------|------|----------|--------|
| 12B.1 | `GET /birth-data` | Authenticated | Array of birth profiles | |
| 12B.2 | `POST /birth-data` | Valid birth data | Profile created, chart generated | |
| 12B.3 | `GET /birth-chart/:profileId` | Valid ID | Full natal chart data | |
| 12B.4 | `GET /birth-chart/:profileId` | Another user's profile ID | 403 or 404 (no leaking) | |
| 12B.5 | `PUT /birth-data/:id` | Update location | Chart regenerated, old archived | |

### 12C. Forecasts

| # | Endpoint | Test | Expected | Result |
|---|----------|------|----------|--------|
| 12C.1 | `GET /forecasts/daily` | FREE user | Daily forecast data returned | |
| 12C.2 | `GET /forecasts/horoscope` | FREE user | 200 + horoscope data (all 12 areas); frontend limits display to 4 | |
| 12C.3 | `GET /forecasts/horoscope` | PRO user | 200 + horoscope data (frontend shows 8 areas) | |
| 12C.4 | `GET /forecasts/daily` | No birth data | Appropriate error or empty response | |

### 12D. Partners & Compatibility

| # | Endpoint | Test | Expected | Result |
|---|----------|------|----------|--------|
| 12D.1 | `GET /partners` | PREMIUM user | Partner list | |
| 12D.2 | `POST /partners` | FREE user | 403 (PREMIUM only) | |
| 12D.3 | `POST /partners` | PREMIUM, valid data | Partner created | |
| 12D.4 | `GET /compatibility/:partnerId` | PREMIUM, valid partner | Compatibility scores + analysis | |

### 12E. Rate Limiting

| # | Test | Expected | Result |
|---|------|----------|--------|
| 12E.1 | Response headers on any API call | `X-RateLimit-Limit`, `X-RateLimit-Remaining` present | |
| 12E.2 | 429 response | `Retry-After` header present | |
| 12E.3 | 80% monthly usage | `X-Usage-Warning: 80%` header or similar | |

---

## SECTION 13 — ADMIN DASHBOARD (full)

> Must be logged in as `apsis.victor@gmail.com`. All admin routes require `adminAuthMiddleware`.
> Non-admin user visiting any `/admin/*` page should get 403 or be redirected.

### 13A. Access Control

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13A.1 | Non-admin user visits `/admin/overview` | Blocked — 403 or redirected | |
| 13A.2 | Unauthenticated user visits `/admin/overview` | Redirected to `/login` | |
| 13A.3 | Admin user visits `/admin` | Redirected to `/admin/overview` | |

### 13B. Overview Page (`/admin/overview`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13B.1 | Page loads | Metric cards visible: Total Users, Signups, MRR, Conversion Rate | |
| 13B.2 | Tier breakdown | FREE / PRO / PREMIUM counts with donut chart or bar | |
| 13B.3 | Daily signups sparkline | Chart showing signups over last 30 days | |
| 13B.4 | MRR estimate | Correct: (PRO count × €10) + (PREMIUM count × €20) | |
| 13B.5 | Conversion rate | Paid users / total users × 100 | |
| 13B.6 | Failed payments section | List of PAST_DUE subscriptions with email + days overdue | |
| 13B.7 | Date range filter: set custom range | Metrics update for selected range | |
| 13B.8 | **Backend curl**: `GET /api/v1/admin/overview` | `{ totalUsers, byTier, newSignups, mrrEstimate, dailySignups }` | |

### 13C. Users Page (`/admin/users`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13C.1 | Page loads | Paginated user list — email, tier, joined date, usage | |
| 13C.2 | Cost column | EUR cost this billing month per user | |
| 13C.3 | Above-threshold users highlighted | Users exceeding cost threshold shown differently | |
| 13C.4 | Search by email | Filters list by email substring | |
| 13C.5 | Search by name | Filters list by full name | |
| 13C.6 | Filter by tier: FREE | Only FREE users shown | |
| 13C.7 | Filter by tier: PRO | Only PRO users shown | |
| 13C.8 | Filter by status: SUSPENDED | Only suspended users shown | |
| 13C.9 | Filter: flagged=highcost | Only users above cost threshold shown | |
| 13C.10 | Pagination | Page 2, page 3 work (if enough users) | |
| 13C.11 | Click user row → user detail modal | Email, tier, subscription status, last active, partners, recent sessions | |
| 13C.12 | User detail: change tier inline | Dropdown → select PRO → saves → tier updated in DB | |
| 13C.13 | User detail: suspend user | Toggle suspend → user gets `isSuspended = true` | |
| 13C.14 | Suspended user tries to log in | Should be blocked or show suspended error | |
| 13C.15 | **Backend curl**: `GET /api/v1/admin/users?page=1&limit=5` | Returns paginated users with cost data | |
| 13C.16 | **Backend curl**: `GET /api/v1/admin/users?search=test` | Filters by email/name | |
| 13C.17 | **Backend curl**: `PATCH /api/v1/admin/users/:id/tier` with `{ tier: "PRO" }` | Returns success, tier updated | |
| 13C.18 | **Backend curl**: `PATCH /api/v1/admin/users/:id/suspend` with `{ suspended: true }` | Returns `{ suspended: true }` | |

### 13D. Usage Page (`/admin/usage`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13D.1 | Page loads | Summary cards: Total Requests, Total Tokens, Avg Latency, p50/p95/p99 | |
| 13D.2 | By-day chart | Bar or line chart of requests per day | |
| 13D.3 | By-tier breakdown | Requests + token counts per tier (FREE/PRO/PREMIUM) | |
| 13D.4 | By-model breakdown | Requests per model (haiku/sonnet/opus) | |
| 13D.5 | Top users table | Top 10 heaviest users by total tokens | |
| 13D.6 | Date range filter | Data updates for selected range | |
| 13D.7 | **Note**: If LlmUsage table not populated, charts may be empty — this is Task 9 | |
| 13D.8 | **Backend curl**: `GET /api/v1/admin/usage` | Returns `{ summary, byDay, byTier, byModel, topUsers }` | |

### 13E. Revenue Page (`/admin/revenue`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13E.1 | Page loads | Active subs, MRR, new subscriptions, churn count | |
| 13E.2 | MRR calculation | (PRO × €10 + PREMIUM × €20) matches DB counts | |
| 13E.3 | Past due subscriptions | Count shown | |
| 13E.4 | Monthly vs yearly breakdown | Monthly count vs yearly (from Stripe) | |
| 13E.5 | Date range filter | New subscriptions / churn updates | |
| 13E.6 | **Backend curl**: `GET /api/v1/admin/revenue` | Returns revenue metrics | |

### 13F. Prompts Page (`/admin/prompts`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13F.1 | Page loads | List of 6 prompts: master, free_addon, pro_addon, premium_addon, forecast, compatibility | |
| 13F.2 | Prompts auto-seeded | If DB empty, defaults are created on GET | |
| 13F.3 | Click a prompt | Right panel shows content + version history | |
| 13F.4 | Version history | List of past versions with date + saved by | |
| 13F.5 | Edit prompt content | Text editor accepts changes | |
| 13F.6 | Save prompt | New version created, version number increments | |
| 13F.7 | Version history after save | Old version appears in history | |
| 13F.8 | Restore previous version | Content reverts to selected version, new version created | |
| 13F.9 | Save empty content | Should fail — "Invalid content" error | |
| 13F.10 | **Backend curl**: `GET /api/v1/admin/prompts` | Returns prompt list | |
| 13F.11 | **Backend curl**: `GET /api/v1/admin/prompts/master` | Returns content + history | |
| 13F.12 | **Backend curl**: `PUT /api/v1/admin/prompts/master` with `{ content: "test" }` | Returns updated prompt | |
| 13F.13 | **Backend curl**: `POST /api/v1/admin/prompts/master/restore/1` | Restores version 1 | |

### 13G. Model Config Page (`/admin/config`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13G.1 | Page loads | 3 input fields: FREE model, PRO model, PREMIUM model | |
| 13G.2 | Current values shown | Defaults: haiku-4-5 / sonnet-4-6 / opus-4-6 (or env override) | |
| 13G.3 | Source indicator | Shows "env" if from env var, "db" if from DB override | |
| 13G.4 | Change model for FREE tier | Input accepts new model string | |
| 13G.5 | Save | DB updated, source changes to "db" | |
| 13G.6 | Chat as FREE user after change | New model used for FREE tier responses | |
| 13G.7 | **Backend curl**: `GET /api/v1/admin/config/models` | Returns `{ FREE: {model, source}, PRO: {model, source}, PREMIUM: {model, source} }` | |
| 13G.8 | **Backend curl**: `PUT /api/v1/admin/config/models` with `{ model_free: "claude-haiku-4-5-20251001" }` | Returns updated config | |

### 13H. Discounts Page (`/admin/discounts`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13H.1 | Page loads | Discount codes table: code, type, value, uses, expiry, status | |
| 13H.2 | Summary row | Active codes count, total redeemed, avg discount % | |
| 13H.3 | Create discount — % type | Form: code, percent discount, max uses (optional), expiry (optional) | |
| 13H.4 | Create discount — submit | Code created in DB + Stripe coupon created (if Stripe configured) | |
| 13H.5 | Duplicate code | Error: "A discount code with this name already exists" | |
| 13H.6 | Deactivate code | `PATCH` with `{ isActive: false }` — code status shows "disabled" | |
| 13H.7 | Reactivate code | `PATCH` with `{ isActive: true }` — code status shows "active" | |
| 13H.8 | Expired code (past `expiresAt`) | Status shows "expired" | |
| 13H.9 | Depleted code (uses >= maxUses) | Status shows "depleted" | |
| 13H.10 | Apply code at checkout | Promo code applied via `POST /subscription/checkout` with `promoCode` | |
| 13H.11 | **Backend curl**: `GET /api/v1/admin/discounts` | Returns codes list + totals | |
| 13H.12 | **Backend curl**: `POST /api/v1/admin/discounts` with valid body | Creates code | |

### 13I. Referrals Page (`/admin/referrals`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 13I.1 | Page loads | Referral links table: slug, label, commission rate, clicks, conversions | |
| 13I.2 | Totals row | Active links count, total clicks, total conversions, total commission €  | |
| 13I.3 | Create referral link | Form: slug, label, commission rate, optional discount code | |
| 13I.4 | Submit creates link | Link appears in table with 0 clicks/conversions | |
| 13I.5 | Duplicate slug | Error: "A referral link with this slug already exists" | |
| 13I.6 | Deactivate link | `isActive: false` — link no longer works | |
| 13I.7 | Conversions tracked | After user converts via referral slug, conversion appears | |
| 13I.8 | Revenue per link | Sum of revenue from conversions shown | |
| 13I.9 | Commission per link | Total commission owed (revenue × commissionRate) | |
| 13I.10 | **Backend curl**: `GET /api/v1/admin/referrals` | Returns links + totals | |
| 13I.11 | **Backend curl**: `POST /api/v1/admin/referrals` with `{ slug, label }` | Creates link | |

---

## SECTION 14 — LOCALIZATION

| # | Test | Expected | Result |
|---|------|----------|--------|
| 14.1 | `/` (no prefix) | English served (default locale) | |
| 14.2 | `/bg/` | All app UI in Bulgarian | |
| 14.3 | `/en/` | All app UI in English | |
| 14.4 | Language switcher (sidebar) | Switches locale, no redirect loop | |
| 14.5 | Chat in BG locale | Oracle responds in Bulgarian | |
| 14.6 | Rate limit error in BG | Error message in Bulgarian | |
| 14.7 | Auth error in BG | Error message in Bulgarian | |
| 14.8 | `/auth/callback` | Works without locale prefix — no locale mismatch | |
| 14.9 | `/xx/dashboard` (invalid locale) | 404 (notFound()), not infinite redirect | |
| 14.10 | Middleware doesn't touch `/_next/`, `/api/`, `/favicon.ico` | These load correctly | |

---

## SECTION 15 — ERROR STATES & EDGE CASES

| # | Test | Expected | Result |
|---|------|----------|--------|
| 15.1 | Expired/tampered JWT → API call | 401, redirect to `/login` | |
| 15.2 | API returns 500 | User sees friendly error, not raw stack trace | |
| 15.3 | Navigate to `/en/this-does-not-exist` | 404 page (not blank white screen) | |
| 15.4 | Birth data form with invalid city (no autocomplete match) | Validation error, not silent failure | |
| 15.5 | Astrology API down during chat | "Oracle temporarily unavailable" or LLM fallback response | |
| 15.6 | Stripe checkout session expired | Error shown, not infinite spinner | |
| 15.7 | SSE stream interrupted (network cut) | Message marked as interrupted or cancelled | |
| 15.8 | Simultaneous messages (spam Enter) | Deduplication works, only one sent | |
| 15.9 | Very long chat message | Renders without overflow or crash | |

---

## SECTION 16 — RESPONSIVE / MOBILE

> Use Chrome DevTools → 375px viewport (iPhone SE size).

| # | Test | Expected | Result |
|---|------|----------|--------|
| 16.1 | Homepage on 375px | No horizontal scroll, hero legible | |
| 16.2 | Dashboard on mobile | Sidebar collapses or bottom nav appears | |
| 16.3 | Chat input on mobile | Input bar at bottom, keyboard doesn't cover it | |
| 16.4 | Chart panel on mobile | Chart visible, not cut off | |
| 16.5 | Admin pages on mobile | Tables scroll horizontally, not broken | |
| 16.6 | Auth forms on mobile | Inputs accessible, submit visible | |
| 16.7 | Settings pages on mobile | Fully scrollable, no overlapping elements | |

---

## KNOWN GAPS (not blocking, but track)

| Item | Status | Impact |
|------|--------|--------|
| Task 9: LlmUsage table | Not populated | Admin usage charts show zeros |
| Task 10: Redis in production | In-memory fallback | Rate limits + context don't survive restarts |
| Facebook OAuth | Not implemented | No FB login available |
| Yearly Stripe prices | Price IDs not set | Only monthly billing works |
| PDF export (server-side) | Stub — returns graceful error | PNG download works, PDF doesn't |
| Middleware manifest | Compilation issue | Pages need `/en/` prefix as workaround |
| Aspect Grid Matrix | Not built | Not testable |

---

## QUICK BACKEND SMOKE TEST SCRIPT

Run this to verify the backend is alive and auth works:

```bash
BASE=https://astrologaai-backend-production.up.railway.app

# Health
curl -s $BASE/health | python3 -m json.tool

# Login
TOKEN=$(curl -s -X POST $BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['accessToken'])")

echo "Token: $TOKEN"

# Subscription status
curl -s -H "Authorization: Bearer $TOKEN" $BASE/api/v1/subscription/status | python3 -m json.tool

# Admin overview (admin account only)
curl -s -H "Authorization: Bearer $TOKEN" $BASE/api/v1/admin/overview | python3 -m json.tool
```
