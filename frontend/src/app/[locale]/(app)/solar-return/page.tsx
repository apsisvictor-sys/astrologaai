'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { trackPremiumFeatureViewed } from '@/lib/analytics';
import CircularChartWheel from '@/components/chart/circular-chart-wheel';
import { getApiBaseUrl } from '@/lib/runtime-config';

const API_URL = getApiBaseUrl();
const ACCESS_TOKEN_KEY = 'astrologaai_access_token';

// ── Constants ────────────────────────────────────────────────────────────────

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '⛢', Neptune: '♆', Pluto: '♇',
  True_Node: '☊', Chiron: '⚷', Ascendant: 'AC',
};

const SIGN_BG: Record<string, string> = {
  Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнаци', Cancer: 'Рак',
  Leo: 'Лъв', Virgo: 'Дева', Libra: 'Везни', Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец', Capricorn: 'Козирог', Aquarius: 'Водолей', Pisces: 'Риби',
};

// Map raw API planet names → CircularChartWheel keys
const PLANET_KEY_MAP: Record<string, string> = {
  Sun: 'sun', Moon: 'moon', Mercury: 'mercury', Venus: 'venus',
  Mars: 'mars', Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus',
  Neptune: 'neptune', Pluto: 'pluto', True_Node: 'northNode',
  Chiron: 'chiron', Ascendant: 'rising',
};

// Symbol map for NatalChart keys
const PLANET_SYMBOL_BY_KEY: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
  northNode: '☊', southNode: '☋', chiron: '⚷', rising: 'ASC', lilith: '⚹',
};

const SIGN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};

const SIGN_MODALITY: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
};

const ASPECT_NATURE: Record<string, 'harmonious' | 'challenging' | 'neutral'> = {
  trine: 'harmonious', sextile: 'harmonious',
  square: 'challenging', opposition: 'challenging',
  conjunction: 'neutral', quincunx: 'neutral',
};

const ASPECT_BG: Record<string, string> = {
  trine: 'трин', sextile: 'секстил', square: 'квадрат',
  opposition: 'опозиция', conjunction: 'конюнкция', quincunx: 'квинконс',
};

// ── Data transformer ─────────────────────────────────────────────────────────

