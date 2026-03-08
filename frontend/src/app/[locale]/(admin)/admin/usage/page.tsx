'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet } from '@/lib/admin-api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsageSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsdCents: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

interface DayRow {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsdCents: number;
  avgLatencyMs: number;
}

interface TierRow {
  tier: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsdCents: number;
}

interface ModelRow {
  model: string;
  requests: number;
  costUsdCents: number;
}

interface TopUser {
  userId: string;
  email: string;
  requests: number;
  totalTokens: number;
}

interface UsageData {
  summary: UsageSummary;
  byDay: DayRow[];
  byTier: TierRow[];
  byModel: ModelRow[];
  topUsers: TopUser[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function centsToEuro(cents: number): string {
  return '€' + (cents / 100).toFixed(2);
}

function fmtM(tokens: number): string {
  return (tokens / 1_000_000).toFixed(2) + 'M';
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const TIER_COLORS: Record<string, string> = {
  FREE: 'text-slate-300 bg-slate-700/50 border-slate-600',
  SEEKER: 'text-accent-cyan bg-[#00f0ff]/10 border-[#00f0ff]/30',
  ORACLE: 'text-primary bg-primary/10 border-primary/30',
  COSMIC: 'text-[#ff0080] bg-[#ff0080]/10 border-[#ff0080]/30',
};

function tierBadge(tier: string) {
  const cls = TIER_COLORS[tier.toUpperCase()] ?? 'text-slate-300 bg-slate-700/50 border-slate-600';
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {tier}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="glass-panel p-5 flex flex-col gap-1 min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted truncate">
        {label}
      </p>
      <p className={`text-2xl font-bold truncate ${accent}`}>{value}</p>
    </div>
  );
}

function LatencyBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-[11px] font-mono text-text-muted uppercase">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-sm font-mono text-text-secondary">
        {fmtNum(value)} ms
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const [startDate, setStartDate] = useState(daysAgo(29));
  const [endDate, setEndDate] = useState(today());
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSortDesc, setUserSortDesc] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminGet<UsageData>(
        `/usage?startDate=${startDate}&endDate=${endDate}`
      );
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function applyPreset(days: number | null) {
    if (days === null) return; // custom — user edits manually
    setEndDate(today());
    setStartDate(days === 0 ? today() : daysAgo(days - 1));
  }

  const s = data?.summary;
  const p99 = s?.p99LatencyMs ?? 1;

  const sortedUsers = data
    ? [...data.topUsers]
        .sort((a, b) =>
          userSortDesc ? b.requests - a.requests : a.requests - b.requests
        )
        .slice(0, 10)
    : [];

  return (
    <main className="relative min-h-screen pt-8 pb-16 px-4 sm:px-6 lg:px-8 text-slate-100">
      {/* Background orbs */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="blur-sphere w-[500px] h-[500px] top-[-10%] right-[-10%] bg-primary opacity-30" />
        <div className="blur-sphere w-[400px] h-[400px] bottom-[-15%] left-[-10%] bg-[#00f0ff] opacity-10 mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted mb-1">
              Admin
            </p>
            <h1 className="text-4xl font-bold gradient-text">Usage &amp; Cost</h1>
          </div>

          {/* Date filters */}
          <div className="glass-panel p-4 flex flex-wrap gap-2 items-center">
            {/* Presets */}
            {([
              { label: 'Today', days: 0 },
              { label: '7d', days: 7 },
              { label: '30d', days: 30 },
              { label: '90d', days: 90 },
            ] as const).map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              >
                {p.label}
              </button>
            ))}

            <span className="text-text-muted text-xs">or</span>

            {/* Custom range */}
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-primary/50"
            />
            <span className="text-text-muted text-xs">→</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* ── Loading / Error ── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="glass-panel p-6 border-[#ff0080]/30 text-[#ff0080]">
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            {/* ── Metric Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard
                label="Total Requests"
                value={fmtNum(s!.totalRequests)}
                accent="text-primary"
              />
              <MetricCard
                label="Input Tokens"
                value={fmtM(s!.totalInputTokens)}
                accent="text-accent-cyan"
              />
              <MetricCard
                label="Output Tokens"
                value={fmtM(s!.totalOutputTokens)}
                accent="text-[#ff0080]"
              />
              <MetricCard
                label="Total Cost"
                value={centsToEuro(s!.totalCostUsdCents)}
                accent="text-emerald-400"
              />
              <MetricCard
                label="Avg Latency"
                value={`${fmtNum(s!.avgLatencyMs)} ms`}
                accent="text-amber-400"
              />
            </div>

            {/* ── Two-column: Latency percentiles + Token chart ── */}
            <div className="grid lg:grid-cols-3 gap-6">

