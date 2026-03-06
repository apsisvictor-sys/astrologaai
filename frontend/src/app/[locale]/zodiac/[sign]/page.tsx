import { notFound } from 'next/navigation';
import { Sparkles, ArrowLeft, Sun, Moon, ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

const ZODIAC_DATA = {
    aries: { name: 'Aries', symbol: '♈', element: 'Fire', color: '#FF6B00', quality: 'Cardinal', ruler: 'Mars', keyword: 'I am' },
    taurus: { name: 'Taurus', symbol: '♉', element: 'Earth', color: '#10B981', quality: 'Fixed', ruler: 'Venus', keyword: 'I have' },
    gemini: { name: 'Gemini', symbol: '♊', element: 'Air', color: '#bc13fe', quality: 'Mutable', ruler: 'Mercury', keyword: 'I think' },
    cancer: { name: 'Cancer', symbol: '♋', element: 'Water', color: '#00f0ff', quality: 'Cardinal', ruler: 'Moon', keyword: 'I feel' },
    leo: { name: 'Leo', symbol: '♌', element: 'Fire', color: '#FF6B00', quality: 'Fixed', ruler: 'Sun', keyword: 'I will' },
    virgo: { name: 'Virgo', symbol: '♍', element: 'Earth', color: '#10B981', quality: 'Mutable', ruler: 'Mercury', keyword: 'I analyze' },
    libra: { name: 'Libra', symbol: '♎', element: 'Air', color: '#bc13fe', quality: 'Cardinal', ruler: 'Venus', keyword: 'I balance' },
    scorpio: { name: 'Scorpio', symbol: '♏', element: 'Water', color: '#00f0ff', quality: 'Fixed', ruler: 'Pluto/Mars', keyword: 'I desire' },
    sagittarius: { name: 'Sagittarius', symbol: '♐', element: 'Fire', color: '#FF6B00', quality: 'Mutable', ruler: 'Jupiter', keyword: 'I see' },
    capricorn: { name: 'Capricorn', symbol: '♑', element: 'Earth', color: '#10B981', quality: 'Cardinal', ruler: 'Saturn', keyword: 'I use' },
    aquarius: { name: 'Aquarius', symbol: '♒', element: 'Air', color: '#bc13fe', quality: 'Fixed', ruler: 'Uranus/Saturn', keyword: 'I know' },
    pisces: { name: 'Pisces', symbol: '♓', element: 'Water', color: '#00f0ff', quality: 'Mutable', ruler: 'Neptune/Jupiter', keyword: 'I believe' },
};

type SignKey = keyof typeof ZODIAC_DATA;

// Statically generate all 12 paths at build time
export function generateStaticParams() {
    return Object.keys(ZODIAC_DATA).map((sign) => ({
        sign: sign,
    }));
}

export default function SignPage({ params }: { params: { sign: string, locale: string } }) {
    const signKey = params.sign.toLowerCase() as SignKey;
    const signData = ZODIAC_DATA[signKey];

    if (!signData) {
        notFound();
    }

    return (
        <main className="relative min-h-screen pt-32 pb-24 overflow-hidden selection:bg-primary/40 text-slate-100">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div
                    className="blur-sphere w-[800px] h-[800px] top-[-30%] right-[-20%] opacity-20"
                    style={{ backgroundColor: signData.color }}
                ></div>
                <div className="blur-sphere w-[600px] h-[600px] bottom-[-10%] left-[-20%] bg-background-deep mix-blend-screen opacity-50"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">

                {/* Navigation */}
                <Link href="/zodiac" className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-12">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Cosmic Encyclopedia
                </Link>

                {/* Header Hero */}
                <div className="glass-panel p-12 md:p-16 mb-16 relative overflow-hidden text-center rounded-3xl border border-white/10" style={{ boxShadow: `0 0 40px ${signData.color}20` }}>
                    <div className="absolute inset-0 bg-background-deep opacity-40 z-[-1]"></div>

                    <div
                        className="w-32 h-32 mx-auto rounded-full border-2 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative"
                        style={{ borderColor: `${signData.color}80`, backgroundColor: `${signData.color}10` }}
                    >
                        <div
                            className="absolute inset-0 rounded-full animate-pulse-slow opacity-30 blur-xl"
                            style={{ backgroundColor: signData.color }}
                        ></div>
                        <span className="text-6xl" style={{ color: signData.color }}>{signData.symbol}</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 uppercase tracking-widest">{signData.name}</h1>
                    <p className="text-2xl font-mono tracking-[0.3em] font-bold mb-10" style={{ color: signData.color }}>
                        "{signData.keyword}"
                    </p>

                    <div className="flex flex-wrap justify-center gap-6 text-sm font-mono uppercase tracking-widest">
                        <div className="glass-panel px-6 py-3 border border-border-glass rounded-full flex items-center gap-2 text-text-secondary">
                            <Sun className="w-4 h-4 text-white" />
                            Element: <span className="text-white font-bold">{signData.element}</span>
                        </div>
                        <div className="glass-panel px-6 py-3 border border-border-glass rounded-full flex items-center gap-2 text-text-secondary">
                            <Moon className="w-4 h-4 text-white" />
                            Quality: <span className="text-white font-bold">{signData.quality}</span>
                        </div>
                        <div className="glass-panel px-6 py-3 border border-border-glass rounded-full flex items-center gap-2 text-text-secondary">
                            <Sparkles className="w-4 h-4 text-white" />
                            Ruler: <span className="text-white font-bold">{signData.ruler}</span>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="grid md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-8 animate-fade-in-up">
                        <h2 className="text-3xl font-display font-bold text-white border-b border-border-glass pb-4">The Oracle's Synthesis</h2>
                        <p className="text-text-secondary text-lg leading-relaxed">
                            Every sign represents a fundamental state of cosmic evolution. By analyzing exactly where {signData.name} lands in your personal 12 houses through Swiss Ephemeris data, The Oracle can calculate precisely how this energy manifests in your reality.
                        </p>
                        <p className="text-text-secondary text-lg leading-relaxed">
                            As a {signData.element} sign, its primary vibration relates to {signData.element === 'Fire' ? 'action, passion, and spiritual ignition.' : signData.element === 'Earth' ? 'stability, resourcefulness, and material actualization.' : signData.element === 'Air' ? 'intellect, communication, and social interconnection.' : 'emotion, intuition, and deep soul resonance.'}
                        </p>
                        <p className="text-text-secondary text-lg leading-relaxed">
                            However, knowing you have a {signData.name} Sun or Moon is only roughly 2% of the total holistic equation of your blueprint. True astrological guidance comes from mapping exact trigonometric angles (aspects) between {signData.name} and the other active forces present at your precise microsecond of birth.
                        </p>

                        <div className="glass-panel p-8 mt-12 border border-border-glass rounded-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundColor: signData.color }}></div>
                            <h3 className="text-2xl font-bold text-white mb-4 z-10 relative">Calculate Your {signData.name} Placements</h3>
                            <p className="text-text-secondary mb-6 z-10 relative">Allow The Oracle to scan your exact coordinates to see if {signData.name} rules your Ascendant, Midheaven, or any major stelliums.</p>
                            <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-background-deep font-bold hover:bg-gray-200 transition-colors z-10 relative">
                                Map My Blueprint <ArrowUpRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {/* SEO Sidebar */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-6">Explore the Zodiac</h3>
                        <div className="glass-panel p-6 flex flex-col gap-4">
                            {Object.values(ZODIAC_DATA).map((s) => (
                                <Link
                                    key={s.name}
                                    href={`/zodiac/${s.name.toLowerCase()}`}
                                    className={`flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:text-white transition-colors ${s.name === signData.name ? 'text-white font-bold' : 'text-text-muted'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span style={{ color: s.color }}>{s.symbol}</span>
                                        <span>{s.name}</span>
                                    </div>
                                    {s.name === signData.name && <Sparkles className="w-3 h-3" style={{ color: s.color }} />}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}
