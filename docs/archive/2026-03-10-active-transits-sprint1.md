# Active Transits — Sprint 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace fake/stub transit data with real astrology-api.io calls, pre-inject natal chart + active transits into every Oracle conversation (eliminating redundant tool calls), and build an Active Transits page showing all current transit-to-natal aspects.

**Architecture:**
- A new shared service function `getActiveTransitsForUser(natalChart)` calls astrology-api.io for today's sky positions (cached 1 hour in Redis, universal for all users), then computes aspects to the user's specific natal chart using the existing `calculateTransitsToNatal()` function. This result gets: (1) injected into every Oracle system prompt as pre-loaded context, (2) returned by the `GET /api/v1/forecasts/transits` endpoint, and (3) displayed on a new `/transits` frontend page.
- `get_natal_chart` and `get_transits` tools are removed from the Oracle tool set — the data is now always in context. The Oracle still has 8 on-demand tools for specific queries (synastry, solar return, etc.).
- Daily forecast service's fake `getCurrentTransits()` is replaced with the same real data source.

**Tech Stack:** Node/Express/TypeScript backend, Next.js/React frontend, astrology-api.io (already configured), Redis (Upstash, already configured), Vercel AI SDK (existing streaming pipeline).

**Critical notes for implementer:**
- **NEVER run `tsc` locally** — it OOM crashes. Edit BOTH `.ts` source files AND matching `.js` files in `backend/dist/` manually.
- The dist files mirror src exactly, just compiled JS. When you edit a `.ts` file, also edit the corresponding `.js` in `backend/dist/`.
- Backend runs locally on port 4000 via `tsx watch`. After editing `.ts` files it auto-reloads. Dist `.js` files are for Railway production deployment.
- `astrology-api.io` base URL: `https://json.astrology-api.io/v1`, key in `backend/.env` as `ASTROLOGY_API_KEY`.
- The orchestrator (`backend/src/services/astrology/astrology-orchestrator.ts`) has a working `getTransits(date, options?)` method — use it.
- `calculateTransitsToNatal(transits, natalChart)` in `backend/src/services/transits.ts:454` already works correctly — use it as-is.
- `buildSystemPrompt` in `backend/src/services/llm-helpers.ts:357` already has a `transitsSummary` parameter that gets appended to the system prompt — it's just never populated. We just need to populate it.

---

## Task 1: Create shared `getActiveTransitsForUser` service function

**What:** A single function that takes a natal chart object, fetches today's sky from astrology-api.io (via the existing orchestrator), computes transit-to-natal aspects, and returns both the raw sky positions and the computed aspects. This is the single source of truth used by all other tasks.

**Files:**
- Modify: `backend/src/services/transits.ts` (add the new function near end of file, after `calculateTransitsToNatal`)
- Modify: `backend/dist/services/transits.js` (mirror the change in compiled JS)

**Step 1: Read the existing exports at bottom of `backend/src/services/transits.ts`**

The file ends at line 511:
```typescript
export type { DailyTransits as DailyTransitsType, TransitAspect as TransitAspectType };
```

**Step 2: Add the new function to `backend/src/services/transits.ts` before the export line**

Add this function at line 511 (before the existing `export type` line):

