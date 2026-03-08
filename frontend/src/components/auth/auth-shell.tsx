import { Link } from '@/i18n/navigation';

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background-deep flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Ambient blur spheres */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="blur-sphere w-[420px] h-[420px] bg-primary" style={{ top: '-120px', left: '-80px' }} />
        <div className="blur-sphere w-[360px] h-[360px] bg-accent-pink" style={{ bottom: '-100px', right: '-80px', opacity: 0.2 }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Logo */}
        <Link href="/" className="block text-center mb-8">
          <span className="text-white font-display font-bold text-xl tracking-tight">
            Astro<span className="gradient-text">Log</span>AI
          </span>
        </Link>

        {/* Card */}
        <div className="glass-panel p-8" style={{ boxShadow: '0 0 40px rgba(228,26,255,0.1)' }}>
          {children}
        </div>
      </div>
    </main>
  );
}
