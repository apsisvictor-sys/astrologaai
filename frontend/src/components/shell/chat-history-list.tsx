'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { useAuth } from '@/lib/auth-context';

const PINNED_KEY = 'astrologaai_pinned_chats';

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
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

// ── Pinned helpers ────────────────────────────────────────────────────────────

function getPinnedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); }
  catch { return []; }
}

function savePinnedIds(ids: string[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

// ── Chat item ─────────────────────────────────────────────────────────────────

function ChatItem({ session, active, pinned, onTogglePin }: {
  session: ChatSession;
  active: boolean;
  pinned: boolean;
  onTogglePin: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        href={`/chat/${session.id}`}
        className={cn(
          'block px-3 py-2 rounded-xl text-sm truncate transition-all pr-8',
          active ? 'bg-primary/10 text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'
        )}
      >
        {session.title || 'New conversation'}
      </Link>
      {(hovered || pinned) && (
        <button
          onClick={(e) => { e.preventDefault(); onTogglePin(session.id); }}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 text-xs transition-colors',
            pinned ? 'opacity-70 hover:opacity-100' : 'opacity-40 hover:opacity-80'
          )}
          title={pinned ? 'Unpin' : 'Pin to top'}
          aria-label={pinned ? 'Unpin conversation' : 'Pin conversation to top'}
        >
          📌
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChatHistoryList() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
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

  useEffect(() => { setPinnedIds(getPinnedIds()); }, []);

  // Load all sessions
  useEffect(() => {
    const token = localStorage.getItem('astrologaai_access_token');
    if (!token) return;
    fetch(`${getApiBaseUrl()}/api/v1/chat/sessions`, {
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
        const token = localStorage.getItem('astrologaai_access_token');
        const res = await fetch(
          `${getApiBaseUrl()}/api/v1/chat/sessions?search=${encodeURIComponent(value.trim())}`,
          { headers: { Authorization: `Bearer ${token}` } }
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

  const togglePin = (id: string) => {
    const updated = pinnedIds.includes(id)
      ? pinnedIds.filter(p => p !== id)
      : [id, ...pinnedIds];
    setPinnedIds(updated);
    savePinnedIds(updated);
  };

  const pinned = sessions.filter(s => pinnedIds.includes(s.id));
  const unpinned = sessions.filter(s => !pinnedIds.includes(s.id));
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

        {/* Floating search results popover — anchored left-full of sidebar */}
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
            {/* Header */}
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

            {/* Results */}
            {!searchLoading && searchResults.length === 0 && (
              <p className="px-4 py-5 text-sm text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No chats found for "{searchQuery}"
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
                {/* Title row */}
                <p className="text-sm font-medium text-white/90 leading-snug mb-1 truncate">
                  <Highlight text={s.title || 'New conversation'} term={searchQuery} />
                </p>
                {/* Snippet row */}
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
                pinned
                onTogglePin={togglePin}
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
                pinned={false}
                onTogglePin={togglePin}
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
