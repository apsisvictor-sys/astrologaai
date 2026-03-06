import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { MarketingChat } from '@/components/marketing/marketing-chat';
import { Sparkles, Compass, Eye, ShieldCheck, Star, User, MessageCircle, Aperture, Fingerprint } from 'lucide-react';

const englishContent = {
  badge: 'The Next Evolution of AI Astrology',
  title: 'Consult',
  titleAccent: 'The Oracle',
  subtitle:
    'Reveal your cosmic blueprint. Powered by exact NASA-grade mathematical algorithms and contextual AI synthesis. Do not just read your daily horoscope—ask the universe directly.',
  featuresTitle: 'Cosmic Precision',
  featuresSubtitle: 'Unlike generic bots, The Oracle connects directly to Swiss Ephemeris data for millisecond-perfect planetary degrees.',
  values: [
    {
      icon: Compass,
      title: 'Mathematical Accuracy',
      text: 'Calculations derived directly from NASA Jet Propulsion Laboratory data streams, not generalized sun-sign logic.'
    },
    {
      icon: Eye,
      title: 'Ethereal Visualization',
      text: 'Your exact natal chart mapped via a custom SVG visualizer, uniquely generated and animated just for you.'
    },
    {
      icon: ShieldCheck,
      title: 'Absolute Privacy',
      text: 'Your cosmic coordinates and intimate questions are encrypted. Only you hold the key to your celestial blueprint.'
    }
  ]
};

// User requested forcing English for initial build on both locales
const copy = {
  bg: englishContent,
  en: englishContent
} as const;

