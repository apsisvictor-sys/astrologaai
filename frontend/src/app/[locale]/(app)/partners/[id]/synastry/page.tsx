'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import SynastryChartWheel, { InterPlanetaryAspect } from '@/components/chart/synastry-chart-wheel';
import { partnersApi, Partner, SynastryChart, PartnersAPIError } from '@/lib/partners-api';

const PLANET_SYMBOLS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
  northNode: '☊', southNode: '☋', chiron: '⚷',
};

export default function SynastryPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id as string;
  const language = (user?.language as 'bg' | 'en') ?? 'bg';

  const [partner, setPartner] = useState<Partner | null>(null);
  const [synastry, setSynastry] = useState<SynastryChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<InterPlanetaryAspect | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !partnerId) return;
    setLoading(true);
    Promise.all([partnersApi.get(partnerId), partnersApi.getSynastry(partnerId, language)])
      .then(([p, s]) => { setPartner(p); setSynastry(s.synastry); })
      .catch(e => setError(e instanceof PartnersAPIError ? e.message : 'Failed to load synastry'))
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

  if (error || !synastry) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 rounded-2xl max-w-sm"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-3xl mb-3">⚠️</p>
          <p className="text-white font-semibold mb-2">{error ?? 'Unable to load synastry'}</p>
          <button onClick={() => router.push('/partners')}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'rgba(228,26,255,0.15)', border: '1px solid rgba(228,26,255,0.3)' }}>
            Back to Partners
          </button>
        </div>
      </div>
    );
  }

  const harmoniousCount = synastry.interAspects.filter(a => a.nature === 'harmonious').length;
  const challengingCount = synastry.interAspects.filter(a => a.nature === 'challenging').length;
  const score = synastry.compatibilityScore;
  const scoreColor = score >= 70 ? '#00f0ff' : score >= 50 ? '#F59E0B' : '#ff0080';

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
        <h1 className="text-2xl font-bold text-white">Synastry: {partner?.name}</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Planetary relationship analysis
        </p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="flex flex-col items-center p-6 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <SynastryChartWheel
            userChart={synastry.userChart}
            partnerChart={synastry.partnerChart}
            interAspects={synastry.interAspects}
            userName={user?.fullName ?? 'You'}
            partnerName={partner?.name ?? 'Partner'}
            size={480}
            language={language}
            onAspectClick={setSelectedAspect}
          />
          {/* Score */}
          <div className="mt-5 text-center">
            <div className="text-5xl font-bold mb-1" style={{ color: scoreColor }}>{score}%</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {harmoniousCount} harmonious · {challengingCount} challenging
            </div>
          </div>
        </div>

        {/* Right: summary + strengths + challenges */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(228,26,255,0.06), rgba(0,240,255,0.06))', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {language === 'bg' ? synastry.summary.bg : synastry.summary.en}
            </p>
          </div>

          {/* Strengths */}
          {synastry.strengths.length > 0 && (
            <div className="p-5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#00f0ff' }}>Strengths</h3>
              <div className="space-y-2">
                {synastry.strengths.map((s, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(0,240,255,0.05)' }}>
                    <p className="text-xs font-semibold text-white mb-0.5">{language === 'bg' ? s.title.bg : s.title.en}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{language === 'bg' ? s.description.bg : s.description.en}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenges */}
          {synastry.challenges.length > 0 && (
            <div className="p-5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#ff0080' }}>Challenges</h3>
              <div className="space-y-2">
                {synastry.challenges.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(255,0,128,0.05)' }}>
                    <p className="text-xs font-semibold text-white mb-0.5">{language === 'bg' ? c.title.bg : c.title.en}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{language === 'bg' ? c.description.bg : c.description.en}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Aspects grid */}
      <div className="p-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="text-sm font-semibold text-white mb-1">
          Aspects ({synastry.interAspects.length})
        </h3>
        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Click an aspect to read its interpretation</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {synastry.interAspects.slice(0, 24).map((aspect, i) => {
            const color = aspect.nature === 'harmonious' ? '#00f0ff' : aspect.nature === 'challenging' ? '#ff0080' : '#e41aff';
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
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white">
                    {PLANET_SYMBOLS[aspect.userPlanet] ?? aspect.userPlanet} — {PLANET_SYMBOLS[aspect.partnerPlanet] ?? aspect.partnerPlanet}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{ background: `${color}15`, color }}>
                  {language === 'bg' ? aspect.aspectBg : aspect.aspect}
                </span>
                <div className="mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                  {aspect.orb.toFixed(1)}°
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected interpretation */}
        {selectedAspect && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl"
            style={{ background: 'rgba(228,26,255,0.06)', border: '1px solid rgba(228,26,255,0.15)' }}
          >
            <p className="text-xs font-semibold text-white mb-1.5">
              {PLANET_SYMBOLS[selectedAspect.userPlanet]} {selectedAspect.userPlanet} — {PLANET_SYMBOLS[selectedAspect.partnerPlanet]} {selectedAspect.partnerPlanet}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {language === 'bg' ? selectedAspect.interpretation.bg : selectedAspect.interpretation.en}
            </p>
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={() => router.push(`/partners/${partnerId}/report`)}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
        >
          View Compatibility Report
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
