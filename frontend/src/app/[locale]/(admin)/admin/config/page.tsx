'use client';

import { useState, useEffect } from 'react';
import { adminGet, adminPut } from '@/lib/admin-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tier = 'FREE' | 'PRO' | 'PREMIUM';

interface TierConfig {
  model: string;
  source: 'db' | 'env';
}

type ModelsResponse = Record<Tier, TierConfig>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUGGESTED_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'gpt-4o',
  'gpt-4o-mini',
];

const TIER_META: Record<Tier, { label: string; color: string; badgeBg: string; badgeText: string }> = {
  FREE: {
    label: 'FREE',
    color: '#a0a0b0',
    badgeBg: 'rgba(160,160,176,0.12)',
    badgeText: '#a0a0b0',
  },
  PRO: {
    label: 'PRO',
    color: '#F59E0B',
    badgeBg: 'rgba(245,158,11,0.12)',
    badgeText: '#F59E0B',
  },
  PREMIUM: {
    label: 'PREMIUM',
    color: '#8B5CF6',
    badgeBg: 'rgba(139,92,246,0.12)',
    badgeText: '#8B5CF6',
  },
};

const TIERS: Tier[] = ['FREE', 'PRO', 'PREMIUM'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasUnknownPrefix(model: string): boolean {
  const trimmed = model.trim();
  if (!trimmed) return false;
  return !trimmed.startsWith('claude-') && !trimmed.startsWith('gpt-');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
        style={{ borderTopColor: '#e41aff', borderRightColor: '#e41aff' }}
      />
    </div>
  );
}

interface TierCardProps {
  tier: Tier;
  model: string;
  source: 'db' | 'env';
  onChange: (value: string) => void;
}

