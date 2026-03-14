'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet, adminPatch } from '@/lib/admin-api';
import { formatDate } from '@/lib/format';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tier = 'FREE' | 'PRO' | 'PREMIUM';

interface User {
  id: string;
  email: string;
  fullName: string;
  tier: Tier;
  createdAt: string;
  lastActive: string;
  queryCount: number;
  isSuspended: boolean;
  costEurCents: number;
  aboveThreshold: boolean;
}

interface Session {
  date: string;
  messageCount: number;
}

interface TierHistoryEntry {
  tier: Tier;
  changedAt: string;
}

interface UserDetail extends User {
  subscriptionHistory: TierHistoryEntry[];
  recentSessions: Session[];
  usage: {
    queryCount: number;
  };
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIERS: Tier[] = ['FREE', 'PRO', 'PREMIUM'];

const TIER_BADGE: Record<Tier, string> = {
  FREE: 'bg-gray-700 text-gray-300',
  PRO: 'bg-amber-800 text-amber-300',
  PREMIUM: 'bg-purple-900 text-purple-300',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—';
  return formatDate(iso);
}

function presetRange(days: number | 'today'): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (days === 'today') {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(end.getDate() - days);
  }
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TIER_BADGE[tier]}`}>
      {tier}
    </span>
  );
}

function HighCostBadge() {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-900/60 text-amber-300 border border-amber-500/30">
      High Cost
    </span>
  );
}

function fmtEur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

function StatusBadge({ suspended }: { suspended: boolean }) {
  if (suspended) {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-900 text-red-300">
        Suspended
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-green-400">
      <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
      Active
    </span>
  );
}

// ─── User Detail Modal ────────────────────────────────────────────────────────

interface UserDetailModalProps {
  userId: string;
  onClose: () => void;
}

function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminGet<UserDetail>(`/users/${userId}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? 'Failed to load user');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="glass-panel relative w-full max-w-2xl mx-4 p-8 overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-primary transition-colors text-2xl leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="text-xl font-display font-semibold gradient-text mb-6">User Detail</h2>

        {loading && <Spinner />}

        {error && (
          <div className="glass-panel p-4 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {detail && !loading && (
          <div className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted mb-1">Email</p>
                <p className="text-white font-medium break-all">{detail.email}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Full Name</p>
                <p className="text-white font-medium">{detail.fullName || '—'}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Tier</p>
                <TierBadge tier={detail.tier} />
              </div>
              <div>
                <p className="text-text-muted mb-1">Joined</p>
                <p className="text-white">{fmtDate(detail.createdAt)}</p>
              </div>
            </div>

            {/* Usage */}
            <div>
              <h3 className="text-sm font-semibold text-text-secondary mb-2">Usage</h3>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <p className="text-white">
                  Queries this month:{' '}
                  <span className="text-accent-cyan font-semibold">
                    {detail.usage?.queryCount ?? detail.queryCount}
                  </span>
                </p>
                <p className="text-white flex items-center gap-2">
                  LLM cost this month:{' '}
                  <span className={detail.aboveThreshold ? 'text-amber-300 font-semibold' : 'text-accent-cyan font-semibold'}>
                    {fmtEur(detail.costEurCents ?? 0)}
                  </span>
                  {detail.aboveThreshold && <HighCostBadge />}
                </p>
              </div>
            </div>

            {/* Recent Sessions */}
            <div>
              <h3 className="text-sm font-semibold text-text-secondary mb-2">
                Recent Sessions (last 5)
              </h3>
              {detail.recentSessions && detail.recentSessions.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-left border-b border-white/10">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recentSessions.slice(0, 5).map((s, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 text-white">{fmtDate(s.date)}</td>
                        <td className="py-2 text-accent-cyan">{s.messageCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-text-muted text-sm">No sessions found.</p>
              )}
            </div>

            {/* Tier History */}
            {detail.subscriptionHistory && detail.subscriptionHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-2">Tier History</h3>
                <ul className="space-y-1">
                  {detail.subscriptionHistory.map((h, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <TierBadge tier={h.tier} />
                      <span className="text-text-muted">{fmtDate(h.changedAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | Tier>('ALL');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [flaggedHighCost, setFlaggedHighCost] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tier action state per-user
  const [tierActionUser, setTierActionUser] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        search: debouncedSearch,
        tier: tierFilter === 'ALL' ? '' : tierFilter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(flaggedHighCost ? { flagged: 'highcost' } : {}),
      });
      const data = await adminGet<UsersResponse>(`/users?${params.toString()}`);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, tierFilter, dateRange, flaggedHighCost]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handlers
  function handlePreset(preset: 7 | 30 | 90 | 'today') {
    const range = presetRange(preset);
    setDateRange(range);
    setPage(1);
  }

  function handleViewUser(id: string) {
    setSelectedUserId(id);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setSelectedUserId(null);
  }

  async function handleSetTier(userId: string, tier: Tier) {
    setActionLoading(userId + '-tier');
    try {
      await adminPatch(`/users/${userId}/tier`, { tier });
      setTierActionUser(null);
      await fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update tier');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleSuspend(user: User) {
    setActionLoading(user.id + '-suspend');
    try {
      await adminPatch(`/users/${user.id}/suspend`, { suspended: !user.isSuspended });
      await fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update suspension');
    } finally {
      setActionLoading(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: '#0D0010' }}>
      {/* Page title */}
      <h1 className="text-3xl font-display font-bold gradient-text">Users</h1>

      {/* Filters */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-text-muted mb-1">Search</label>
            <input
              type="text"
              placeholder="Email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Tier filter */}
          <div className="min-w-[140px]">
            <label className="block text-xs text-text-muted mb-1">Tier</label>
            <select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value as 'ALL' | Tier); setPage(1); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="ALL">ALL</option>
              {TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="min-w-[150px]">
            <label className="block text-xs text-text-muted mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => { setDateRange((r) => ({ ...r, startDate: e.target.value })); setPage(1); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs text-text-muted mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => { setDateRange((r) => ({ ...r, endDate: e.target.value })); setPage(1); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Preset buttons */}
          <div className="flex gap-2">
            {([7, 30, 90, 'today'] as const).map((p) => (
              <button
                key={String(p)}
                onClick={() => handlePreset(p)}
                className="px-3 py-2 rounded-lg text-xs font-medium border border-white/10 text-text-secondary hover:border-primary/50 hover:text-primary transition-colors"
              >
                {p === 'today' ? 'Today' : `${p}d`}
              </button>
            ))}
            {(dateRange.startDate || dateRange.endDate) && (
              <button
                onClick={() => { setDateRange({ startDate: '', endDate: '' }); setPage(1); }}
                className="px-3 py-2 rounded-lg text-xs font-medium border border-white/10 text-text-muted hover:border-red-500/50 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* High Cost filter toggle */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => { setFlaggedHighCost(v => !v); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              flaggedHighCost
                ? 'bg-amber-900/40 border-amber-500/60 text-amber-300'
                : 'border-white/10 text-text-secondary hover:border-amber-500/40 hover:text-amber-400'
            }`}
          >
            <span>⚠</span>
            High Cost Users
          </button>
          <p className="text-xs text-text-muted">
            {loading ? 'Loading…' : `${total} user${total !== 1 ? 's' : ''} found`}
          </p>
        </div>
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
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Full Name</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Last Active</th>
                  <th className="px-4 py-3 font-medium">Queries</th>
                  <th className="px-4 py-3 font-medium">Cost (mo)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-text-muted">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isBusy = actionLoading?.startsWith(user.id);
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3 text-white max-w-[200px] truncate">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-white">{user.fullName || '—'}</td>
                        <td className="px-4 py-3">
                          <TierBadge tier={user.tier} />
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{fmtDate(user.createdAt)}</td>
                        <td className="px-4 py-3 text-text-secondary">{fmtDate(user.lastActive)}</td>
                        <td className="px-4 py-3 text-accent-cyan font-semibold">{user.queryCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={user.aboveThreshold ? 'text-amber-300 font-semibold' : 'text-text-secondary'}>
                              {fmtEur(user.costEurCents ?? 0)}
                            </span>
                            {user.aboveThreshold && <HighCostBadge />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge suspended={user.isSuspended} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* View */}
                            <button
                              onClick={() => handleViewUser(user.id)}
                              className="px-2 py-1 rounded text-xs border border-white/10 text-text-secondary hover:border-primary/50 hover:text-primary transition-colors"
                            >
                              View
                            </button>

                            {/* Set Tier */}
                            <div className="relative">
                              {tierActionUser === user.id ? (
                                <div className="flex items-center gap-1">
                                  <select
                                    autoFocus
                                    defaultValue={user.tier}
                                    onChange={(e) => handleSetTier(user.id, e.target.value as Tier)}
                                    onBlur={() => setTierActionUser(null)}
                                    className="bg-white/5 border border-white/10 rounded px-1 py-1 text-xs text-white focus:outline-none focus:border-primary/50"
                                  >
                                    {TIERS.map((t) => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setTierActionUser(user.id)}
                                  disabled={isBusy}
                                  className="px-2 py-1 rounded text-xs border border-white/10 text-text-secondary hover:border-amber-500/50 hover:text-amber-400 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading === user.id + '-tier' ? '…' : 'Set Tier'}
                                </button>
                              )}
                            </div>

                            {/* Suspend / Unsuspend */}
                            <button
                              onClick={() => handleToggleSuspend(user)}
                              disabled={isBusy}
                              className={`px-2 py-1 rounded text-xs border transition-colors disabled:opacity-50 ${
                                user.isSuspended
                                  ? 'border-green-500/30 text-green-400 hover:border-green-500/70'
                                  : 'border-red-500/30 text-red-400 hover:border-red-500/70'
                              }`}
                            >
                              {actionLoading === user.id + '-suspend'
                                ? '…'
                                : user.isSuspended
                                ? 'Unsuspend'
                                : 'Suspend'}
                            </button>
                          </div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-4 py-2 rounded-lg text-sm border border-white/10 text-text-secondary hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-sm text-text-muted">
            Page <span className="text-white font-semibold">{page}</span> of{' '}
            <span className="text-white font-semibold">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-4 py-2 rounded-lg text-sm border border-white/10 text-text-secondary hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* User Detail Modal */}
      {showModal && selectedUserId && (
        <UserDetailModal userId={selectedUserId} onClose={handleCloseModal} />
      )}
    </div>
  );
}
