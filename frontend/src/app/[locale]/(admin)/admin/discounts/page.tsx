'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet, adminPost, adminPatch } from '@/lib/admin-api';

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscountType = 'percent' | 'amount';
type AppliesTo = 'ALL' | 'PRO' | 'PREMIUM';

interface DiscountCode {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  appliesTo: AppliesTo;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface DiscountsResponse {
  codes: DiscountCode[];
}

interface CreateForm {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  appliesTo: AppliesTo;
  maxUses: string;
  expiresAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const APPLIES_TO_OPTIONS: AppliesTo[] = ['ALL', 'PRO', 'PREMIUM'];

const DEFAULT_FORM: CreateForm = {
  code: '',
  discountType: 'percent',
  discountValue: '',
  appliesTo: 'ALL',
  maxUses: '',
  expiresAt: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getPresetDates(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (days === 0) {
    return { startDate: toISODate(start), endDate: toISODate(end) };
  }
  start.setDate(start.getDate() - days);
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function TypeBadge({ type }: { type: DiscountType }) {
  if (type === 'percent') {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-900/50 text-cyan-300">
        %
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-900/50 text-amber-300">
      €
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
        Active
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-800 text-gray-400">
      Inactive
    </span>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState<CreateForm>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof CreateForm>(key: K, value: CreateForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) {
      setError('Code is required');
      return;
    }
    if (!form.discountValue || Number(form.discountValue) <= 0) {
      setError('Value must be greater than 0');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await adminPost('/discounts', {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        appliesTo: form.appliesTo,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create code');
    } finally {
      setCreating(false);
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(228,26,255,0.15)',
    color: '#e0e0f0',
    colorScheme: 'dark' as const,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 p-8 overflow-y-auto max-h-[90vh] rounded-[16px]"
        style={{
          background: 'rgba(13,0,16,0.97)',
          border: '1px solid rgba(228,26,255,0.25)',
          backdropFilter: 'blur(12px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl leading-none transition-colors"
          style={{ color: '#6b6b80' }}
          aria-label="Close"
        >
          ×
        </button>

        <h2
          className="text-xl font-bold mb-6"
          style={{
            background: 'linear-gradient(135deg, #e41aff, #00f0ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Create Discount Code
        </h2>

        {error && (
          <div
            className="rounded-lg p-3 mb-4 text-sm"
            style={{
              background: 'rgba(255,0,80,0.08)',
              border: '1px solid rgba(255,0,80,0.3)',
              color: '#ff0080',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Code */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#a0a0b0' }}>
              Code <span style={{ color: '#ff0080' }}>*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setField('code', e.target.value.toUpperCase())}
              placeholder="LAUNCH50"
              required
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                ...inputStyle,
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            />
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-xs mb-2" style={{ color: '#a0a0b0' }}>
              Discount Type <span style={{ color: '#ff0080' }}>*</span>
            </label>
            <div className="flex gap-4">
              {(['percent', 'amount'] as DiscountType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discountType"
                    value={t}
                    checked={form.discountType === t}
                    onChange={() => setField('discountType', t)}
                    className="accent-purple-500"
                  />
                  <span className="text-sm" style={{ color: '#c0c0d0' }}>
                    {t === 'percent' ? 'Percent (%)' : 'Amount (€)'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#a0a0b0' }}>
              Value{' '}
              <span style={{ color: '#6b6b80' }}>
                {form.discountType === 'percent' ? '(1–100)' : '(in cents)'}
              </span>{' '}
              <span style={{ color: '#ff0080' }}>*</span>
            </label>
            <input
              type="number"
              value={form.discountValue}
              onChange={(e) => setField('discountValue', e.target.value)}
              min={1}
              max={form.discountType === 'percent' ? 100 : undefined}
              placeholder={form.discountType === 'percent' ? '50' : '999'}
              required
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Applies To */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#a0a0b0' }}>
              Applies To
            </label>
            <select
              value={form.appliesTo}
              onChange={(e) => setField('appliesTo', e.target.value as AppliesTo)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={inputStyle}
            >
              {APPLIES_TO_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* Max Uses */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#a0a0b0' }}>
              Max Uses{' '}
              <span style={{ color: '#6b6b80' }}>(leave empty for unlimited)</span>
            </label>
            <input
              type="number"
              value={form.maxUses}
              onChange={(e) => setField('maxUses', e.target.value)}
              min={1}
              placeholder="100"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Expires At */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#a0a0b0' }}>
              Expires At{' '}
              <span style={{ color: '#6b6b80' }}>(optional)</span>
            </label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setField('expiresAt', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Note */}
          <p className="text-xs" style={{ color: '#6b6b80' }}>
            Stripe coupon will be created automatically if Stripe is configured.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={creating}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #e41aff, #00f0ff)',
              color: '#0D0010',
            }}
          >
            {creating ? 'Creating…' : 'Create Code'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DiscountsPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultDates = getPresetDates(30);
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [activePreset, setActivePreset] = useState<number | null>(30);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCodes = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);
      const data = await adminGet<DiscountsResponse>(`/discounts?${params.toString()}`);
      setCodes(data.codes ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load discount codes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes(startDate, endDate);
  }, [startDate, endDate, fetchCodes]);

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

  async function handleToggleActive(code: DiscountCode) {
    setTogglingId(code.id);
    try {
      await adminPatch(`/discounts/${code.id}`, { isActive: !code.isActive });
      setCodes((prev) =>
        prev.map((c) => (c.id === code.id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update code');
    } finally {
      setTogglingId(null);
    }
  }

  function handleCopyCode(code: DiscountCode) {
    navigator.clipboard.writeText(code.code).then(() => {
      setCopiedId(code.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  const dateInputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(228,26,255,0.15)',
    color: '#c0c0d0',
    colorScheme: 'dark' as const,
  };

  return (
    <div className="min-h-screen p-6 md:p-10 space-y-6" style={{ backgroundColor: '#0D0010' }}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <h1
          className="text-4xl font-bold"
          style={{
            background: 'linear-gradient(135deg, #e41aff, #00f0ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Discount Codes
        </h1>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #e41aff, #00f0ff)',
            color: '#0D0010',
          }}
        >
          + Create New Code
        </button>
      </div>

      {/* Date filter row */}
      <div className="flex flex-wrap items-center gap-3">
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
            style={dateInputStyle}
          />
          <span className="text-sm" style={{ color: '#6b6b80' }}>
            to
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDate(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 outline-none"
            style={dateInputStyle}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-[16px] p-4 text-sm"
          style={{
            background: 'rgba(255,0,80,0.08)',
            border: '1px solid rgba(255,0,80,0.3)',
            color: '#ff0080',
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-hidden rounded-[16px]"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(228,26,255,0.15)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    color: '#6b6b80',
                  }}
                >
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Applies To</th>
                  <th className="px-4 py-3 font-medium">Uses</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-sm"
                      style={{ color: '#6b6b80' }}
                    >
                      No discount codes found.
                    </td>
                  </tr>
                ) : (
                  codes.map((code) => {
                    const isToggling = togglingId === code.id;
                    const isCopied = copiedId === code.id;
                    const usesDisplay =
                      code.maxUses != null
                        ? `${code.usesCount}/${code.maxUses}`
                        : `${code.usesCount}/∞`;
                    const valueDisplay =
                      code.discountType === 'percent'
                        ? `${code.discountValue}%`
                        : `€${(code.discountValue / 100).toFixed(2)}`;

                    return (
                      <tr
                        key={code.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        className="transition-colors hover:bg-white/[0.02]"
                      >
                        {/* Code — copyable */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleCopyCode(code)}
                            title={isCopied ? 'Copied!' : 'Click to copy'}
                            className="transition-opacity hover:opacity-80"
                            style={{
                              fontFamily: 'monospace',
                              letterSpacing: '0.05em',
                              color: isCopied ? '#00f0ff' : '#e0e0f0',
                              fontSize: '0.8rem',
                            }}
                          >
                            {isCopied ? '✓ Copied' : code.code}
                          </button>
                        </td>

                        {/* Type badge */}
                        <td className="px-4 py-3">
                          <TypeBadge type={code.discountType} />
                        </td>

                        {/* Value */}
                        <td className="px-4 py-3 font-semibold" style={{ color: '#e0e0f0' }}>
                          {valueDisplay}
                        </td>

                        {/* Applies To */}
                        <td className="px-4 py-3" style={{ color: '#a0a0b0' }}>
                          {code.appliesTo}
                        </td>

                        {/* Uses */}
                        <td className="px-4 py-3" style={{ color: '#00f0ff' }}>
                          {usesDisplay}
                        </td>

                        {/* Expires */}
                        <td className="px-4 py-3" style={{ color: '#a0a0b0' }}>
                          {fmtDate(code.expiresAt)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge isActive={code.isActive} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(code)}
                            disabled={isToggling}
                            className="px-2 py-1 rounded text-xs border transition-colors disabled:opacity-50"
                            style={
                              code.isActive
                                ? {
                                    borderColor: 'rgba(255,0,80,0.3)',
                                    color: '#ff0080',
                                  }
                                : {
                                    borderColor: 'rgba(0,240,255,0.3)',
                                    color: '#00f0ff',
                                  }
                            }
                          >
                            {isToggling ? '…' : code.isActive ? 'Deactivate' : 'Activate'}
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
      {showCreateModal && (
        <CreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchCodes(startDate, endDate)}
        />
      )}
    </div>
  );
}
