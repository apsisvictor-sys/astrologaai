'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminGet } from '@/lib/admin-api';

// ── Types ────────────────────────────────────────────────────────────────────

interface BillingPeriod {
  count: number;
  revenueCents: number;
}

interface RevenueData {
  active: number;
  cancelled: number;
  pastDue: number;
  totalRevenueCents: number;
  mrrCents: number;
  billingBreakdown: {
    monthly: BillingPeriod;
    yearly: BillingPeriod;
  };
  newSubscriptions: number;
  churnCount: number;
  stripeConfigured: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatEur(cents: number): string {
  const euros = cents / 100;
  if (euros >= 1000) {
    return `€${(euros / 1000).toFixed(1)}k`;
  }
  return `€${euros.toFixed(2)}`;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getPresetRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  const end = toISODate(now);
  if (preset === 'today') {
    return { startDate: end, endDate: end };
  }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { startDate: toISODate(start), endDate: end };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-9 h-9 rounded-full border-2 border-[#e41aff] border-t-transparent animate-spin" />
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div
      className="glass-panel p-6 flex items-start gap-4"
      style={{ border: '1px solid rgba(255,0,128,0.3)' }}
    >
      <span className="text-2xl mt-0.5">⚠</span>
      <div>
        <p className="text-white font-semibold mb-1">Failed to load revenue data</p>
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  glow: string;
}

function MetricCard({ label, value, sub, accent, glow }: MetricCardProps) {
  return (
    <div
      className="glass-panel p-5 flex flex-col gap-2"
      style={{ borderLeft: `2px solid ${accent}` }}
    >
      <p className="text-xs uppercase tracking-widest text-text-muted font-medium">{label}</p>
      <p className="text-3xl font-bold text-white" style={{ textShadow: `0 0 20px ${glow}` }}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

interface HealthCardProps {
  label: string;
  count: number;
  accent: string;
  glow: string;
  description: string;
}

function HealthCard({ label, count, accent, glow, description }: HealthCardProps) {
  return (
    <div className="glass-panel p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: accent, boxShadow: `0 0 8px ${glow}` }}
        />
        <p className="text-xs uppercase tracking-widest text-text-muted font-medium">{label}</p>
      </div>
      <p className="text-4xl font-bold text-white" style={{ textShadow: `0 0 20px ${glow}` }}>
        {count.toLocaleString()}
      </p>
      <p className="text-xs text-text-secondary">{description}</p>
    </div>
  );
}

interface BillingCardProps {
  label: string;
  period: BillingPeriod;
  accent: string;
  glow: string;
}

function BillingCard({ label, period, accent, glow }: BillingCardProps) {
  return (
    <div
      className="glass-panel p-6 flex-1"
      style={{ borderTop: `2px solid ${accent}` }}
    >
      <p className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: accent }}>
        {label}
      </p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-bold text-white" style={{ textShadow: `0 0 20px ${glow}` }}>
            {period.count.toLocaleString()}
          </p>
          <p className="text-xs text-text-muted mt-1">subscribers</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: accent }}>
            {formatEur(period.revenueCents)}
          </p>
          <p className="text-xs text-text-muted mt-1">revenue in period</p>
        </div>
      </div>
    </div>
  );
}

// ── Preset button ─────────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d',    label: '7d'    },
  { key: '30d',   label: '30d'   },
  { key: '90d',   label: '90d'   },
] as const;

