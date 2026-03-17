'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';

export function PublicNav() {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5">
      <Link
        href={isAuthenticated ? '/dashboard' : '/'}
        className="text-white font-display font-bold text-lg tracking-tight"
      >
        Astro<span className="gradient-text">Log</span>AI
      </Link>
      <div className="hidden sm:flex items-center gap-8">
        <Link href="/features" className="text-sm text-text-muted hover:text-white transition-colors">
          Features
        </Link>
        <Link href="/pricing" className="text-sm text-text-muted hover:text-white transition-colors">
          Pricing
        </Link>
        {isAuthenticated ? (
          <Link
            href="/dashboard"
            className="text-sm px-4 py-2 rounded-full text-white font-medium transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #e41aff, #7c3aed)', boxShadow: '0 0 16px rgba(228,26,255,0.3)' }}
          >
            ✦ Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-sm text-text-muted hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-all"
            >
              Start Free
            </Link>
          </>
        )}
      </div>
      {/* Mobile */}
      {isAuthenticated ? (
        <Link href="/dashboard" className="sm:hidden text-sm text-primary font-medium">
          Dashboard
        </Link>
      ) : (
        <Link href="/login" className="sm:hidden text-sm text-text-muted hover:text-white transition-colors">
          Sign in
        </Link>
      )}
    </nav>
  );
}
