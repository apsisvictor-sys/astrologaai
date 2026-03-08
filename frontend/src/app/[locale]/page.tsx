import { Link } from '@/i18n/navigation';
import { OracleHero } from '@/components/home/oracle-hero';
import { ProductSection } from '@/components/home/product-section';
import { PublicNav } from '@/components/home/public-nav';
import { PublicFooter } from '@/components/home/public-footer';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background-deep">
      {/* Ambient blur spheres — fixed, behind everything */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="blur-sphere w-[480px] h-[480px] bg-primary" style={{ top: '-140px', left: '-80px' }} />
        <div className="blur-sphere w-[360px] h-[360px] bg-accent-pink" style={{ top: '35%', right: '-80px', opacity: 0.25 }} />
        <div className="blur-sphere w-[500px] h-[500px] bg-primary" style={{ bottom: '-180px', left: '25%', opacity: 0.18 }} />
      </div>

      {/* Star field particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[
          { top: '8%', left: '12%', delay: '0s' },
          { top: '22%', left: '78%', delay: '0.8s' },
          { top: '45%', left: '5%', delay: '1.5s' },
          { top: '60%', left: '92%', delay: '0.3s' },
          { top: '80%', left: '35%', delay: '2.1s' },
          { top: '15%', left: '55%', delay: '1.2s' },
          { top: '70%', left: '65%', delay: '0.6s' },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse-slow"
            style={{ top: s.top, left: s.left, animationDelay: s.delay, opacity: 0.25 }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <PublicNav />

        {/* ── HERO ── */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">
          {/* Above-hero label + heading */}
          <div className="text-center mb-10 animate-fade-in">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-5">
              AI Astrology · Precision · Depth
            </p>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-5 leading-[1.1] tracking-tight">
              Consult{' '}
              <span className="gradient-text">The Oracle</span>
            </h1>
            <p className="text-text-secondary text-base md:text-lg max-w-md mx-auto leading-relaxed">
              Your complete natal chart. A personal AI astrologer who holds it all in mind.
            </p>
          </div>

          {/* Oracle hero widget — dormant → awakened */}
          <OracleHero />

          <p className="mt-8 text-xs text-text-muted animate-fade-in">
            No account needed to start ·{' '}
            <Link href="/register" className="text-primary hover:underline">
              Save your chart
            </Link>{' '}
            for free
          </p>
        </section>

        {/* ── BELOW THE FOLD ── */}
        <ProductSection />

        {/* ── FINAL CTA ── */}
        <section className="mt-24 text-center px-6 animate-fade-in">
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Begin your reading</h2>
          <p className="text-text-secondary text-sm mb-8">Join thousands who consult The Oracle daily.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 gradient-button text-white font-bold py-4 px-10 rounded-full text-base"
          >
            Create Free Account
          </Link>
          <p className="mt-4 text-xs text-text-muted">Free tier · No credit card required</p>
        </section>

        <PublicFooter />
      </div>
    </main>
  );
}
