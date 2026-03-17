'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { href: '/chat',     icon: '✦', label: 'Chat',      minTier: null      },
  { href: '/chart',    icon: '◉', label: 'My Chart',  minTier: null      },
  { href: '/forecast', icon: '◎', label: 'Forecast',  minTier: 'PRO'     },
  { href: '/partners', icon: '♡', label: 'Partners',  minTier: 'PREMIUM' },
  { href: '/settings', icon: '⚙', label: 'Settings',  minTier: null      },
] as const;

const TIER_ORDER = { FREE: 0, PRO: 1, PREMIUM: 2 };

interface SidebarNavProps {
  userTier: 'FREE' | 'PRO' | 'PREMIUM';
  onLockedClick: (label: string) => void;
}

export function SidebarNav({ userTier, onLockedClick }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isLocked = item.minTier !== null && TIER_ORDER[userTier] < TIER_ORDER[item.minTier as keyof typeof TIER_ORDER];
        const isActive = pathname.startsWith(item.href);

        if (isLocked) {
          return (
            <button
              key={item.href}
              onClick={() => onLockedClick(item.label)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.05] hover:shadow-[0_0_14px_rgba(228,26,255,0.08),inset_0_0_8px_rgba(228,26,255,0.03)] transition-all duration-200 w-full"
            >
              <span className="w-8 text-center opacity-40">{item.icon}</span>
              <span className="text-sm opacity-40">{item.label}</span>
              <Badge variant="pro" className="ml-auto">{item.minTier}</Badge>
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
              isActive
                ? 'text-white'
                : 'text-text-muted hover:text-white hover:bg-white/[0.05] hover:shadow-[0_0_14px_rgba(228,26,255,0.08),inset_0_0_8px_rgba(228,26,255,0.03)]'
            )}
            style={isActive ? {
              background: 'rgba(228,26,255,0.08)',
              boxShadow: '0 0 16px rgba(228,26,255,0.12), inset 0 0 12px rgba(228,26,255,0.04)',
              border: '1px solid rgba(228,26,255,0.12)',
            } : undefined}
          >
            <span className={cn('w-8 text-center', isActive && 'text-primary')}>{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
            {isActive && (
              <div className="ml-auto w-1 h-4 rounded-full bg-primary/60" style={{ boxShadow: '0 0 6px rgba(228,26,255,0.8)' }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
