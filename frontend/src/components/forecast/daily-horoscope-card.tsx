'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { Lock, Sparkles } from 'lucide-react';

interface LifeArea {
  area: string;
  title: string;
  prediction: string;
  rating: number;
  keywords: string[];
}

interface PersonalDailyHoroscope {
  date: string;
  overallTheme: string;
  overallRating: number;
  lifeAreas: LifeArea[];
  moon: { phase: string; sign: string; prediction: string; illumination: number };
  tips: string[];
  cached: boolean;
}

// Which areas FREE users can see
const FREE_AREAS = ['identity', 'communication'];
// Display order
const AREA_ORDER = ['identity', 'communication', 'love', 'career', 'health', 'finance'];
const AREA_ICONS: Record<string, string> = {
  love: '♀', career: '♄', health: '☽', finance: '☿', identity: '☀', communication: '☊',
};

function RatingOrbs({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full transition-all"
          style={{
            background: i < rating
              ? 'radial-gradient(circle, rgba(228,26,255,1) 0%, rgba(228,26,255,0.5) 100%)'
              : 'rgba(255,255,255,0.12)',
            boxShadow: i < rating ? '0 0 6px rgba(228,26,255,0.7)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

interface DailyHoroscopeCardProps {
  tier: 'FREE' | 'PRO' | 'PREMIUM';
}

export function DailyHoroscopeCard({ tier }: DailyHoroscopeCardProps) {
  const isPro = tier === 'PRO' || tier === 'PREMIUM';
  const [horoscope, setHoroscope] = useState<PersonalDailyHoroscope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PersonalDailyHoroscope>('/api/v1/forecasts/horoscope')
      .then(res => {
        if (res.success) setHoroscope(res.data);
        else setError('Failed to load');
      })
      .catch(() => setError('Failed to load horoscope'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'rgba(10,0,16,0.7)', border: '1px solid rgba(228,26,255,0.12)' }}>
        <div className="h-4 bg-white/5 rounded w-1/2 mb-3" />
        <div className="h-3 bg-white/5 rounded w-3/4" />
      </div>
    );
  }

  if (error || !horoscope) {
    return (
      <div className="rounded-2xl p-5" style={{ background: 'rgba(10,0,16,0.7)', border: '1px solid rgba(228,26,255,0.12)' }}>
        <p className="text-text-muted text-sm">Daily horoscope unavailable today.</p>
      </div>
    );
  }

  // Sort life areas in display order, keep unlisted at the end
  const sortedAreas = [...horoscope.lifeAreas].sort((a, b) => {
    const ai = AREA_ORDER.indexOf(a.area);
    const bi = AREA_ORDER.indexOf(b.area);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const visibleAreas = isPro ? sortedAreas : sortedAreas.filter(a => FREE_AREAS.includes(a.area));
  const lockedAreas = isPro ? [] : sortedAreas.filter(a => !FREE_AREAS.includes(a.area));

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'rgba(10,0,16,0.7)', border: '1px solid rgba(228,26,255,0.15)', boxShadow: '0 0 40px rgba(228,26,255,0.05)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-primary text-xs">✦ Today</span>
            <RatingOrbs rating={horoscope.overallRating} />
          </div>
          <h3 className="text-white font-semibold text-sm leading-snug">{horoscope.overallTheme}</h3>
        </div>
        {/* Moon badge */}
        <div
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-text-muted"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span>☽</span>
          <span>{horoscope.moon.phase}</span>
        </div>
      </div>

      {/* Moon prediction */}
      <p className="text-text-muted text-xs leading-relaxed border-l-2 pl-3" style={{ borderColor: 'rgba(228,26,255,0.3)' }}>
        {horoscope.moon.prediction}
      </p>

      {/* Life areas grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {visibleAreas.map(area => (
          <div
            key={area.area}
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-primary text-xs">{AREA_ICONS[area.area] || '✦'}</span>
                <span className="text-text-secondary text-xs font-medium">{area.title}</span>
              </div>
              <RatingOrbs rating={area.rating} max={5} />
            </div>
            <p className="text-text-muted text-xs leading-relaxed">{area.prediction}</p>
          </div>
        ))}

        {/* Locked areas (FREE users) */}
        {lockedAreas.map(area => (
          <div
            key={area.area}
            className="rounded-xl p-3 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="blur-sm select-none pointer-events-none">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-primary text-xs">{AREA_ICONS[area.area] || '✦'}</span>
                <span className="text-text-secondary text-xs font-medium">{area.title}</span>
              </div>
              <p className="text-text-muted text-xs">Lorem ipsum dolor sit amet consectetur</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="w-4 h-4 text-white/20" />
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade CTA (FREE) or Tips link (PRO) */}
      {!isPro ? (
        <Link
          href="/pricing"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, rgba(228,26,255,0.25), rgba(228,26,255,0.10))', border: '1px solid rgba(228,26,255,0.30)' }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Unlock full reading — upgrade to PRO
        </Link>
      ) : (
        <Link href="/forecast" className="text-center text-xs text-primary hover:text-primary/80 transition-colors">
          View full reading →
        </Link>
      )}
    </div>
  );
}
