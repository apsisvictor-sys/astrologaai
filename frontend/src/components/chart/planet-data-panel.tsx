'use client';

import type { BackendNatalChart } from '@/components/chart/natal-chart-adapter';

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
  northNode: '☊', chiron: '⚷',
};

const PLANET_NAMES_EN: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
  pluto: 'Pluto', northNode: 'N.Node', chiron: 'Chiron',
};

const PLANET_NAMES_BG: Record<string, string> = {
  sun: 'Слънце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун',
  pluto: 'Плутон', northNode: 'С.Въз.', chiron: 'Хирон',
};

const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const SIGN_BG: Record<string, string> = {
  Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнаци', Cancer: 'Рак',
  Leo: 'Лъв', Virgo: 'Дева', Libra: 'Везни', Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец', Capricorn: 'Козирог', Aquarius: 'Водолей', Pisces: 'Риби',
};

const SIGN_ELEMENT: Record<string, string> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};

const ELEMENT_COLOR: Record<string, string> = {
  fire: '#FBBF24',
  earth: '#10B981',
  air: '#A78BFA',
  water: '#00f0ff',
};

const PLANET_ORDER = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'northNode', 'chiron',
] as const;

// house index → angle label
const ANGLE_LABELS: { index: number; label: string }[] = [
  { index: 0, label: 'ASC' },
  { index: 9, label: 'MC' },
  { index: 6, label: 'DSC' },
  { index: 3, label: 'IC' },
];

interface PlanetDataPanelProps {
  rawChart: BackendNatalChart;
  language?: 'en' | 'bg';
}

