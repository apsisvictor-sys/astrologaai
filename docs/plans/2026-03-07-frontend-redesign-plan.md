# Frontend Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean rebuild of the AstroLogAI frontend — chat-centric, Void Prism design system, iterative delivery with Stitch design review between each task.

**Architecture:** Next.js 14 App Router with next-intl localization. Authenticated app shell wraps all `/chat`, `/chart`, `/transits`, `/partners`, `/settings` routes with a desktop sidebar + mobile bottom nav. Public routes (`/`, `/features`, `/pricing`) are standalone. Chat is always the home screen for authenticated users. Preserved integrations: auth-context, socket-client, api-client, chat-context-ws, NatalChartCanvas.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, next-intl, Socket.io client, Supabase auth, Framer Motion (animations), Lucide React (icons)

**Design reference:** `docs/plans/2026-03-07-frontend-redesign-design.md`

**Process:** After each task, stop for Stitch design review before proceeding to the next task.

---

## Pre-Task: Install Missing Dependencies

**Step 1: Check and install framer-motion if not present**

```bash
cd /home/victor/.openclaw/workspace/astrologaai/frontend
cat package.json | grep framer-motion
```

If not present:
```bash
npm install framer-motion
```

**Step 2: Verify existing preserved files are intact**

```bash
ls src/lib/auth-context.tsx
ls src/lib/socket-client.ts
ls src/lib/api-client.ts
ls src/lib/chat-context-ws.tsx
ls src/components/astrology/natal-chart-canvas.tsx
```

All 5 must exist before starting.

---