```typescript
/**
 * Get active transit-to-natal aspects for a user's chart.
 * Fetches today's sky from astrology-api.io (cached 1h, universal for all users),
 * then computes which transiting planets are aspecting the user's natal planets.
 *
 * @param natalChart - The user's natal chart object (from birthChart.chartData in DB)
 * @returns { skyPositions, aspectsToNatal, moonPhase, generatedAt }
 */
export async function getActiveTransitsForUser(natalChart: any): Promise<{
  skyPositions: TransitPosition[];
  aspectsToNatal: TransitAspect[];
  moonPhase: MoonPhase;
  generatedAt: string;
}> {
  // Import orchestrator here to avoid circular deps
  const { astrologyOrchestrator } = await import('./astrology/astrology-orchestrator');

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  // getDailyTransits already handles caching (1h TTL) and uses the in-house
  // Swiss Ephemeris calculation. We use it for moon phase + as fallback.
  const dailyData = await getDailyTransits(today);

  let skyPositions = dailyData.transits;

  // Try to upgrade to real astrology-api.io data (more accurate)
  try {
    const apiData = await astrologyOrchestrator.getTransits(dateStr);
    if (apiData?.planets?.length > 0) {
      skyPositions = apiData.planets.map((p: any) => ({
        planet: p.name,
        planetBg: PLANET_BG[p.name] || p.name,
        sign: p.sign,
        signBg: SIGN_BG[p.sign] || p.sign,
        degree: p.degree,
        retrograde: p.retrograde ?? false,
      }));
    }
  } catch (err) {
    console.warn('[Transits] astrology-api.io failed, using in-house calculation:', err);
  }

  const aspectsToNatal = calculateTransitsToNatal(skyPositions, natalChart);

  return {
    skyPositions,
    aspectsToNatal,
    moonPhase: dailyData.moonPhase,
    generatedAt: new Date().toISOString(),
  };
}
```

**Step 3: Check the orchestrator export name**

Run: `grep -n "export" backend/src/services/astrology/astrology-orchestrator.ts | head -20`

The orchestrator exports a singleton instance. Find the exact export name (likely `astrologyOrchestrator` or `orchestrator`). Adjust the import in the function above to match the actual export name.

**Step 4: Mirror the change in `backend/dist/services/transits.js`**

Find the corresponding location at the end of the dist file and add the equivalent compiled JS:

```javascript
/**
 * Get active transit-to-natal aspects for a user's chart.
 */
async function getActiveTransitsForUser(natalChart) {
  const { astrologyOrchestrator } = await Promise.resolve().then(() => require('./astrology/astrology-orchestrator'));
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dailyData = await getDailyTransits(today);
  let skyPositions = dailyData.transits;
  try {
    const apiData = await astrologyOrchestrator.getTransits(dateStr);
    if (apiData?.planets?.length > 0) {
      skyPositions = apiData.planets.map((p) => ({
        planet: p.name,
        planetBg: PLANET_BG[p.name] || p.name,
        sign: p.sign,
        signBg: SIGN_BG[p.sign] || p.sign,
        degree: p.degree,
        retrograde: p.retrograde ?? false,
      }));
    }
  } catch (err) {
    console.warn('[Transits] astrology-api.io failed, using in-house calculation:', err);
  }
  const aspectsToNatal = calculateTransitsToNatal(skyPositions, natalChart);
  return {
    skyPositions,
    aspectsToNatal,
    moonPhase: dailyData.moonPhase,
    generatedAt: new Date().toISOString(),
  };
}
exports.getActiveTransitsForUser = getActiveTransitsForUser;
```

**Step 5: Verify the function can be imported**

Run: `cd /home/victor/.openclaw/workspace/astrologaai && node -e "const t = require('./backend/dist/services/transits'); console.log(typeof t.getActiveTransitsForUser)"`

Expected output: `function`

**Step 6: Commit**

```bash
git add backend/src/services/transits.ts backend/dist/services/transits.js
git commit -m "feat: add getActiveTransitsForUser — real API + natal aspect computation"
```

---

## Task 2: Pre-inject natal chart + active transits into Oracle system prompt

**What:** In `chatController.ts`, after the existing natal chart is fetched, call `getActiveTransitsForUser()` and build a `transitsSummary` string. Pass it to `buildSystemPrompt()`. Remove `get_natal_chart` and `get_transits` from the Oracle's tool list — they're now always pre-loaded in context.

