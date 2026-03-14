'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { Partner, partnersApi, PartnersAPIError } from '@/lib/partners-api';
import { PartnerCard } from './partner-card';
import { PartnerForm } from './partner-form';
import { UpgradeModal } from '@/components/shell/upgrade-modal';

const PARTNER_LIMITS: Record<string, number> = { FREE: 0, PRO: 0, PREMIUM: 10 };

export function PartnersPanel() {
  const { user } = useAuth();
  const router = useRouter();
  const tier = user?.tier ?? 'FREE';
  const language = (user?.language as 'bg' | 'en') ?? 'bg';
  const limit = PARTNER_LIMITS[tier] ?? 0;

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (tier !== 'PREMIUM') { setLoading(false); return; }
    fetchPartners();
  }, [tier]);

  async function fetchPartners() {
    setLoading(true);
    setError(null);
    try {
      const data = await partnersApi.list();
      setPartners(data);
    } catch (e) {
      setError(e instanceof PartnersAPIError ? e.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(partner: Partner) {
    if (!confirm('Remove this partner?')) return;
    try {
      await partnersApi.delete(partner.id);
      setPartners(prev => prev.filter(p => p.id !== partner.id));
    } catch (e) {
      alert(e instanceof PartnersAPIError ? e.message : 'Delete failed');
    }
  }

  function handleAddClick() {
    if (partners.length >= limit) { setShowUpgrade(true); return; }
    setEditing(null);
    setShowForm(true);
  }

  function handleFormSuccess(partner: Partner) {
    setShowForm(false);
    if (editing) {
      setPartners(prev => prev.map(p => p.id === partner.id ? partner : p));
    } else {
      setPartners(prev => [partner, ...prev]);
    }
    setEditing(null);
  }

  // ── FREE + PRO tier — locked, PREMIUM required ───────────────────────────

  if (tier !== 'PREMIUM') {
    return (
      <div className="relative min-h-[500px] rounded-2xl overflow-hidden">
        {/* Blurred preview content */}
        <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
          <PartnersPanelShell
            partners={MOCK_PARTNERS}
            loading={false}
            error={null}
            language={language}
            limit={2}
            onAdd={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </div>

        {/* Lock overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          style={{ background: 'linear-gradient(to bottom, rgba(13,0,16,0.55) 0%, rgba(13,0,16,0.92) 60%)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-sm"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(228,26,255,0.12)', border: '1px solid rgba(228,26,255,0.3)' }}
            >
              <span className="text-2xl">♡</span>
            </div>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block"
              style={{ background: 'rgba(228,26,255,0.15)', color: '#e41aff', border: '1px solid rgba(228,26,255,0.3)' }}
            >
              PREMIUM Feature
            </span>
            <h3 className="text-xl font-bold text-white mb-2">Relationship Compatibility</h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Discover the astrological dynamics behind your most important relationships. Add partners, explore synastry charts, and let the Oracle reveal what the stars say about your connection.
            </p>
            <button
              onClick={() => setShowUpgrade(true)}
              className="w-full py-3 px-6 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)' }}
            >
              Upgrade to PREMIUM
            </button>
          </motion.div>
        </div>

        <UpgradeModal isOpen={showUpgrade} feature="Relationship Compatibility" onClose={() => setShowUpgrade(false)} />
      </div>
    );
  }

  // ── PRO / PREMIUM panel ───────────────────────────────────────────────────

  return (
    <>
      <PartnersPanelShell
        partners={partners}
        loading={loading}
        error={error}
        language={language}
        limit={limit}
        onAdd={handleAddClick}
        onEdit={(p) => { setEditing(p); setShowForm(true); }}
        onDelete={handleDelete}
      />

      {/* Add / Edit form modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowForm(false); setEditing(null); }}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 28 }}
            >
              <PartnerForm
                partner={editing}
                onSuccess={handleFormSuccess}
                onCancel={() => { setShowForm(false); setEditing(null); }}
                language={language}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <UpgradeModal isOpen={showUpgrade} feature="Partners & Synastry" onClose={() => setShowUpgrade(false)} />
    </>
  );
}

// ── Inner shell (shared between real and mock/blurred) ─────────────────────

interface ShellProps {
  partners: Partner[];
  loading: boolean;
  error: string | null;
  language: 'bg' | 'en';
  limit: number;
  onAdd: () => void;
  onEdit: (p: Partner) => void;
  onDelete: (p: Partner) => void;
}

function PartnersPanelShell({ partners, loading, error, language, limit, onAdd, onEdit, onDelete }: ShellProps) {
  const atLimit = partners.length >= limit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Partners</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {partners.length}/{limit} partners
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)', color: '#fff' }}
        >
          <span>+</span> Add Partner
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      )}

      {/* Partner cards */}
      {!loading && partners.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <PartnerCard
                partner={p}
                onEdit={onEdit}
                onDelete={onDelete}
                language={language}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && partners.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-2xl"
            style={{ background: 'rgba(228,26,255,0.1)', border: '1px solid rgba(228,26,255,0.2)' }}
          >
            ♡
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No partners yet</h3>
          <p className="text-sm mb-6 max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Add a partner to explore synastry charts and compatibility insights.
          </p>
          <button
            onClick={onAdd}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)' }}
          >
            Add your first partner
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ── Mock data for FREE-tier blurred preview ───────────────────────────────

const MOCK_PARTNERS: Partner[] = [
  {
    id: 'mock-1',
    name: 'Maria',
    label: 'Romantic',
    relationshipType: 'romantic',
    birthData: { date: '1992-06-15', time: '14:30', location: 'Sofia, Bulgaria' },
    chartSummary: { sunSign: 'Gemini', moonSign: 'Scorpio', risingSign: 'Virgo' },
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    name: 'Alex',
    label: 'Friend',
    relationshipType: 'friend',
    birthData: { date: '1988-11-03', time: null, location: 'Plovdiv, Bulgaria' },
    chartSummary: { sunSign: 'Scorpio', moonSign: 'Aries', risingSign: 'Cancer' },
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
