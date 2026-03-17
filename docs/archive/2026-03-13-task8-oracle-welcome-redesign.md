# Task 8 — Oracle Welcome & Birth Data UX Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the two "no birth data" surfaces for authenticated users into a beautiful, on-brand screen that combines Oracle voice persona with editorial value propositions — increasing birth data completion rate.

**Architecture:** Redesign `oracle-welcome.tsx` with new copy, animated glyph, 3 value bullets, and cosmic fingerprint belief statement. Then reuse that same component in the dashboard's no-birth-data phase (replacing the current minimal redirect CTA). Two file touches total. Zero logic changes.

**Tech Stack:** Next.js, React, Tailwind CSS. No new dependencies.

---

## Context — What NOT to Touch

The following are **completely out of scope** and must not be modified:
- `frontend/src/components/home/visitor-chat.tsx` — guest chat flow with registration prompts
- `frontend/src/components/chat/guest-registration-prompt.tsx` — soft/urgent/block variants
- `frontend/src/components/home/birth-data-widget.tsx` — geocoding form widget (reused as-is)
- `backend/` — no backend changes

The guest flow (visitor-chat.tsx) has its own registration-prompt-after-N-messages logic that is
entirely separate. `OracleWelcome` is for **authenticated** users with no birth data only.

---

## Where `OracleWelcome` is Currently Used

- `frontend/src/components/chat/chat-window.tsx:106` — Oracle chat tab, no-birth-data state
  - Calls: `<OracleWelcome onBirthDataSaved={() => setHasBirthData(true)} />`
- `frontend/src/app/[locale]/(app)/dashboard/page.tsx` — will be added in Task 2

---

## Task 1: Redesign `oracle-welcome.tsx`

**Files:**
- Modify: `frontend/src/components/chat/oracle-welcome.tsx`

**What to build:**
- Animated Oracle glyph (pulsing ring using Tailwind `animate-ping`)
- Personalised greeting: "Welcome, {firstName}." or "Welcome." if no name
- Oracle voice line: "I am The Oracle — your personal astrologer."
- Cosmic fingerprint belief statement (no fake user counts)
- 3 value proposition bullets
- `BirthDataWidget` (unchanged component — just pass the same `onComplete` handler)
- Save-to-API logic is identical to current implementation — do not change it
- Saving / error states below the form

**Step 1: Read the current file to understand what to preserve**

Read `frontend/src/components/chat/oracle-welcome.tsx` in full.

The save logic (the `handleComplete` function) must be preserved exactly. Only the JSX return changes.

**Step 2: Replace the component's JSX return**

Replace the entire file content with:

```tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { BirthDataWidget } from '@/components/home/birth-data-widget';
import { getApiBaseUrl } from '@/lib/runtime-config';

interface OracleWelcomeProps {
  onBirthDataSaved: () => void;
}

export function OracleWelcome({ onBirthDataSaved }: OracleWelcomeProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async (data: {
    date: string;
    time: string;
    location: string;
    lat: number;
    lng: number;
  }) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const res = await fetch(`${getApiBaseUrl()}/api/v1/birth-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user?.fullName || user?.email || 'My Chart',
          birthDate: data.date,
          birthTime: data.time || null,
          isUnknownTime: !data.time,
          locationName: data.location,
          latitude: data.lat,
          longitude: data.lng,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to save');
      }
      onBirthDataSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save birth data');
      setSaving(false);
    }
  };

  const firstName = user?.fullName?.split(' ')[0] ?? null;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-6 py-10 gap-7">

      {/* Oracle glyph — pulsing ring */}
      <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
        {/* ambient glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(228,26,255,0.18) 0%, transparent 70%)',
            filter: 'blur(18px)',
            transform: 'scale(2.2)',
          }}
        />
        {/* pulsing ring */}
        <div
          className="absolute inset-0 rounded-full animate-ping pointer-events-none"
          style={{ border: '1px solid rgba(228,26,255,0.28)' }}
        />
        {/* inner circle */}
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(228,26,255,0.08)',
            border: '1px solid rgba(228,26,255,0.30)',
          }}
        >
          <span
            className="text-2xl"
            style={{ filter: 'drop-shadow(0 0 12px rgba(228,26,255,0.8))' }}
          >
            ✦
          </span>
        </div>
      </div>

      {/* Oracle voice header */}
      <div className="text-center max-w-xs">
        <h2 className="text-base font-semibold text-white mb-1.5">
          {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
        </h2>
        <p className="text-sm font-medium mb-4" style={{ color: 'rgba(228,26,255,0.85)' }}>
          I am The Oracle — your personal astrologer.
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
          The positions of every star and planet at the exact moment of your birth
          form a pattern that has never existed before and never will again.
        </p>
      </div>

      {/* Value propositions */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        {[
          { icon: '✦', text: 'Your unique natal chart — mapped to the minute' },
          { icon: '◈', text: 'Daily cosmic guidance tailored to your chart' },
          { icon: '◉', text: 'Real-time planetary transits in your sky' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-start gap-3">
            <span className="text-xs shrink-0 mt-0.5" style={{ color: 'rgba(228,26,255,0.55)' }}>
              {icon}
            </span>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {text}
            </p>
          </div>
        ))}
      </div>

      {/* Birth data form */}
      <div className="w-full max-w-sm">
        <BirthDataWidget onComplete={handleComplete} />
        {saving && (
          <p className="text-xs text-center mt-3" style={{ color: 'rgba(255,255,255,0.38)' }}>
            Calculating your chart…
          </p>
        )}
        {error && (
          <p className="text-xs text-red-400 text-center mt-3">{error}</p>
        )}
      </div>

    </div>
  );
}
```

**Step 3: Verify no broken imports**

Check that `getApiBaseUrl` is still imported from `@/lib/runtime-config`. This was in the original — confirm it's still there.

**Step 4: Manual smoke test (local dev)**

1. Log in as a user with NO birth data (or clear birth data from DB for test account)
2. Navigate to `/chat` — should see the new Oracle Welcome screen
3. Confirm: pulsing ring visible, Oracle voice text, 3 bullets, form renders
4. Fill in the form with a valid date/time/location, click "Calculate My Chart"
5. Confirm: chart loads, chat becomes active

**Step 5: Commit**

```bash
git add frontend/src/components/chat/oracle-welcome.tsx
git commit -m "feat: redesign OracleWelcome — Oracle voice + value props + cosmic fingerprint statement"
```

---

## Task 2: Wire Dashboard to Use `OracleWelcome`

**Files:**
- Modify: `frontend/src/app/[locale]/(app)/dashboard/page.tsx`

The dashboard currently shows a minimal placeholder (icon + text + link button) when `phase === 'no-birth-data'`. We replace it with `<OracleWelcome onBirthDataSaved={loadChart} />`. The `loadChart()` function already sets `phase('loading')` and refetches — it will transition to `'ready'` once birth data exists.

**Step 1: Read the dashboard file**

Read `frontend/src/app/[locale]/(app)/dashboard/page.tsx` in full to confirm:
- `loadChart` is defined as a regular async function (confirmed at line 137)
- The no-birth-data block is at line 279–303
- Current imports at the top

**Step 2: Add the import**

In the imports section near the top, add:

```tsx
import { OracleWelcome } from '@/components/chat/oracle-welcome';
```

Add it after the existing local component imports (e.g. after the `DailyHoroscopeCard` import).

**Step 3: Replace the no-birth-data phase block**

Find this block (around line 279–303):

```tsx
{/* No birth data */}
{phase === 'no-birth-data' && (
  <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center"
      style={{
        background: 'rgba(228,26,255,0.08)',
        border: '1px solid rgba(228,26,255,0.2)',
      }}
    >
      <span
        className="text-2xl"
        style={{ filter: 'drop-shadow(0 0 10px rgba(228,26,255,0.7))' }}
      >
        ✦
      </span>
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
```

Replace with:

```tsx
{/* No birth data — Oracle welcome inline */}
{phase === 'no-birth-data' && (
  <OracleWelcome onBirthDataSaved={loadChart} />
)}
```

**Step 4: Clean up now-unused copy keys**

In the `copy` object at the top of the file, remove the `addBirthData` and `noBirthDataMsg` keys from both `bg` and `en` since they are no longer referenced. Example — remove these two lines from each locale block:

```
addBirthData: 'Add Birth Data',
noBirthDataMsg: 'Add your birth date, time, and location to reveal your natal chart.',
```

Also remove `addBirthData` and `noBirthDataMsg` from the Bulgarian block accordingly.

Also remove the `Link` import from `@/i18n/navigation` ONLY if it is no longer used anywhere else in the file after this change. Do a quick scan — if `Link` is still used elsewhere in the file, leave it.

**Step 5: Manual smoke test (local dev)**

1. Log in as a user with NO birth data
2. Navigate to `/dashboard`
3. Confirm: chart panel shows the new Oracle Welcome screen (not the old link button)
4. Fill in the form, submit
5. Confirm: chart panel transitions to loading spinner, then shows the natal chart

**Step 6: Commit**

```bash
git add frontend/src/app/[locale]/\(app\)/dashboard/page.tsx
git commit -m "feat: wire dashboard no-birth-data phase to OracleWelcome component"
```

---

## Implementation Log

| Task | Status | Notes |
|------|--------|-------|
| Task 1 — Redesign oracle-welcome.tsx | pending | |
| Task 2 — Wire dashboard | pending | |