**Files:**
- Modify: `backend/src/controllers/chatController.ts` (~lines 270-320)
- Modify: `backend/src/services/llm.ts` (~lines 114-120, tool list)
- Modify: `backend/dist/controllers/chatController.js`
- Modify: `backend/dist/services/llm.js`

**Step 1: Read the current transit summary format in `llm-helpers.ts`**

In `buildSystemPrompt` (line 357-375), the `transitsSummary` string is injected under the heading `CURRENT TRANSITS:`. We need to format our data to match this expectation.

**Step 2: Add `getActiveTransitsForUser` import to `chatController.ts`**

Find the imports block at the top. Currently imports from `'../services/llm'`. Add the transits import:

```typescript
import { getActiveTransitsForUser } from '../services/transits';
```

**Step 3: Populate `transitsSummary` in `chatController.ts`**

Find the block around line 271-295 where `chartSummary` is built. Immediately AFTER that block (around line 295, before `buildSystemPrompt` is called), add:

```typescript
    // Build active transits context (pre-injected — no tool call needed)
    let transitsSummary: string | undefined;
    if (chartSummary) {
      // Only compute if we have a natal chart to match against
      try {
        const chartData = (() => {
          // Re-fetch the chart data we already have
          if (session.birthProfileId || birthProfileId) {
            return null; // will be populated below via separate path
          }
          return null;
        })();

        // We need the raw chartData object — re-use what was already fetched above
        // The chartSummary was built from chartData, so fetch it again cleanly
        let rawChartData: any = null;
        if (session.birthProfileId || birthProfileId) {
          const profileId = session.birthProfileId || birthProfileId;
          const bp = await prisma.birthProfile.findUnique({
            where: { id: profileId! },
            include: { birthChart: true },
          });
          rawChartData = bp?.birthChart?.chartData || null;
        } else {
          const uc = await prisma.birthChart.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
          });
          rawChartData = uc?.chartData || null;
        }

        if (rawChartData) {
          const { skyPositions, aspectsToNatal, moonPhase } = await getActiveTransitsForUser(rawChartData);

          const aspectLines = aspectsToNatal.slice(0, 12).map(a =>
            `- ${a.transitPlanetBg} ${a.aspectBg} natal ${a.natalPlanetBg} | orb ${a.orb}° | ${a.influence} | ${a.description}`
          ).join('\n');

          const skyLines = skyPositions.map(p =>
            `${p.planetBg}: ${p.signBg} ${p.degree}°${p.retrograde ? ' ℞' : ''}`
          ).join(', ');

          transitsSummary = `TODAY'S SKY (${new Date().toISOString().split('T')[0]}):
${skyLines}

Moon: ${moonPhase.phaseBg} (${moonPhase.illumination}% illuminated) in ${moonPhase.moonSignBg}

ACTIVE TRANSITS TO NATAL CHART (sorted by orb — tightest = most powerful):
${aspectLines || 'No major aspects within orb today.'}`;
        }
      } catch (err) {
        console.warn('[Chat] Failed to compute active transits for system prompt:', err);
        // Non-fatal — Oracle continues without transit context
      }
    }
```

**Step 4: Pass `transitsSummary` to `buildSystemPrompt`**

Find the `buildSystemPrompt` call (line ~312):

```typescript
    const systemPrompt = buildSystemPrompt({
      chartSummary,
      language: userLanguage,
      conversationHistory,
      sessionSummary,
      recentMessages,
    });
```

Change it to:

```typescript
    const systemPrompt = buildSystemPrompt({
      chartSummary,
      transitsSummary,   // ← add this line
      language: userLanguage,
      conversationHistory,
      sessionSummary,
      recentMessages,
    });
```

**Step 5: Remove `get_natal_chart` and `get_transits` from Oracle tool list in `llm.ts`**

Find lines 114-121 in `backend/src/services/llm.ts`:

