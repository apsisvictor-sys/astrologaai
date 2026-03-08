'use client';

import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getApiBaseUrl } from '@/lib/runtime-config';

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

export function ChatHistoryList() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const pathname = usePathname();

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

  const grouped = groupByDate(sessions);

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-3 mb-1">{group}</p>
          {items.map((s) => (
            <Link
              key={s.id}
              href={`/chat/${s.id}`}
              className={cn(
                'block px-3 py-2 rounded-xl text-sm truncate transition-all',
                pathname === `/chat/${s.id}`
                  ? 'bg-primary/10 text-white'
                  : 'text-text-muted hover:bg-white/5 hover:text-white'
              )}
            >
              {s.title || 'New conversation'}
            </Link>
          ))}
        </div>
      ))}
      {sessions.length === 0 && (
        <p className="text-xs text-text-muted px-3 italic">No conversations yet</p>
      )}
    </div>
  );
}