type PresetKey = typeof PRESETS[number]['key'];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date filter state
  const [activePreset, setActivePreset] = useState<PresetKey | 'custom'>('30d');
  const initialRange = getPresetRange('30d');
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  const fetchData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminGet<RevenueData>(`/revenue?startDate=${start}&endDate=${end}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePreset(preset: PresetKey) {
    const range = getPresetRange(preset);
    setActivePreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    fetchData(range.startDate, range.endDate);
  }

  function handleCustomApply() {
    setActivePreset('custom');
    fetchData(startDate, endDate);
  }

  return (
    <div className="space-y-8">

      {/* Page title */}
      <div>
        <h1
          className="text-3xl font-bold gradient-text inline-block"
          style={{
            background: 'linear-gradient(90deg,#e41aff,#00f0ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Revenue
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Subscription metrics and billing breakdown
        </p>
      </div>

      {/* Date filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Preset pills */}
        <div className="flex items-center gap-1">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePreset(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={activePreset === key ? {
                background: 'rgba(228,26,255,0.18)',
                color: '#e41aff',
                border: '1px solid rgba(228,26,255,0.4)',
              } : {
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.45)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10" />

        {/* Custom date inputs */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setActivePreset('custom'); }}
            className="px-3 py-1.5 rounded-lg text-xs text-white bg-white/5 border border-white/10
                       focus:outline-none focus:border-[#e41aff]/50 transition-colors"
          />
          <span className="text-text-muted text-xs">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setActivePreset('custom'); }}
            className="px-3 py-1.5 rounded-lg text-xs text-white bg-white/5 border border-white/10
                       focus:outline-none focus:border-[#e41aff]/50 transition-colors"
          />
          <button
            onClick={handleCustomApply}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={{
              background: 'rgba(0,240,255,0.12)',
              color: '#00f0ff',
              border: '1px solid rgba(0,240,255,0.3)',
            }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Stripe banner */}
      {data && !data.stripeConfigured && (
        <div
          className="glass-panel px-5 py-3 flex items-center gap-3"
          style={{ border: '1px solid rgba(0,240,255,0.25)', background: 'rgba(0,240,255,0.05)' }}
        >
          <span className="text-[#00f0ff] text-lg">ℹ</span>
          <p className="text-sm text-[#00f0ff]">
            Connect Stripe to see live revenue data. Showing mock data.
          </p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorCard message={error} />
      ) : data ? (
        <>
          {/* Top metric cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              label="MRR"
              value={formatEur(data.mrrCents)}
              sub="Monthly Recurring Revenue"
              accent="#e41aff"
              glow="#e41aff66"
            />
            <MetricCard
              label="Active Subscribers"
              value={data.active.toLocaleString()}
              sub="Currently active"
              accent="#00f0ff"
              glow="#00f0ff66"
            />
            <MetricCard
              label="New Subscriptions"
              value={data.newSubscriptions.toLocaleString()}
              sub="In selected period"
              accent="#a855f7"
              glow="#a855f766"
            />
            <MetricCard
              label="Churn"
              value={data.churnCount.toLocaleString()}
              sub="Cancellations in period"
              accent="#ff0080"
              glow="#ff008066"
            />
          </div>

          {/* Subscription health */}
          <div>
            <p className="text-xs uppercase tracking-widest text-text-muted font-medium mb-3">
              Subscription Health
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <HealthCard
                label="Active"
                count={data.active}
                accent="#22c55e"
                glow="#22c55e66"
                description="Currently paying subscribers"
              />
              <HealthCard
                label="Cancelled"
                count={data.cancelled}
                accent="#f59e0b"
                glow="#f59e0b66"
                description="Cancelled — access until period end"
              />
              <HealthCard
                label="Past Due"
                count={data.pastDue}
                accent="#ff0080"
                glow="#ff008066"
                description="Payment failed — action required"
              />
            </div>
          </div>

          {/* Billing breakdown */}
          <div>
            <p className="text-xs uppercase tracking-widest text-text-muted font-medium mb-3">
              Billing Period Breakdown
            </p>
            <div className="flex gap-4">
              <BillingCard
                label="Monthly Plan"
                period={data.billingBreakdown.monthly}
                accent="#00f0ff"
                glow="#00f0ff66"
              />
              <BillingCard
                label="Annual / Solar Return Plan"
                period={data.billingBreakdown.yearly}
                accent="#ff0080"
                glow="#ff008066"
              />
            </div>
          </div>

          {/* Revenue metrics */}
          <div>
            <p className="text-xs uppercase tracking-widest text-text-muted font-medium mb-3">
              Revenue Metrics
            </p>
            <div className="glass-panel p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-widest mb-1">
                  Total Revenue (period)
                </p>
                <p className="text-3xl font-bold text-white">
                  {formatEur(data.totalRevenueCents)}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {startDate} → {endDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-widest mb-1">
                  MRR Breakdown
                </p>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00f0ff] inline-block" />
                      Monthly subscribers
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {data.billingBreakdown.monthly.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ff0080] inline-block" />
                      Annual subscribers
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {data.billingBreakdown.yearly.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-text-muted uppercase tracking-widest">MRR</span>
                    <span
                      className="text-lg font-bold"
                      style={{ color: '#e41aff', textShadow: '0 0 16px #e41aff66' }}
                    >
                      {formatEur(data.mrrCents)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
