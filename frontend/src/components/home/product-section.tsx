const features = [
  {
    icon: '🌌',
    title: 'Full Chart Context',
    description:
      'Every answer draws on your complete natal chart — 14 celestial bodies, all aspects, houses, and your chart ruler. Not just your Sun sign.',
  },
  {
    icon: '✦',
    title: 'Genuine Reasoning',
    description:
      'The Oracle synthesizes multiple chart factors the way a skilled human astrologer would — not a lookup table. It interprets. It connects. It reveals.',
  },
  {
    icon: '◎',
    title: '10 Astrological Tools',
    description:
      'Natal chart, live transits, solar return, progressions, synastry, composite, astrocartography, Venus return, lunar return, solar arc directions.',
  },
];

const steps = [
  { num: '1', title: 'Provide Coordinates', body: 'Enter your exact birth time and location. The Oracle maps your celestial origins instantly.' },
  { num: '2', title: 'Chart Calculated', body: 'Our engine calculates a precise natal chart — all 14 bodies, aspects, and house cusps.' },
  { num: '3', title: 'Ask The Universe', body: 'Converse with The Oracle about your chart, daily transits, and future path using natural language.' },
];

const testimonials = [
  {
    quote: "I've used every astrology app on the market, but The Oracle immediately pointed out a Venus-Neptune transit affecting my work that everyone else missed because the ephemeris calculations were so exact.",
    name: 'Elena R.',
    tier: 'The Navigator Tier',
  },
  {
    quote: 'The holographic SVG chart alone is worth the subscription. Being able to literally ask questions about my chart and get hyper-specific, mathematically backed answers is next level.',
    name: 'Marcus T.',
    tier: 'The Oracle Tier',
  },
];

export function ProductSection() {
  return (
    <>
      {/* Why The Oracle */}
      <section className="mt-32 max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-4">Why The Oracle</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Beyond generic AI astrology</h2>
          <p className="text-text-secondary max-w-xl mx-auto text-sm leading-relaxed">
            Free ChatGPT doesn't know your chart. The Oracle does — completely, deeply, always.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="glass-panel glass-panel-hover p-7 rounded-2xl">
              <div className="text-3xl mb-5">{f.icon}</div>
              <h3 className="text-base font-bold text-white mb-2 tracking-tight">{f.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mt-28 max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-4">Process</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">How To Consult The Oracle</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 relative">
          {/* Desktop connector line */}
          <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10" />
          {steps.map((s, i) => (
            <div key={i} className="glass-panel p-7 rounded-2xl flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center mb-5 text-primary font-bold text-sm">
                {s.num}
              </div>
              <h3 className="font-bold text-white mb-2 tracking-tight">{s.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mt-28 max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-4">Echoes From The Void</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">What navigators say</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="glass-panel glass-panel-hover p-7 rounded-2xl">
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, j) => (
                  <span key={j} className="text-accent-amber text-sm">★</span>
                ))}
              </div>
              <p className="text-text-secondary text-sm leading-relaxed italic mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <span className="text-xs text-primary">✦</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-text-muted text-xs">{t.tier}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