              {/* Latency percentiles */}
              <div className="glass-panel p-6 flex flex-col gap-4">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">
                  Latency Percentiles
                </h2>
                <div className="flex flex-col gap-4 mt-1">
                  <LatencyBar
                    label="p50"
                    value={s!.p50LatencyMs}
                    max={p99}
                    color="bg-emerald-400"
                  />
                  <LatencyBar
                    label="p95"
                    value={s!.p95LatencyMs}
                    max={p99}
                    color="bg-amber-400"
                  />
                  <LatencyBar
                    label="p99"
                    value={s!.p99LatencyMs}
                    max={p99}
                    color="bg-[#ff0080]"
                  />
                </div>
                <div className="mt-2 pt-4 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'p50', val: s!.p50LatencyMs },
                    { label: 'p95', val: s!.p95LatencyMs },
                    { label: 'p99', val: s!.p99LatencyMs },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">{label}</p>
                      <p className="text-sm font-mono font-bold text-slate-200">{fmtNum(val)}ms</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily token usage chart */}
              <div className="glass-panel p-6 lg:col-span-2">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted mb-4">
                  Daily Token Usage
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={data.byDay}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradInput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradOutput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff0080" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ff0080" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(5)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      axisLine={false}
                      tickLine={false}
                      width={38}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(13,0,16,0.95)',
                        border: '1px solid rgba(228,26,255,0.2)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: '#a1a1aa' }}
                      formatter={(value) => [
                        fmtNum(Number(value)),
                        '',
                      ]}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === 'inputTokens' ? 'Input Tokens' : 'Output Tokens'
                      }
                      wrapperStyle={{ fontSize: 11, color: '#6b7280' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="inputTokens"
                      stroke="#00f0ff"
                      strokeWidth={1.5}
                      fill="url(#gradInput)"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="outputTokens"
                      stroke="#ff0080"
                      strokeWidth={1.5}
                      fill="url(#gradOutput)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Cost by Tier table ── */}
            <div className="glass-panel p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted mb-4">
                Cost by Tier
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Tier', 'Requests', 'Input Tokens', 'Output Tokens', 'Cost'].map(
                        (h) => (
                          <th
                            key={h}
                            className="pb-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted first:pl-0 pl-4"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.byTier.map((row) => (
                      <tr
                        key={row.tier}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3">{tierBadge(row.tier)}</td>
                        <td className="py-3 pl-4 font-mono text-slate-300">
                          {fmtNum(row.requests)}
                        </td>
                        <td className="py-3 pl-4 font-mono text-text-secondary">
                          {fmtM(row.inputTokens)}
                        </td>
                        <td className="py-3 pl-4 font-mono text-text-secondary">
                          {fmtM(row.outputTokens)}
                        </td>
                        <td className="py-3 pl-4 font-mono text-emerald-400 font-bold">
                          {centsToEuro(row.costUsdCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Top 10 Users table ── */}
            <div className="glass-panel p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted mb-4">
                Top 10 Heaviest Users
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
                        Email
                      </th>
                      <th
                        className="pb-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted pl-4 cursor-pointer select-none hover:text-primary transition-colors"
                        onClick={() => setUserSortDesc((v) => !v)}
                      >
                        Requests{' '}
                        <span className="text-primary">{userSortDesc ? '↓' : '↑'}</span>
                      </th>
                      <th className="pb-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted pl-4">
                        Total Tokens
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u, i) => (
                      <tr
                        key={u.userId}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 flex items-center gap-2">
                          <span className="text-[10px] font-mono text-text-muted w-5 text-right">
                            {i + 1}
                          </span>
                          <span className="text-slate-200">{u.email}</span>
                        </td>
                        <td className="py-3 pl-4 font-mono text-primary font-bold">
                          {fmtNum(u.requests)}
                        </td>
                        <td className="py-3 pl-4 font-mono text-text-secondary">
                          {fmtNum(u.totalTokens)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
