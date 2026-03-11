import type { BackendNatalChart } from './natal-chart-adapter';
import type { NatalChart, PlanetPosition, HouseCusp, Aspect } from './circular-chart-wheel';

const SIGN_BG: Record<string, string> = {
  Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнаци', Cancer: 'Рак',
  Leo: 'Лъв', Virgo: 'Дева', Libra: 'Везни', Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец', Capricorn: 'Козирог', Aquarius: 'Водолей', Pisces: 'Риби',
};

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
  northNode: '☊', southNode: '☋', chiron: '⚷', lilith: '⚹', rising: '↑',
};

const SIGN_MODALITY: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
};

const SIGN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};

type RawPlanet = { sign: string; degree: number; retrograde?: boolean; house?: number };

function computeElements(chart: BackendNatalChart): { fire: number; earth: number; air: number; water: number } {
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const;
  for (const k of keys) {
    const p = chart[k];
    if (!p) continue;
    const el = SIGN_ELEMENT[p.sign];
    if (el) counts[el]++;
  }
  return counts;
}

function makePlanet(key: string, raw: RawPlanet | undefined): PlanetPosition {
  const fallback: PlanetPosition = {
    name: key, sign: 'Aries', signBg: 'Овен',
    degree: 0, house: 1, retrograde: false, symbol: PLANET_GLYPHS[key] ?? '●',
  };
  if (!raw) return fallback;
  return {
    name: key,
    sign: raw.sign,
    signBg: SIGN_BG[raw.sign] ?? raw.sign,
    degree: raw.degree,
    house: raw.house ?? 1,
    retrograde: raw.retrograde ?? false,
    symbol: PLANET_GLYPHS[key] ?? '●',
  };
}

export function adaptChartForWheel(raw: BackendNatalChart): NatalChart {
  const risingRaw = raw.rising ?? raw.ascendant;

  const houses: HouseCusp[] = (raw.houses ?? []).slice(0, 12).map((h, i) => ({
    number: i + 1,
    sign: h.sign,
    signBg: SIGN_BG[h.sign] ?? h.sign,
    degree: h.degree,
  }));
  while (houses.length < 12) {
    houses.push({ number: houses.length + 1, sign: 'Aries', signBg: 'Овен', degree: 0 });
  }

  const aspects: Aspect[] = (raw.aspects ?? []).map(a => ({
    planet1: a.planet1.toLowerCase(),
    planet2: a.planet2.toLowerCase(),
    aspect: a.aspect,
    aspectBg: a.aspect,
    orb: a.orb,
    nature: (['harmonious', 'challenging', 'neutral'].includes(a.nature ?? '')
      ? a.nature as 'harmonious' | 'challenging' | 'neutral'
      : 'neutral'),
  }));

  const corePlanets: PlanetPosition[] = [
    makePlanet('sun', raw.sun),
    makePlanet('moon', raw.moon),
    makePlanet('mercury', raw.mercury),
    makePlanet('venus', raw.venus),
    makePlanet('mars', raw.mars),
    makePlanet('jupiter', raw.jupiter),
    makePlanet('saturn', raw.saturn),
    makePlanet('uranus', raw.uranus),
    makePlanet('neptune', raw.neptune),
    makePlanet('pluto', raw.pluto),
  ];

  const modalities = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of corePlanets) {
    const mod = SIGN_MODALITY[p.sign];
    if (mod) modalities[mod]++;
  }

  const elements = raw.elements ?? computeElements(raw);

  return {
    sun: makePlanet('sun', raw.sun),
    moon: makePlanet('moon', raw.moon),
    rising: makePlanet('rising', risingRaw),
    mercury: makePlanet('mercury', raw.mercury),
    venus: makePlanet('venus', raw.venus),
    mars: makePlanet('mars', raw.mars),
    jupiter: makePlanet('jupiter', raw.jupiter),
    saturn: makePlanet('saturn', raw.saturn),
    uranus: makePlanet('uranus', raw.uranus),
    neptune: makePlanet('neptune', raw.neptune),
    pluto: makePlanet('pluto', raw.pluto),
    northNode: makePlanet('northNode', raw.northNode),
    southNode: makePlanet('southNode', raw.southNode),
    chiron: makePlanet('chiron', raw.chiron),
    lilith: raw.lilith ? makePlanet('lilith', raw.lilith) : undefined,
    houses,
    aspects,
    elements,
    modalities,
  };
}
