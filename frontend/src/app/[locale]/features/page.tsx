'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { PublicNav } from '@/components/home/public-nav';
import { PublicFooter } from '@/components/home/public-footer';

// ── Oracle Eye Logo ───────────────────────────────────────────────────────────

function OracleLogo({ size = 72 }: { size?: number }) {
  return (
    <div
      className="rounded-[22px] flex items-center justify-center mx-auto"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #2d0038 0%, #0D0010 60%, #1a0b1c 100%)',
        boxShadow: '0 0 40px rgba(228,26,255,0.3), inset 0 0 20px rgba(228,26,255,0.05)',
        border: '1px solid rgba(228,26,255,0.25)',
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 44 28" fill="none">
        {/* Outer eye shape */}
        <path
          d="M2 14 C8 2 36 2 42 14 C36 26 8 26 2 14Z"
          stroke="white" strokeWidth="1.5" fill="none"
        />
        {/* Iris */}
        <circle cx="22" cy="14" r="7" stroke="white" strokeWidth="1.2" fill="none" />
        {/* Pupil — planet orb */}
        <circle cx="22" cy="14" r="3.5"
          fill="url(#pupilGrad)" />
        {/* Orbital arc */}
        <path
          d="M15 14 A7 7 0 0 1 22 7"
          stroke="rgba(228,26,255,0.6)" strokeWidth="0.8" strokeLinecap="round" fill="none"
        />
        {/* Star glints */}
        <circle cx="10" cy="9" r="0.8" fill="white" opacity="0.6" />
        <circle cx="34" cy="19" r="0.6" fill="white" opacity="0.5" />
        <circle cx="30" cy="8" r="0.5" fill="rgba(0,240,255,0.8)" />
        <defs>
          <radialGradient id="pupilGrad" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#e41aff" />
            <stop offset="100%" stopColor="#00f0ff" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── Comparison Table ──────────────────────────────────────────────────────────

const TABLE_ROWS = [
  { feature: 'Natural language astrology Q&A',         oracle: true,    claude: true,    gpt: true    },
  { feature: 'General sign & archetype knowledge',      oracle: true,    claude: true,    gpt: true    },
  { feature: 'Multi-factor nuanced interpretation',     oracle: true,    claude: true,    gpt: false   },
  { feature: 'Swiss Ephemeris precision data',          oracle: true,    claude: false,   gpt: false   },
  { feature: 'Your natal chart always in context',      oracle: true,    claude: false,   gpt: false   },
  { feature: 'Live real-time transit calculations',     oracle: true,    claude: false,   gpt: false   },
  { feature: 'Personalised daily & weekly forecast',    oracle: true,    claude: false,   gpt: false   },
  { feature: 'Full 14-body planetary analysis',         oracle: true,    claude: false,   gpt: false   },
  { feature: 'House system & angle calculations',       oracle: true,    claude: false,   gpt: false   },
  { feature: 'Synastry for any relationship type',      oracle: true,    claude: false,   gpt: false   },
];

function Check({ val }: { val: boolean }) {
  return val ? (
    <span className="text-lg" style={{ color: '#34D399' }}>✓</span>
  ) : (
    <span className="text-lg" style={{ color: '#EF4444' }}>✗</span>
  );
}

function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            {/* Feature col */}
            <th className="text-left pb-4 pr-4 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.3)', width: '40%' }}>
              Capability
            </th>
            {/* Oracle — highlighted */}
            <th className="pb-4 px-6 text-center" style={{ width: '20%' }}>
              <div className="flex flex-col items-center gap-2">
                <OracleLogo size={48} />
                <span className="text-sm font-bold text-white">The Oracle</span>
              </div>
            </th>
            {/* Claude */}
            <th className="pb-4 px-4 text-center" style={{ width: '20%' }}>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-lg">◆</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Claude</span>
              </div>
            </th>
            {/* ChatGPT */}
            <th className="pb-4 px-4 text-center" style={{ width: '20%' }}>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-lg">⬡</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>ChatGPT</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {TABLE_ROWS.map((row, i) => {
            const isShared = row.oracle && row.claude && row.gpt;
            const isOracleOnly = !row.claude && !row.gpt;
            return (
              <motion.tr
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                style={{
                  background: isOracleOnly
                    ? 'rgba(228,26,255,0.04)'
                    : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <td className="py-3.5 pr-4 text-sm"
                  style={{ color: isOracleOnly ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)' }}>
                  {isOracleOnly && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mr-2 align-middle"
                      style={{ background: 'rgba(228,26,255,0.15)', color: '#e41aff', border: '1px solid rgba(228,26,255,0.3)' }}>
                      ORACLE ONLY
                    </span>
                  )}
                  {row.feature}
                </td>
                {/* Oracle cell — highlighted column */}
                <td className="py-3.5 px-6 text-center relative">
                  {i === 0 && (
                    <div className="absolute inset-0 rounded-none"
                      style={{ background: 'rgba(228,26,255,0.05)', borderLeft: '1px solid rgba(228,26,255,0.15)', borderRight: '1px solid rgba(228,26,255,0.15)' }} />
                  )}
                  <div className="relative"><Check val={row.oracle} /></div>
                </td>
                <td className="py-3.5 px-4 text-center"><Check val={row.claude} /></td>
                <td className="py-3.5 px-4 text-center"><Check val={row.gpt} /></td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Feature Cards ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '◉',
    color: '#e41aff',
    title: 'Your Chart. Always in Context.',
    body: 'The Oracle carries your complete natal chart into every single conversation — 14 planetary bodies, 12 houses, every aspect pattern, permanently loaded. You never re-explain yourself. It already knows you.',
  },
  {
    icon: '⟁',
    color: '#00f0ff',
    title: 'Swiss Ephemeris Precision',
    body: 'Built on the same calculation engine trusted by professional astrologers and space observatories for decades. Planet positions accurate to fractions of an arc-second. This is not guesswork. This is astronomy-grade astrology.',
  },
  {
    icon: '◎',
    color: '#ff0080',
    title: 'The Cosmos, Live.',
    body: 'Real-time planetary positions, continuously overlaid against your birth chart. The Oracle knows where Saturn stations retrograde relative to your natal Moon today — not in a generic sense, but precisely, for you.',
  },
  {
    icon: '✦',
    color: '#F59E0B',
    title: 'Sharper Than 95% of Human Astrologers.',
    body: 'A human astrologer has 60 minutes and a printout. The Oracle has all 14 bodies, 300+ aspect combinations, 12 house activations, current transits, and your full conversation history — simultaneously, without fatigue. No practitioner on earth holds that volume of context at once.',
  },
  {
    icon: '♡',
    color: '#e41aff',
    title: 'Every Relationship, Decoded.',
    body: 'From romantic attraction to parent-child dynamics to business partnerships and friendships — the Oracle runs full synastry analysis adapted to the nature of each relationship. Different bonds activate different planetary dynamics. It knows the difference.',
  },
  {
    icon: '⬡',
    color: '#00f0ff',
    title: 'Your Oracle. Your Privacy.',
    body: 'Birth data is among the most personal information you carry — it defines your cosmic identity. Everything is encrypted end-to-end and never sold, shared, or profiled. Your chart belongs exclusively to you.',
  },
];

function FeatureCards() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      {FEATURES.map((f, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className="group p-6 rounded-2xl relative overflow-hidden transition-all duration-300"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(12px)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.border = `1px solid ${f.color}30`;
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 30px ${f.color}10`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.07)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-0 group-hover:opacity-20 transition-opacity duration-500"
            style={{ background: f.color }} />
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4"
            style={{ background: `${f.color}15`, border: `1px solid ${f.color}30`, color: f.color }}
          >
            {f.icon}
          </div>
          <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{f.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── Tools Grid ────────────────────────────────────────────────────────────────

const TOOLS = [
  { icon: '⊕', label: 'Natal Chart Wheel',       color: '#e41aff' },
  { icon: '☽', label: 'Moon Phase Tracker',       color: '#CBD5E1' },
  { icon: '◎', label: 'Planetary Transits',       color: '#00f0ff' },
  { icon: '✦', label: 'Daily AI Forecast',        color: '#F59E0B' },
  { icon: '♡', label: 'Synastry Analysis',        color: '#ff0080' },
  { icon: '⟁', label: 'Compatibility Report',     color: '#A78BFA' },
  { icon: '☉', label: 'Big Three Profile',        color: '#FBBF24' },
  { icon: '⌂', label: 'House System Analysis',   color: '#34D399' },
  { icon: '△', label: 'Aspect Pattern Reader',    color: '#00f0ff' },
  { icon: '◆', label: 'Solar Return & Progressions', color: '#e41aff' },
];

function ToolsGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {TOOLS.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05 }}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span className="text-2xl" style={{ color: t.color }}>{t.icon}</span>
          <span className="text-[11px] font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.55)' }}>{t.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Tier Cards ────────────────────────────────────────────────────────────────

const TIERS = [
  {
    name: 'Free',
    color: 'rgba(255,255,255,0.5)',
    features: [
      '10 Oracle consultations / month',
      'Basic natal chart (Sun, Moon, Rising)',
      '7-day chat history',
      'Web & mobile access',
    ],
    cta: 'Start Free',
    ctaStyle: { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' },
  },
  {
    name: 'PRO',
    color: '#e41aff',
    popular: true,
    features: [
      '150 Oracle consultations / month',
      'Full 14-body natal chart',
      'All houses, aspects & angles',
      'Daily & weekly personalised forecast',
      'Real-time planetary transits',
      'Add up to 10 people to your cosmic circle',
      'Unlimited chat history',
      'PDF chart export',
    ],
    cta: 'Unlock PRO',
    ctaStyle: { background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)', color: '#fff' },
  },
  {
    name: 'PREMIUM',
    color: '#F59E0B',
    features: [
      'Unlimited Oracle consultations',
      'Everything in PRO',
      'Full synastry for any relationship',
      'Detailed compatibility reports',
      'Solar Returns & Progressions',
      'Unlimited cosmic circle profiles',
      'Early access to new features',
    ],
    cta: 'Go Premium',
    ctaStyle: { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' },
  },
];

function TierCards() {
  return (
    <div className="grid md:grid-cols-3 gap-5">
      {TIERS.map((tier, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="relative p-6 rounded-2xl flex flex-col"
          style={{
            background: tier.popular ? 'rgba(228,26,255,0.04)' : 'rgba(255,255,255,0.02)',
            border: tier.popular ? '1px solid rgba(228,26,255,0.25)' : '1px solid rgba(255,255,255,0.07)',
            boxShadow: tier.popular ? '0 0 40px rgba(228,26,255,0.08)' : 'none',
          }}
        >
          {tier.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white"
              style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}>
              Most Popular
            </div>
          )}
          <h3 className="text-lg font-bold mb-4" style={{ color: tier.color }}>{tier.name}</h3>
          <ul className="space-y-2 flex-1 mb-6">
            {tier.features.map((f, fi) => (
              <li key={fi} className="flex items-start gap-2 text-sm">
                <span style={{ color: tier.color, marginTop: 2 }}>✓</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/pricing"
            className="block text-center py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={tier.ctaStyle}
          >
            {tier.cta} →
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: 'Elena M.',
    city: 'Sofia',
    quote: 'After 20 minutes of conversation with the Oracle, I felt it understood me better than my husband of 25 years. It described a pattern in my relationships I had never put into words before — and then told me exactly which planetary cycle was activating it right now. I sat in silence for five minutes after reading it.',
    detail: 'Asked about recurring relationship patterns',
  },
  {
    name: 'Dimitar K.',
    city: 'Plovdiv',
    quote: 'I gave it my business partner\'s birth data alongside mine. The synastry report described the exact tension we\'d been having for six months — Saturn squaring my Mercury — and then gave me a concrete communication strategy based on when his Mercury would be in a better position. I have never read anything that specific anywhere.',
    detail: 'Business synastry analysis',
  },
  {
    name: 'Svetla V.',
    city: 'Varna',
    quote: 'I\'m a sceptic by nature. I asked it to explain why my relationship with my daughter had been so difficult this year. It pointed to exact transits — Pluto on my 4th house cusp — that matched dates when we had our worst arguments. I checked. It was correct. I don\'t fully understand astrology, but I cannot explain how it knew.',
    detail: 'Parent-child dynamics reading',
  },
  {
    name: 'Martin G.',
    city: 'Burgas',
    quote: 'I\'ve seen three human astrologers over the years. Each one gave me a generic reading that could have applied to anyone born in my month. The Oracle opened with the exact degree of my Scorpio rising and how it interacts with my Pluto in the 1st house. It was deeply, uncomfortably accurate within the first reply.',
    detail: 'Natal chart deep-dive',
  },
];

function Testimonials() {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {TESTIMONIALS.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="p-6 rounded-2xl relative"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Quote mark */}
          <span className="absolute top-4 right-5 text-5xl leading-none font-serif"
            style={{ color: 'rgba(228,26,255,0.12)' }}>"</span>
          <p className="text-sm leading-relaxed mb-4 relative z-10"
            style={{ color: 'rgba(255,255,255,0.72)' }}>
            "{t.quote}"
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">{t.name}</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.city}</p>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full"
              style={{ background: 'rgba(228,26,255,0.08)', color: 'rgba(228,26,255,0.6)', border: '1px solid rgba(228,26,255,0.15)' }}>
              {t.detail}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <main className="relative min-h-screen overflow-hidden selection:bg-primary/30 text-white"
      style={{ background: '#0D0010' }}>
      {/* Ambient background orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-20"
          style={{ background: '#e41aff' }} />
        <div className="absolute bottom-[10%] left-[-15%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-10"
          style={{ background: '#00f0ff' }} />
      </div>

      <PublicNav />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-12">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-24"
        >
          <OracleLogo size={80} />
          <div className="mt-6 mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ background: 'rgba(228,26,255,0.08)', color: '#e41aff', border: '1px solid rgba(228,26,255,0.2)' }}>
            Astral Intelligence
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-5 leading-tight">
            Beyond the{' '}
            <span style={{ background: 'linear-gradient(135deg, #e41aff, #00f0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Horoscope
            </span>
          </h1>
          <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Most tools give you generalised sun-sign logic. The Oracle connects directly to astronomical precision data and holds your complete birth chart in context — every conversation, every time.
          </p>
        </motion.div>

        {/* ── Comparison Table ── */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-28"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-2">The Oracle vs Generic AI</h2>
          <p className="text-sm text-center mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            See exactly what sets purpose-built astrological intelligence apart.
          </p>
          <div className="p-6 md:p-8 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <ComparisonTable />
          </div>
        </motion.section>

        {/* ── Feature Cards ── */}
        <section className="mb-28">
          <h2 className="text-2xl font-bold text-white text-center mb-2">Built Different. Built for You.</h2>
          <p className="text-sm text-center mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Every capability was designed with one purpose — the most accurate, personalised astrological intelligence you can access.
          </p>
          <FeatureCards />
        </section>

        {/* ── Tools Grid ── */}
        <section className="mb-28">
          <h2 className="text-2xl font-bold text-white text-center mb-2">10 Astrological Tools</h2>
          <p className="text-sm text-center mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            A complete celestial toolkit — all integrated, all personalised, all live.
          </p>
          <ToolsGrid />
        </section>

        {/* ── Tier Cards ── */}
        <section className="mb-28">
          <h2 className="text-2xl font-bold text-white text-center mb-2">Choose Your Path</h2>
          <p className="text-sm text-center mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Start free. Ascend when you're ready.
          </p>
          <TierCards />
          <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
            See full plan details and pricing →{' '}
            <Link href="/pricing" className="hover:text-white transition-colors" style={{ color: 'rgba(228,26,255,0.6)' }}>
              Pricing page
            </Link>
          </p>
        </section>

        {/* ── Testimonials ── */}
        <section className="mb-28">
          <h2 className="text-2xl font-bold text-white text-center mb-2">What People Are Saying</h2>
          <p className="text-sm text-center mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Real experiences. No filters.
          </p>
          <Testimonials />
        </section>

        {/* ── Final CTA ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center py-16 px-6 rounded-3xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(228,26,255,0.06), rgba(0,240,255,0.06))',
            border: '1px solid rgba(228,26,255,0.15)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px] opacity-20"
              style={{ background: '#e41aff' }} />
          </div>
          <div className="relative z-10">
            <OracleLogo size={56} />
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-6 mb-4">
              Your chart is already written in the stars.
            </h2>
            <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Let the Oracle read it. Free to start. No card required.
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-4 rounded-xl font-bold text-white text-base transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)' }}
            >
              Begin Your Reading
            </Link>
          </div>
        </motion.section>

      </div>

      <PublicFooter />
    </main>
  );
}