```typescript
    // FREE: natal chart only — users can explore their birth chart placements
    activeTools['get_natal_chart'] = astrologyTools.get_natal_chart;

    // PRO: adds live transits, solar return, and lunar return
    if (tier === 'PRO' || tier === 'PREMIUM') {
      activeTools['get_transits'] = astrologyTools.get_transits;
      activeTools['get_solar_return'] = astrologyTools.get_solar_return;
      activeTools['get_lunar_return'] = astrologyTools.get_lunar_return;
    }
```

Replace with:

```typescript
    // Natal chart and current transits are pre-injected into the system prompt.
    // Tools here are for on-demand, user-directed, specific queries only.

    // PRO: solar return (year ahead) and lunar return (month ahead)
    if (tier === 'PRO' || tier === 'PREMIUM') {
      activeTools['get_solar_return'] = astrologyTools.get_solar_return;
      activeTools['get_lunar_return'] = astrologyTools.get_lunar_return;
    }
```

**Step 6: Update the tier system prompt context in `llm.ts` to remove references to get_natal_chart and get_transits**

Find the FREE tier system prompt (line ~136) and update the tool reference text:

```typescript
    const systemPromptContext = tier === 'FREE'
      ? `The user is on the FREE plan — 'The Seeker' (Търсачът).
Your natal chart data is already loaded in your context above — use it directly without calling any tools.
You CANNOT access forecasts, relationship analysis, or timing tools on this plan.
If the user asks about current planetary events, what to expect this year, relationship compatibility, or specific timing — do NOT guess or hallucinate. Acknowledge it warmly and guide them: 'За да видим какво правят планетите за теб в момента и какво предстои тази година, можеш да преминеш към план Pro (Навигаторът).'`

      : tier === 'PRO'
      ? `The user is on the PRO plan — 'The Navigator' (Навигаторът).
Your natal chart data and today's active transits are already loaded in your context above — use them directly without tool calls.
You have access to TWO additional tools for specific time-based queries:
- get_solar_return: the annual chart cast for the user's birthday — use this for questions about the year ahead
- get_lunar_return: the monthly lunar cycle chart — use this for questions about THIS MONTH
You CANNOT access relationship synastry, composite charts, secondary progressions, solar arc directions, astrocartography, or Venus Return timing on this plan.
If the user asks about relationship compatibility, soul connections, or detailed timing — guide them: 'За задълбочен анализ на взаимоотношенията, можеш да преминеш към план Premium (Оракулът).'`

      : `The user is on the PREMIUM plan — 'The Oracle' (Оракулът).
Your natal chart data and today's active transits are already loaded in your context above — use them directly without tool calls.
You have access to eight additional tools for on-demand specific queries:
- get_solar_return: annual solar return chart for year-ahead themes
- get_lunar_return: monthly lunar return chart — emotional themes and current cycle
- get_synastry: inter-chart aspects between the user and a partner — relationship compatibility
- get_progressions: secondary progressions — slow inner psychological and life evolution
- get_solar_arc: solar arc directions — long-term life chapter shifts (~1° per year)
- get_relocation: astrocartography — how different locations affect the chart
- get_composite: the composite chart — the relationship as its own entity
- get_venus_return: Venus return chart — precise timing for love and financial luck
Answer every question with depth, nuance, and comprehensive multi-tool synthesis when relevant.`;
```

**Step 7: Mirror all changes in `backend/dist/controllers/chatController.js` and `backend/dist/services/llm.js`**

These files are the compiled JS counterparts. Replicate the same logic changes in JS syntax.

**Step 8: Test the Oracle in a chat session**

Start the backend (`cd backend && npm run dev`). Open a chat. Check the server logs — you should NOT see `[Agent Tool Triggered] calculateNatalChartTool` or `[Agent Tool Triggered] analyzeTransitsTool`. You SHOULD see `[Transits]` log output from the new function.

Ask the Oracle: "What transits are active for me right now?" — it should answer from context without triggering any tool calls.

**Step 9: Commit**

