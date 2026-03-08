'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { checkIsAdmin } from '@/lib/admin-api';

const NAV_ITEMS = [
  { href: 'overview',  label: 'Overview',      icon: '◈' },
  { href: 'users',     label: 'Users',          icon: '◉' },
  { href: 'usage',     label: 'Usage & Cost',   icon: '◑' },
  { href: 'revenue',   label: 'Revenue',        icon: '◎' },
  { href: 'prompts',   label: 'Prompt Editor',  icon: '◈' },
  { href: 'config',    label: 'Model Config',   icon: '⬡' },
  { href: 'discounts', label: 'Discounts',      icon: '◇' },
  { href: 'referrals', label: 'Referrals',      icon: '◈' },
];

function EyeLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <ellipse cx="14" cy="14" rx="13" ry="9" stroke="url(#adminLogoGrad)" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="5" fill="url(#adminLogoGrad)" opacity="0.9" />
      <circle cx="15.5" cy="12.5" r="1.5" fill="white" opacity="0.6" />
      <defs>
        <linearGradient id="adminLogoGrad" x1="1" y1="14" x2="27" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff0080" />
          <stop offset="0.5" stopColor="#e41aff" />
          <stop offset="1" stopColor="#00f0ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Determine locale from pathname
  const locale = pathname.startsWith('/bg/') || pathname === '/bg' ? 'bg' : 'en';
  const adminBase = `/${locale}/admin`;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push(`/${locale}/login`);
      return;
    }
    checkIsAdmin().then((ok) => {
      if (!ok) {
        router.push(`/${locale}/dashboard`);
      } else {
        setIsAdmin(true);
        setAdminChecked(true);
      }
    });
  }, [isLoading, isAuthenticated, locale, router]);

  if (isLoading || !adminChecked) {
    return (
      <div className="min-h-screen bg-[#0D0010] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e41aff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // Active nav detection
  const activeSection = NAV_ITEMS.find((item) =>
    pathname.includes(`/admin/${item.href}`)
  )?.href || 'overview';

  return (
    <div className="min-h-screen bg-[#0D0010] flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 z-40 flex flex-col"
        style={{ background: 'rgba(13,0,16,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <EyeLogo />
          <div>
            <p className="font-display font-bold text-white text-sm leading-none">Oracle Admin</p>
            <p className="text-[10px] text-[#e41aff] tracking-widest uppercase mt-0.5">Control Center</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(`${adminBase}/${item.href}`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left"
                style={isActive ? {
                  background: 'rgba(228,26,255,0.12)',
                  color: '#e41aff',
                  boxShadow: 'inset 0 0 0 1px rgba(228,26,255,0.25)',
                } : {
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1 h-4 rounded-full bg-[#e41aff] shadow-[0_0_6px_#e41aff]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: admin email */}
        <div className="px-5 py-4 border-t border-white/5">
          <p className="text-[10px] text-[#64748B] uppercase tracking-widest mb-1">Signed in as</p>
          <p className="text-xs text-white/70 truncate">{user?.email}</p>
          <button
            onClick={signOut}
            className="mt-3 text-[11px] text-[#64748B] hover:text-[#e41aff] transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4"
          style={{ background: 'rgba(13,0,16,0.85)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-sm font-mono">
              /admin/{activeSection}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
              style={{ background: 'rgba(228,26,255,0.15)', color: '#e41aff', border: '1px solid rgba(228,26,255,0.3)' }}>
              ADMIN MODE
            </span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#ff0080,#e41aff)', color: 'white' }}>
              {(user?.email || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
