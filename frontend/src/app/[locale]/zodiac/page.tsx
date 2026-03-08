import { Link } from '@/i18n/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';

const ZODIAC_SIGNS = [
    { name: 'Aries', slug: 'aries', symbol: '♈', element: 'Fire', color: '#FF6B00', desc: 'The brave initiator. Bold, pioneering, and fiercely independent.' },
    { name: 'Taurus', slug: 'taurus', symbol: '♉', element: 'Earth', color: '#10B981', desc: 'The steadfast builder. Patient, reliable, and deeply connected to the sensory world.' },
    { name: 'Gemini', slug: 'gemini', symbol: '♊', element: 'Air', color: '#bc13fe', desc: 'The curious communicator. Versatile, expressive, and intellectually hungry.' },
    { name: 'Cancer', slug: 'cancer', symbol: '♋', element: 'Water', color: '#00f0ff', desc: 'The intuitive nurturer. Compassionate, protective, and deeply feeling.' },
    { name: 'Leo', slug: 'leo', symbol: '♌', element: 'Fire', color: '#FF6B00', desc: 'The radiant leader. Charismatic, creative, and passionately expressive.' },
    { name: 'Virgo', slug: 'virgo', symbol: '♍', element: 'Earth', color: '#10B981', desc: 'The analytical healer. Meticulous, practical, and devoted to service.' },
    { name: 'Libra', slug: 'libra', symbol: '♎', element: 'Air', color: '#bc13fe', desc: 'The harmonious diplomat. Relatable, aesthetic, and driven by justice.' },
    { name: 'Scorpio', slug: 'scorpio', symbol: '♏', element: 'Water', color: '#00f0ff', desc: 'The intense transformer. Magnetic, perceptive, and profoundly deep.' },
    { name: 'Sagittarius', slug: 'sagittarius', symbol: '♐', element: 'Fire', color: '#FF6B00', desc: 'The philosophical explorer. Optimistic, adventurous, and truth-seeking.' },
    { name: 'Capricorn', slug: 'capricorn', symbol: '♑', element: 'Earth', color: '#10B981', desc: 'The ambitious architect. Disciplined, responsible, and relentlessly determined.' },
    { name: 'Aquarius', slug: 'aquarius', symbol: '♒', element: 'Air', color: '#bc13fe', desc: 'The visionary innovator. Original, humanitarian, and fiercely unconventional.' },
    { name: 'Pisces', slug: 'pisces', symbol: '♓', element: 'Water', color: '#00f0ff', desc: 'The mystical dreamer. Empathetic, artistic, and spiritually boundless.' },
];

export default function ZodiacHubPage() {
    return (
        <main className="relative min-h-screen pt-32 pb-24 overflow-hidden selection:bg-primary/40 text-slate-100">
            {/* Background Orbs */}
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="blur-sphere w-[800px] h-[800px] top-[-30%] right-[-20%] bg-primary opacity-15"></div>
                <div className="blur-sphere w-[600px] h-[600px] bottom-[-10%] left-[-20%] bg-[#00f0ff] mix-blend-screen opacity-10"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                {/* Header Section */}
                <div className="text-center max-w-3xl mx-auto mb-20 animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6 neon-glow-primary">
                        <Sparkles className="w-4 h-4 text-primary-light" />
                        <span className="text-xs font-bold tracking-[0.2em] text-primary-light uppercase">Cosmic Encyclopedia</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-display font-extrabold text-white mb-6">
                        Insights from the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-blue">Void</span>
                    </h1>
                    <p className="text-xl text-text-secondary leading-relaxed">
                        Explore the 12 archetypes of the zodiac. Understand the fundamental cosmic forces that shape your ethereal blueprint before diving into The Oracle's exact mathematical synthesis.
                    </p>
                </div>

                {/* Zodiac Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    {ZODIAC_SIGNS.map((sign, idx) => (
                        <Link
                            key={sign.slug}
                            href={`/zodiac/${sign.slug}`}
                            className="glass-panel p-8 group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] flex flex-col items-center text-center cursor-pointer border border-border-glass hover:border-white/20"
                            style={{
                                boxShadow: `0 0 0 rgba(0,0,0,0)`
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = `0 0 30px ${sign.color}30`;
                                e.currentTarget.style.borderColor = `${sign.color}80`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = `0 0 0 rgba(0,0,0,0)`;
                                e.currentTarget.style.borderColor = `rgba(255,255,255,0.05)`;
                            }}
                        >
                            {/* Backglow effect */}
                            <div
                                className="absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
                                style={{ backgroundColor: sign.color }}
                            ></div>

                            <div className="w-20 h-20 rounded-full bg-background-deep border border-white/10 flex items-center justify-center mb-6 shadow-glow relative">
                                <div
                                    className="absolute inset-0 rounded-full animate-pulse-slow opacity-20"
                                    style={{ backgroundColor: sign.color }}
                                ></div>
                                <span className="text-4xl" style={{ color: sign.color }}>{sign.symbol}</span>
                            </div>

                            <h3 className="text-2xl font-display font-bold text-white mb-2">{sign.name}</h3>
                            <p
                                className="text-[10px] font-mono uppercase tracking-[0.2em] mb-4 px-3 py-1 rounded-full border"
                                style={{ color: sign.color, borderColor: `${sign.color}40`, backgroundColor: `${sign.color}10` }}
                            >
                                {sign.element}
                            </p>

                            <p className="text-text-secondary text-sm leading-relaxed mb-6 flex-grow">{sign.desc}</p>

                            <div
                                className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors duration-300"
                                style={{ color: sign.color }}
                            >
                                Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    ))}
                </div>

            </div>
        </main>
    );
}