```bash
git add backend/src/controllers/chatController.ts backend/src/services/llm.ts \
        backend/dist/controllers/chatController.js backend/dist/services/llm.js
git commit -m "feat: pre-inject natal chart + active transits into Oracle context, remove redundant tool calls"
```

---

## Task 3: Fix `getCurrentTransits()` in forecast service and wire the transits endpoint

**What:** Two fixes in one commit:
1. Replace the fake `Math.random()` `getCurrentTransits()` function in `forecast.ts` with a call to the real `getActiveTransitsForUser()`.
2. Replace the stub response in `GET /api/v1/forecasts/transits` with real data.

**Files:**
- Modify: `backend/src/services/forecast.ts` (~lines 228-258)
- Modify: `backend/src/routes/forecasts.ts` (~lines 167-216)
- Modify: `backend/dist/services/forecast.js`
- Modify: `backend/dist/routes/forecasts.js`

**Step 1: Fix `getCurrentTransits()` in `backend/src/services/forecast.ts`**

Find the function at line 228:
```typescript
async function getCurrentTransits(): Promise<Transit[]> {
  // ... 30 lines of Math.random() fake code ...
}
```

Replace the entire function body with:
```typescript
async function getCurrentTransits(natalChart?: any): Promise<Transit[]> {
  if (natalChart) {
    try {
      const { getActiveTransitsForUser } = await import('./transits');
      const { skyPositions } = await getActiveTransitsForUser(natalChart);
      return skyPositions.map(p => ({
        planet: p.planet,
        planetBg: p.planetBg,
        sign: p.sign,
        signBg: p.signBg,
        degree: p.degree,
      }));
    } catch (err) {
      console.warn('[Forecast] getActiveTransitsForUser failed, using fallback:', err);
    }
  }

  // Fallback: use in-house Swiss Ephemeris calculation (no API key needed)
  const { getDailyTransits } = await import('./transits');
  const daily = await getDailyTransits(new Date());
  return daily.transits.map(p => ({
    planet: p.planet,
    planetBg: p.planetBg,
    sign: p.sign,
    signBg: p.signBg,
    degree: p.degree,
  }));
}
```

**Step 2: Update the caller of `getCurrentTransits()` in `forecast.ts` to pass natalChart**

Search for `getCurrentTransits()` calls in the file. Find where it's called (likely in `getDailyForecast`) and update to pass the natalChart:

```typescript
// Before:
const transits = await getCurrentTransits();

// After:
const transits = await getCurrentTransits(natalChart);
```

**Step 3: Wire `GET /api/v1/forecasts/transits` in `backend/src/routes/forecasts.ts`**

Find lines 198-205 (the stub response):
```typescript
    // For now, return a placeholder - real implementation would use astrology API
    res.json({
      success: true,
      data: {
        message: 'Transits endpoint - to be implemented with astrology-api.io integration',
        userId,
      },
    });
```

Replace from line 181 (where birth data is validated) through the stub response with:

```typescript
    const birthChart = await prisma.birthChart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!birthChart?.chartData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CHART_NOT_FOUND',
          message: 'Natal chart not computed yet. Save your birth data first.',
        },
      });
    }

    const { getActiveTransitsForUser } = await import('../services/transits');
    const transitData = await getActiveTransitsForUser(birthChart.chartData);

    res.json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        skyPositions: transitData.skyPositions,
        aspectsToNatal: transitData.aspectsToNatal,
        moonPhase: transitData.moonPhase,
        generatedAt: transitData.generatedAt,
      },
    });
```

Remove the old birth data lookup block (lines 181-196) since the new code above replaces it.

**Step 4: Mirror changes in `backend/dist/services/forecast.js` and `backend/dist/routes/forecasts.js`**

**Step 5: Test the endpoint**

```bash
# Get a valid access token from local dev, then:
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/v1/forecasts/transits | jq '.data.aspectsToNatal | length'
```

