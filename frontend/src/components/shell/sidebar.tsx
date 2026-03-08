'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { ChatHistoryList } from './chat-history-list';
import { SidebarNav } from './sidebar-nav';
import { TierBadge } from './tier-badge';

interface SidebarProps {
  onLockedFeatureClick: (feature: string) => void;
}

export function Sidebar({ onLockedFeatureClick }: SidebarProps) {
  const { user } = useAuth();
  const tier = (user?.tier || 'FREE') as 'FREE' | 'PRO' | 'PREMIUM';

  return (
    <aside
      className="hidden md:flex flex-col w-[260px] h-screen fixed left-0 top-0 z-40"
      style={{
        background: 'linear-gradient(180deg, rgba(26,11,28,0.97) 0%, rgba(18,6,20,0.95) 100%)',
        backdropFilter: 'blur(16px)',
        boxShadow: '1px 0 40px rgba(0,0,0,0.5), 1px 0 0 rgba(228,26,255,0.04)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 shrink-0">
        <Link href="/chat" className="text-white font-bold text-lg tracking-tight">
          Astro<span className="gradient-text">Log</span>AI
        </Link>
      </div>

      {/* New Chat */}
      <div className="px-3 pb-2 shrink-0">
        <Link
          href="/chat"
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-text-muted hover:text-white transition-all text-sm group"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-base leading-none group-hover:text-primary transition-colors">+</span>
          New Chat
        </Link>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-hidden px-3 py-2">
        <ChatHistoryList />
      </div>

      {/* Bottom: nav + user */}
      <div className="px-3 pt-3 pb-5 shrink-0" style={{ borderTop: '1px solid rgba(228,26,255,0.08)' }}>
        <SidebarNav userTier={tier} onLockedClick={onLockedFeatureClick} />

        {/* User card */}
        <div
          className="mt-3 mx-1 rounded-2xl p-3 relative overflow-hidden"
          style={{
            background: 'rgba(228,26,255,0.04)',
            border: '1px solid rgba(228,26,255,0.10)',
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(228,26,255,0.25) 0%, transparent 70%)', filter: 'blur(12px)' }}
          />

          <div className="flex flex-col items-center gap-2 relative">
            {/* Avatar with gradient ring */}
            <div
              className="shrink-0 rounded-full p-[1.5px]"
              style={{ background: 'linear-gradient(135deg, #e41aff, #00f0ff)' }}
            >
              <div className="w-9 h-9 rounded-full bg-[#120614] flex items-center justify-center text-sm font-bold text-primary">
                {(user?.fullName || user?.email || '?').charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 min-w-0 w-full">
              <p className="text-xs text-white/90 font-medium truncate text-center w-full">
                {user?.fullName || user?.email}
              </p>
              <TierBadge tier={tier} showUpgrade={false} />
            </div>
          </div>

          {/* Upgrade link below, only for FREE */}
          {tier === 'FREE' && (
            <a
              href="/pricing"
              className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
              style={{
                background: 'rgba(228,26,255,0.08)',
                border: '1px solid rgba(228,26,255,0.15)',
              }}
            >
              <span style={{ background: 'linear-gradient(135deg, #e41aff, #00f0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ✦ Unlock full access
              </span>
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
