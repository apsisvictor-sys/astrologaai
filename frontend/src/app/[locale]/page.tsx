import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { MarketingChat } from '@/components/marketing/marketing-chat';
import { Sparkles, Compass, Eye, ShieldCheck } from 'lucide-react';

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

      </div>
    </main>
  );
}