Expected: a number > 0 (e.g., 15-25 active aspects)

Also verify it's NOT a stub: `curl ... | jq '.data.message'` should return `null`.

**Step 6: Commit**

```bash
git add backend/src/services/forecast.ts backend/src/routes/forecasts.ts \
        backend/dist/services/forecast.js backend/dist/routes/forecasts.js
git commit -m "feat: wire real transit data to forecast service and /forecasts/transits endpoint"
```

---

## Task 4: Build Active Transits frontend page

**What:** A new page at `/transits` (accessible via sidebar) that fetches from `GET /api/v1/forecasts/transits` and displays all active transit-to-natal aspects grouped by transit speed. Three sections: "Today" (fast movers: Sun/Moon/Mercury/Venus/Mars), "This Month/Season" (Jupiter/Saturn), "Long-Term Themes" (Uranus/Neptune/Pluto).

**Files:**
- Create: `frontend/src/app/[locale]/(app)/transits/page.tsx`
- Possibly modify: `frontend/src/components/shell/sidebar.tsx` (add navigation link)

**Step 1: Understand the existing design system**

Read `frontend/src/app/[locale]/(app)/forecast/weekly/page.tsx` lines 1-60 for the color palette and styling conventions used in forecast pages. Colors are defined inline — no Tailwind theme needed.

The design system colors (confirmed from notifications page):
```typescript
const COLORS = {
  backgroundPrimary: '#0D0010',
  backgroundSecondary: 'rgba(255,255,255,0.03)',
  primary: '#e41aff',
  secondary: '#ff0080',
  textPrimary: '#FAFAFA',
  textSecondary: 'rgba(255,255,255,0.55)',
  gradient: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
  success: '#10B981',
  error: '#EF4444',
  border: 'rgba(228,26,255,0.2)',
  surface: 'rgba(255,255,255,0.04)',
};
```

**Step 2: Define speed categorization for planets**

```typescript
const FAST_MOVERS = ['moon', 'sun', 'mercury', 'venus', 'mars'];
const SOCIAL_PLANETS = ['jupiter', 'saturn'];
const OUTER_PLANETS = ['uranus', 'neptune', 'pluto', 'northNode', 'southNode', 'chiron'];

function getTransitCategory(planet: string): 'today' | 'season' | 'longterm' {
  if (FAST_MOVERS.includes(planet)) return 'today';
  if (SOCIAL_PLANETS.includes(planet)) return 'season';
  return 'longterm';
}
```

**Step 3: Create `frontend/src/app/[locale]/(app)/transits/page.tsx`**

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from '@/i18n/navigation';

const COLORS = {
  backgroundPrimary: '#0D0010',
  backgroundSecondary: 'rgba(255,255,255,0.03)',
  primary: '#e41aff',
  textPrimary: '#FAFAFA',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.3)',
  gradient: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
  success: '#10B981',
  error: '#EF4444',
  border: 'rgba(228,26,255,0.2)',
  surface: 'rgba(255,255,255,0.04)',
  positive: '#10B981',
  challenging: '#F59E0B',
  neutral: '#94A3B8',
};

const FAST_MOVERS = ['moon', 'sun', 'mercury', 'venus', 'mars'];
const SOCIAL_PLANETS = ['jupiter', 'saturn'];

interface TransitAspect {
  transitPlanet: string;
  transitPlanetBg: string;
  natalPlanet: string;
  natalPlanetBg: string;
  aspect: string;
  aspectBg: string;
  orb: number;
  influence: 'positive' | 'challenging' | 'neutral';
  description: string;
}

