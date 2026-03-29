'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { memoriesApi, OracleMemory } from '@/lib/api-client';
import { trackPremiumFeatureViewed } from '@/lib/analytics';
import { UpgradeModal } from '@/components/shell/upgrade-modal';

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'career',      icon: '◆', bg: 'rgba(228,26,255,0.08)',  label_bg: 'Кариера',   label_en: 'Career'      },
  { key: 'love',        icon: '♡', bg: 'rgba(255,0,128,0.08)',  label_bg: 'Любов',     label_en: 'Love'        },
  { key: 'health',      icon: '✦', bg: 'rgba(0,240,255,0.08)',  label_bg: 'Здраве',    label_en: 'Health'      },
  { key: 'fears',       icon: '◎', bg: 'rgba(255,165,0,0.08)',  label_bg: 'Страхове',  label_en: 'Fears'       },
  { key: 'growth',      icon: '△', bg: 'rgba(16,185,129,0.08)', label_bg: 'Растеж',    label_en: 'Growth'      },
  { key: 'high_impact', icon: '★', bg: 'rgba(255,215,0,0.08)',  label_bg: 'Приоритет', label_en: 'High Impact' },
  { key: 'other',       icon: '○', bg: 'rgba(255,255,255,0.05)', label_bg: 'Други',    label_en: 'Other'       },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

// ── Mock data for blurred teaser ──────────────────────────────────────────────

const MOCK_MEMORIES: OracleMemory[] = [
  { id: '1', content: 'Работи в сферата на маркетинга и е в процес на кариерна промяна', category: 'career', sourceDate: '2026-03-01', createdAt: '2026-03-01T00:00:00Z', lastRecalledAt: null },
  { id: '2', content: 'Има дългосрочна романтична връзка, която преминава през период на трансформация', category: 'love', sourceDate: '2026-03-05', createdAt: '2026-03-05T00:00:00Z', lastRecalledAt: null },
  { id: '3', content: 'Практикува медитация и йога за справяне със стреса', category: 'health', sourceDate: '2026-03-10', createdAt: '2026-03-10T00:00:00Z', lastRecalledAt: null },
  { id: '4', content: 'Изпитва страх от провал и перфекционизъм при нови проекти', category: 'fears', sourceDate: '2026-03-15', createdAt: '2026-03-15T00:00:00Z', lastRecalledAt: null },
];

// ── Colors ────────────────────────────────────────────────────────────────────

const C = {
  bg:        '#0D0010',
  surface:   'rgba(255,255,255,0.04)',
  border:    'rgba(228,26,255,0.15)',
  primary:   '#e41aff',
  grad:      'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
  text:      '#ffffff',
  muted:     'rgba(255,255,255,0.55)',
  faint:     'rgba(255,255,255,0.3)',
  error:     '#ef4444',
  success:   '#10b981',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MemoryCard({
  memory,
  locale,
  onDelete,
}: {
  memory: OracleMemory;
  locale: string;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex items-start justify-between gap-3 p-4 rounded-xl"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed" style={{ color: C.text }}>{memory.content}</p>
        <p className="text-xs mt-1.5" style={{ color: C.faint }}>
          {formatDate(memory.sourceDate, locale)}
        </p>
      </div>

      {confirming ? (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => onDelete(memory.id)}
            className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
            style={{ background: `${C.error}20`, color: C.error, border: `1px solid ${C.error}40` }}
          >
            {locale === 'bg' ? 'Потвърди' : 'Confirm'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: C.surface, color: C.muted }}
          >
            {locale === 'bg' ? 'Отказ' : 'Cancel'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
          style={{ background: `${C.error}15`, color: C.error }}
          title={locale === 'bg' ? 'Изтрий' : 'Delete'}
        >
          ×
        </button>
      )}
    </motion.div>
  );
}