## Task 1: Design System — Tokens, Global CSS, Base Components

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/glass-panel.tsx`
- Create: `src/components/ui/input-oval.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/spinner.tsx`

---

**Step 1.1: Update Tailwind config with Void Prism tokens**

Replace the contents of `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'background-deep':  '#0D0010',
        'background-dark':  '#1a0b1c',
        'surface':          '#2d1633',
        'surface-light':    '#3d1f45',
        'primary':          '#e41aff',
        'primary-dim':      'rgba(228, 26, 255, 0.15)',
        'accent-cyan':      '#00f0ff',
        'accent-pink':      '#ff0080',
        'accent-amber':     '#FBBF24',
        'text-primary':     '#FAFAFA',
        'text-secondary':   '#CBD5E1',
        'text-muted':       '#64748B',
        'border-subtle':    'rgba(255, 255, 255, 0.07)',
        'pro-gold':         '#F59E0B',
        'premium-purple':   '#8B5CF6',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm':   '8px',
        DEFAULT: '12px',
        'lg':   '16px',
        'xl':   '24px',
        '2xl':  '32px',
        'full': '9999px',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(228, 26, 255, 0.3)',
        'glow-cyan':    '0 0 20px rgba(0, 240, 255, 0.3)',
        'glow-pink':    '0 0 20px rgba(255, 0, 128, 0.3)',
        'panel':        '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'float':        'float 6s ease-in-out infinite',
        'pulse-slow':   'pulse 3s ease-in-out infinite',
        'fade-in':      'fadeIn 0.4s ease-out',
        'slide-up':     'slideUp 0.4s ease-out',
        'slide-in-left':'slideInLeft 0.3s ease-out',
        'expand-chat':  'expandChat 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        expandChat: {
          from: { opacity: '0', height: '60px' },
          to:   { opacity: '1', height: '480px' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

**Step 1.2: Update globals.css**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

@layer base {
  * {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    background-color: #0D0010;
    color: #FAFAFA;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::selection {
    background-color: rgba(228, 26, 255, 0.3);
    color: #FAFAFA;
  }

  ::-webkit-scrollbar {
    width: 4px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(228, 26, 255, 0.3);
    border-radius: 4px;
  }
}

@layer components {
  /* Glass panel — core surface primitive */
  .glass-panel {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 16px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .glass-panel-hover {
    @apply glass-panel transition-all duration-300;
  }
  .glass-panel-hover:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(228, 26, 255, 0.2);
  }

  /* Glow borders */
  .glow-primary {
    box-shadow: 0 0 20px rgba(228, 26, 255, 0.25);
    border: 1px solid rgba(228, 26, 255, 0.3);
  }

  .glow-cyan {
    box-shadow: 0 0 20px rgba(0, 240, 255, 0.25);
    border: 1px solid rgba(0, 240, 255, 0.3);
  }

  /* Blur spheres — ambient depth background elements */
  .blur-sphere {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
    opacity: 0.35;
  }

  /* Neon gradient text */
  .gradient-text {
    background: linear-gradient(135deg, #e41aff, #00f0ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Neon gradient button */
  .gradient-button {
    background: linear-gradient(135deg, #ff0080, #e41aff, #00f0ff);
    background-size: 200% 200%;
    transition: background-position 0.3s ease, box-shadow 0.3s ease;
  }
  .gradient-button:hover {
    background-position: right center;
    box-shadow: 0 0 30px rgba(228, 26, 255, 0.5);
  }

  /* Tier badge colors */
  .tier-free     { color: #64748B; border-color: #64748B; }
  .tier-pro      { color: #F59E0B; border-color: #F59E0B; }
  .tier-premium  { color: #8B5CF6; border-color: #8B5CF6; }
}
```

---

**Step 1.3: Create Button component**

Create `src/components/ui/button.tsx`:

```typescript
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full',
          {
            'bg-primary text-white hover:bg-primary/90 hover:shadow-glow-primary':
              variant === 'primary',
            'bg-transparent text-text-secondary hover:text-white hover:bg-white/5':
              variant === 'ghost',
            'border border-border-subtle text-text-secondary hover:border-primary/40 hover:text-white':
              variant === 'outline',
            'gradient-button text-white':
              variant === 'gradient',
          },
          {
            'text-sm px-4 py-2':   size === 'sm',
            'text-sm px-6 py-2.5': size === 'md',
            'text-base px-8 py-3': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

**Step 1.4: Create GlassPanel component**

Create `src/components/ui/glass-panel.tsx`:

```typescript
import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'primary' | 'cyan' | 'none';
  hover?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, glow = 'none', hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-panel',
          hover && 'glass-panel-hover cursor-pointer',
          glow === 'primary' && 'glow-primary',
          glow === 'cyan'    && 'glow-cyan',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';
```

**Step 1.5: Create InputOval component**

Create `src/components/ui/input-oval.tsx`:

```typescript
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputOvalProps extends InputHTMLAttributes<HTMLInputElement> {
  onSend?: () => void;
  isLoading?: boolean;
}

export const InputOval = forwardRef<HTMLInputElement, InputOvalProps>(
  ({ className, onSend, isLoading, ...props }, ref) => {
    return (
      <div className={cn(
        'relative flex items-center w-full',
        'bg-white/5 border border-white/10 rounded-full',
        'focus-within:border-primary/50 focus-within:shadow-glow-primary',
        'transition-all duration-300',
        className
      )}>
        <input
          ref={ref}
          className="flex-1 bg-transparent px-6 py-4 text-text-primary placeholder-text-muted outline-none text-sm"
          {...props}
        />
        <button
          onClick={onSend}
          disabled={isLoading}
          className="mr-2 w-9 h-9 rounded-full gradient-button flex items-center justify-center shrink-0 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    );
  }
);

InputOval.displayName = 'InputOval';
```

**Step 1.6: Create Badge component**

Create `src/components/ui/badge.tsx`:

```typescript
import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'free' | 'pro' | 'premium' | 'locked';
}

export function Badge({ className, variant = 'free', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border',
        {
          'text-text-muted border-text-muted/40 bg-text-muted/10':      variant === 'free',
          'text-pro-gold border-pro-gold/40 bg-pro-gold/10':            variant === 'pro',
          'text-premium-purple border-premium-purple/40 bg-premium-purple/10': variant === 'premium',
          'text-text-muted border-white/10 bg-white/5':                 variant === 'locked',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
```

**Step 1.7: Create Spinner component**

Create `src/components/ui/spinner.tsx`:

```typescript
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin',
        className
      )}
    />
  );
}
```

**Step 1.8: Ensure utils/cn helper exists**

Check `src/lib/utils.ts`. If missing, create it:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwindcss-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

If `clsx` or `tailwind-merge` not installed:
```bash
npm install clsx tailwind-merge
```

**Step 1.9: Visual check**

```bash
npm run dev
```

Open browser. Verify globals.css loads. No console errors.

**Step 1.10: Commit**

```bash
git add -A
git commit -m "feat: design system — Void Prism tokens, global CSS, base UI components"
```

> **STITCH REVIEW CHECKPOINT:** Share the token values and component screenshots with Stitch before Task 2.

---

## Task 2: Homepage — Dormant Oracle + Awakening Animation

**Files:**
- Modify: `src/app/[locale]/page.tsx` (complete rewrite)
- Create: `src/components/home/oracle-hero.tsx`
- Create: `src/components/home/oracle-avatar.tsx`
- Create: `src/components/home/visitor-chat.tsx`
- Create: `src/components/home/birth-data-widget.tsx`
- Create: `src/components/home/product-section.tsx`
- Create: `src/components/home/public-footer.tsx`
- Create: `src/components/home/public-nav.tsx`

---

**Step 2.1: Create PublicNav (minimal top nav for public pages)**

Create `src/components/home/public-nav.tsx`:

```typescript
import Link from 'next/link';

export function PublicNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5">
      <div className="text-white font-display font-bold text-lg tracking-tight">
        Astro<span className="gradient-text">Log</span>AI
      </div>
      <div className="flex items-center gap-8">
        <Link href="/features" className="text-sm text-text-muted hover:text-white transition-colors">
          Features
        </Link>
        <Link href="/pricing" className="text-sm text-text-muted hover:text-white transition-colors">
          Pricing
        </Link>
        <Link href="/login" className="text-sm text-text-muted hover:text-white transition-colors">
          Sign in
        </Link>
        <Link
          href="/register"
          className="text-sm px-4 py-2 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-all"
        >
          Begin
        </Link>
      </div>
    </nav>
  );
}
```

**Step 2.2: Create OracleAvatar (animated cosmic sphere)**

Create `src/components/home/oracle-avatar.tsx`:

```typescript
'use client';

import { motion } from 'framer-motion';

export function OracleAvatar() {
  return (
    <motion.div
      className="relative w-48 h-48 mx-auto mb-8"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse-slow" />

      {/* Rotating outer ring */}
      <motion.div
        className="absolute inset-2 rounded-full border border-primary/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        {/* Ring dots */}
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <div
            key={deg}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translateY(-42px) translate(-50%, -50%)`,
            }}
          />
        ))}
      </motion.div>

      {/* Inner sphere */}
      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/40 via-accent-pink/20 to-accent-cyan/30 backdrop-blur-sm" />

      {/* Center glyph */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl" style={{ filter: 'drop-shadow(0 0 12px #e41aff)' }}>✦</span>
      </div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/60"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            y: [-4, 4, -4],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 2 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}
    </motion.div>
  );
}
```

**Step 2.3: Create BirthDataWidget (inline birth data collection)**

Create `src/components/home/birth-data-widget.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface BirthDataWidgetProps {
  onComplete: (data: { date: string; time: string; location: string; lat: number; lng: number }) => void;
}

export function BirthDataWidget({ onComplete }: BirthDataWidgetProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [unknownTime, setUnknownTime] = useState(false);
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const searchLocation = async (query: string) => {
    if (query.length < 3) return;
    try {
      const res = await fetch(`/api/locations/autocomplete?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setLocationSuggestions(data.suggestions || []);
    } catch {
      setLocationSuggestions([]);
    }
  };

  const isComplete = date && (time || unknownTime) && selectedLocation;

  const handleSubmit = () => {
    if (!isComplete || !selectedLocation) return;
    onComplete({
      date,
      time: unknownTime ? '12:00' : time,
      location: selectedLocation.name,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
    });
  };

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4 text-left">
      <p className="text-xs font-bold uppercase tracking-widest text-primary/60">Birth Coordinates</p>

      {/* Date */}
      <div>
        <label className="block text-xs text-text-muted mb-1">Date of birth</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Time */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-text-muted">Time of birth</label>
          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={unknownTime}
              onChange={(e) => setUnknownTime(e.target.checked)}
              className="accent-primary"
            />
            Unknown
          </label>
        </div>
        <input
          type="time"
          value={time}
          disabled={unknownTime}
          onChange={(e) => setTime(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 disabled:opacity-40"
        />
      </div>

      {/* Location */}
      <div className="relative">
        <label className="block text-xs text-text-muted mb-1">Birth city</label>
        <input
          type="text"
          value={location}
          placeholder="e.g. Sofia, Bulgaria"
          onChange={(e) => {
            setLocation(e.target.value);
            setSelectedLocation(null);
            searchLocation(e.target.value);
          }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-text-muted"
        />
        {locationSuggestions.length > 0 && !selectedLocation && (
          <div className="absolute top-full left-0 right-0 mt-1 glass-panel rounded-xl overflow-hidden z-10">
            {locationSuggestions.slice(0, 5).map((s, i) => (
              <button
                key={i}
                className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-white/5 transition-colors"
                onClick={() => {
                  setLocation(s.name);
                  setSelectedLocation(s);
                  setLocationSuggestions([]);
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="gradient"
        className="w-full"
        disabled={!isComplete}
        onClick={handleSubmit}
      >
        Calculate My Chart
      </Button>
    </div>
  );
}
```

**Step 2.4: Create VisitorChat (expanded chat state)**

Create `src/components/home/visitor-chat.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BirthDataWidget } from './birth-data-widget';
import { InputOval } from '@/components/ui/input-oval';

interface Message {
  role: 'oracle' | 'user';
  content: string;
  widget?: 'birth-data';
}

const PROMPT_COUNT_KEY = 'oracle_visitor_prompts';
const REGISTER_THRESHOLD = 3;

interface VisitorChatProps {
  onRegisterPrompt: () => void;
}

export function VisitorChat({ onRegisterPrompt }: VisitorChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'oracle',
      content: "I am The Oracle — your personal astrologer. To read your chart and speak to your cosmic blueprint, I need to know when and where you arrived in this world.",
      widget: 'birth-data',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [birthDataCollected, setBirthDataCollected] = useState(false);
  const [promptCount, setPromptCount] = useState(
    parseInt(sessionStorage.getItem(PROMPT_COUNT_KEY) || '0')
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBirthData = (data: any) => {
    setBirthDataCollected(true);
    setMessages(prev => [
      ...prev,
      { role: 'user', content: `Born ${data.date}${data.time ? ' at ' + data.time : ''} in ${data.location}` },
      { role: 'oracle', content: "Beautiful. I can feel the architecture of your chart taking shape. What would you like to explore first — who you are at your core, what's happening in your life right now, or something else entirely?" },
    ]);
    // Store birth data in sessionStorage for guest session
    sessionStorage.setItem('guest_birth_data', JSON.stringify(data));
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !birthDataCollected) return;

    const newCount = promptCount + 1;
    setPromptCount(newCount);
    sessionStorage.setItem(PROMPT_COUNT_KEY, String(newCount));

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    if (newCount >= REGISTER_THRESHOLD) {
      onRegisterPrompt();
      return;
    }

    setIsLoading(true);
    // TODO: Connect to backend guest chat endpoint in Task 5
    // For now, simulate Oracle response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'oracle',
        content: "Your chart reveals something fascinating here. To continue this conversation and save your insights, I invite you to create your free account — your chart and this session will be waiting for you.",
      }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              {msg.role === 'oracle' ? (
                <div className="max-w-[85%] space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs text-primary">✦</span>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed pt-0.5">{msg.content}</p>
                  </div>
                  {msg.widget === 'birth-data' && !birthDataCollected && (
                    <div className="ml-10">
                      <BirthDataWidget onComplete={handleBirthData} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-[80%] glass-panel px-4 py-2.5 rounded-2xl rounded-br-sm">
                  <p className="text-white text-sm">{msg.content}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center">
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-xs text-primary">✦</span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {birthDataCollected && (
        <div className="p-4 border-t border-white/5">
          <InputOval
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            onSend={sendMessage}
            isLoading={isLoading}
            placeholder="Ask the Oracle..."
          />
        </div>
      )}
    </div>
  );
}
```

**Step 2.5: Create OracleHero (dormant + awakening)**

Create `src/components/home/oracle-hero.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OracleAvatar } from './oracle-avatar';
import { VisitorChat } from './visitor-chat';
import { InputOval } from '@/components/ui/input-oval';
import { useRouter } from 'next/navigation';

export function OracleHero() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const router = useRouter();

  const handleExpand = () => setIsExpanded(true);

  if (showRegisterPrompt) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 rounded-3xl text-center max-w-md mx-auto glow-primary"
      >
        <div className="text-4xl mb-4">✦</div>
        <h2 className="text-2xl font-bold text-white mb-3">Your chart is ready.</h2>
        <p className="text-text-secondary mb-6">
          Create your free account to save your chart, continue this conversation, and access your full cosmic blueprint.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/register')}
            className="gradient-button text-white font-bold py-3 px-8 rounded-full"
          >
            Create Free Account
          </button>
          <button
            onClick={() => router.push('/pricing')}
            className="text-sm text-text-muted hover:text-white transition-colors"
          >
            View all plans
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          /* DORMANT STATE */
          <motion.div
            key="dormant"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <OracleAvatar />
            <p className="text-text-muted text-sm mb-6 animate-float">
              Your personal astrologer awaits
            </p>
            <InputOval
              placeholder="Ask the Oracle..."
              onFocus={handleExpand}
              onClick={handleExpand}
              readOnly
              className="cursor-pointer max-w-md mx-auto"
            />
          </motion.div>
        ) : (
          /* EXPANDED CHAT STATE */
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 60 }}
            animate={{ opacity: 1, height: 520 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="glass-panel rounded-3xl overflow-hidden glow-primary"
            style={{ minHeight: 480 }}
          >
            {/* Chat header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-xs text-primary">✦</span>
              </div>
              <span className="text-sm font-medium text-white">The Oracle</span>
              <span className="ml-auto text-xs text-text-muted">AI Astrologer</span>
            </div>
            <VisitorChat onRegisterPrompt={() => setShowRegisterPrompt(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2.6: Create ProductSection (below the fold)**

Create `src/components/home/product-section.tsx`:

```typescript
export function ProductSection() {
  const features = [
    {
      icon: '🌌',
      title: 'Full Chart Context',
      description: 'Every answer draws on your complete natal chart — 14 celestial bodies, all aspects, houses, and your chart ruler. Not just your Sun sign.',
    },
    {
      icon: '✦',
      title: 'Genuine Reasoning',
      description: 'The Oracle synthesizes multiple chart factors the way a skilled human astrologer would — not a lookup table. It interprets. It connects. It reveals.',
    },
    {
      icon: '◎',
      title: '10 Astrological Tools',
      description: 'Natal chart, live transits, solar return, progressions, synastry, composite, astrocartography, Venus return, lunar return, solar arc directions.',
    },
  ];

  return (
    <section className="mt-32 max-w-5xl mx-auto px-6">
      <div className="text-center mb-16">
        <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-4">Why The Oracle</p>
        <h2 className="text-4xl font-bold text-white mb-4">Beyond generic AI astrology</h2>
        <p className="text-text-secondary max-w-xl mx-auto">
          Free ChatGPT doesn't know your chart. The Oracle does — completely, deeply, always.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div key={i} className="glass-panel p-8 glass-panel-hover">
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="text-lg font-bold text-white mb-3">{f.title}</h3>
            <p className="text-text-secondary text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2.7: Create PublicFooter**

Create `src/components/home/public-footer.tsx`:

```typescript
export function PublicFooter() {
  return (
    <footer className="mt-32 pb-12 px-6 text-center">
      <div className="max-w-5xl mx-auto border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-text-muted text-xs">
          © {new Date().getFullYear()} AstroLogAI
        </p>
        <div className="flex items-center gap-6">
          {['Terms of Use', 'Privacy Policy', 'Refund Policy', 'Company'].map((link) => (
            <a key={link} href="#" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
```

**Step 2.8: Rewrite homepage page.tsx**

Replace `src/app/[locale]/page.tsx`:

```typescript
import { OracleHero } from '@/components/home/oracle-hero';
import { ProductSection } from '@/components/home/product-section';
import { PublicNav } from '@/components/home/public-nav';
import { PublicFooter } from '@/components/home/public-footer';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background-deep">
      {/* Ambient blur spheres */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="blur-sphere w-[500px] h-[500px] bg-primary top-[-150px] left-[-100px]" />
        <div className="blur-sphere w-[400px] h-[400px] bg-accent-pink top-[30%] right-[-100px]" />
        <div className="blur-sphere w-[600px] h-[600px] bg-primary bottom-[-200px] left-[20%]" style={{ opacity: 0.2 }} />
      </div>

      <div className="relative z-10">
        <PublicNav />

        {/* Hero section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16">
          <div className="text-center mb-12 animate-fade-in">
            <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-4">
              AI Astrology · Precision · Depth
            </p>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 leading-tight">
              Consult <span className="gradient-text">The Oracle</span>
            </h1>
            <p className="text-text-secondary text-lg max-w-lg mx-auto">
              Your complete natal chart. A personal AI astrologer who holds it all in mind.
            </p>
          </div>

          <OracleHero />

          <p className="mt-8 text-xs text-text-muted">
            No account needed to start · <Link href="/register" className="text-primary hover:underline">Save your chart</Link> for free
          </p>
        </section>

        <ProductSection />

        {/* CTA section */}
        <section className="mt-24 text-center px-6">
          <h2 className="text-3xl font-bold text-white mb-4">Begin your reading</h2>
          <p className="text-text-secondary mb-8">Join thousands who consult The Oracle daily.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 gradient-button text-white font-bold py-4 px-10 rounded-full text-lg"
          >
            Create Free Account
          </Link>
          <p className="mt-4 text-xs text-text-muted">
            Free tier · No credit card required
          </p>
        </section>

        <PublicFooter />
      </div>
    </main>
  );
}
```

**Step 2.9: Visual check**

```bash
npm run dev
```

Verify:
- Dormant state: avatar visible, pill input below
- Click pill: avatar fades out, chat expands smoothly
- Oracle introduces itself with birth data widget
- Widget collects date/time/location
- After submit: Oracle responds, user can type
- After 3 messages: register prompt appears
- Scroll below hero: product section visible
- Footer: minimal links only

**Step 2.10: Commit**

```bash
git add -A
git commit -m "feat: homepage — dormant Oracle hero, awakening animation, visitor chat flow"
```

> **STITCH REVIEW CHECKPOINT:** Share screenshots of dormant state, expanded state, birth data widget, and product section. Refine with Stitch before Task 3.

---

## Task 3: Auth Pages — Login + Register

**Files:**
- Modify: `src/app/[locale]/login/page.tsx`
- Modify: `src/app/[locale]/register/page.tsx`
- Create: `src/components/auth/auth-shell.tsx`
- Create: `src/components/auth/login-form.tsx`
- Create: `src/components/auth/register-form.tsx`

---

**Step 3.1: Create AuthShell (shared wrapper for auth pages)**

Create `src/components/auth/auth-shell.tsx`:

```typescript
import Link from 'next/link';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background-deep flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient blur */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="blur-sphere w-96 h-96 bg-primary top-[-100px] left-[-100px]" />
        <div className="blur-sphere w-80 h-80 bg-accent-pink bottom-[-80px] right-[-80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="block text-center mb-8">
          <span className="text-white font-display font-bold text-xl tracking-tight">
            Astro<span className="gradient-text">Log</span>AI
          </span>
        </Link>

        {/* Card */}
        <div className="glass-panel p-8 glow-primary">
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          <p className="text-text-muted text-sm mb-8">{subtitle}</p>
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-text-muted">
          {footer}
        </div>
      </div>
    </main>
  );
}
```

**Step 3.2: Rewrite login page**

Replace `src/app/[locale]/login/page.tsx` — keep existing `useAuth` logic, replace visual layer only. The form should use the new AuthShell and style the existing form fields with Void Prism tokens.

Key: Do NOT touch the auth submission logic — only the JSX/className layer.

**Step 3.3: Rewrite register page**

Same as Step 3.2 — preserve logic, replace visual layer.

**Step 3.4: Visual check + commit**

```bash
npm run dev
# Check /login and /register — centered card, blur spheres, gradient button
git add -A
git commit -m "feat: auth pages — Void Prism login and register"
```

> **STITCH REVIEW CHECKPOINT**

---

## Task 4: Authenticated Shell — Sidebar + Bottom Nav

**Files:**
- Create: `src/components/shell/app-shell.tsx`
- Create: `src/components/shell/sidebar.tsx`
- Create: `src/components/shell/chat-history-list.tsx`
- Create: `src/components/shell/sidebar-nav.tsx`
- Create: `src/components/shell/bottom-nav.tsx`
- Create: `src/components/shell/tier-badge.tsx`
- Create: `src/components/shell/upgrade-prompt.tsx`
- Modify: `src/app/[locale]/layout.tsx` — wrap authenticated routes in AppShell

---

**Step 4.1: Create TierBadge**

Create `src/components/shell/tier-badge.tsx`:

```typescript
import { Badge } from '@/components/ui/badge';

interface TierBadgeProps {
  tier: 'FREE' | 'PRO' | 'PREMIUM';
  showUpgrade?: boolean;
}

const TIER_LABELS = {
  FREE:    { label: 'THE SEEKER',    variant: 'free'    as const },
  PRO:     { label: 'THE NAVIGATOR', variant: 'pro'     as const },
  PREMIUM: { label: 'THE ORACLE',    variant: 'premium' as const },
};

export function TierBadge({ tier, showUpgrade }: TierBadgeProps) {
  const { label, variant } = TIER_LABELS[tier];
  return (
    <div className="flex flex-col gap-1.5">
      <Badge variant={variant}>{label}</Badge>
      {showUpgrade && tier !== 'PREMIUM' && (
        <a href="/pricing" className="text-xs text-primary hover:text-primary/80 transition-colors">
          Upgrade plan →
        </a>
      )}
    </div>
  );
}
```

**Step 4.2: Create SidebarNav (icon nav with tier locking)**

Create `src/components/shell/sidebar-nav.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { href: '/chart',    icon: '✦', label: 'My Chart',  minTier: null    },
  { href: '/transits', icon: '◎', label: 'Transits',  minTier: 'PRO'   },
  { href: '/partners', icon: '♡', label: 'Partners',  minTier: 'PRO'   },
  { href: '/settings', icon: '⚙', label: 'Settings',  minTier: null    },
] as const;

const TIER_ORDER = { FREE: 0, PRO: 1, PREMIUM: 2 };

interface SidebarNavProps {
  userTier: 'FREE' | 'PRO' | 'PREMIUM';
  onLockedClick: (label: string) => void;
}

export function SidebarNav({ userTier, onLockedClick }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isLocked = item.minTier !== null && TIER_ORDER[userTier] < TIER_ORDER[item.minTier as keyof typeof TIER_ORDER];
        const isActive = pathname.startsWith(item.href);

        if (isLocked) {
          return (
            <button
              key={item.href}
              onClick={() => onLockedClick(item.label)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:bg-white/5 transition-all group w-full"
            >
              <span className="w-8 text-center opacity-40">{item.icon}</span>
              <span className="text-sm opacity-40">{item.label}</span>
              <Badge variant="pro" className="ml-auto">PRO</Badge>
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
              isActive
                ? 'bg-primary/10 text-white border border-primary/20'
                : 'text-text-muted hover:bg-white/5 hover:text-white'
            )}
          >
            <span className="w-8 text-center">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

**Step 4.3: Create ChatHistoryList**

Create `src/components/shell/chat-history-list.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
}

function groupByDate(sessions: ChatSession[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  return sessions.reduce((acc, s) => {
    const d = new Date(s.updatedAt).toDateString();
    const key = d === today ? 'Today' : d === yesterday ? 'Yesterday' : 'Older';
    acc[key] = [...(acc[key] || []), s];
    return acc;
  }, {} as Record<string, ChatSession[]>);
}

export function ChatHistoryList() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('astrologaai_access_token');
    if (!token) return;
    fetch('/api/v1/chat/sessions', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setSessions(d.data?.sessions || []))
      .catch(() => {});
  }, [pathname]);

  const grouped = groupByDate(sessions);

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-3 mb-1">{group}</p>
          {items.map((s) => (
            <Link
              key={s.id}
              href={`/chat/${s.id}`}
              className={cn(
                'block px-3 py-2 rounded-xl text-sm truncate transition-all',
                pathname === `/chat/${s.id}`
                  ? 'bg-primary/10 text-white'
                  : 'text-text-muted hover:bg-white/5 hover:text-white'
              )}
            >
              {s.title || 'New conversation'}
            </Link>
          ))}
        </div>
      ))}
      {sessions.length === 0 && (
        <p className="text-xs text-text-muted px-3 italic">No conversations yet</p>
      )}
    </div>
  );
}
```

**Step 4.4: Create Sidebar**

Create `src/components/shell/sidebar.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ChatHistoryList } from './chat-history-list';
import { SidebarNav } from './sidebar-nav';
import { TierBadge } from './tier-badge';

