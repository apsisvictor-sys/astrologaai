# Dashboard Chart Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dummy-data chart on the dashboard with a real, interactive CircularChartWheel fed by live API data, add a beautiful Void Prism planet data panel on the right, move subscription/action cards below the chart, and add zoom.

**Architecture:** The dashboard page will fetch the user's primary birth profile + chart data (same pattern as `chart-panel.tsx`), then render `CircularChartWheel` (upgraded to Void Prism colors + responsive) and a new `PlanetDataPanel` side-by-side. Cards move below. A new `adaptChartForWheel` adapter converts `BackendNatalChart` → the `NatalChart` type that `CircularChartWheel` expects.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, inline SVG

---

## Context / Key Files

- `frontend/src/app/[locale]/(app)/dashboard/page.tsx` — main dashboard (currently shows dummy chart)
- `frontend/src/components/chart/circular-chart-wheel.tsx` — advanced SVG chart (exported as default, also exports `NatalChart`, `PlanetPosition`, `HouseCusp`, `Aspect` types)
- `frontend/src/components/astrology/natal-chart-canvas.tsx` — simpler chart (currently used on dashboard — will be replaced)
- `frontend/src/components/chart/chart-panel.tsx` — reference for how to fetch birth profiles + chart data
- `frontend/src/components/chart/natal-chart-adapter.ts` — has `BackendNatalChart` interface + `adaptNatalChart()`
- API: `GET /api/v1/birth-data` → list profiles; `GET /api/v1/birth-chart/:id` → returns `BackendNatalChart`

## BackendNatalChart shape (from `natal-chart-adapter.ts`)

```typescript
interface BackendPlanet { sign: string; degree: number; retrograde?: boolean; house?: number; }
interface BackendHouseCusp { sign: string; degree: number; }
interface BackendNatalChart {
  sun: BackendPlanet; moon: BackendPlanet;
  rising?: BackendPlanet; ascendant?: BackendPlanet;
  mercury?: BackendPlanet; venus?: BackendPlanet; mars?: BackendPlanet;
  jupiter?: BackendPlanet; saturn?: BackendPlanet; uranus?: BackendPlanet;
  neptune?: BackendPlanet; pluto?: BackendPlanet;
  northNode?: BackendPlanet; southNode?: BackendPlanet;
  chiron?: BackendPlanet; lilith?: BackendPlanet;
  houses: BackendHouseCusp[];
  aspects?: Array<{ planet1: string; planet2: string; aspect: string; orb: number; nature?: string; }>;
  elements?: { fire: number; earth: number; air: number; water: number };
}
```

## CircularChartWheel NatalChart shape (from `circular-chart-wheel.tsx`)

```typescript
interface PlanetPosition { name: string; sign: string; signBg: string; degree: number; house: number; retrograde: boolean; symbol: string; }
interface HouseCusp { number: number; sign: string; signBg: string; degree: number; }
interface Aspect { planet1: string; planet2: string; aspect: string; aspectBg: string; orb: number; nature: 'harmonious' | 'challenging' | 'neutral'; }
interface NatalChart {
  sun: PlanetPosition; moon: PlanetPosition; rising: PlanetPosition;
  mercury: PlanetPosition; venus: PlanetPosition; mars: PlanetPosition;
  jupiter: PlanetPosition; saturn: PlanetPosition; uranus: PlanetPosition;
  neptune: PlanetPosition; pluto: PlanetPosition;
  northNode: PlanetPosition; southNode: PlanetPosition; chiron: PlanetPosition;
  lilith?: PlanetPosition;
  houses: HouseCusp[]; aspects: Aspect[];
  elements: { fire: number; earth: number; air: number; water: number };
  modalities: { cardinal: number; fixed: number; mutable: number };
}
```

---

## Task 1: Update CircularChartWheel — Void Prism colors + responsive SVG

**Files:**
- Modify: `frontend/src/components/chart/circular-chart-wheel.tsx`

**What to change:**

### Step 1: Update the `colors` object (lines 18–29)

Replace:
```typescript
const colors = {
  background: '#0A0A0F',
  surface: '#0A0A1F',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: '#252532',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};
```
With:
```typescript
const colors = {
  background: '#0D0010',
  surface: '#130019',
  primary: '#e41aff',
  secondary: '#00f0ff',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: 'rgba(228,26,255,0.18)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};
```

