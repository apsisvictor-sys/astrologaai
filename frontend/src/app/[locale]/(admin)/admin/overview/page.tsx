'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet } from '@/lib/admin-api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DailySignup {
  date: string;
  count: number;
}

interface OverviewData {
  totalUsers: number;
  byTier: { FREE: number; PRO: number; PREMIUM: number };
  newSignups: number;
  mrrEstimate: number;
  conversionRate: number;
  failedPayments: number;
  dailySignups: DailySignup[];
}

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getPresetDates(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (days === 0) {
    // Today
    return { startDate: toISODate(start), endDate: toISODate(end) };
  }
  start.setDate(start.getDate() - days);
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultDates = getPresetDates(30);
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [activePreset, setActivePreset] = useState<number | null>(30);

  const fetchData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);
      const result = await adminGet<OverviewData>(`/overview?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(startDate, endDate);
  }, [startDate, endDate, fetchData]);

  function applyPreset(days: number) {
    const { startDate: s, endDate: e } = getPresetDates(days);
    setActivePreset(days);
    setStartDate(s);
    setEndDate(e);
  }

  function handleStartDate(val: string) {
    setActivePreset(null);
    setStartDate(val);
  }

  function handleEndDate(val: string) {
    setActivePreset(null);
    setEndDate(val);
  }

  return (
    <div className="min-h-screen font-display p-6 md:p-10" style={{ backgroundColor: '#0D0010' }}>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-4xl font-bold gradient-text mb-2"
          style={{
            background: 'linear-gradient(135deg, #e41aff, #00f0ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Overview
        </h1>
        <p className="text-text-secondary text-sm">Platform metrics and activity summary</p>
      </div>

      {/* Date filter row */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.days)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
            style={{
              background:
                activePreset === p.days
                  ? 'linear-gradient(135deg, #e41aff33, #00f0ff22)'
                  : 'rgba(255,255,255,0.04)',
              border:
                activePreset === p.days
                  ? '1px solid #e41aff'
                  : '1px solid rgba(228,26,255,0.15)',
              color: activePreset === p.days ? '#e41aff' : '#a0a0b0',
            }}
          >
            {p.label}
          </button>
        ))}

        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDate(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(228,26,255,0.15)',
              color: '#c0c0d0',
              colorScheme: 'dark',
            }}
          />
          <span className="text-text-muted text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDate(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(228,26,255,0.15)',
              color: '#c0c0d0',
              colorScheme: 'dark',
            }}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div
            className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: '#e41aff', borderRightColor: '#e41aff' }}
          />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          className="rounded-[16px] p-5 mb-6"
          style={{
            background: 'rgba(255,0,80,0.08)',
            border: '1px solid rgba(255,0,80,0.3)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: '#ff0080' }}>
            Error: {error}
          </p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Total Users" value={data.totalUsers.toLocaleString()} />
            <MetricCard
              label="MRR"
              value={`€${data.mrrEstimate.toLocaleString()}`}
              sublabel="/month"
              accentColor="#00f0ff"
            />
            <MetricCard
              label="Conversion Rate"
              value={`${data.conversionRate.toFixed(1)}%`}
              accentColor="#e41aff"
            />
            <MetricCard
              label="New Signups"
              value={data.newSignups.toLocaleString()}
              sublabel="in period"
              accentColor="#ff0080"
            />
          </div>

          {/* Tier breakdown */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <TierCard label="FREE" count={data.byTier.FREE} color="#a0a0b0" />
            <TierCard label="PRO" count={data.byTier.PRO} color="#F59E0B" />
            <TierCard label="PREMIUM" count={data.byTier.PREMIUM} color="#8B5CF6" />
          </div>

          {/* Daily signups sparkline */}
          <div
            className="glass-panel p-5 mb-6"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(228,26,255,0.15)',
              borderRadius: '16px',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-sm font-semibold text-text-secondary mb-4">Daily Signups</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.dailySignups} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e41aff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#e41aff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b6b80', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fill: '#6b6b80', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a0020',
                    border: '1px solid rgba(228,26,255,0.3)',
                    borderRadius: '8px',
                    color: '#e0e0f0',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#e41aff', marginBottom: 4 }}
                  cursor={{ stroke: 'rgba(228,26,255,0.3)' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#e41aff"
                  strokeWidth={2}
                  fill="url(#signupGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Failed payments warning */}
          {data.failedPayments > 0 && (
            <div
              className="rounded-[16px] p-5 flex items-center gap-3"
              style={{
                background: 'rgba(255,0,80,0.07)',
                border: '1px solid rgba(255,0,80,0.3)',
              }}
            >
              <span style={{ color: '#ff0080', fontSize: 20 }}>!</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#ff0080' }}>
                  Failed Payments
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {data.failedPayments} payment{data.failedPayments !== 1 ? 's' : ''} failed and require attention.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  accentColor,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accentColor?: string;
}) {
  return (
    <div
      className="rounded-[16px] p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(228,26,255,0.15)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p className="text-xs text-text-muted uppercase tracking-wider mb-3">{label}</p>
      <p
        className="text-3xl font-bold"
        style={{ color: accentColor ?? '#e8e8f0' }}
      >
        {value}
        {sublabel && (
          <span className="text-sm font-normal text-text-muted ml-1">{sublabel}</span>
        )}
      </p>
    </div>
  );
}

function TierCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      className="rounded-[16px] p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(228,26,255,0.15)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p className="text-xs uppercase tracking-wider mb-3" style={{ color }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color }}>
        {count.toLocaleString()}
      </p>
      <p className="text-xs text-text-muted mt-1">users</p>
    </div>
  );
}
