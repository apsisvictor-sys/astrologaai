import Link from 'next/link';
import { MarketingChat } from '@/components/marketing/marketing-chat';
import { Sparkles, Compass, Eye, ShieldCheck } from 'lucide-react';

export default function RootPage() {
  return (
    <main className="relative w-full overflow-hidden selection:bg-primary-glow selection:text-white pb-32">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[150px] mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-orange/10 blur-[150px] mix-blend-screen"></div>
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-secondary/15 blur-[120px] mix-blend-screen animate-float"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center lg:pt-32">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-primary/30 backdrop-blur-md mb-8 animate-fade-in-up">
          <Sparkles className="w-4 h-4 text-primary-light" />
          <span className="text-sm font-medium text-primary-light">The Next Evolution of AI Astrology</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Consult <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-secondary-light">The Oracle</span>
        </h1>

        <p className="max-w-2xl mx-auto text-xl text-text-secondary font-sans leading-relaxed mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Reveal your cosmic blueprint. Powered by exact NASA-grade mathematical algorithms and contextual AI synthesis. Do not just read your daily horoscope—ask the universe directly.
        </p>

        {/* The Hook: Embedded Chat Component */}
        <MarketingChat />

        {/* Technology Features Section */}
        <div className="mt-40 text-left animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">Cosmic Precision</h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto">Unlike generic bots, The Oracle connects directly to Swiss Ephemeris data for millisecond-perfect planetary degrees.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-2xl hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <Compass className="text-primary-light w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Mathematical Accuracy</h3>
              <p className="text-text-secondary leading-relaxed">Calculations derived directly from NASA Jet Propulsion Laboratory data streams, not generalized sun-sign logic.</p>
            </div>

            <div className="glass-panel p-8 rounded-2xl hover:border-accent-orange/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-accent-orange/20 flex items-center justify-center mb-6">
                <Eye className="text-accent-orange w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Ethereal Visualization</h3>
              <p className="text-text-secondary leading-relaxed">Your exact natal chart mapped via a custom SVG visualizer, uniquely generated and animated just for you.</p>
            </div>

            <div className="glass-panel p-8 rounded-2xl hover:border-secondary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mb-6">
                <ShieldCheck className="text-secondary-light w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Absolute Privacy</h3>
              <p className="text-text-secondary leading-relaxed">Your cosmic coordinates and intimate questions are encrypted. Only you hold the key to your celestial blueprint.</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