function TierCard({ tier, model, source, onChange }: TierCardProps) {
  const meta = TIER_META[tier];
  const unknown = hasUnknownPrefix(model);

  return (
    <div
      className="rounded-[16px] p-6"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(228,26,255,0.15)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header row: tier badge + source badge */}
      <div className="flex items-center justify-between mb-5">
        <span
          className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ background: meta.badgeBg, color: meta.badgeText }}
        >
          {meta.label}
        </span>

        {source === 'db' ? (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,240,255,0.1)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.25)' }}
          >
            DB Override
          </span>
        ) : (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(160,160,176,0.08)',
              color: '#7070a0',
              border: '1px solid rgba(160,160,176,0.2)',
            }}
          >
            ENV Fallback
          </span>
        )}
      </div>

      {/* Model input */}
      <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Model</label>
      <input
        type="text"
        value={model}
        onChange={(e) => onChange(e.target.value)}
        className="w-full font-mono text-sm px-4 py-2.5 rounded-lg outline-none transition-colors"
        style={{
          background: 'rgba(0,0,0,0.35)',
          border: unknown
            ? '1px solid rgba(255,0,80,0.55)'
            : '1px solid rgba(228,26,255,0.2)',
          color: '#e0e0f0',
        }}
        placeholder="e.g. claude-sonnet-4-6"
        spellCheck={false}
        autoComplete="off"
      />

      {/* Unknown-prefix warning */}
      {unknown && (
        <p className="text-xs mt-1.5" style={{ color: '#ff0080' }}>
          Unknown provider prefix — expected <code className="font-mono">claude-</code> or <code className="font-mono">gpt-</code>
        </p>
      )}

      {/* Suggested model chips */}
      <div className="mt-4">
        <p className="text-xs text-text-muted mb-2">Quick fill:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_MODELS.map((s) => (
            <button
              key={s}
              onClick={() => onChange(s)}
              className="font-mono text-xs px-2.5 py-1 rounded-md transition-all duration-100"
              style={{
                background: model === s ? 'rgba(228,26,255,0.15)' : 'rgba(255,255,255,0.04)',
                border: model === s ? '1px solid rgba(228,26,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
                color: model === s ? '#e41aff' : '#8080a0',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminConfigPage() {
  const [models, setModels] = useState<Record<Tier, string>>({
    FREE: '',
    PRO: '',
    PREMIUM: '',
  });
  const [sources, setSources] = useState<Record<Tier, 'db' | 'env'>>({
    FREE: 'env',
    PRO: 'env',
    PREMIUM: 'env',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch current config on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminGet<ModelsResponse>('/config/models');
        setModels({
          FREE: data.FREE.model,
          PRO: data.PRO.model,
          PREMIUM: data.PREMIUM.model,
        });
        setSources({
          FREE: data.FREE.source,
          PRO: data.PRO.source,
          PREMIUM: data.PREMIUM.source,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load model config');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleChange(tier: Tier, value: string) {
    setModels((prev) => ({ ...prev, [tier]: value }));
    // Clear messages when user edits
    setSuccessMsg(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminPut('/config/models', {
        FREE: models.FREE,
        PRO: models.PRO,
        PREMIUM: models.PREMIUM,
      });
      setSuccessMsg('Changes saved! LLM service reloaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen font-display p-6 md:p-10" style={{ backgroundColor: '#0D0010' }}>
      {/* Header */}
      <div className="mb-4">
        <h1
          className="text-4xl font-bold mb-2"
          style={{
            background: 'linear-gradient(135deg, #e41aff, #00f0ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Model Config
        </h1>
        <p className="text-text-secondary text-sm max-w-xl">
          Configure the LLM model for each subscription tier. Changes take effect immediately (hot-reload).
        </p>
      </div>

      {/* Info note */}
      <div
        className="mb-8 rounded-[12px] px-4 py-3 flex items-start gap-3 max-w-xl"
        style={{
          background: 'rgba(0,240,255,0.06)',
          border: '1px solid rgba(0,240,255,0.2)',
        }}
      >
        <span style={{ color: '#00f0ff', fontSize: 16, marginTop: 1 }}>i</span>
        <p className="text-xs leading-relaxed" style={{ color: '#80c8d0' }}>
          Source <strong style={{ color: '#00f0ff' }}>&apos;db&apos;</strong> = DB override active.{' '}
          Source <strong style={{ color: '#7a7a9a' }}>&apos;env&apos;</strong> = using environment variable fallback.
        </p>
      </div>

      {/* Loading */}
      {loading && <Spinner />}

      {/* Error on load */}
      {!loading && error && !saving && (
        <div
          className="rounded-[16px] p-5 mb-6 max-w-2xl"
          style={{ background: 'rgba(255,0,80,0.08)', border: '1px solid rgba(255,0,80,0.3)' }}
        >
          <p className="text-sm font-medium" style={{ color: '#ff0080' }}>
            Error: {error}
          </p>
        </div>
      )}

      {/* Tier cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 max-w-5xl">
          {TIERS.map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              model={models[tier]}
              source={sources[tier]}
              onChange={(val) => handleChange(tier, val)}
            />
          ))}
        </div>
      )}

      {/* Save button + feedback */}
      {!loading && (
        <div className="flex flex-col gap-3 max-w-5xl">
          {/* Save error (from save attempt) */}
          {error && saving === false && successMsg === null && (
            <div
              className="rounded-[12px] px-4 py-3"
              style={{ background: 'rgba(255,0,80,0.08)', border: '1px solid rgba(255,0,80,0.3)' }}
            >
              <p className="text-sm" style={{ color: '#ff0080' }}>
                Error: {error}
              </p>
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div
              className="rounded-[12px] px-4 py-3"
              style={{ background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.25)' }}
            >
              <p className="text-sm font-medium" style={{ color: '#00f0ff' }}>
                {successMsg}
              </p>
            </div>
          )}

          <div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 rounded-[12px] text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: saving
                  ? 'rgba(228,26,255,0.3)'
                  : 'linear-gradient(135deg, #e41aff, #00f0ff)',
                color: '#ffffff',
                boxShadow: saving ? 'none' : '0 0 20px rgba(228,26,255,0.35)',
              }}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                    style={{ borderTopColor: '#ffffff', borderRightColor: '#ffffff' }}
                  />
                  Saving…
                </span>
              ) : (
                'Save All Changes'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
