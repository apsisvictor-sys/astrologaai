import { Link } from '@/i18n/navigation';

export function PublicNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5">
      <div className="text-white font-display font-bold text-lg tracking-tight">
        Astro<span className="gradient-text">Log</span>AI
      </div>
      <div className="hidden sm:flex items-center gap-8">
        <Link href="/features" className="text-sm text-text-muted hover:text-white transition-colors">
          Features
        </Link>
        <Link href="/pricing" className="text-sm text-text-muted hover:text-white transition-colors">
          Pricing
        </Link>
        <Link href="/login" className="text-sm text-text-muted hover:text-white transition-colors">
          Sign in
        </Link>
        <Link
          href="/register"
          className="text-sm px-4 py-2 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-all"
        >
          Begin
        </Link>
      </div>
      {/* Mobile: just sign in */}
      <Link href="/login" className="sm:hidden text-sm text-text-muted hover:text-white transition-colors">
        Sign in
      </Link>
    </nav>
  );
}
