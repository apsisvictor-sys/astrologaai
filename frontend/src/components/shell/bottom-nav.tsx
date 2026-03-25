'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const LEFT_TABS = [
  { href: '/chart',    icon: '✦', label: 'Chart',    minTier: null  },
  { href: '/best-days', icon: '☆', label: 'Best Days', minTier: null },
] as const;

const RIGHT_TABS = [
  { href: '/partners', icon: '♡', label: 'Partners', minTier: 'PRO' },
  { href: '/settings', icon: '⚙', label: 'Settings', minTier: null  },
] as const;

const TIER_ORDER = { FREE: 0, PRO: 1, PREMIUM: 2 };

export function BottomNav({ onLockedClick }: { onLockedClick: (f: string) => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const tier = (user?.tier || 'FREE') as 'FREE' | 'PRO' | 'PREMIUM';

  const renderTab = (tab: { href: string; icon: string; label: string; minTier: string | null }) => {
    const isLocked = tab.minTier !== null && TIER_ORDER[tier] < TIER_ORDER[tab.minTier as keyof typeof TIER_ORDER];
    const isActive = pathname.startsWith(tab.href);

    const inner = (
      <div className={cn(
        'flex flex-col items-center gap-1 py-3 transition-colors',
        isActive ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
      )}>
        <span className="text-lg leading-none">{tab.icon}</span>
        <span className="text-[10px] font-medium">{tab.label}</span>
        {isLocked && <span className="text-[8px] font-bold text-pro-gold">PRO</span>}
      </div>
    );

    return isLocked ? (
      <button key={tab.href} onClick={() => onLockedClick(tab.label)} className="flex-1">
        {inner}
      </button>
    ) : (
      <Link key={tab.href} href={tab.href} className="flex-1">
        {inner}
      </Link>
    );
  };

  const chatActive = pathname.startsWith('/chat');

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background-dark/95 backdrop-blur-xl flex items-end px-2 pb-6 pt-2"
      style={{ borderTop: '1px solid rgba(228,26,255,0.18)' }}
    >
      {/* Left tabs */}
      {LEFT_TABS.map(renderTab)}

      {/* Center elevated Chat button */}
      <div className="flex-1 flex flex-col items-center relative -top-5">
        <Link href="/chat">
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all',
              chatActive
                ? 'shadow-primary/50 scale-105'
                : 'shadow-primary/30'
            )}
            style={{
              background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)',
            }}
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </Link>
        <span className={cn('text-[10px] font-medium mt-1', chatActive ? 'text-primary' : 'text-text-muted')}>
          Chat
        </span>
      </div>

      {/* Right tabs */}
      {RIGHT_TABS.map(renderTab)}
    </nav>
  );
}