interface TransitData {
  date: string;
  skyPositions: Array<{ planet: string; planetBg: string; sign: string; signBg: string; degree: number; retrograde: boolean }>;
  aspectsToNatal: TransitAspect[];
  moonPhase: { phase: string; phaseBg: string; illumination: number; moonSign: string; moonSignBg: string };
  generatedAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

function getCategory(planet: string): 'today' | 'season' | 'longterm' {
  if (FAST_MOVERS.includes(planet)) return 'today';
  if (SOCIAL_PLANETS.includes(planet)) return 'season';
  return 'longterm';
}

function influenceColor(influence: string) {
  if (influence === 'positive') return COLORS.positive;
  if (influence === 'challenging') return COLORS.challenging;
  return COLORS.neutral;
}

function TransitCard({ aspect, locale }: { aspect: TransitAspect; locale: string }) {
  const color = influenceColor(aspect.influence);
  return (
    <div
      className="p-4 rounded-xl"
      style={{ background: COLORS.backgroundSecondary, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold" style={{ color: COLORS.textPrimary }}>
              {aspect.transitPlanetBg}
            </span>
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
              {aspect.aspectBg}
            </span>
            <span style={{ color: COLORS.textSecondary }}>
              {locale === 'bg' ? 'natal' : 'natal'} {aspect.natalPlanetBg}
            </span>
          </div>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            {aspect.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs" style={{ color: COLORS.textMuted }}>
            {locale === 'bg' ? 'орб' : 'orb'}
          </div>
          <div className="font-mono text-sm" style={{ color }}>
            {aspect.orb}°
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActiveTransitsPage() {
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<TransitData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/transits');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('astrologaai_access_token');
    if (!token) return;

    fetch(`${API_URL}/api/v1/forecasts/transits`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || 'Failed to load transits');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.backgroundPrimary }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin" style={{ background: COLORS.gradient }} />
          <p style={{ color: COLORS.textSecondary }}>{locale === 'bg' ? 'Зареждане...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const todayAspects = data?.aspectsToNatal.filter(a => getCategory(a.transitPlanet) === 'today') ?? [];
  const seasonAspects = data?.aspectsToNatal.filter(a => getCategory(a.transitPlanet) === 'season') ?? [];
  const longtermAspects = data?.aspectsToNatal.filter(a => getCategory(a.transitPlanet) === 'longterm') ?? [];

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: COLORS.backgroundPrimary }}>
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link href="/forecast" className="flex items-center gap-2 mb-8" style={{ color: COLORS.textSecondary }}>
          ← {locale === 'bg' ? 'Прогнози' : 'Forecasts'}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.textPrimary }}>
            {locale === 'bg' ? 'Активни транзити' : 'Active Transits'}
          </h1>
          {data && (
            <p style={{ color: COLORS.textSecondary }}>
              {locale === 'bg' ? `Небе за ${data.date}` : `Sky for ${data.date}`}
              {' · '}
              {data.moonPhase.phaseBg} {data.moonPhase.illumination}%
              {' · '}
              {locale === 'bg' ? 'Луна в' : 'Moon in'} {data.moonPhase.moonSignBg}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: `${COLORS.error}20`, border: `1px solid ${COLORS.error}`, color: COLORS.error }}>
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Today — fast movers */}
            {todayAspects.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-1" style={{ color: COLORS.textPrimary }}>
                  {locale === 'bg' ? '⚡ Днешни влияния' : '⚡ Today\'s Influences'}
                </h2>
                <p className="text-sm mb-4" style={{ color: COLORS.textMuted }}>
                  {locale === 'bg' ? 'Слънце, Луна, Меркурий, Венера, Марс' : 'Sun, Moon, Mercury, Venus, Mars'}
                </p>
                <div className="space-y-3">
                  {todayAspects.map((a, i) => <TransitCard key={i} aspect={a} locale={locale} />)}
                </div>
              </section>
            )}

