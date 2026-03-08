'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet, adminPost, adminPatch } from '@/lib/admin-api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Conversion {
  tier: string;
  revenueUsdCents: number;
  commissionCents: number;
  convertedAt: string;
}

interface ReferralLink {
  id: string;
  slug: string;
  label: string;
  commissionRate: number;
  clicks: number;
  isActive: boolean;
  conversions: Conversion[];
  totalConversions: number;
  totalCommissionCents: number;
  createdAt: string;
}

interface ReferralsResponse {
  links: ReferralLink[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtEuros(cents: number): string {
  return '€' + (cents / 100).toFixed(2);
}

function fmtPercent(rate: number): string {
  return (rate * 100).toFixed(0) + '%';
}

const BASE_URL = 'https://astrologaai.com';

function buildRefUrl(slug: string): string {
  return `${BASE_URL}?ref=${slug}`;
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div
        className="h-10 w-10 rounded-full border-2 border-transparent animate-spin"
        style={{ borderTopColor: '#e41aff', borderRightColor: '#00f0ff' }}
      />
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-panel p-6">
      <p className="text-xs text-text-muted uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-display font-bold text-white">{value}</p>
    </div>
  );
}

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-2 px-2 py-0.5 rounded text-[10px] border border-white/10 text-text-muted hover:border-primary/50 hover:text-primary transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [commissionPct, setCommissionPct] = useState('20');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pct = parseFloat(commissionPct);
    if (!label.trim()) { setError('Label is required.'); return; }
    if (!slug.trim()) { setError('Slug is required.'); return; }
    if (isNaN(pct) || pct < 0 || pct > 100) { setError('Commission must be 0–100.'); return; }

    setSubmitting(true);
    try {
      await adminPost('/referrals', {
        label: label.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        commissionRate: pct / 100,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="glass-panel relative w-full max-w-md mx-4 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-primary transition-colors text-2xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="text-xl font-display font-semibold gradient-text mb-6">
          Create Referral Link
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Label */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Label</label>
            <input
              type="text"
              placeholder="e.g. John's Blog"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Slug <span className="text-text-muted">(becomes ?ref=slug)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. john-blog"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors font-mono"
            />
            {slug && (
              <p className="mt-1 text-[11px] text-text-muted font-mono truncate">
                {buildRefUrl(slug)}
              </p>
            )}
          </div>

          {/* Commission Rate */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Commission Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="20"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#e41aff,#00f0ff)', color: '#0D0010' }}
          >
            {submitting ? 'Creating…' : 'Create Link'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReferralsPage() {
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGet<ReferralsResponse>('/referrals');
      setLinks(data.links ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load referral links');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  async function handleToggle(link: ReferralLink) {
    setTogglingId(link.id);
    try {
      await adminPatch(`/referrals/${link.id}`, { isActive: !link.isActive });
      await fetchLinks();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update link');
    } finally {
      setTogglingId(null);
    }
  }

  // Summary metrics
  const totalLinks = links.length;
  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);
  const totalCommission = links.reduce((sum, l) => sum + l.totalCommissionCents, 0);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: '#0D0010' }}>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold gradient-text">Referral Links</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg,#e41aff,#00f0ff)', color: '#0D0010' }}
        >
          + Create Referral Link
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Total Links" value={totalLinks} />
        <MetricCard label="Total Clicks" value={totalClicks.toLocaleString()} />
        <MetricCard label="Commission Earned" value={fmtEuros(totalCommission)} />
      </div>

      {/* Error */}
      {error && (
        <div className="glass-panel p-4 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-text-muted text-left">
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium">Slug / URL</th>
                  <th className="px-4 py-3 font-medium">Commission</th>
                  <th className="px-4 py-3 font-medium">Clicks</th>
                  <th className="px-4 py-3 font-medium">Conversions</th>
                  <th className="px-4 py-3 font-medium">Commission Earned</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-text-muted">
                      No referral links yet. Create your first one above.
                    </td>
                  </tr>
                ) : (
                  links.map((link) => {
                    const refUrl = buildRefUrl(link.slug);
                    const isBusy = togglingId === link.id;
                    return (
                      <tr
                        key={link.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        {/* Label */}
                        <td className="px-4 py-3 text-white font-medium">{link.label}</td>

                        {/* Slug / URL */}
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <span className="font-mono text-[#00f0ff] text-xs truncate max-w-[220px]">
                              {refUrl}
                            </span>
                            <CopyButton text={refUrl} />
                          </div>
                        </td>

                        {/* Commission % */}
                        <td className="px-4 py-3 text-white">
                          {fmtPercent(link.commissionRate)}
                        </td>

                        {/* Clicks */}
                        <td className="px-4 py-3 text-text-secondary">
                          {link.clicks.toLocaleString()}
                        </td>

                        {/* Conversions */}
                        <td className="px-4 py-3 text-text-secondary">
                          {link.totalConversions}
                        </td>

                        {/* Commission Earned */}
                        <td className="px-4 py-3 font-semibold" style={{ color: '#e41aff' }}>
                          {fmtEuros(link.totalCommissionCents)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {link.isActive ? (
                            <span className="flex items-center gap-1 text-xs text-green-400">
                              <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                              Active
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">Inactive</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggle(link)}
                            disabled={isBusy}
                            className={`px-3 py-1 rounded text-xs border transition-colors disabled:opacity-50 ${
                              link.isActive
                                ? 'border-red-500/30 text-red-400 hover:border-red-500/70'
                                : 'border-green-500/30 text-green-400 hover:border-green-500/70'
                            }`}
                          >
                            {isBusy ? '…' : link.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchLinks}
        />
      )}
    </div>
  );
}