### Step 2: Update zodiac fill colors (lines 344–347)

Replace the `fillColor` assignments inside `renderZodiacWheel`:
```typescript
if (['Aries', 'Leo', 'Sagittarius'].includes(sign)) fillColor = 'rgba(251,191,36,0.1)';
else if (['Taurus', 'Virgo', 'Capricorn'].includes(sign)) fillColor = 'rgba(16,185,129,0.1)';
else if (['Gemini', 'Libra', 'Aquarius'].includes(sign)) fillColor = 'rgba(167,139,250,0.1)';
else if (['Cancer', 'Scorpio', 'Pisces'].includes(sign)) fillColor = 'rgba(0,240,255,0.1)';
```

### Step 3: Make SVG responsive (line 585–590)

Replace the opening `<svg>` tag:
```tsx
// BEFORE:
<svg
  ref={svgRef}
  width={size}
  height={size}
  viewBox={`0 0 ${size} ${size}`}
  style={{ background: colors.background, borderRadius: '50%' }}
>

// AFTER:
<svg
  ref={svgRef}
  width="100%"
  height="100%"
  viewBox={`0 0 ${size} ${size}`}
  style={{ background: colors.background, borderRadius: '50%', display: 'block' }}
>
```

### Step 4: Update the wrapping div (line 583)

Replace:
```tsx
<div className="relative inline-block">
```
With:
```tsx
<div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
```

### Step 5: Update aspect colors to use Void Prism

Replace in `ASPECT_COLORS` (lines 138–145):
```typescript
const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#e41aff',
  sextile: colors.success,
  square: '#ff0080',
  trine: '#00f0ff',
  opposition: '#ff6b6b',
  quincunx: colors.warning,
};
```

### Step 6: Update planet highlight colors in `renderPlanets` (lines 507–510)

The planet background stroke for Sun/Moon/Rising:
```tsx
stroke={planet.name === 'sun' || planet.name === 'moon' || planet.name === 'rising'
  ? '#e41aff'
  : 'rgba(228,26,255,0.25)'}
```

### Step 7: Update tooltip styling (lines 615–622)

Replace tooltip div styles:
```tsx
style={{
  left: tooltip.x + 15,
  top: tooltip.y + 15,
  background: '#0D0010',
  border: '1px solid rgba(228,26,255,0.3)',
  borderRadius: '12px',
  boxShadow: '0 4px 30px rgba(228,26,255,0.15)',
}}
```

### Step 8: Commit

```bash
git add frontend/src/components/chart/circular-chart-wheel.tsx
git commit -m "feat: update CircularChartWheel to Void Prism colors + responsive SVG"
```

---

## Task 2: Create `adapt-chart-for-wheel.ts` adapter

**Files:**
- Create: `frontend/src/components/chart/adapt-chart-for-wheel.ts`

**Step 1: Write the file**

