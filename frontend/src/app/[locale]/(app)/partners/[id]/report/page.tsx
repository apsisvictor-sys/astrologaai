'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { partnersApi, PartnersAPIError, CompatibilityReport } from '@/lib/partners-api';

// Circular score gauge
function ScoreRing({ score }: { score: number }) {
  const size = 160;
  const sw = 10;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#00f0ff' : score >= 50 ? '#F59E0B' : '#ff0080';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}%</span>
        <span className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Compatibility</span>
      </div>
    </div>
  );
}

// Category score bar
function CategoryBar({ label, score }: { label: string; score: number; analysis: string }) {
  const color = score >= 70 ? '#00f0ff' : score >= 50 ? '#F59E0B' : '#ff0080';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
        <span style={{ color }}>{score}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id as string;
  const language = (user?.language as 'bg' | 'en') ?? 'bg';

  const [report, setReport] = useState<CompatibilityReport | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !partnerId) return;
    setLoading(true);
    partnersApi.getCompatibilityReport(partnerId, language)
      .then(data => { setReport(data.report); setPartnerName(data.partner.name); })
      .catch(e => setError(e instanceof PartnersAPIError ? e.message : 'Failed to load report'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, partnerId, language]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: '#e41aff', borderRightColor: 'rgba(228,26,255,0.3)' }} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 rounded-2xl max-w-sm"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-3xl mb-3">⚠️</p>
          <p className="text-white font-semibold mb-2">{error ?? 'No report available'}</p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={() => { setError(null); setLoading(true); partnersApi.getCompatibilityReport(partnerId, language).then(d => { setReport(d.report); setPartnerName(d.partner.name); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
            >
              Retry
            </button>
            <button onClick={() => router.push('/partners')}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cats = report.categories;
  const catList = [
    { key: 'emotional',      label: language === 'bg' ? cats.emotional.labelBg     : cats.emotional.label,     score: cats.emotional.score,     analysis: cats.emotional.analysis },
    { key: 'communication',  label: language === 'bg' ? cats.communication.labelBg : cats.communication.label, score: cats.communication.score, analysis: cats.communication.analysis },
    { key: 'physical',       label: language === 'bg' ? cats.physical.labelBg      : cats.physical.label,      score: cats.physical.score,      analysis: cats.physical.analysis },
    { key: 'longTerm',       label: language === 'bg' ? cats.longTerm.labelBg      : cats.longTerm.label,      score: cats.longTerm.score,      analysis: cats.longTerm.analysis },
  ];

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
        <h1 className="text-2xl font-bold text-white">Compatibility Report</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          You &amp; <span className="text-white font-medium">{partnerName}</span>
        </p>
      </div>

      {/* Score + categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score ring */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <ScoreRing score={report.overallScore} />
        </div>

        {/* Category bars */}
        <div className="p-5 rounded-2xl space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-semibold text-white">Category Breakdown</h3>
          {catList.map(c => (
            <CategoryBar key={c.key} label={c.label} score={c.score} analysis={c.analysis} />
          ))}
        </div>
      </div>

      {/* Category analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {catList.map(c => (
          <div key={c.key} className="p-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">{c.label}</span>
              <span className="text-xs font-mono" style={{ color: c.score >= 70 ? '#00f0ff' : c.score >= 50 ? '#F59E0B' : '#ff0080' }}>{c.score}%</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.analysis}</p>
          </div>
        ))}
      </div>

      {/* Key aspects */}
      {report.keyAspects.length > 0 && (
        <div className="p-5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-semibold text-white mb-3">Key Planetary Aspects</h3>
          <div className="space-y-2">
            {report.keyAspects.map((a, i) => {
              const color = a.nature === 'harmonious' ? '#00f0ff' : a.nature === 'challenging' ? '#ff0080' : '#F59E0B';
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-semibold mt-0.5"
                    style={{ background: `${color}15`, color }}>
                    {a.aspect}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white mb-0.5">{a.userPlanet} ↔ {a.partnerPlanet}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{a.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths + challenges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.strengths.length > 0 && (
          <div className="p-5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#00f0ff' }}>Strengths</h3>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span style={{ color: '#00f0ff' }}>✦</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {report.challenges.length > 0 && (
          <div className="p-5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#F59E0B' }}>Growth Areas</h3>
            <ul className="space-y-2">
              {report.challenges.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span style={{ color: '#F59E0B' }}>◦</span> {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Advice */}
      <div className="p-5 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(228,26,255,0.06), rgba(0,240,255,0.06))', border: '1px solid rgba(228,26,255,0.15)' }}>
        <h3 className="text-sm font-semibold mb-2"
          style={{ background: 'linear-gradient(135deg, #e41aff, #00f0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Oracle Advice
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{report.advice}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={() => { sessionStorage.setItem('astrologaai_prefill_question', `Tell me more about my compatibility with ${partnerName}. Our score is ${report.overallScore}%.`); router.push('/chat'); }}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'rgba(0,240,255,0.1)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)' }}
        >
          Ask the Oracle
        </button>
        <button
          onClick={() => router.push(`/partners/${partnerId}/synastry`)}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
        >
          View Synastry Chart
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
