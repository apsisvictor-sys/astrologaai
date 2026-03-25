'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { partnersApi, Partner, CompositeChartData, CompositeAspect, PartnersAPIError } from '@/lib/partners-api';

// Sign abbreviation → full name
const SIGN_FULL: Record<string, string> = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '⛢', Neptune: '♆', Pluto: '♇',
  True_Node: '☊', Chiron: '⚷', Ascendant: 'AC', Midheaven: 'MC',
};

const ASPECT_NATURE: Record<string, 'harmonious' | 'challenging' | 'neutral'> = {
  conjunction: 'neutral',
  opposition: 'challenging',
  trine: 'harmonious',
  square: 'challenging',
  sextile: 'harmonious',
  quincunx: 'neutral',
};

function signFull(abbr: string) {
  return SIGN_FULL[abbr] ?? abbr;
}

function aspectNature(type: string): 'harmonious' | 'challenging' | 'neutral' {
  return ASPECT_NATURE[type.toLowerCase()] ?? 'neutral';
}

export default function CompositePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [composite, setComposite] = useState<CompositeChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<CompositeAspect | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !partnerId) return;
    setLoading(true);
    Promise.all([partnersApi.get(partnerId), partnersApi.getComposite(partnerId)])
      .then(([p, c]) => { setPartner(p); setComposite(c.composite); })
      .catch(e => {
        if (e instanceof PartnersAPIError) {
          setError(e.message);
          setErrorCode(e.code);
        } else {
          setError('Failed to load composite chart');
        }
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, partnerId]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: '#e41aff', borderRightColor: 'rgba(228,26,255,0.3)' }} />
      </div>
    );
  }

  if (error || !composite) {
    const isPremiumGate = errorCode === 'PREMIUM_REQUIRED';
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 rounded-2xl max-w-sm"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-3xl mb-3">{isPremiumGate ? '✨' : '⚠️'}</p>
          <p className="text-white font-semibold mb-2">
            {isPremiumGate ? 'PREMIUM Feature' : (error ?? 'Unable to load composite chart')}
          </p>
          {isPremiumGate && (
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Composite charts reveal the relationship as its own entity — the shared destiny between two people.
              Upgrade to PREMIUM to unlock.
            </p>
          )}
          <div className="flex flex-col gap-2 mt-4">
            {isPremiumGate && (
              <button onClick={() => router.push('/settings')}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #e41aff, #ff0080)' }}>
                Upgrade to PREMIUM
              </button>
            )}
            <button onClick={() => router.push('/partners')}
              className="px-5 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Back to Partners
            </button>
          </div>
        </div>
      </div>
    );
  }

  const planets = composite.chart_data?.planetary_positions ?? [];
  const aspects = composite.chart_data?.aspects ?? [];
  const harmoniousCount = aspects.filter(a => aspectNature(a.aspect_type) === 'harmonious').length;
  const challengingCount = aspects.filter(a => aspectNature(a.aspect_type) === 'challenging').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/partners')}
          className="text-xs mb-4 flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: 'rgba(228,26,255,0.7)' }}
        >
          ← Back to Partners
        </button>
        <h1 className="text-2xl font-bold text-white">Composite: {partner?.name}</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          The relationship as its own entity
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Planets', value: planets.length, color: '#e41aff' },
          { label: 'Harmonious', value: harmoniousCount, color: '#00f0ff' },
          { label: 'Challenging', value: challengingCount, color: '#ff0080' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-2xl text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-2xl font-bold mb-0.5" style={{ color }}>{value}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Planet positions */}
      <div className="p-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="text-sm font-semibold text-white mb-4">Composite Planets</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {planets.map((planet, i) => {
            const fullSign = signFull(planet.sign);
            const symbol = PLANET_SYMBOLS[planet.name] ?? planet.name[0];
            const signSym = SIGN_SYMBOLS[fullSign] ?? '';
            return (
              <div key={i} className="p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white">{symbol}</span>
                  {planet.is_retrograde && (
                    <span className="text-[9px] px-1 rounded" style={{ color: '#ff0080', background: 'rgba(255,0,128,0.1)' }}>℞</span>
                  )}
                </div>
                <div className="text-[10px] font-medium text-white mb-0.5">
                  {planet.name.replace(/_/g, ' ')}
                </div>
                <div className="text-[11px]" style={{ color: '#e41aff' }}>
                  {signSym} {fullSign}
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {planet.degree.toFixed(2)}°{planet.house ? ` · H${planet.house}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aspects */}
      {aspects.length > 0 && (
        <div className="p-5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-semibold text-white mb-1">
            Aspects ({aspects.length})
          </h3>
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Click an aspect for details</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {aspects.slice(0, 24).map((aspect, i) => {
              const nature = aspectNature(aspect.aspect_type);
              const color = nature === 'harmonious' ? '#00f0ff' : nature === 'challenging' ? '#ff0080' : '#e41aff';
              const isSelected = selectedAspect === aspect;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedAspect(isSelected ? null : aspect)}
                  className="p-2.5 rounded-xl text-left transition-all text-xs"
                  style={{
                    background: isSelected ? `${color}12` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? color + '50' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div className="text-white text-[11px] mb-1">
                    {(PLANET_SYMBOLS[aspect.point1] ?? aspect.point1)} — {(PLANET_SYMBOLS[aspect.point2] ?? aspect.point2)}
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={{ background: `${color}15`, color }}>
                    {aspect.aspect_type}
                  </span>
                  <div className="mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                    {aspect.orb.toFixed(1)}°
                  </div>
                </button>
              );
            })}
          </div>

          {selectedAspect && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl"
              style={{ background: 'rgba(228,26,255,0.06)', border: '1px solid rgba(228,26,255,0.15)' }}
            >
              <p className="text-xs font-semibold text-white mb-1.5">
                {selectedAspect.point1.replace(/_/g, ' ')} {selectedAspect.aspect_type} {selectedAspect.point2.replace(/_/g, ' ')}
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Orb: {selectedAspect.orb.toFixed(2)}° · {selectedAspect.aspect_type}
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Oracle CTA */}
      <div className="p-5 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(228,26,255,0.06), rgba(0,240,255,0.06))', border: '1px solid rgba(228,26,255,0.15)' }}>
        <div className="flex items-start gap-4">
          <span className="text-2xl mt-0.5">🔮</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white mb-1">Ask the Oracle</p>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Ask your AI astrologer to interpret what this composite chart reveals about your relationship with {partner?.name}.
            </p>
            <button
              onClick={() => router.push('/chat')}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #e41aff, #ff0080)' }}
            >
              Open Oracle
            </button>
          </div>
        </div>
      </div>

      {/* Back actions */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={() => router.push(`/partners/${partnerId}/synastry`)}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: 'rgba(0,240,255,0.08)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)' }}
        >
          View Synastry
        </button>
        <button
          onClick={() => router.push('/partners')}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Back to Partners
        </button>
      </div>
    </motion.div>
  );
}