```typescript
import type { BackendNatalChart } from './natal-chart-adapter';
import type { NatalChart, PlanetPosition, HouseCusp, Aspect } from './circular-chart-wheel';

const SIGN_BG: Record<string, string> = {
  Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнаци', Cancer: 'Рак',
  Leo: 'Лъв', Virgo: 'Дева', Libra: 'Везни', Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец', Capricorn: 'Козирог', Aquarius: 'Водолей', Pisces: 'Риби',
};

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
  northNode: '☊', southNode: '☋', chiron: '⚷', lilith: '⚹', rising: '↑',
};

const SIGN_MODALITY: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
};

type RawPlanet = { sign: string; degree: number; retrograde?: boolean; house?: number };

function makePlanet(key: string, raw: RawPlanet | undefined): PlanetPosition {
  const fallback: PlanetPosition = {
    name: key, sign: 'Aries', signBg: 'Овен',
    degree: 0, house: 1, retrograde: false, symbol: PLANET_GLYPHS[key] ?? '●',
  };
  if (!raw) return fallback;
  return {
    name: key,
    sign: raw.sign,
    signBg: SIGN_BG[raw.sign] ?? raw.sign,
    degree: raw.degree,
    house: raw.house ?? 1,
    retrograde: raw.retrograde ?? false,
    symbol: PLANET_GLYPHS[key] ?? '●',
  };
}

export function adaptChartForWheel(raw: BackendNatalChart): NatalChart {
  const risingRaw = raw.rising ?? raw.ascendant;

  const houses: HouseCusp[] = (raw.houses ?? []).slice(0, 12).map((h, i) => ({
    number: i + 1,
    sign: h.sign,
    signBg: SIGN_BG[h.sign] ?? h.sign,
    degree: h.degree,
  }));
  while (houses.length < 12) {
    houses.push({ number: houses.length + 1, sign: 'Aries', signBg: 'Овен', degree: 0 });
  }

  const aspects: Aspect[] = (raw.aspects ?? []).map(a => ({
    planet1: a.planet1,
    planet2: a.planet2,
    aspect: a.aspect,
    aspectBg: a.aspect,
    orb: a.orb,
    nature: (['harmonious', 'challenging', 'neutral'].includes(a.nature ?? '')
      ? a.nature as 'harmonious' | 'challenging' | 'neutral'
      : 'neutral'),
  }));

  const allPlanets: PlanetPosition[] = [
    makePlanet('sun', raw.sun),
    makePlanet('moon', raw.moon),
    makePlanet('mercury', raw.mercury),
    makePlanet('venus', raw.venus),
    makePlanet('mars', raw.mars),
    makePlanet('jupiter', raw.jupiter),
    makePlanet('saturn', raw.saturn),
    makePlanet('uranus', raw.uranus),
    makePlanet('neptune', raw.neptune),
    makePlanet('pluto', raw.pluto),
  ];

  const modalities = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of allPlanets) {
    const mod = SIGN_MODALITY[p.sign];
    if (mod) modalities[mod]++;
  }

  const elements = raw.elements ?? { fire: 0, earth: 0, air: 0, water: 0 };

  return {
    sun: makePlanet('sun', raw.sun),
    moon: makePlanet('moon', raw.moon),
    rising: makePlanet('rising', risingRaw),
    mercury: makePlanet('mercury', raw.mercury),
    venus: makePlanet('venus', raw.venus),
    mars: makePlanet('mars', raw.mars),
    jupiter: makePlanet('jupiter', raw.jupiter),
    saturn: makePlanet('saturn', raw.saturn),
    uranus: makePlanet('uranus', raw.uranus),
    neptune: makePlanet('neptune', raw.neptune),
    pluto: makePlanet('pluto', raw.pluto),
    northNode: makePlanet('northNode', raw.northNode),
    southNode: makePlanet('southNode', raw.southNode),
    chiron: makePlanet('chiron', raw.chiron),
    lilith: raw.lilith ? makePlanet('lilith', raw.lilith) : undefined,
    houses,
    aspects,
    elements,
    modalities,
  };
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/chart/adapt-chart-for-wheel.ts
git commit -m "feat: add adaptChartForWheel adapter (BackendNatalChart → CircularChartWheel NatalChart)"
```

---

## Task 3: Create `PlanetDataPanel` component

**Files:**
- Create: `frontend/src/components/chart/planet-data-panel.tsx`

This panel shows three sections: planet list, angles (ASC/MC/DSC/IC), and element balance.
It reads `BackendNatalChart` directly — no need for the CircularChartWheel adapter.

**Design language:**
- Background: `rgba(13,0,18,0.85)` with `border: 1px solid rgba(228,26,255,0.15)`
- Section header: 10px uppercase tracking-widest, `rgba(228,26,255,0.5)` color
- Planet rows: planet glyph colored by element, name in white/60%, sign in white, degree in white
- Retrograde: `℞` in magenta
- Section divider: `border-top: 1px solid rgba(228,26,255,0.1)`
- Element dots: filled circles colored by element, empty circles for the rest

**Step 1: Write the file**