interface SidebarProps {
  onLockedFeatureClick: (feature: string) => void;
}

export function Sidebar({ onLockedFeatureClick }: SidebarProps) {
  const { user } = useAuth();
  const tier = (user?.tier || 'FREE') as 'FREE' | 'PRO' | 'PREMIUM';

  return (
    <aside className="hidden md:flex flex-col w-[260px] h-screen fixed left-0 top-0 bg-background-dark border-r border-border-subtle z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border-subtle shrink-0">
        <Link href="/chat" className="text-white font-bold text-lg tracking-tight">
          Astro<span className="gradient-text">Log</span>AI
        </Link>
      </div>

      {/* New Chat */}
      <div className="px-3 py-3 shrink-0">
        <Link
          href="/chat"
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-border-subtle text-text-secondary hover:border-primary/30 hover:text-white transition-all text-sm"
        >
          <span className="text-lg">+</span>
          New Chat
        </Link>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-hidden px-3 py-2">
        <ChatHistoryList />
      </div>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-border-subtle shrink-0 space-y-3">
        <SidebarNav userTier={tier} onLockedClick={onLockedFeatureClick} />

        {/* User + tier */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {(user?.fullName || user?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate">{user?.fullName || user?.email}</p>
            <TierBadge tier={tier} showUpgrade={tier === 'FREE'} />
          </div>
        </div>
      </div>
    </aside>
  );
}
```

**Step 4.5: Create BottomNav (mobile)**

Create `src/components/shell/bottom-nav.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/chat',    icon: '◉', label: 'Chat',     minTier: null  },
  { href: '/chart',   icon: '✦', label: 'Chart',    minTier: null  },
  { href: '/transits',icon: '◎', label: 'Transits', minTier: 'PRO' },
  { href: '/partners',icon: '♡', label: 'Partners', minTier: 'PRO' },
  { href: '/settings',icon: '⚙', label: 'Settings', minTier: null  },
] as const;

const TIER_ORDER = { FREE: 0, PRO: 1, PREMIUM: 2 };

export function BottomNav({ onLockedClick }: { onLockedClick: (f: string) => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const tier = (user?.tier || 'FREE') as 'FREE' | 'PRO' | 'PREMIUM';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background-dark border-t border-border-subtle flex">
      {TABS.map((tab) => {
        const isLocked = tab.minTier !== null && TIER_ORDER[tier] < TIER_ORDER[tab.minTier as keyof typeof TIER_ORDER];
        const isActive = pathname.startsWith(tab.href);

        const inner = (
          <div className={cn(
            'flex flex-col items-center gap-1 py-3',
            isActive ? 'text-primary' : 'text-text-muted'
          )}>
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
            {isLocked && <span className="text-[8px] font-bold text-pro-gold">PRO</span>}
          </div>
        );

        return isLocked ? (
          <button key={tab.href} onClick={() => onLockedClick(tab.label)} className="flex-1">
            {inner}
          </button>
        ) : (
          <Link key={tab.href} href={tab.href} className="flex-1">
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
```

**Step 4.6: Create UpgradeModal**

Create `src/components/shell/upgrade-modal.tsx`:

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface UpgradeModalProps {
  isOpen: boolean;
  feature: string;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, feature, onClose }: UpgradeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full glass-panel p-8 rounded-t-3xl md:rounded-3xl glow-primary z-50"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-white text-2xl">×</button>
            <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2">Upgrade Required</p>
            <h2 className="text-2xl font-bold text-white mb-2">{feature}</h2>
            <p className="text-text-secondary text-sm mb-6">
              This feature is available on The Navigator (PRO) plan and above.
            </p>
            <Link
              href="/pricing"
              onClick={onClose}
              className="block w-full text-center gradient-button text-white font-bold py-3.5 rounded-full"
            >
              View Plans & Upgrade
            </Link>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Step 4.7: Create AppShell**

Create `src/components/shell/app-shell.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { UpgradeModal } from './upgrade-modal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [lockedFeature, setLockedFeature] = useState('');

  return (
    <div className="flex min-h-screen bg-background-deep">
      {/* Desktop sidebar */}
      <Sidebar onLockedFeatureClick={setLockedFeature} />

      {/* Main content */}
      <main className="flex-1 md:ml-[260px] min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav onLockedClick={setLockedFeature} />

      {/* Upgrade modal */}
      <UpgradeModal
        isOpen={!!lockedFeature}
        feature={lockedFeature}
        onClose={() => setLockedFeature('')}
      />
    </div>
  );
}
```

**Step 4.8: Wire AppShell into authenticated layout**

Modify `src/app/[locale]/layout.tsx` — wrap the authenticated routes. The shell should only appear for authenticated users. Non-authenticated routes (`/`, `/features`, `/pricing`, `/login`, `/register`) use their own layouts.

Strategy: Check if route is in the authenticated set, apply AppShell conditionally, or create a dedicated `(app)/layout.tsx` route group.

Recommended: Create `src/app/[locale]/(app)/layout.tsx` as a Next.js route group:

```typescript
import { AppShell } from '@/components/shell/app-shell';
import { AuthProvider } from '@/lib/auth-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
```

Move `chat/`, `chart/`, `transits/`, `partners/`, `settings/` directories under `(app)/`.

**Step 4.9: Visual check + commit**

```bash
npm run dev
# Verify: sidebar visible on desktop at /chat
# Verify: bottom nav visible on mobile at /chat
# Verify: clicking PRO-locked item shows upgrade modal
git add -A
git commit -m "feat: authenticated shell — sidebar (desktop), bottom nav (mobile), upgrade modal"
```

> **STITCH REVIEW CHECKPOINT**

---

## Task 5: Chat Interface

**Files:**
- Modify: `src/app/[locale]/(app)/chat/page.tsx`
- Create: `src/app/[locale]/(app)/chat/[sessionId]/page.tsx`
- Create: `src/components/chat/chat-window.tsx`
- Create: `src/components/chat/message-list.tsx`
- Create: `src/components/chat/message-item.tsx`
- Create: `src/components/chat/chat-input-bar.tsx`
- Create: `src/components/chat/tool-indicator.tsx`
- Create: `src/components/chat/empty-state.tsx`
- Preserve: `src/lib/chat-context-ws.tsx`, `src/lib/socket-client.ts`

Key: rebuild the visual layer only. The existing `chat-context-ws.tsx` WebSocket integration is the source of truth for data. Components consume context — they do not manage socket connections.

**Step 5.1–5.9:** (ChatWindow, MessageItem with markdown rendering, ChatInputBar as pill with auto-expand textarea, ToolIndicator as subtle inline spinner, EmptyState with suggested prompts, wire to ChatContextWS, visual check, commit)

> **STITCH REVIEW CHECKPOINT**

---

## Task 6: My Chart Panel

**Files:**
- Modify: `src/app/[locale]/(app)/chart/page.tsx`
- Create: `src/components/chart/chart-panel.tsx`
- Create: `src/components/chart/natal-chart-adapter.ts`
- Create: `src/components/chart/big-three-card.tsx`
- Create: `src/components/chart/planet-table.tsx`
- Create: `src/components/chart/elements-card.tsx`
- Create: `src/components/chart/aspects-summary.tsx`
- Modify: `src/components/astrology/natal-chart-canvas.tsx` — add touch events, conjunction aspect, retrograde indicator

**Key adapter** (`natal-chart-adapter.ts`):

Maps backend `NatalChart` → `NatalChartData` expected by `NatalChartCanvas`:
```typescript
import type { NatalChart } from '@/lib/types';
import type { NatalChartData } from '@/components/astrology/natal-chart-canvas';

export function adaptNatalChart(chart: NatalChart): NatalChartData {
  return {
    planets: [
      { name: 'Sun', degree: chart.sun.degree + (SIGN_INDEX[chart.sun.sign] * 30), sign: chart.sun.sign },
      { name: 'Moon', degree: chart.moon.degree + (SIGN_INDEX[chart.moon.sign] * 30), sign: chart.moon.sign },
      // ... all planets
    ],
    houses: chart.houses.map(h => h.degree + (SIGN_INDEX[h.sign] * 30)),
    ascendant: chart.rising.degree + (SIGN_INDEX[chart.rising.sign] * 30),
  };
}
```

> **STITCH REVIEW CHECKPOINT**

---

## Task 7: Transits Panel + Tier Lock

**Files:**
- Create: `src/app/[locale]/(app)/transits/page.tsx`
- Create: `src/components/transits/transit-panel.tsx`
- Create: `src/components/transits/moon-phase-card.tsx`
- Create: `src/components/transits/transit-list.tsx`
- Create: `src/components/ui/locked-section.tsx` (reusable locked state)

> **STITCH REVIEW CHECKPOINT**

---

## Task 8: Partners Panel

**Files:**
- Modify: `src/app/[locale]/(app)/partners/page.tsx`
- Modify: `src/app/[locale]/(app)/partners/[id]/page.tsx`
- Create: `src/components/partners/partner-list.tsx`
- Create: `src/components/partners/partner-card.tsx`
- Create: `src/components/partners/add-partner-form.tsx`
- Create: `src/components/partners/synastry-view.tsx`

> **STITCH REVIEW CHECKPOINT**

---

## Task 9: Settings

**Files:**
- Modify: `src/app/[locale]/(app)/settings/page.tsx`
- Create: `src/components/settings/settings-shell.tsx` (tab nav)
- Create: `src/components/settings/profile-tab.tsx`
- Create: `src/components/settings/birth-data-tab.tsx`
- Create: `src/components/settings/subscription-tab.tsx`
- Create: `src/components/settings/notifications-tab.tsx`

> **STITCH REVIEW CHECKPOINT**

---

## Task 10: Features + Pricing Pages

**Files:**
- Modify: `src/app/[locale]/features/page.tsx`
- Modify: `src/app/[locale]/pricing/page.tsx`
- Create: `src/components/pricing/pricing-card.tsx`
- Create: `src/components/pricing/billing-toggle.tsx`

Pricing card data matches `TIER_CONFIG` from backend `subscription-tiers.ts`:
- FREE: €0 / 10 queries/month / natal chart
- PRO: €10/mo (€8/mo yearly) / unlimited / + transits, solar return, lunar return
- PREMIUM: €20/mo (€16/mo yearly) / unlimited / all 10 tools

> **STITCH REVIEW CHECKPOINT**

---

## Task 11: Admin Dashboard

**Files:**
- Create: `src/app/admin/layout.tsx` (admin auth guard)
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/stats-overview.tsx`
- Create: `src/components/admin/users-table.tsx`
- Create: `src/components/admin/system-settings.tsx` (model config, prompt editor)
- Create: `src/components/admin/provider-health.tsx`

Admin auth guard: check user has admin role (add `isAdmin` flag to User model or check email against env `ADMIN_EMAIL`).

> **STITCH REVIEW CHECKPOINT**

---

## Final Cleanup

```bash
# Remove old files that are fully replaced
rm -rf src/components/marketing/
rm -f src/components/login-form.tsx
rm -f src/components/registration-form.tsx
rm -f src/components/global-nav.tsx
rm -f src/components/navigation.tsx
rm -f src/components/provider-status.tsx
rm -f src/components/onboarding-tutorial.tsx
rm -f src/lib/socket-client.ts.backup

git add -A
git commit -m "chore: remove replaced legacy components"
```