// Converts raw solar return API response into the NatalChart shape
// expected by CircularChartWheel. Returns null if essential data is missing.
function transformToNatalChart(rawData: any): any | null {
  const subject = rawData?.chart?.subject ?? rawData?.subject ?? rawData;
  const planets: any[] = subject?.planets ?? [];
  const aspects: any[] = subject?.aspects ?? [];
  const houses: any[] = subject?.houses ?? [];

  if (!planets.length) return null;

  const chartObj: Record<string, any> = {};

  for (const p of planets) {
    const key = PLANET_KEY_MAP[p.name];
    if (!key) continue;
    chartObj[key] = {
      name: p.name ?? '',
      sign: p.sign ?? 'Aries',
      signBg: SIGN_BG[p.sign] ?? (p.sign ?? ''),
      degree: p.degree ?? p.full_degree ?? 0,
      house: p.house ?? 1,
      retrograde: p.is_retrograde ?? false,
      symbol: PLANET_SYMBOL_BY_KEY[key] ?? '',
    };
  }

  // Ensure all required keys exist with fallback values
  const required = ['sun', 'moon', 'rising', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'northNode', 'southNode', 'chiron'];
  for (const key of required) {
    if (!chartObj[key]) {
      chartObj[key] = {
        name: key, sign: 'Aries', signBg: 'Овен',
        degree: 0, house: 1, retrograde: false,
        symbol: PLANET_SYMBOL_BY_KEY[key] ?? '',
      };
    }
  }

  const mappedHouses = houses.map((h: any) => ({
    number: h.house ?? 1,
    sign: h.sign ?? 'Aries',
    signBg: SIGN_BG[h.sign] ?? (h.sign ?? ''),
    degree: h.degree ?? 0,
  }));

  const mappedAspects = aspects.slice(0, 30).map((a: any) => {
    const type = (a.aspect ?? '').toLowerCase();
    return {
      planet1: PLANET_KEY_MAP[a.p1_name] ?? a.p1_name?.toLowerCase() ?? '',
      planet2: PLANET_KEY_MAP[a.p2_name] ?? a.p2_name?.toLowerCase() ?? '',
      aspect: a.aspect ?? '',
      aspectBg: ASPECT_BG[type] ?? (a.aspect ?? ''),
      orb: a.orb ?? 0,
      nature: ASPECT_NATURE[type] ?? 'neutral',
    };
  });

  const elements = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalities = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of planets.slice(0, 10)) {
    const el = SIGN_ELEMENT[p.sign];
    if (el) elements[el]++;
    const mod = SIGN_MODALITY[p.sign];
    if (mod) modalities[mod]++;
  }

  return { ...chartObj, houses: mappedHouses, aspects: mappedAspects, elements, modalities };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function aspectNature(type: string): 'harmonious' | 'challenging' | 'neutral' {
  return ASPECT_NATURE[type.toLowerCase()] ?? 'neutral';
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SolarReturnPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [chartData, setChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<any>(null);

  const [reportText, setReportText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isPremium = user?.tier === 'PREMIUM';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.tier !== 'FREE') return;
    trackPremiumFeatureViewed({ feature: 'Solar Return' });
  }, [user?.tier]);

  // Fetch chart data (PREMIUM only)
  const fetchChart = useCallback(async (year: number) => {
    setChartLoading(true);
    setChartError(null);
    setChartData(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/solar-return/chart?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? 'Failed to load chart');
      setChartData(body.data);
    } catch (e: any) {
      setChartError(e.message ?? 'Chart unavailable');
    } finally {
      setChartLoading(false);
    }
  }, []);

  // Stream annual report (PREMIUM only)
  const streamReport = useCallback(async (year: number) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsStreaming(true);
    setReportText('');
    setStreamStatus('');
    setStreamError(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/solar-return/report?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json();
        setStreamError(body.error?.message ?? 'Failed to load report');
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response stream');

      let currentEvent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'status') {
                setStreamStatus(data.message ?? '');
              } else if (currentEvent === 'chunk') {
                if (data.content) setReportText(prev => prev + data.content);
                if (data.done) setStreamStatus('');
              } else if (currentEvent === 'error') {
                setStreamError(data.message ?? 'Error generating report');
              } else if (currentEvent === 'complete') {
                setIsStreaming(false);
                setStreamStatus('');
              }
            } catch { /* ignore malformed SSE lines */ }
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setStreamError(e.message ?? 'Failed to stream report');
      setIsStreaming(false);
    }
  }, []);

  // Load data when year changes (PREMIUM only)
  useEffect(() => {
    if (!isAuthenticated || !isPremium) return;
    fetchChart(selectedYear);
    streamReport(selectedYear);
    return () => abortRef.current?.abort();
  }, [isAuthenticated, isPremium, selectedYear, fetchChart, streamReport]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: '#e41aff', borderRightColor: 'rgba(228,26,255,0.3)' }} />
      </div>
    );
  }

  // ── PREMIUM gate ───────────────────────────────────────────────────────────
  if (!isPremium) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 rounded-2xl max-w-sm w-full"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-4xl mb-4">☀️</p>
          <p className="text-white font-bold text-lg mb-2">Solar Return</p>
          <p className="text-sm font-semibold mb-3" style={{ color: '#e41aff' }}>PREMIUM Feature</p>
          <p className="text-xs mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Your Solar Return chart marks the exact moment the Sun returns to its birth position —
            revealing the central themes, opportunities, and growth areas for your entire year ahead.
          </p>

          {/* Teaser preview */}
          <div className="text-left p-4 rounded-xl mb-6 space-y-2"
            style={{ background: 'rgba(228,26,255,0.04)', border: '1px solid rgba(228,26,255,0.12)' }}>
            <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: 'rgba(228,26,255,0.6)' }}>
              What you&apos;ll unlock
            </p>
            {[
              '☀ Solar Return chart wheel for your year',
              '📅 Year selector — past & future returns',
              '📖 Full streaming annual report by Opus AI',
              '🌍 Planetary positions for the return year',
            ].map((item, i) => (
              <p key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item}</p>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push('/settings')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #e41aff, #ff0080)' }}
            >
              Upgrade to PREMIUM
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── PREMIUM view ───────────────────────────────────────────────────────────

  const rawPlanets: any[] = chartData?.chart?.subject?.planets ?? chartData?.subject?.planets ?? [];
  const rawAspects: any[] = chartData?.chart?.subject?.aspects ?? chartData?.subject?.aspects ?? [];
  const natalChart = chartData ? transformToNatalChart(chartData) : null;

  const harmoniousCount = rawAspects.filter(a => aspectNature(a.aspect) === 'harmonious').length;
  const challengingCount = rawAspects.filter(a => aspectNature(a.aspect) === 'challenging').length;

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8">

      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-xs mb-4 flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: 'rgba(228,26,255,0.7)' }}
        >
          ← Back to Dashboard
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">
              ☀ Solar Return {selectedYear}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Your Year Ahead · Solar Return Reading
            </p>
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <span>📍</span> Calculated for your birth location
            </p>
          </div>
          <button
            onClick={handleShare}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 flex items-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            ↗ Share
          </button>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex gap-2 flex-wrap">
        {yearOptions.map(yr => (
          <button
            key={yr}
            onClick={() => setSelectedYear(yr)}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={
              yr === selectedYear
                ? { background: 'linear-gradient(135deg, #e41aff, #ff0080)', color: 'white', boxShadow: '0 0 16px rgba(228,26,255,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            {yr}
            {yr === currentYear && (
              <span className="ml-1.5 text-[9px] uppercase tracking-wider opacity-60">this year</span>
            )}
          </button>
        ))}
      </div>

      {/* Chart section */}
      {chartLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: '#e41aff', borderRightColor: 'rgba(228,26,255,0.3)' }} />
        </div>
      ) : chartError ? (
        <div className="p-5 rounded-2xl text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{chartError}</p>
          {chartError.includes('birth data') && (
            <button
              onClick={() => router.push('/birth-data/new')}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #e41aff, #ff0080)' }}
            >
              Add Birth Data
            </button>
          )}
        </div>
      ) : chartData ? (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Planets', value: rawPlanets.length, color: '#e41aff' },
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

          {/* Chart wheel */}
          {natalChart && (
            <div className="p-4 rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Solar Return Chart Wheel</h3>
              <div className="flex justify-center">
                <CircularChartWheel chart={natalChart} size={380} />
              </div>
            </div>
          )}

          {/* Planet positions */}
          {rawPlanets.length > 0 && (
            <div className="p-5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Planetary Positions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {rawPlanets.map((planet: any, i: number) => {
                  const symbol = PLANET_SYMBOLS[planet.name] ?? planet.name[0];
                  const signSym = SIGN_SYMBOLS[planet.sign] ?? '';
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
                        {(planet.name ?? '').replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px]" style={{ color: '#e41aff' }}>
                        {signSym} {planet.sign}
                      </div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {(planet.degree ?? 0).toFixed(2)}°{planet.house ? ` · H${planet.house}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aspects */}
          {rawAspects.length > 0 && (
            <div className="p-5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-semibold text-white mb-1">
                Key Aspects ({rawAspects.length})
              </h3>
              <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Click an aspect for details</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {rawAspects.slice(0, 24).map((aspect: any, i: number) => {
                  const nature = aspectNature(aspect.aspect);
                  const color = nature === 'harmonious' ? '#00f0ff' : nature === 'challenging' ? '#ff0080' : '#e41aff';
                  const isSelected = selectedAspect === aspect;
                  const p1sym = PLANET_SYMBOLS[aspect.p1_name] ?? aspect.p1_name;
                  const p2sym = PLANET_SYMBOLS[aspect.p2_name] ?? aspect.p2_name;
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
                      <div className="text-white text-[11px] mb-1">{p1sym} — {p2sym}</div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        style={{ background: `${color}15`, color }}>
                        {aspect.aspect}
                      </span>
                      <div className="mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                        {(aspect.orb ?? 0).toFixed(1)}°
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
                    {(selectedAspect.p1_name ?? '').replace(/_/g, ' ')} {selectedAspect.aspect} {(selectedAspect.p2_name ?? '').replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Orb: {(selectedAspect.orb ?? 0).toFixed(2)}° · {selectedAspect.aspect}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </>
      ) : null}

      {/* Streaming annual report */}
      <div className="p-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Annual Report</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Your Year Ahead — generated by Opus AI
            </p>
          </div>
          {!isStreaming && reportText && (
            <button
              onClick={() => streamReport(selectedYear)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'rgba(228,26,255,0.08)', color: '#e41aff', border: '1px solid rgba(228,26,255,0.2)' }}
            >
              ↺ Regenerate
            </button>
          )}
        </div>

        {/* Status message during streaming */}
        {streamStatus && (
          <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <div className="w-3 h-3 rounded-full border border-transparent animate-spin"
              style={{ borderTopColor: '#e41aff' }} />
            {streamStatus}
          </div>
        )}

        {/* Report text */}
        {reportText ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {reportText}
            {isStreaming && (
              <span className="inline-block w-1 h-4 ml-0.5 animate-pulse align-middle"
                style={{ background: '#e41aff' }} />
            )}
          </div>
        ) : !isStreaming && !streamError && (
          <div className="text-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin mx-auto mb-3"
              style={{ borderTopColor: '#e41aff', borderRightColor: 'rgba(228,26,255,0.3)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Preparing your annual report…
            </p>
          </div>
        )}

        {/* Stream error */}
        {streamError && (
          <div className="mt-2">
            <p className="text-xs mb-3" style={{ color: 'rgba(255,100,100,0.8)' }}>⚠ {streamError}</p>
            <button
              onClick={() => streamReport(selectedYear)}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(228,26,255,0.08)', color: '#e41aff', border: '1px solid rgba(228,26,255,0.2)' }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Oracle CTA */}
      <div className="p-5 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(228,26,255,0.06), rgba(0,240,255,0.06))', border: '1px solid rgba(228,26,255,0.15)' }}>
        <div className="flex items-start gap-4">
          <span className="text-2xl mt-0.5">🔮</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white mb-1">Ask the Oracle</p>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Ask your AI astrologer to dive deeper into your Solar Return and what this year holds for you.
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

      {/* Action buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={() => router.push('/forecast')}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: 'rgba(0,240,255,0.08)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)' }}
        >
          View Forecast
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Back to Dashboard
        </button>
      </div>

    </motion.div>
  );
}
