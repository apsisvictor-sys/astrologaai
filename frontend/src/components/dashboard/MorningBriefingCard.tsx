'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { ChevronDown, ChevronUp, X, ArrowRight, Sparkles } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TransitData {
  planet: string;
  planetBg?: string;
  sign: string;
  signBg?: string;
  aspectToNatal?: {
    influence: 'positive' | 'challenging' | 'neutral';
    description?: string;
    descriptionBg?: string;
  };
}

interface MoonPhaseData {
  phase: string;
  phaseBg?: string;
  illumination: number;
  sign: string;
  signBg?: string;
}

interface DailyForecastData {
  energy: 'high' | 'medium' | 'low';
  moonPhase: MoonPhaseData;
  transits: TransitData[];
  recommendations?: string[];
  recommendationsBg?: string[];
  oracleInsight?: string;
  cached: boolean;
}

// ─── Moon phase emoji ────────────────────────────────────────────────────────

const MOON_ICONS: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
};

const ENERGY_COLORS: Record<string, string> = {
  high: '#e41aff',
  medium: '#aa88cc',
  low: '#6655aa',
};

// ─── Localised copy ──────────────────────────────────────────────────────────

const copy = {
  bg: {
    title: 'Сутрешен Брифинг',
    moonPhase: 'Лунна Фаза',
    energy: 'Дневна Енергия',
    energyHigh: 'Висока',
    energyMedium: 'Умерена',
    energyLow: 'Ниска',
    keyTransits: 'Ключови Транзити',
    tip: 'Препоръка',
    oracleInsight: 'Послание от Оракула',
    seeFullReading: 'Виж пълното четене',
    upgradeForFull: 'Надгради до PRO за пълен брифинг',
    upgrade: 'Надгради',
    dismiss: 'Затвори за днес',
    in: 'в',
  },
  en: {
    title: 'Morning Briefing',
    moonPhase: 'Moon Phase',
    energy: 'Daily Energy',
    energyHigh: 'High',
    energyMedium: 'Moderate',
    energyLow: 'Low',
    keyTransits: 'Key Transits',
    tip: "Today's Tip",
    oracleInsight: 'Oracle Insight',
    seeFullReading: 'See full reading',
    upgradeForFull: 'Upgrade to PRO for the full briefing',
    upgrade: 'Upgrade',
    dismiss: 'Dismiss for today',
    in: 'in',
  },
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

interface MorningBriefingCardProps {
  tier: 'FREE' | 'PRO' | 'PREMIUM';
  locale: 'bg' | 'en';
  hasBirthData: boolean;
}

export function MorningBriefingCard({ tier, locale, hasBirthData }: MorningBriefingCardProps) {
  const c = copy[locale] ?? copy.en;
  const isBg = locale === 'bg';
  const today = new Date().toISOString().split('T')[0];
  const dismissKey = `morning_briefing_dismissed_${today}`;

  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [forecast, setForecast] = useState<DailyForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(dismissKey) === '1') {
      setDismissed(true);
      return;
    }
    if (!hasBirthData || tier === 'FREE') {
      setLoading(false);
      return;
    }
    apiGet<DailyForecastData>('/api/v1/forecasts/daily')
      .then(res => {
        if (res.success) setForecast(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasBirthData, tier, dismissKey]);

  function handleDismiss() {
    localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  }

  if (dismissed) return null;

  const moonIcon = forecast ? (MOON_ICONS[forecast.moonPhase.phase] ?? '🌙') : '🌙';
  const energyColor = forecast ? (ENERGY_COLORS[forecast.energy] ?? ENERGY_COLORS.medium) : ENERGY_COLORS.medium;
  const energyLabel = forecast
    ? (forecast.energy === 'high' ? c.energyHigh : forecast.energy === 'low' ? c.energyLow : c.energyMedium)
    : c.energyMedium;

  // Top transit with an aspect to natal chart
  const topTransit = forecast?.transits?.find(t => t.aspectToNatal);
  const topTransitDesc = topTransit
    ? (isBg ? (topTransit.aspectToNatal?.descriptionBg || topTransit.aspectToNatal?.description) : topTransit.aspectToNatal?.description)
    : null;

  const tip = forecast
    ? (isBg ? (forecast.recommendationsBg?.[0] || forecast.recommendations?.[0]) : forecast.recommendations?.[0])
    : null;

  return (
    <div
      className="rounded-2xl mb-4 overflow-hidden"
      style={{ background: 'rgba(10,0,18,0.85)', border: '1px solid rgba(228,26,255,0.18)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        onClick={() => setCollapsed(c => !c)}
        style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(228,26,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{loading ? '🌙' : moonIcon}</span>
          <span style={{ color: '#e41aff', fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {c.title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={e => { e.stopPropagation(); handleDismiss(); }}
            title={c.dismiss}
            style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
          >
            <X size={14} />
          </button>
          <span style={{ color: '#666' }}>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-5 py-4">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-12 rounded-lg" style={{ background: 'rgba(228,26,255,0.06)' }} />
              <div className="h-12 rounded-lg" style={{ background: 'rgba(228,26,255,0.06)' }} />
            </div>
          ) : tier === 'FREE' ? (
            /* FREE: teaser */
            <div className="space-y-3">
              <p style={{ color: '#aaaaaa', fontSize: '14px', lineHeight: '1.6' }}>
                {isBg
                  ? 'Твоят сутрешен брифинг включва лунна фаза, дневна енергия, ключови транзити и препоръка за деня.'
                  : 'Your morning briefing includes moon phase, daily energy, key transits, and a tip for the day.'}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href="/pricing"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #e41aff, #9b59b6)', color: '#fff' }}
                >
                  <Sparkles size={14} />
                  {c.upgrade}
                  <ArrowRight size={14} />
                </Link>
                <span style={{ color: '#666', fontSize: '13px' }}>{c.upgradeForFull}</span>
              </div>
            </div>
          ) : !hasBirthData ? (
            /* No birth data */
            <p style={{ color: '#888', fontSize: '14px' }}>
              {isBg ? 'Добави натални данни за сутрешен брифинг.' : 'Add birth data to receive your morning briefing.'}
            </p>
          ) : !forecast ? (
            /* Forecast not ready yet */
            <p style={{ color: '#888', fontSize: '14px' }}>
              {isBg ? 'Брифингът за днес ще е готов скоро.' : "Today's briefing will be ready soon."}
            </p>
          ) : (
            /* PRO / PREMIUM: full content */
            <div className="space-y-3">
              {/* Moon + Energy row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Moon Phase */}
                <div
                  className="rounded-xl p-3 flex items-start gap-2"
                  style={{ background: 'rgba(228,26,255,0.06)' }}
                >
                  <span className="text-2xl">{moonIcon}</span>
                  <div>
                    <p style={{ color: '#e41aff', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                      {c.moonPhase}
                    </p>
                    <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: '2px 0 0' }}>
                      {isBg ? (forecast.moonPhase.phaseBg || forecast.moonPhase.phase) : forecast.moonPhase.phase}
                    </p>
                    {forecast.moonPhase.sign && (
                      <p style={{ color: '#888', fontSize: '12px', margin: '1px 0 0' }}>
                        {c.in} {isBg ? (forecast.moonPhase.signBg || forecast.moonPhase.sign) : forecast.moonPhase.sign}
                        {' · '}{forecast.moonPhase.illumination}%
                      </p>
                    )}
                  </div>
                </div>

                {/* Energy */}
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(228,26,255,0.06)' }}
                >
                  <p style={{ color: '#888', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                    {c.energy}
                  </p>
                  <p style={{ color: energyColor, fontSize: '16px', fontWeight: 700, margin: 0 }}>
                    ◉ {energyLabel}
                  </p>
                </div>
              </div>

              {/* Top Transit */}
              {topTransit && topTransitDesc && (
                <div
                  className="rounded-xl p-3"
                  style={{
                    background: 'rgba(228,26,255,0.04)',
                    borderLeft: `3px solid ${topTransit.aspectToNatal?.influence === 'positive' ? '#44cc88' : topTransit.aspectToNatal?.influence === 'challenging' ? '#cc4466' : '#888'}`,
                  }}
                >
                  <p style={{ color: '#e41aff', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                    {c.keyTransits}
                  </p>
                  <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: '0 0 2px' }}>
                    {isBg ? (topTransit.planetBg || topTransit.planet) : topTransit.planet}
                    {' '}{c.in}{' '}
                    {isBg ? (topTransit.signBg || topTransit.sign) : topTransit.sign}
                  </p>
                  <p style={{ color: '#aaa', fontSize: '12px', margin: 0, lineHeight: '1.4' }}>
                    {topTransitDesc}
                  </p>
                </div>
              )}

              {/* Tip */}
              {tip && (
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(228,26,255,0.04)', borderLeft: '3px solid #e41aff' }}
                >
                  <p style={{ color: '#e41aff', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                    {c.tip}
                  </p>
                  <p style={{ color: '#ccbbdd', fontSize: '13px', fontStyle: 'italic', margin: 0, lineHeight: '1.5' }}>
                    "{tip}"
                  </p>
                </div>
              )}

              {/* PREMIUM: Oracle Insight */}
              {tier === 'PREMIUM' && forecast.oracleInsight && (
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(228,26,255,0.08)', border: '1px solid rgba(228,26,255,0.2)' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles size={12} style={{ color: '#e41aff' }} />
                    <p style={{ color: '#e41aff', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                      {c.oracleInsight}
                    </p>
                  </div>
                  <p style={{ color: '#fff', fontSize: '14px', fontStyle: 'italic', margin: 0, lineHeight: '1.6' }}>
                    "{forecast.oracleInsight}"
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="pt-1">
                <Link
                  href="/forecast"
                  className="flex items-center gap-1 text-sm"
                  style={{ color: '#e41aff' }}
                >
                  {c.seeFullReading}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