export default function LandingPage({ params: { locale } }: { params: { locale: 'bg' | 'en' } }) {
  const c = copy[locale] ?? copy.bg;

  return (
    <main className="relative w-full overflow-hidden bg-background-deep font-sans text-text-primary selection:bg-primary/40 selection:text-white pb-32 min-h-screen">
      {/* Language Switcher Fixed Position */}
      <div className="absolute top-6 right-6 z-50">
        <LanguageSwitcher />
      </div>

      {/* Massive Neon Glowing Orbs (Void Prism / Deep Nebula Aesthetic) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Top left vibrant Fuchsia orb */}
        <div className="absolute -top-40 -left-20 w-[60vw] h-[60vw] bg-secondary blur-sphere pointer-events-none"></div>
        {/* Right side Sunrise Orange massive glow */}
        <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] bg-accent-orange blur-sphere pointer-events-none"></div>
        {/* Center floating deep Electric Purple */}
        <div className="absolute -bottom-40 left-[20%] w-[80vw] h-[80vw] bg-primary blur-sphere pointer-events-none animate-float"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-24 pb-16 text-center lg:pt-32">

        {/* Celestial Alert Pill */}
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/30 mb-8 animate-fade-in-up neon-glow-primary">
          <Sparkles className="w-5 h-5 text-secondary" />
          <span className="text-sm font-bold tracking-[0.2em] text-primary uppercase">{c.badge}</span>
        </div>

        <h1 className="text-6xl md:text-[6rem] font-display font-extrabold text-white tracking-tighter mb-8 animate-fade-in-up leading-none" style={{ animationDelay: '0.1s' }}>
          {c.title}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-blue">
            {c.titleAccent}
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-xl md:text-2xl text-text-secondary font-sans leading-relaxed mb-16 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {c.subtitle}
        </p>

        {/* The Hook: Embedded Chat Component */}
        <div className="animate-fade-in-up max-w-4xl mx-auto" style={{ animationDelay: '0.3s' }}>
          <div className="glass-panel p-2 shadow-panel">
            <MarketingChat />
          </div>
        </div>

        {/* Technology Features Section */}
        <div className="mt-48 text-left animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 uppercase tracking-tight">{c.featuresTitle}</h2>
            <p className="text-text-secondary text-xl max-w-2xl mx-auto">{c.featuresSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {c.values.map((val, idx) => {
              const glowHoverClasses = ['hover:scale-[1.02]', 'hover:scale-[1.02]', 'hover:scale-[1.02]'];
              const bgClasses = ['bg-primary/20', 'bg-secondary/20', 'bg-accent-orange/20'];
              const iconClasses = ['text-primary-light', 'text-secondary-light', 'text-accent-orange'];

              return (
                <div key={idx} className={`glass-panel p-10 transition-transform duration-500 transform ${glowHoverClasses[idx]}`}>
                  <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-10 ${bgClasses[idx]}`}>
                    <val.icon className={`w-8 h-8 ${iconClasses[idx]}`} />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white mb-4 tracking-tight">{val.title}</h3>
                  <p className="text-text-secondary leading-relaxed text-lg">{val.text}</p>
                </div>
              );
            })}
          </div>
        </div>
        {/* How It Works Section */}
        <div className="mt-48 text-left animate-fade-in-up">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 uppercase tracking-tight">How To Consult The Oracle</h2>
            <p className="text-text-secondary text-xl max-w-2xl mx-auto">Three steps to unlock your cosmic blueprint and begin navigating the universe.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-[80px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-primary/10 via-primary/30 to-accent-blue/10 z-0"></div>

            <div className="relative z-10 glass-panel p-10 flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full bg-background-deep border-4 border-primary shadow-glow flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20"></div>
                <Fingerprint className="w-8 h-8 text-primary-light" />
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">1. Provide Coordinates</h3>
              <p className="text-text-secondary">Enter your exact birth time and location. The Oracle encrypts this data to map your celestial origins instantly.</p>
            </div>

            <div className="relative z-10 glass-panel p-10 flex flex-col items-center text-center group mt-8 md:mt-0">
              <div className="w-20 h-20 rounded-full bg-background-deep border-4 border-secondary shadow-[0_0_15px_rgba(255,0,128,0.4)] flex items-center justify-center mb-8 relative">
                <Aperture className="w-8 h-8 text-secondary-light" />
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">2. Align Alignment</h3>
              <p className="text-text-secondary">Our engine calculates a highly precise, SVG-rendered holographic natal chart mapping every planetary aspect.</p>
            </div>

            <div className="relative z-10 glass-panel p-10 flex flex-col items-center text-center group mt-8 md:mt-0">
              <div className="w-20 h-20 rounded-full bg-background-deep border-4 border-accent-blue shadow-[0_0_15px_rgba(6,127,249,0.4)] flex items-center justify-center mb-8 relative">
                <MessageCircle className="w-8 h-8 text-accent-blue" />
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">3. Ask The Universe</h3>
              <p className="text-text-secondary">Converse directly with The Oracle regarding your chart, daily transits, and future path using natural language.</p>
            </div>
          </div>
        </div>

        {/* Testimonials from the Void */}
        <div className="mt-48 text-left animate-fade-in-up">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 uppercase tracking-tight">Echoes From The Void</h2>
            <p className="text-text-secondary text-xl max-w-2xl mx-auto">Hear from navigators who have already unlocked their cosmic blueprint.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-panel p-10 relative overflow-hidden group">
              <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-primary blur-[50px] opacity-10 group-hover:opacity-30 transition-opacity"></div>
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-xl text-white italic mb-8 relative z-10">"I've used every astrology app on the market, but The Oracle immediately pointed out a Venus-Neptune transit affecting my work that everyone else missed purely because the ephemeris calculations were so exact."</p>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-light" />
                </div>
                <div>
                  <h4 className="text-white font-bold">Elena R.</h4>
                  <p className="text-sm text-text-muted">The Navigator Tier</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-10 relative overflow-hidden group">
              <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-accent-blue blur-[50px] opacity-10 group-hover:opacity-30 transition-opacity"></div>
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-xl text-white italic mb-8 relative z-10">"The holographic SVG chart alone is worth the subscription. But being able to literally text questions about my chart and get hyper-specific, mathematically backed answers is next level."</p>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-accent-blue/20 border border-accent-blue/50 flex items-center justify-center">
                  <User className="w-6 h-6 text-accent-blue" />
                </div>
                <div>
                  <h4 className="text-white font-bold">Marcus T.</h4>
                  <p className="text-sm text-text-muted">The Oracle Tier</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA Footer */}
        <div className="mt-48 text-center animate-fade-in-up mb-24">
          <h2 className="text-5xl font-display font-bold text-white mb-8">Begin Your Journey</h2>
          <Link href="/register" className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-gradient-to-r from-primary to-accent-blue hover:shadow-[0_0_40px_rgba(228,26,255,0.6)] text-white font-bold text-xl transition-all duration-300 transform hover:scale-105">
            <Sparkles className="w-6 h-6" />
            Consult The Oracle Now
          </Link>
        </div>

      </div>
    </main>
  );
}
