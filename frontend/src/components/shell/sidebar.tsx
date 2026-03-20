'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { ChatHistoryList } from './chat-history-list';
import { SidebarNav } from './sidebar-nav';
import { StreakIndicator } from './streak-indicator';
import { TierBadge } from './tier-badge';

interface SidebarProps {
  onLockedFeatureClick: (feature: string) => void;
}

const MENU_ITEMS = [
  { icon: '👤', label: 'Profile', href: '/settings/profile' },
  { icon: '♊', label: 'My Birth Data', href: '/settings/birth-data' },
  { icon: '💳', label: 'Subscription', href: '/settings/subscription' },
  { icon: '⚙️', label: 'Settings', href: '/settings' },
];

export function Sidebar({ onLockedFeatureClick }: SidebarProps) {
  const { user, signOut } = useAuth();
  const tier = (user?.tier || 'FREE') as 'FREE' | 'PRO' | 'PREMIUM';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

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
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-3 py-2">
        <ChatHistoryList />
      </div>

      {/* Bottom: nav + user */}
      <div className="px-3 pt-3 pb-5 shrink-0" style={{ borderTop: '1px solid rgba(228,26,255,0.08)' }}>
        <SidebarNav userTier={tier} onLockedClick={onLockedFeatureClick} />

        {/* ENH-23: Oracle streak indicator */}
        <StreakIndicator />

        {/* User card wrapper — relative so popover can position above it */}
        <div ref={containerRef} className="mt-3 mx-1 relative">

          {/* Popover menu — floats to the right, outside the sidebar */}
          <div
            aria-hidden={!open}
            className={`absolute left-full bottom-0 ml-2 w-52 rounded-xl transition-all duration-200 ${
              open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
            style={{
              background: 'rgba(18,6,20,0.98)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(228,26,255,0.15)',
              boxShadow: '8px 0 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(228,26,255,0.08)',
              transformOrigin: 'bottom left',
            }}
          >
            <div className="p-1.5">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.href}
                  tabIndex={open ? 0 : -1}
                  onClick={() => { setOpen(false); router.push(item.href); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-white/80 hover:text-white transition-all"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(228,26,255,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span aria-hidden="true" className="text-base w-5 text-center leading-none">{item.icon}</span>
                  {item.label}
                </button>
              ))}

              {/* Divider + Sign out */}
              <div className="border-t border-white/10 mt-1 pt-1">
                <button
                  tabIndex={open ? 0 : -1}
                  onClick={() => { setOpen(false); signOut(); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-red-400/70 hover:text-red-400 transition-all"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(228,26,255,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span aria-hidden="true" className="text-base w-5 text-center leading-none">🚪</span>
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* User card */}
          <div
            className="rounded-2xl relative overflow-visible"
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

            {/* Clickable trigger — avatar + name only (no <a> inside <button>) */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="menu"
              className="w-full p-3 pb-2 cursor-pointer text-left relative"
            >
              <div className="flex flex-col items-center gap-2">
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
            </button>

            {/* Upgrade link — outside the button so <a> is not nested inside <button> */}
            {tier === 'FREE' && (
              <div className="px-3 pb-3">
                <Link
                  href="/pricing"
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                  style={{
                    background: 'rgba(228,26,255,0.08)',
                    border: '1px solid rgba(228,26,255,0.15)',
                  }}
                >
                  <span style={{ background: 'linear-gradient(135deg, #e41aff, #00f0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    ✦ Unlock full access
                  </span>
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </aside>
  );
}