function CategorySection({
  cat,
  memories,
  locale,
  onDelete,
}: {
  cat: typeof CATEGORIES[number];
  memories: OracleMemory[];
  locale: string;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const label = locale === 'bg' ? cat.label_bg : cat.label_en;

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 w-full mb-2 group"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ background: cat.bg, border: `1px solid ${C.border}` }}
        >
          {cat.icon}
        </div>
        <span className="text-sm font-semibold" style={{ color: C.text }}>{label}</span>
        <span className="text-xs ml-0.5" style={{ color: C.faint }}>({memories.length})</span>
        <span className="ml-auto text-xs transition-transform" style={{ color: C.faint, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pl-9">
              {memories.length === 0 ? (
                <p className="text-sm py-2" style={{ color: C.faint }}>
                  {locale === 'bg' ? 'Няма спомени в тази категория.' : 'No memories in this category.'}
                </p>
              ) : (
                <AnimatePresence mode="popLayout">
                  {memories.map(m => (
                    <MemoryCard key={m.id} memory={m} locale={locale} onDelete={onDelete} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Locked teaser (PRO + FREE) ────────────────────────────────────────────────

function LockedTeaser({ tier, locale }: { tier: string; locale: string }) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div className="relative min-h-[520px] rounded-2xl overflow-hidden">
      {/* Blurred mock preview */}
      <div style={{ filter: 'blur(7px)', pointerEvents: 'none', userSelect: 'none' }}>
        <div className="p-6 space-y-3">
          {MOCK_MEMORIES.map(m => {
            const cat = CATEGORIES.find(c => c.key === m.category)!;
            return (
              <div
                key={m.id}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: C.surface, border: `1px solid ${C.border}` }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: cat.bg }}>{cat.icon}</div>
                <div>
                  <p className="text-sm" style={{ color: C.text }}>{m.content}</p>
                  <p className="text-xs mt-1" style={{ color: C.faint }}>{formatDate(m.sourceDate, locale)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lock overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
        style={{ background: 'linear-gradient(to bottom, rgba(13,0,16,0.5) 0%, rgba(13,0,16,0.93) 55%)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-sm"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
            style={{ background: 'rgba(228,26,255,0.12)', border: '1px solid rgba(228,26,255,0.3)' }}
          >
            ◈
          </div>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block"
            style={{ background: 'rgba(228,26,255,0.15)', color: C.primary, border: '1px solid rgba(228,26,255,0.3)' }}
          >
            PREMIUM Feature
          </span>
          <h3 className="text-xl font-bold text-white mb-2 mt-3">Oracle Memory</h3>
          <p className="text-sm mb-6" style={{ color: C.muted }}>
            {locale === 'bg'
              ? 'Вашият астролог събира важни моменти от разговорите ви. Надградете до PREMIUM за да ги преглеждате и управлявате.'
              : 'Your astrologer collects key insights from your conversations. Upgrade to PREMIUM to view and manage your memories.'}
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="w-full py-3 px-6 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
            style={{ background: C.grad }}
          >
            {locale === 'bg' ? 'Надгради до PREMIUM' : 'Upgrade to PREMIUM'}
          </button>
        </motion.div>
      </div>

      <UpgradeModal isOpen={showUpgrade} feature="Oracle Memory" onClose={() => setShowUpgrade(false)} requiredTier="PREMIUM" />
    </div>
  );
}

// ── Main PREMIUM panel ────────────────────────────────────────────────────────

export function MemoriesPanel() {
  const { user } = useAuth();
  const locale = useLocale();
  const tier = user?.tier ?? 'FREE';

  const [memories, setMemories] = useState<OracleMemory[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingMemory, setTogglingMemory] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tier !== 'FREE') return;
    trackPremiumFeatureViewed({ feature: 'Oracle Memory' });
  }, [tier]);

  useEffect(() => {
    if (tier !== 'PREMIUM') { setLoading(false); return; }
    loadData();
  }, [tier]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, memoriesRes] = await Promise.all([
        memoriesApi.getSettings(),
        memoriesApi.list(),
      ]);
      setMemoryEnabled(settingsRes.data.memoryEnabled);
      setMemories(memoriesRes.data.memories);
    } catch {
      setError(locale === 'bg' ? 'Грешка при зареждане.' : 'Failed to load memories.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    setTogglingMemory(true);
    try {
      const res = await memoriesApi.setMemoryEnabled(!memoryEnabled);
      setMemoryEnabled(res.data.memoryEnabled);
    } catch {
      // revert is implicit — state unchanged
    } finally {
      setTogglingMemory(false);
    }
  }

  async function handleDeleteOne(id: string) {
    try {
      await memoriesApi.deleteOne(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch {
      alert(locale === 'bg' ? 'Грешка при изтриване.' : 'Delete failed.');
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      await memoriesApi.deleteAll();
      setMemories([]);
      setShowDeleteAllDialog(false);
    } catch {
      alert(locale === 'bg' ? 'Грешка при изтриване.' : 'Delete failed.');
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await memoriesApi.exportDownload();
    } catch {
      alert(locale === 'bg' ? 'Грешка при експорт.' : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  // ── Locked for PRO + FREE ─────────────────────────────────────────────────

  if (tier !== 'PREMIUM') {
    return (
      <div className="min-h-screen py-10 px-4" style={{ background: C.bg }}>
        <div className="max-w-2xl mx-auto">
          <PageHeader locale={locale} />
          <LockedTeaser tier={tier} locale={locale} />
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ background: C.grad }}
        />
      </div>
    );
  }

  // ── PREMIUM view ──────────────────────────────────────────────────────────

  const grouped = CATEGORIES.map(cat => ({
    cat,
    memories: memories.filter(m => m.category === cat.key),
  }));

  const hasMemories = memories.length > 0;

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: C.bg }}>
      <div className="max-w-2xl mx-auto">
        <PageHeader locale={locale} />

        {error && (
          <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: `${C.error}15`, border: `1px solid ${C.error}40`, color: C.error }}>
            {error}
          </div>
        )}

        {/* Toggle + bulk actions card */}
        <div className="mb-6 p-5 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          {/* Memory enable toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: C.text }}>
                {locale === 'bg' ? 'Събиране на спомени' : 'Memory collection'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                {locale === 'bg'
                  ? 'Oracle ще запомня важни неща от разговорите ви'
                  : 'Oracle will remember key insights from your conversations'}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={togglingMemory}
              className="relative w-12 h-6 rounded-full transition-all shrink-0 disabled:opacity-50"
              style={{
                background: memoryEnabled ? C.primary : 'rgba(255,255,255,0.15)',
                boxShadow: memoryEnabled ? `0 0 12px ${C.primary}60` : 'none',
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: memoryEnabled ? '26px' : '2px' }}
              />
            </button>
          </div>

          {hasMemories && (
            <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'rgba(228,26,255,0.1)', color: C.primary, border: `1px solid rgba(228,26,255,0.2)` }}
              >
                {exporting
                  ? (locale === 'bg' ? 'Изтегляне...' : 'Downloading...')
                  : (locale === 'bg' ? '↓ Експортирай всички' : '↓ Export all')}
              </button>
              <button
                onClick={() => setShowDeleteAllDialog(true)}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: `${C.error}10`, color: C.error, border: `1px solid ${C.error}30` }}
              >
                {locale === 'bg' ? '× Изтрий всички' : '× Delete all'}
              </button>
            </div>
          )}
        </div>

        {/* Empty state */}
        {!hasMemories ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
              style={{ background: 'rgba(228,26,255,0.08)', border: `1px solid ${C.border}` }}
            >
              ◈
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: C.text }}>
              {locale === 'bg' ? 'Все още няма спомени' : 'No memories yet'}
            </p>
            <p className="text-sm" style={{ color: C.muted }}>
              {locale === 'bg'
                ? 'Oracle ще започне да запомня след следващия ви разговор'
                : 'Oracle will start remembering after your next conversation'}
            </p>
          </motion.div>
        ) : (
          /* Category sections */
          <div>
            {grouped
              .filter(g => g.memories.length > 0)
              .map(({ cat, memories: catMemories }) => (
                <CategorySection
                  key={cat.key}
                  cat={cat}
                  memories={catMemories}
                  locale={locale}
                  onDelete={handleDeleteOne}
                />
              ))}
          </div>
        )}
      </div>

      {/* Delete all confirmation dialog */}
      <AnimatePresence>
        {showDeleteAllDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => !deletingAll && setShowDeleteAllDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-6 rounded-2xl z-50"
              style={{ background: '#150020', border: `1px solid ${C.border}` }}
            >
              <h3 className="text-lg font-bold mb-2" style={{ color: C.text }}>
                {locale === 'bg' ? 'Изтрий всички спомени?' : 'Delete all memories?'}
              </h3>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                {locale === 'bg'
                  ? 'Това ще изтрие всички спомени на Oracle за вас. Действието е необратимо.'
                  : 'This will permanently erase all Oracle memories about you. This cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteAllDialog(false)}
                  disabled={deletingAll}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: C.surface, color: C.text }}
                >
                  {locale === 'bg' ? 'Отказ' : 'Cancel'}
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: C.error, color: C.text }}
                >
                  {deletingAll
                    ? (locale === 'bg' ? 'Изтриване...' : 'Deleting...')
                    : (locale === 'bg' ? 'Изтрий всички' : 'Delete all')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────

function PageHeader({ locale }: { locale: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-1">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'rgba(228,26,255,0.12)', border: '1px solid rgba(228,26,255,0.25)' }}
        >
          ◈
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#ffffff' }}>
          Oracle Memory
        </h1>
      </div>
      <p className="text-sm ml-12" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {locale === 'bg' ? 'Вашият астролог ви помни' : 'Your astrologer remembers you'}
      </p>
    </div>
  );
}
