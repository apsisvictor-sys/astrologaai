import { Sparkles, Cpu, Orbit, Lock, ShieldCheck, Zap } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function FeaturesPage() {
    return (
        <main className="relative min-h-screen pt-32 pb-24 overflow-hidden selection:bg-primary/40 text-slate-100">
            {/* Background Orbs */}
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="blur-sphere w-[600px] h-[600px] top-[-20%] right-[-10%] bg-primary opacity-20"></div>
                <div className="blur-sphere w-[500px] h-[500px] bottom-[10%] left-[-20%] bg-accent-blue mix-blend-screen opacity-15"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                {/* Header Section */}
                <div className="text-center max-w-3xl mx-auto mb-20 animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6 neon-glow-primary">
                        <Sparkles className="w-4 h-4 text-primary-light" />
                        <span className="text-xs font-bold tracking-[0.2em] text-primary-light uppercase">Astral Intelligence</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-display font-extrabold text-white mb-6">
                        Beyond the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-blue">Horoscope</span>
                    </h1>
                    <p className="text-xl text-text-secondary leading-relaxed">
                        Most astrology apps use generalized sun-sign logic. The Oracle is different. We connect directly to NASA-grade ephemeris data to calculate the exact degree of every celestial body at the millisecond of your birth.
                    </p>
                </div>

                {/* Feature Grid */}
                <div className="grid md:grid-cols-2 gap-8 mb-24 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>

                    <div className="glass-panel p-10 group relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(228,26,255,0.15)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary blur-[50px] rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-8 shadow-glow">
                            <Orbit className="w-8 h-8 text-primary-light" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-white mb-4">Swiss Ephemeris Precision</h3>
                        <p className="text-text-secondary leading-relaxed mb-6">
                            Our core calculation engine utilizes the Swiss Ephemeris, the gold standard used by professional astrologers and astronomical institutions. This guarantees planet positions accurate to fractions of an arc-second.
                        </p>
                    </div>

                    <div className="glass-panel p-10 group relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,127,249,0.15)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue blur-[50px] rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                        <div className="w-16 h-16 rounded-2xl bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center mb-8 shadow-glow">
                            <Cpu className="w-8 h-8 text-accent-blue" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-white mb-4">Contextual AI Synthesis</h3>
                        <p className="text-text-secondary leading-relaxed mb-6">
                            Instead of reading from a generic database of interpretations, our LLM engine synthesizes your entire natal chart holographically. It understands the complex interplay between aspects, houses, and transits simultaneously.
                        </p>
                    </div>

                    <div className="glass-panel p-10 group relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,0,128,0.15)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff0080] blur-[50px] rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                        <div className="w-16 h-16 rounded-2xl bg-[#ff0080]/20 border border-[#ff0080]/30 flex items-center justify-center mb-8 shadow-glow">
                            <Zap className="w-8 h-8 text-[#ff0080]" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-white mb-4">Live Real-Time Transits</h3>
                        <p className="text-text-secondary leading-relaxed mb-6">
                            The universe is constantly moving, and so is our engine. The Oracle continuously calculates the live positions of the planets and overlays them against your natal chart to provide dynamically updating life forecasting.
                        </p>
                    </div>

                    <div className="glass-panel p-10 group relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white blur-[50px] rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
                        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-8 shadow-glow">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-white mb-4">Quantum Encrypted Privacy</h3>
                        <p className="text-text-secondary leading-relaxed mb-6">
                            Your birth data and personal queries are extremely sensitive. All interactions with The Oracle are strictly encrypted and anonymized. Your cosmic coordinates belong exclusively to you.
                        </p>
                    </div>

                </div>

                {/* Call to action */}
                <div className="glass-panel p-12 text-center rounded-3xl relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent-blue/10"></div>
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-6 relative z-10">
                        Ready to experience true astrological precision?
                    </h2>
                    <p className="text-text-secondary mb-8 relative z-10 max-w-2xl mx-auto">
                        Generate your high-fidelity natal chart and begin conversing with The Oracle completely free.
                    </p>
                    <div className="flex justify-center relative z-10">
                        <Link href="/register" className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-accent-blue hover:shadow-[0_0_30px_rgba(228,26,255,0.5)] text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-3">
                            <Sparkles className="w-5 h-5" />
                            Unlock Your Chart
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
