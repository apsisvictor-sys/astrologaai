'use client';

import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getApiBaseUrl } from '@/lib/runtime-config';

const PINNED_KEY = 'astrologaai_pinned_chats';

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
}

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

function getPinnedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePinnedIds(ids: string[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

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
          active
            ? 'bg-primary/10 text-white'
            : 'text-text-muted hover:bg-white/5 hover:text-white'
        )}
      >
        {session.title || 'New conversation'}
      </Link>

      {/* Pin button — visible on hover or when already pinned */}
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

export function ChatHistoryList() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    setPinnedIds(getPinnedIds());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('astrologaai_access_token');
    if (!token) return;
    fetch(`${getApiBaseUrl()}/api/v1/chat/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setSessions(d.data?.sessions || []))
      .catch(() => {});
  }, [pathname]);

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
  );
}