```tsx
'use client';

import type { BackendNatalChart } from '@/components/chart/natal-chart-adapter';

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
  northNode: '☊', chiron: '⚷',
};

const PLANET_NAMES_EN: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
  pluto: 'Pluto', northNode: 'N.Node', chiron: 'Chiron',
};

const PLANET_NAMES_BG: Record<string, string> = {
  sun: 'Слънце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун',
  pluto: 'Плутон', northNode: 'С.Въз.', chiron: 'Хирон',
};

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const SIGN_BG: Record<string, string> = {
  Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнаци', Cancer: 'Рак',
  Leo: 'Лъв', Virgo: 'Дева', Libra: 'Везни', Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец', Capricorn: 'Козирог', Aquarius: 'Водолей', Pisces: 'Риби',
};

// Sign → element → color
const SIGN_ELEMENT: Record<string, string> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};

const ELEMENT_COLOR: Record<string, string> = {
  fire: '#FBBF24',
  earth: '#10B981',
  air: '#A78BFA',
  water: '#00f0ff',
};

const PLANET_ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'northNode', 'chiron'] as const;

// Angle labels: house index → label
const ANGLE_LABELS = [
  { index: 0, label: 'ASC' },
  { index: 9, label: 'MC' },
  { index: 6, label: 'DSC' },
  { index: 3, label: 'IC' },
];

interface PlanetDataPanelProps {
  rawChart: BackendNatalChart;
  language?: 'en' | 'bg';
}

export function PlanetDataPanel({ rawChart, language = 'en' }: PlanetDataPanelProps) {
  const isBg = language === 'bg';

  const elements = rawChart.elements ?? computeElements(rawChart);
  const totalPlanets = Object.values(elements).reduce((s, n) => s + n, 0) || 10;

  return (
    <div
      className="w-full h-full rounded-2xl p-5 flex flex-col gap-5 overflow-y-auto"
      style={{
        background: 'rgba(13,0,18,0.85)',
        border: '1px solid rgba(228,26,255,0.15)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'inset 0 0 40px rgba(228,26,255,0.03), 0 0 40px rgba(228,26,255,0.06)',
      }}
    >
      {/* Section 1: Planets */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(228,26,255,0.5)' }}>
          {isBg ? 'Планетарни позиции' : 'Planetary Positions'}
        </p>
        <div className="flex flex-col gap-1.5">
          {PLANET_ORDER.map(key => {
            const planet = (rawChart as any)[key];
            if (!planet) return null;
            const glyph = PLANET_GLYPHS[key];
            const name = isBg ? PLANET_NAMES_BG[key] : PLANET_NAMES_EN[key];
            const signGlyph = SIGN_GLYPHS[planet.sign] ?? '';
            const signName = isBg ? (SIGN_BG[planet.sign] ?? planet.sign) : planet.sign;
            const deg = Math.floor(planet.degree);
            const arcMin = Math.round((planet.degree - deg) * 60);
            const elemColor = ELEMENT_COLOR[SIGN_ELEMENT[planet.sign]] ?? '#fff';

            return (
              <div
                key={key}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(228,26,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Planet glyph */}
                <span
                  className="w-6 text-center text-sm shrink-0"
                  style={{ color: elemColor, filter: `drop-shadow(0 0 4px ${elemColor}60)` }}
                >
                  {glyph}
                </span>

                {/* Planet name */}
                <span className="text-xs w-16 shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {name}
                </span>

                {/* Sign glyph + name */}
                <span className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-xs" style={{ color: elemColor, opacity: 0.8 }}>{signGlyph}</span>
                  <span className="text-xs text-white truncate">{signName}</span>
                </span>

                {/* Degree */}
                <span className="text-xs font-mono shrink-0" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {deg}°{arcMin.toString().padStart(2, '0')}′
                </span>

                {/* Retrograde */}
                {planet.retrograde && (
                  <span className="text-xs shrink-0" style={{ color: '#e41aff', filter: 'drop-shadow(0 0 4px rgba(228,26,255,0.8))' }}>
                    ℞
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(228,26,255,0.1)' }} />

      {/* Section 2: Angles */}
      {rawChart.houses && rawChart.houses.length >= 10 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(228,26,255,0.5)' }}>
            {isBg ? 'Ъгли' : 'Angles'}
          </p>
          <div className="flex flex-col gap-1.5">
            {ANGLE_LABELS.map(({ index, label }) => {
              const house = rawChart.houses[index];
              if (!house) return null;
              const signGlyph = SIGN_GLYPHS[house.sign] ?? '';
              const signName = isBg ? (SIGN_BG[house.sign] ?? house.sign) : house.sign;
              const deg = Math.floor(house.degree);
              const arcMin = Math.round((house.degree - deg) * 60);
              const isMainAngle = label === 'ASC' || label === 'MC';

              return (
                <div key={label} className="flex items-center gap-2 px-2 py-1.5">
                  <span
                    className="text-xs font-bold w-8 shrink-0 font-mono"
                    style={{
                      color: isMainAngle ? '#00f0ff' : 'rgba(0,240,255,0.5)',
                      filter: isMainAngle ? 'drop-shadow(0 0 4px rgba(0,240,255,0.5))' : 'none',
                    }}
                  >
                    {label}
                  </span>
                  <span className="flex items-center gap-1 flex-1">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{signGlyph}</span>
                    <span className="text-xs text-white">{signName}</span>
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {deg}°{arcMin.toString().padStart(2, '0')}′
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(228,26,255,0.1)' }} />

      {/* Section 3: Elements */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(228,26,255,0.5)' }}>
          {isBg ? 'Елементи' : 'Elements'}
        </p>
        <div className="flex flex-col gap-2">
          {[
            { key: 'fire', label: isBg ? 'Огън' : 'Fire', emoji: '🔥', color: ELEMENT_COLOR.fire },
            { key: 'earth', label: isBg ? 'Земя' : 'Earth', emoji: '🌍', color: ELEMENT_COLOR.earth },
            { key: 'air', label: isBg ? 'Въздух' : 'Air', emoji: '💨', color: ELEMENT_COLOR.air },
            { key: 'water', label: isBg ? 'Вода' : 'Water', emoji: '💧', color: ELEMENT_COLOR.water },
          ].map(({ key, label, color }) => {
            const count = (elements as any)[key] as number ?? 0;
            const maxDots = 5;
            const filled = Math.min(count, maxDots);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs w-14 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                <div className="flex gap-1">
                  {Array.from({ length: maxDots }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: i < filled ? color : 'rgba(255,255,255,0.08)',
                        boxShadow: i < filled ? `0 0 4px ${color}80` : 'none',
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-mono ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Compute element counts from planet signs if backend didn't provide them
function computeElements(chart: BackendNatalChart): { fire: number; earth: number; air: number; water: number } {
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const;
  for (const k of keys) {
    const p = (chart as any)[k];
    if (!p) continue;
    const el = SIGN_ELEMENT[p.sign];
    if (el in counts) (counts as any)[el]++;
  }
  return counts;
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/chart/planet-data-panel.tsx
git commit -m "feat: add PlanetDataPanel component — Void Prism planet list, angles, elements"
```