export function PlanetDataPanel({ rawChart, language = 'en' }: PlanetDataPanelProps) {
  const isBg = language === 'bg';
  const elements = rawChart.elements ?? computeElements(rawChart);

  return (
    <div
      className="w-full h-full rounded-2xl p-5 flex flex-col gap-5 overflow-y-auto"
      style={{
        background: 'rgba(13,0,18,0.85)',
        border: '1px solid rgba(228,26,255,0.15)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'inset 0 0 40px rgba(228,26,255,0.03), 0 0 40px rgba(228,26,255,0.06)',
      }}
    >
      {/* Section 1: Planets */}
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(228,26,255,0.5)' }}
        >
          {isBg ? 'Планетарни позиции' : 'Planetary Positions'}
        </p>
        <div className="flex flex-col gap-0.5">
          {PLANET_ORDER.map(key => {
            const planet = (rawChart as any)[key];
            if (!planet) return null;
            const glyph = PLANET_GLYPHS[key];
            const name = isBg ? PLANET_NAMES_BG[key] : PLANET_NAMES_EN[key];
            const signGlyph = SIGN_GLYPHS[planet.sign] ?? '';
            const signName = isBg ? (SIGN_BG[planet.sign] ?? planet.sign) : planet.sign;
            let deg = Math.floor(planet.degree);
            let arcMin = Math.round((planet.degree - deg) * 60);
            if (arcMin >= 60) { deg++; arcMin = 0; }
            const elemColor = ELEMENT_COLOR[SIGN_ELEMENT[planet.sign]] ?? '#fff';

            return (
              <div
                key={key}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-default select-none"
                style={{ transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(228,26,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Planet glyph */}
                <span
                  className="w-5 text-center text-sm shrink-0"
                  style={{
                    color: elemColor,
                    filter: `drop-shadow(0 0 3px ${elemColor}60)`,
                  }}
                >
                  {glyph}
                </span>

                {/* Planet name */}
                <span
                  className="text-[11px] w-[58px] shrink-0 truncate"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {name}
                </span>

                {/* Sign glyph + name */}
                <span className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-[11px]" style={{ color: elemColor, opacity: 0.75 }}>
                    {signGlyph}
                  </span>
                  <span className="text-[11px] text-white truncate">{signName}</span>
                </span>

                {/* Degree */}
                <span
                  className="text-[11px] font-mono shrink-0 tabular-nums"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  {deg}°{String(arcMin).padStart(2, '0')}′
                </span>

                {/* Retrograde */}
                {planet.retrograde && (
                  <span
                    className="text-[10px] shrink-0 font-bold"
                    style={{
                      color: '#e41aff',
                      filter: 'drop-shadow(0 0 3px rgba(228,26,255,0.7))',
                    }}
                  >
                    ℞
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(228,26,255,0.1)' }} />

      {/* Section 2: Angles */}
      {rawChart.houses && rawChart.houses.length >= 10 && (
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(228,26,255,0.5)' }}
          >
            {isBg ? 'Ъгли' : 'Angles'}
          </p>
          <div className="flex flex-col gap-0.5">
            {ANGLE_LABELS.map(({ index, label }) => {
              const house = rawChart.houses[index];
              if (!house) return null;
              const signGlyph = SIGN_GLYPHS[house.sign] ?? '';
              const signName = isBg ? (SIGN_BG[house.sign] ?? house.sign) : house.sign;
              let deg = Math.floor(house.degree);
              let arcMin = Math.round((house.degree - deg) * 60);
              if (arcMin >= 60) { deg++; arcMin = 0; }
              const isMain = label === 'ASC' || label === 'MC';

              return (
                <div key={label} className="flex items-center gap-2 px-2 py-1.5">
                  <span
                    className="text-[11px] font-bold w-8 shrink-0 font-mono"
                    style={{
                      color: isMain ? '#00f0ff' : 'rgba(0,240,255,0.45)',
                      filter: isMain ? 'drop-shadow(0 0 3px rgba(0,240,255,0.5))' : 'none',
                    }}
                  >
                    {label}
                  </span>
                  <span className="flex items-center gap-1 flex-1 min-w-0">
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {signGlyph}
                    </span>
                    <span className="text-[11px] text-white truncate">{signName}</span>
                  </span>
                  <span
                    className="text-[11px] font-mono shrink-0 tabular-nums"
                    style={{ color: 'rgba(255,255,255,0.65)' }}
                  >
                    {deg}°{String(arcMin).padStart(2, '0')}′
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(228,26,255,0.1)' }} />

      {/* Section 3: Elements */}
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(228,26,255,0.5)' }}
        >
          {isBg ? 'Елементи' : 'Elements'}
        </p>
        <div className="flex flex-col gap-2">
          {(
            [
              { key: 'fire',  label: isBg ? 'Огън'    : 'Fire',  color: ELEMENT_COLOR.fire  },
              { key: 'earth', label: isBg ? 'Земя'    : 'Earth', color: ELEMENT_COLOR.earth },
              { key: 'air',   label: isBg ? 'Въздух'  : 'Air',   color: ELEMENT_COLOR.air   },
              { key: 'water', label: isBg ? 'Вода'    : 'Water', color: ELEMENT_COLOR.water },
            ] as const
          ).map(({ key, label, color }) => {
            const count = (elements as any)[key] as number ?? 0;
            const MAX_DOTS = 5;
            const filled = Math.min(count, MAX_DOTS);
            return (
              <div key={key} className="flex items-center gap-2">
                <span
                  className="text-[11px] w-[52px] shrink-0"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  {label}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: MAX_DOTS }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: i < filled ? color : 'rgba(255,255,255,0.07)',
                        boxShadow: i < filled ? `0 0 4px ${color}70` : 'none',
                        transition: 'background 0.2s',
                      }}
                    />
                  ))}
                </div>
                <span
                  className="text-[10px] font-mono ml-1"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Fallback: compute element counts from planet signs
function computeElements(
  chart: BackendNatalChart,
): { fire: number; earth: number; air: number; water: number } {
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  const keys = [
    'sun', 'moon', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  ] as const;
  for (const k of keys) {
    const p = (chart as any)[k];
    if (!p?.sign) continue;
    const el = SIGN_ELEMENT[p.sign as string];
    if (el in counts) (counts as Record<string, number>)[el]++;
  }
  return counts;
}