            {/* Season — Jupiter/Saturn */}
            {seasonAspects.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-1" style={{ color: COLORS.textPrimary }}>
                  {locale === 'bg' ? '🌊 Тази сезон' : '🌊 This Season'}
                </h2>
                <p className="text-sm mb-4" style={{ color: COLORS.textMuted }}>
                  {locale === 'bg' ? 'Юпитер, Сатурн' : 'Jupiter, Saturn'} · {locale === 'bg' ? 'седмици до месеци' : 'weeks to months'}
                </p>
                <div className="space-y-3">
                  {seasonAspects.map((a, i) => <TransitCard key={i} aspect={a} locale={locale} />)}
                </div>
              </section>
            )}

            {/* Long-term — outer planets */}
            {longtermAspects.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-1" style={{ color: COLORS.textPrimary }}>
                  {locale === 'bg' ? '✨ Дългосрочни теми' : '✨ Long-Term Themes'}
                </h2>
                <p className="text-sm mb-4" style={{ color: COLORS.textMuted }}>
                  {locale === 'bg' ? 'Уран, Нептун, Плутон, Хирон' : 'Uranus, Neptune, Pluto, Chiron'} · {locale === 'bg' ? 'месеци до години' : 'months to years'}
                </p>
                <div className="space-y-3">
                  {longtermAspects.map((a, i) => <TransitCard key={i} aspect={a} locale={locale} />)}
                </div>
              </section>
            )}

            {data.aspectsToNatal.length === 0 && (
              <div className="text-center py-12" style={{ color: COLORS.textSecondary }}>
                {locale === 'bg' ? 'Няма активни аспекти в момента.' : 'No active aspects at this time.'}
              </div>
            )}

            {/* Sky overview */}
            <section className="mt-4 p-4 rounded-xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: COLORS.textSecondary }}>
                {locale === 'bg' ? 'Небесни позиции днес' : 'Current sky positions'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.skyPositions.map((p, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded" style={{ background: COLORS.backgroundSecondary, color: COLORS.textMuted }}>
                    {p.planetBg} {p.signBg} {p.degree}°{p.retrograde ? ' ℞' : ''}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Add a transits link to the sidebar**

Read `frontend/src/components/shell/sidebar.tsx` to find the navigation links section. Find where "Forecast" or "Weekly" links are defined, and add an "Active Transits" link nearby:

The exact code depends on the sidebar structure. Look for the nav items array or the JSX with forecast-related hrefs. Add:
```tsx
{ href: '/transits', label: locale === 'bg' ? 'Активни транзити' : 'Active Transits', icon: '🌟' }
```

**Step 5: Test the page**

Visit `http://localhost:3003/transits`. Verify:
- Page loads with real transit data (not a loading spinner stuck)
- Aspects are grouped correctly by planet speed
- Three sections appear
- Sky positions strip shows at bottom

**Step 6: Commit**

```bash
git add frontend/src/app/[locale]/\(app\)/transits/page.tsx \
        frontend/src/components/shell/sidebar.tsx
git commit -m "feat: add Active Transits page with real transit-to-natal aspects"
```

---

## Final Verification Checklist

Before declaring Sprint 1 done:

- [ ] `GET /api/v1/forecasts/transits` returns real data with `aspectsToNatal` array (not stub message)
- [ ] Backend server logs show NO `[Agent Tool Triggered] calculateNatalChartTool` during a chat session
- [ ] Backend server logs show NO `[Agent Tool Triggered] analyzeTransitsTool` during a chat session
- [ ] Oracle responds to "what transits are active for me?" using the pre-injected context, without tool calls
- [ ] Active Transits page loads at `/transits` with real grouped data
- [ ] Daily forecast still works (not broken by getCurrentTransits fix)
- [ ] Both `.ts` and `.js` dist files updated for every changed backend file

---

## What was NOT changed (intentional scope)

- `get_solar_return`, `get_lunar_return`, `get_synastry`, etc. — kept as tool calls (correct: these ARE on-demand queries)
- `transits.ts` in-house calculation — kept as fallback (good resilience if astrology-api.io is down)
- No DB schema changes needed
- No new env vars needed (astrology-api.io key already configured)
