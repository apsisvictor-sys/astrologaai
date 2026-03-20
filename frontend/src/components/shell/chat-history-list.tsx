'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { useAuth } from '@/lib/auth-context';

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  isPinned?: boolean;
  matchSnippet?: string | null;
}

// ── Highlight — bolds matched term in text ───────────────────────────────────

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase()
          ? <strong key={i} className="text-white font-semibold">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ── Date grouping ─────────────────────────────────────────────────────────────

function groupByDate(sessions: ChatSession[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  return sessions.reduce((acc, s) => {
    const d = new Date(s.updatedAt).toDateString();
    const key = d === today ? 'Today' : d === yesterday ? 'Yesterday' : 'Older';
    acc[key] = [...(acc[key] || []), s];
    return acc;
  }, {} as Record<string, ChatSession[]>);
}

// ── Context menu ──────────────────────────────────────────────────────────────

interface MenuProps {
  session: ChatSession;
  onPin: () => void;
  onRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onShare: () => void;
  onClose: () => void;
}

function ContextMenu({ session, onPin, onRename, onArchive, onDelete, onShare, onClose }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const item = (label: string, onClick: () => void, red = false) => (
    <button
      key={label}
      onClick={(e) => { e.stopPropagation(); onClick(); onClose(); }}
      className={cn(
        'w-full text-left px-3 py-2 text-xs rounded-lg transition-colors',
        red ? 'text-red-400/80 hover:text-red-400' : 'text-white/70 hover:text-white'
      )}
      onMouseEnter={(e) => { e.currentTarget.style.background = red ? 'rgba(239,68,68,0.08)' : 'rgba(228,26,255,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-40 rounded-xl z-50 py-1"
      style={{
        background: 'rgba(18,6,20,0.98)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(228,26,255,0.18)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      {item(session.isPinned ? '📌 Unpin' : '📌 Pin', onPin)}
      {item('🔗 Share', onShare)}
      {item('✏️ Rename', onRename)}
      {item('📦 Archive', onArchive)}
      {item('🗑️ Delete', onDelete, true)}
    </div>
  );
}

// ── Chat item ─────────────────────────────────────────────────────────────────

function ChatItem({
  session, active, onUpdate, onDelete,
}: {
  session: ChatSession;
  active: boolean;
  onUpdate: (id: string, patch: Partial<ChatSession> & { deleted?: boolean }) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(session.title || '');
  const [shareToast, setShareToast] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const API = getApiBaseUrl();

  const getToken = () => localStorage.getItem('astrologaai_access_token');

  const patch = async (body: Record<string, unknown>) => {
    await fetch(`${API}/api/v1/chat/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const handlePin = async () => {
    await patch({ isPinned: !session.isPinned });
    onUpdate(session.id, { isPinned: !session.isPinned });
  };

  const handleArchive = async () => {
    await patch({ isArchived: true });
    onUpdate(session.id, { deleted: true }); // removes from list
  };

  const handleDelete = async () => {
    await fetch(`${API}/api/v1/chat/sessions/${session.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    onDelete(session.id);
  };

  const handleShare = async () => {
    const res = await fetch(`${API}/api/v1/chat/sessions/${session.id}/share`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (data.data?.shareUrl) {
      await navigator.clipboard.writeText(data.data.shareUrl).catch(() => {});
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const handleRenameSubmit = async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== session.title) {
      await patch({ title: trimmed });
      onUpdate(session.id, { title: trimmed });
    }
    setRenaming(false);
  };

  return (
    <div className="relative group" ref={menuRef}>
      {renaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(false); }}
          className="w-full px-3 py-2 rounded-xl text-sm text-white bg-transparent outline-none border border-primary/40"
        />
      ) : (
        <Link
          href={`/chat/${session.id}`}
          className={cn(
            'block px-3 py-2 rounded-xl text-sm truncate transition-all pr-8',
            active ? 'bg-primary/10 text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'
          )}
        >
          {session.isPinned && <span className="mr-1 opacity-50 text-[10px]">📌</span>}
          {session.title || 'New conversation'}
        </Link>
      )}

      {/* Share copied toast */}
      {shareToast && (
        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-primary whitespace-nowrap bg-black/80 px-2 py-0.5 rounded-md pointer-events-none">
          Link copied!
        </span>
      )}

      {/* ··· button */}
      {!renaming && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(v => !v); }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
          aria-label="Session options"
        >
          ···
        </button>
      )}

      {menuOpen && (
        <ContextMenu
          session={session}
          onPin={handlePin}
          onRename={() => { setRenaming(true); setRenameValue(session.title || ''); }}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onShare={handleShare}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChatHistoryList() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatSession[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const API = getApiBaseUrl();
  const getToken = () => localStorage.getItem('astrologaai_access_token');

  // Load all sessions
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API}/api/v1/chat/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setSessions(d.data?.sessions || []))
      .catch(() => {});
  }, [pathname, isAuthenticated]);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    function handleClick(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popoverOpen]);

  // Close popover on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setPopoverOpen(false); setSearchQuery(''); }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim()) { setSearchResults([]); setPopoverOpen(false); return; }
    setPopoverOpen(true);
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `${API}/api/v1/chat/sessions?search=${encodeURIComponent(value.trim())}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const data = await res.json();
        setSearchResults(data.data?.sessions || []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
  };

  const handleResultClick = (id: string) => {
    setPopoverOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    router.push(`/chat/${id}`);
  };

  // Optimistic update handler
  const handleUpdate = (id: string, patch: Partial<ChatSession> & { deleted?: boolean }) => {
    if (patch.deleted) {
      setSessions(prev => prev.filter(s => s.id !== id));
      return;
    }
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const handleDelete = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const pinned = sessions.filter(s => s.isPinned);
  const unpinned = sessions.filter(s => !s.isPinned);
  const grouped = groupByDate(unpinned);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* Search input + floating popover */}
      <div ref={searchWrapperRef} className="relative px-1 mb-2 shrink-0">
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            ⌕
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search chats…"
            className="w-full pl-7 pr-3 py-2 rounded-xl text-xs text-white/70 outline-none transition-colors placeholder-white/25"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${searchQuery ? 'rgba(228,26,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]); setPopoverOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-sm leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Floating search results popover */}
        {popoverOpen && searchQuery.trim() && (
          <div
            className="absolute top-0 left-full ml-2 w-[360px] rounded-2xl overflow-hidden z-50"
            style={{
              background: 'rgba(18,6,20,0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(228,26,255,0.2)',
              boxShadow: '8px 0 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(228,26,255,0.06)',
              maxHeight: '480px',
              overflowY: 'auto',
            }}
          >
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Search results
              </span>
              {searchLoading && (
                <span className="w-3 h-3 border border-white/20 border-t-primary/60 rounded-full animate-spin block" />
              )}
              {!searchLoading && (
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {searchResults.length} {searchResults.length === 1 ? 'chat' : 'chats'}
                </span>
              )}
            </div>

            {!searchLoading && searchResults.length === 0 && (
              <p className="px-4 py-5 text-sm text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No chats found for &ldquo;{searchQuery}&rdquo;
              </p>
            )}

            {searchResults.map((s) => (
              <button
                key={s.id}
                onClick={() => handleResultClick(s.id)}
                className="w-full text-left px-4 py-3.5 transition-all"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(228,26,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <p className="text-sm font-medium text-white/90 leading-snug mb-1 truncate">
                  <Highlight text={s.title || 'New conversation'} term={searchQuery} />
                </p>
                {s.matchSnippet && (
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <Highlight text={s.matchSnippet} term={searchQuery} />
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Pinned section */}
        {pinned.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-3 mb-1">Pinned</p>
            {pinned.map(s => (
              <ChatItem
                key={s.id}
                session={s}
                active={pathname === `/chat/${s.id}`}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
            <div className="mx-3 my-2 border-t border-white/5" />
          </div>
        )}

        {/* Grouped unpinned sessions */}
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-3 mb-1">{group}</p>
            {items.map(s => (
              <ChatItem
                key={s.id}
                session={s}
                active={pathname === `/chat/${s.id}`}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ))}

        {sessions.length === 0 && (
          <p className="text-xs text-text-muted px-3 italic">No conversations yet</p>
        )}
      </div>
    </div>
  );
}