---

## Task 4: Redesign the Dashboard page

**Files:**
- Modify: `frontend/src/app/[locale]/(app)/dashboard/page.tsx`

**Full replacement** — completely rewrite the file with:
1. Chart data fetching (same pattern as `chart-panel.tsx`)
2. 12-col grid: chart (7 cols) + planet panel (5 cols) on top row
3. Subscription + Quick Actions cards in a bottom row (6+6 cols)
4. Profile section as a compact bottom strip
5. `CircularChartWheel` with `adaptChartForWheel` for real data
6. Mouse-wheel zoom on the chart container
7. Big 3 header (Sun · Moon · Rising) instead of "Your Ethereal Natal Chart"
8. Loading, no-data, and error states
9. Locale-aware (bg/en)

**Step 1: Write the new dashboard page**

```tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import CircularChartWheel from '@/components/chart/circular-chart-wheel';
import { PlanetDataPanel } from '@/components/chart/planet-data-panel';
import { adaptChartForWheel } from '@/components/chart/adapt-chart-for-wheel';
import type { BackendNatalChart } from '@/components/chart/natal-chart-adapter';
import type { NatalChart } from '@/components/chart/circular-chart-wheel';
import { Sparkles, MessageSquare, Compass, Settings, Users, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

interface BirthProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string | null;
  isUnknownTime: boolean;
}

const copy = {
  bg: {
    title: 'Космическо Табло',
    subtitle: 'Вашата ефирна връзка с Оракула',
    quickActions: 'Бързи действия',
    plan: 'Звезден План',
    guest: 'Пътешественик',
    freePlan: 'Търсач (Безплатен)',
    usage: 'Оставащи въпроси',
    upgrade: 'Отключи Оракула',
    addBirthData: 'Добави Натални Данни',
    noBirthDataMsg: 'Добави своята дата, час и място на раждане, за да разкриеш своята натална карта.',
    zoomHint: 'Скролни за зум',
  },
  en: {
    title: 'Cosmic Dashboard',
    subtitle: 'Your ethereal connection to The Oracle',
    quickActions: 'Quick Actions',
    plan: 'Astral Plan',
    guest: 'Traveler',
    freePlan: 'The Seeker (Free)',
    usage: 'Queries remaining',
    upgrade: 'Unlock The Oracle',
    addBirthData: 'Add Birth Data',
    noBirthDataMsg: 'Add your birth date, time, and location to reveal your natal chart.',
    zoomHint: 'Scroll to zoom',
  },
} as const;

export default function DashboardPage({ params: { locale } }: { params: { locale: 'bg' | 'en' } }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const c = copy[locale] ?? copy.en;

  const [phase, setPhase] = useState<'loading' | 'no-birth-data' | 'ready' | 'error'>('loading');
  const [rawChart, setRawChart] = useState<BackendNatalChart | null>(null);
  const [adaptedChart, setAdaptedChart] = useState<NatalChart | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [isUnknownTime, setIsUnknownTime] = useState(false);

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.6, Math.min(2.5, z - e.deltaY * 0.001)));
  }, []);

  const resetZoom = useCallback(() => setZoom(1), []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadChart();
  }, [isAuthenticated]);

  async function loadChart() {
    setPhase('loading');
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const profilesRes = await fetch(`${API_URL}/api/v1/birth-data`, { headers });
      if (!profilesRes.ok) throw new Error('Failed to load profiles');
      const profilesData = await profilesRes.json();
      const profiles: BirthProfile[] = profilesData.data?.profiles ?? profilesData.data ?? [];

      if (!profiles.length) {
        setPhase('no-birth-data');
        return;
      }

      const primary = profiles[0];
      setProfileName(primary.name);
      setIsUnknownTime(primary.isUnknownTime);

      const chartRes = await fetch(`${API_URL}/api/v1/birth-chart/${primary.id}`, { headers });
      if (!chartRes.ok) throw new Error('Failed to load chart');
      const chartData = await chartRes.json();
      const chart: BackendNatalChart = chartData.data?.chart ?? chartData.data ?? chartData;

      setRawChart(chart);
      setAdaptedChart(adaptChartForWheel(chart));
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }

  const quickActions = [
    { href: '/chat', label: locale === 'bg' ? 'Оракул' : 'Oracle', icon: MessageSquare, color: 'text-primary' },
    { href: '/forecast', label: locale === 'bg' ? 'Транзити' : 'Transits', icon: Compass, color: 'text-accent-blue' },
    { href: '/partners', label: locale === 'bg' ? 'Синастрия' : 'Synastry', icon: Users, color: 'text-[#ff0080]' },
    { href: '/settings', label: locale === 'bg' ? 'Настройки' : 'Settings', icon: Settings, color: 'text-text-muted' },
  ];

  if (isLoading || (!isAuthenticated && phase === 'loading')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-deep">
        <Sparkles className="w-8 h-8 text-primary animate-spin-slow" />
      </div>
    );
  }

  const sun = rawChart?.sun;
  const moon = rawChart?.moon;
  const rising = rawChart?.rising ?? rawChart?.ascendant;

  return (
    <main className="relative min-h-screen pt-24 pb-16 overflow-hidden selection:bg-primary/40 text-slate-100">
      {/* Background orbs */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="blur-sphere w-[500px] h-[500px] top-[-10%] right-[-10%] bg-primary" />
        <div className="blur-sphere w-[600px] h-[600px] bottom-[-20%] left-[-20%] bg-accent-blue mix-blend-screen opacity-20" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 animate-fade-in-up">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">{c.title}</h1>
            <p className="text-text-secondary text-lg">{c.subtitle}</p>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="grid lg:grid-cols-12 gap-6">

          {/* ── CHART WHEEL (7 cols) ─────────────────────────── */}
          <div className="lg:col-span-7 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div
              className="rounded-2xl p-5 relative overflow-hidden h-full"
              style={{
                background: 'rgba(10,0,16,0.7)',
                border: '1px solid rgba(228,26,255,0.15)',
                boxShadow: '0 0 60px rgba(228,26,255,0.06)',
              }}
            >
              {/* Corner glow */}
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(228,26,255,0.1) 0%, transparent 70%)', filter: 'blur(20px)' }} />

              {/* Big 3 header */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                {phase === 'ready' && sun && moon && rising ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-white">☉ {sun.sign}</span>
                    <span className="text-text-muted text-xs">·</span>
                    <span className="text-sm font-medium text-white">☽ {moon.sign}</span>
                    <span className="text-text-muted text-xs">·</span>
                    <span className="text-sm font-medium text-white">↑ {rising.sign}</span>
                    {isUnknownTime && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full ml-1" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
                        {locale === 'bg' ? '⚠ Часът е неизвестен' : '⚠ Time unknown'}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-5" />
                )}
                {profileName && (
                  <span className="text-xs text-text-muted shrink-0 ml-2">{profileName}</span>
                )}
              </div>

              {/* Chart area */}
              {phase === 'loading' && (
                <div className="flex items-center justify-center" style={{ minHeight: 420 }}>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 animate-spin"
                      style={{ borderColor: 'rgba(228,26,255,0.4)', borderTopColor: '#e41aff' }} />
                    <p className="text-xs text-text-muted">{locale === 'bg' ? 'Изчисляване...' : 'Calculating...'}</p>
                  </div>
                </div>
              )}

              {phase === 'no-birth-data' && (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(228,26,255,0.08)', border: '1px solid rgba(228,26,255,0.2)' }}>
                    <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 10px rgba(228,26,255,0.7))' }}>✦</span>
                  </div>
                  <p className="text-sm text-text-muted max-w-xs">{c.noBirthDataMsg}</p>
                  <Link
                    href="/birth-data/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
                  >
                    ✦ {c.addBirthData}
                  </Link>
                </div>
              )}

              {phase === 'error' && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <p className="text-sm text-red-400">{locale === 'bg' ? 'Грешка при зареждане' : 'Error loading chart'}</p>
                  <button onClick={loadChart} className="text-xs text-primary hover:opacity-80">
                    {locale === 'bg' ? 'Опитай отново' : 'Try again'}
                  </button>
                </div>
              )}

              {phase === 'ready' && adaptedChart && (
                <>
                  {/* Zoom hint */}
                  {zoom === 1 && (
                    <p className="text-[10px] text-center mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {c.zoomHint}
                    </p>
                  )}
                  {zoom !== 1 && (
                    <button
                      onClick={resetZoom}
                      className="text-[10px] text-center mb-2 w-full hover:opacity-80 transition-opacity"
                      style={{ color: 'rgba(228,26,255,0.5)' }}
                    >
                      {locale === 'bg' ? 'Нулирай зум' : 'Reset zoom'}
                    </button>
                  )}

                  {/* Zoomable chart container */}
                  <div
                    ref={chartRef}
                    className="overflow-hidden rounded-2xl relative"
                    onWheel={handleWheel}
                    style={{
                      cursor: zoom > 1 ? 'grab' : 'default',
                      boxShadow: '0 0 30px rgba(228,26,255,0.12)',
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <CircularChartWheel
                        chart={adaptedChart}
                        size={500}
                        language={locale}
                        showAspects={true}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── PLANET DATA PANEL (5 cols) ──────────────────── */}
          <div className="lg:col-span-5 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            {phase === 'ready' && rawChart ? (
              <PlanetDataPanel rawChart={rawChart} language={locale} />
            ) : (
              <div
                className="rounded-2xl h-full"
                style={{
                  background: 'rgba(13,0,18,0.5)',
                  border: '1px solid rgba(228,26,255,0.08)',
                  minHeight: 400,
                }}
              />
            )}
          </div>

          {/* ── BOTTOM ROW: Subscription + Quick Actions ─────── */}
          <div className="lg:col-span-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <section className="glass-panel p-6 relative overflow-hidden group h-full">
              <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-primary blur-[40px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
              <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4">{c.plan}</h2>
              <div className="mb-5 relative z-10">
                <p className="text-2xl font-display font-bold text-white mb-1">{user?.tier || c.freePlan}</p>
                <p className="text-text-secondary text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {c.usage}: 10
                </p>
              </div>
              <Link
                href="/pricing"
                className="relative z-10 w-full flex items-center justify-between bg-gradient-to-r from-primary to-accent-blue text-white font-bold py-3.5 px-5 rounded-xl hover:shadow-[0_0_20px_rgba(228,26,255,0.4)] transition-all duration-300"
              >
                {c.upgrade}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </section>
          </div>

          <div className="lg:col-span-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <section className="glass-panel p-6 h-full">
              <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4">{c.quickActions}</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-background-dark/50 border border-white/5 hover:bg-white/5 hover:border-primary/50 transition-all duration-300 group"
                  >
                    <action.icon className={`w-5 h-5 mb-2.5 ${action.color} group-hover:scale-110 transition-transform duration-300`} />
                    <span className="text-xs font-medium text-text-secondary group-hover:text-white transition-colors">{action.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* ── Profile strip ──────────────────────────────────── */}
          <div className="lg:col-span-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <section className="glass-panel px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-background-dark border border-primary/30 flex items-center justify-center text-sm font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary to-accent-blue">
                  {(user?.fullName || c.guest).charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{user?.fullName || c.guest}</p>
                  <p className="text-xs text-text-muted">{user?.email}</p>
                </div>
              </div>
            </section>
          </div>

        </div>
      </div>
    </main>
  );
}
```

