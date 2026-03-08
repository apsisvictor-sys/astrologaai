import type { NatalChartData, PlanetaryPosition } from '@/components/astrology/natal-chart-canvas';

// Sign index: 0=Aries, 1=Taurus, ... 11=Pisces
const SIGN_INDEX: Record<string, number> = {
  Aries: 0, Taurus: 1, Gemini: 2, Cancer: 3,
  Leo: 4, Virgo: 5, Libra: 6, Scorpio: 7,
  Sagittarius: 8, Capricorn: 9, Aquarius: 10, Pisces: 11,
};

// Normalise a sign name to the index key (backend may use lowercase or short names)
function signIndex(sign: string): number {
  if (!sign) return 0;
  const cap = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase();
  // Handle "Sagittarius" vs "Saggitarius" etc.
  const key = Object.keys(SIGN_INDEX).find(
    (k) => k.toLowerCase() === cap.toLowerCase()
  ) || 'Aries';
  return SIGN_INDEX[key] ?? 0;
}

function toAbsoluteDegree(degree: number, sign: string): number {
  return signIndex(sign) * 30 + (degree % 30);
}

interface BackendPlanet {
  name?: string;
  sign: string;
  degree: number;
  retrograde?: boolean;
  house?: number;
}

interface BackendHouseCusp {
  number?: number;
  sign: string;
  degree: number;
}

export interface BackendNatalChart {
  sun: BackendPlanet;
  moon: BackendPlanet;
  rising?: BackendPlanet;
  ascendant?: BackendPlanet;
  mercury?: BackendPlanet;
  venus?: BackendPlanet;
  mars?: BackendPlanet;
  jupiter?: BackendPlanet;
  saturn?: BackendPlanet;
  uranus?: BackendPlanet;
  neptune?: BackendPlanet;
  pluto?: BackendPlanet;
  northNode?: BackendPlanet;
  southNode?: BackendPlanet;
  chiron?: BackendPlanet;
  lilith?: BackendPlanet;
  houses: BackendHouseCusp[];
  aspects?: Array<{
    planet1: string;
    planet2: string;
    aspect: string;
    orb: number;
    nature?: string;
  }>;
  elements?: { fire: number; earth: number; air: number; water: number };
}

export function adaptNatalChart(chart: BackendNatalChart): NatalChartData {
  const planets: PlanetaryPosition[] = [];

  const addPlanet = (name: string, planet: BackendPlanet | undefined) => {
    if (!planet) return;
    planets.push({
      name,
      degree: toAbsoluteDegree(planet.degree, planet.sign),
      sign: planet.sign,
      retrograde: planet.retrograde,
    });
  };

  addPlanet('Sun', chart.sun);
  addPlanet('Moon', chart.moon);
  addPlanet('Mercury', chart.mercury);
  addPlanet('Venus', chart.venus);
  addPlanet('Mars', chart.mars);
  addPlanet('Jupiter', chart.jupiter);
  addPlanet('Saturn', chart.saturn);
  addPlanet('Uranus', chart.uranus);
  addPlanet('Neptune', chart.neptune);
  addPlanet('Pluto', chart.pluto);
  addPlanet('North Node', chart.northNode);
  addPlanet('Chiron', chart.chiron);

  const risingPlanet = chart.rising ?? chart.ascendant;

  const houses = (chart.houses || []).map((h) =>
    toAbsoluteDegree(h.degree, h.sign)
  );

  // Ensure 12 house cusps
  while (houses.length < 12) {
    houses.push((houses.length * 30) % 360);
  }

  const ascendant = risingPlanet
    ? toAbsoluteDegree(risingPlanet.degree, risingPlanet.sign)
    : houses[0] ?? 0;

  return { planets, houses, ascendant };
}
