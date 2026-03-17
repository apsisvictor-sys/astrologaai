# AstroLogAI — US-01 to US-39 Verification Matrix

Status baseline prepared on 2026-02-27.

**Important:** This is a preparation matrix only. Runtime verification has **not** started yet (per Victor instruction).

## Legend
- **Code Status**: Implemented (from tracker) / Unknown
- **Verification Status**: Not Started / In Progress / Passed / Failed
- **Infra Check**: Supabase / Redis / Stripe / OAuth / Astrology API / Resend as applicable

---

## Sprint 1 — Foundation

| US | Story | Code Status | Verification Status | Infra Check |
|---|---|---|---|---|
| US-01 | Registration | Implemented | Not Started | Supabase, Resend |
| US-02 | Login | Implemented | Not Started | Supabase |
| US-03 | Password Reset | Implemented | Not Started | Supabase, Redis, Resend |
| US-04 | Social Login | Implemented | Not Started | Google OAuth, Apple OAuth, Supabase |
| US-05 | Birth Data Collection | Implemented | Not Started | Supabase, Astrology API |
| US-06 | Natal Chart Generation | Implemented | Not Started | Astrology API, Redis |
| US-07 | Onboarding Tutorial | Implemented | Not Started | Frontend/UI |
| US-25 | Set Language Preference | Implemented | Not Started | Frontend/API |
| US-33 | Astrology API Fallback Strategy | Implemented | Not Started | Astrology API |
| US-36 | Free-tier Query Limit Enforcement | Implemented | Not Started | Redis/Supabase |

## Sprint 2 — Core Chat

| US | Story | Code Status | Verification Status | Infra Check |
|---|---|---|---|---|
| US-08 | Send Message to AI Astrologer | Implemented | Not Started | LLM provider, Redis |
| US-09 | Chat History | Implemented | Not Started | Supabase |
| US-10 | Chat Context Persistence | Implemented | Not Started | Redis |
| US-11 | Streaming Responses | Implemented | Not Started | WebSocket/SSE |
| US-34 | LLM Provider Fallback Strategy | Implemented | Not Started | LLM providers |
| US-37 | API Rate-Limit Burst/Retry Behavior | Implemented | Not Started | API middleware |
| US-38 | WebSocket/Stream Reconnection Strategy | Implemented | Not Started | Socket infra |

## Sprint 3 — Chart + Forecasts

| US | Story | Code Status | Verification Status | Infra Check |
|---|---|---|---|---|
| US-12 | View Natal Chart | Implemented | Not Started | Frontend/UI |
| US-13 | Understand Chart Components | Implemented | Not Started | Frontend/API |
| US-14 | Explore Chart Aspects | Implemented | Not Started | Astrology API |
| US-15 | Daily Forecast | Implemented | Not Started | Astrology API |
| US-16 | Weekly Forecast | Implemented | Not Started | Astrology API |
| US-17 | Transit Alerts | Implemented | Not Started | Notifications |
| US-35 | Translation Fallback Strategy | Implemented | Not Started | i18n layer |
| US-39 | Localized Error-Message Framework | Implemented | Not Started | API + i18n |

## Sprint 4 — Relationships

| US | Story | Code Status | Verification Status | Infra Check |
|---|---|---|---|---|
| US-18 | Add Partner | Implemented | Not Started | Supabase |
| US-19 | Synastry Chart Generation | Implemented | Not Started | Astrology API |
| US-20 | Compatibility Analysis | Implemented | Not Started | Astrology API + LLM |

## Sprint 5 — Subscription & Billing

| US | Story | Code Status | Verification Status | Infra Check |
|---|---|---|---|---|
| US-21 | View Subscription Plans | Implemented | Not Started | Frontend |
| US-22 | Upgrade Subscription | Implemented | Not Started | Stripe |
| US-23 | Manage Billing/Subscription | Implemented | Not Started | Stripe |
| US-24 | Downgrade Subscription | Implemented | Not Started | Stripe |

## Sprint 6 — Language + Settings

| US | Story | Code Status | Verification Status | Infra Check |
|---|---|---|---|---|
| US-26 | Auto-Detect User Language | Implemented | Not Started | i18n |
| US-27 | Translate Content/Chat Responses | Implemented | Not Started | i18n + LLM |
| US-28 | Edit Profile | Implemented | Not Started | Supabase |
| US-29 | Notification Preferences | Implemented | Not Started | Supabase |
| US-30 | Edit Birth Data | Implemented | Not Started | Supabase + Astrology API |
| US-31 | Delete Account | Implemented | Not Started | Supabase |
| US-32 | Export User Data | Implemented | Not Started | Supabase |

---

## Out-of-scope IDs removed from active tracker
US-40, US-41, US-42, US-43, US-44, US-45, US-46, US-47, US-48, US-49, US-50

These are not part of the official BMAD scope (docs 01–12).