**Step 2: Verify it compiles without TypeScript errors**

Check imports are correct:
- `CircularChartWheel` is the default export from `circular-chart-wheel.tsx` ✓
- `NatalChart` type is exported from `circular-chart-wheel.tsx` ✓
- `PlanetDataPanel` named export ✓
- `adaptChartForWheel` named export ✓
- `BackendNatalChart` type from `natal-chart-adapter.ts` ✓

**Step 3: Commit**

```bash
git add frontend/src/app/[locale]/\(app\)/dashboard/page.tsx
git commit -m "feat: redesign dashboard — CircularChartWheel with real data, planet panel, zoom, cards below"
```

---

## Task 5: Edit both `.ts` AND `.js` dist files for Railway

**CRITICAL: NEVER run `tsc` — it crashes with OOM. Always edit both `.ts` and `.js` dist files manually.**

The new files added in Tasks 2 and 3 are frontend-only (Next.js/React). They do NOT need corresponding backend dist changes.

The CircularChartWheel and PlanetDataPanel changes are also frontend-only.

Therefore: **No backend dist changes needed for this feature.** ✓

---

## Testing Checklist

1. **Load dashboard as authenticated user with birth data**
   - Chart should show real planet positions (not dummy Taurus/Libra/etc.)
   - Planet panel should show correct planet list
   - Big 3 header (☉ Sun · ☽ Moon · ↑ Rising) should match actual chart

2. **Load dashboard as authenticated user WITHOUT birth data**
   - Should show "Add Birth Data" prompt in chart area
   - Planet panel shows empty placeholder

3. **Zoom test**
   - Scroll mouse wheel over chart → chart zooms in/out (0.6× to 2.5×)
   - "Reset zoom" text appears when zoomed, click resets to 1×
   - SVG stays crisp at all zoom levels (vector, not raster)

4. **Planet data panel**
   - Retrograde planets show ℞ in magenta
   - Planet glyphs colored by element (fire=amber, earth=green, air=purple, water=cyan)
   - Angles section shows ASC/MC/DSC/IC with correct degrees
   - Elements section dots match planet counts

5. **Mobile**
   - Chart and panel stack vertically (grid becomes single column)
   - Cards below also stack

6. **Language (bg vs en)**
   - `/bg/dashboard` shows Bulgarian labels in planet panel and header text
   - `/dashboard` (English) shows English labels
