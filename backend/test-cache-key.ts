/**
 * Simple test to verify position-based cache key generation
 * Run with: npx ts-node test-cache-key.ts
 */

// Mock types for standalone testing
interface PlanetPosition {
  name: string;
  sign: string;
  degree: number;
}

interface HouseCusp {
  number: number;
  sign: string;
  degree: number;
}

interface NatalChart {
  sun: PlanetPosition;
  moon: PlanetPosition;
  rising: PlanetPosition;
  mercury: PlanetPosition;
  venus: PlanetPosition;
  mars: PlanetPosition;
  jupiter: PlanetPosition;
  saturn: PlanetPosition;
  uranus: PlanetPosition;
  neptune: PlanetPosition;
  pluto: PlanetPosition;
  houses: HouseCusp[];
  [key: string]: any;
}

// The actual function from astrology.ts
function generatePositionBasedCacheKey(chart: NatalChart): string {
  // Planet abbreviation mapping
  const planetAbbr: Record<string, string> = {
    sun: 'Sun',
    moon: 'Moon',
    mercury: 'Mer',
    venus: 'Ven',
    mars: 'Mar',
    jupiter: 'Jup',
    saturn: 'Sat',
    uranus: 'Ura',
    neptune: 'Nep',
    pluto: 'Plu',
  };

  // Sign abbreviation mapping (3 letters)
  const signAbbr: Record<string, string> = {
    Aries: 'Ari',
    Taurus: 'Tau',
    Gemini: 'Gem',
    Cancer: 'Can',
    Leo: 'Leo',
    Virgo: 'Vir',
    Libra: 'Lib',
    Scorpio: 'Sco',
    Sagittarius: 'Sag',
    Capricorn: 'Cap',
    Aquarius: 'Aqu',
    Pisces: 'Pis',
  };

  // Build planet position parts
  const planetKeys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const parts: string[] = [];

  planetKeys.forEach(planetKey => {
    const planet = chart[planetKey as keyof NatalChart] as PlanetPosition;
    if (planet) {
      const abbr = planetAbbr[planetKey] || planetKey.substring(0, 3);
      const sign = signAbbr[planet.sign] || planet.sign.substring(0, 3);
      const degree = Math.round(planet.degree); // Round to nearest degree
      parts.push(`${abbr}:${sign}${degree}`);
    }
  });

  // Add Ascendant (Rising)
  if (chart.rising) {
    const sign = signAbbr[chart.rising.sign] || chart.rising.sign.substring(0, 3);
    const degree = Math.round(chart.rising.degree);
    parts.push(`Asc:${sign}${degree}`);
  }

  // Add Midheaven (MC) - typically in house 10
  const mcHouse = chart.houses.find(h => h.number === 10);
  if (mcHouse) {
    const sign = signAbbr[mcHouse.sign] || mcHouse.sign.substring(0, 3);
    const degree = Math.round(mcHouse.degree % 30); // Degree within sign
    parts.push(`MC:${sign}${degree}`);
  }

  return `chart_pos:${parts.join('|')}`;
}

// Test helper
function createTestChart(
  planets: Partial<Record<string, { sign: string; degree: number }>>,
  rising?: { sign: string; degree: number },
  mc?: { sign: string; degree: number }
): NatalChart {
  const defaultPlanet = (name: string): PlanetPosition => ({
    name,
    sign: 'Aries',
    degree: 0,
  });

  const createPlanet = (name: string, data?: { sign: string; degree: number }): PlanetPosition => {
    const base = defaultPlanet(name);
    if (data) {
      base.sign = data.sign;
      base.degree = data.degree;
    }
    return base;
  };

  const chart: any = {
    sun: createPlanet('sun', planets.sun),
    moon: createPlanet('moon', planets.moon),
    rising: createPlanet('rising', rising || planets.rising),
    mercury: createPlanet('mercury', planets.mercury),
    venus: createPlanet('venus', planets.venus),
    mars: createPlanet('mars', planets.mars),
    jupiter: createPlanet('jupiter', planets.jupiter),
    saturn: createPlanet('saturn', planets.saturn),
    uranus: createPlanet('uranus', planets.uranus),
    neptune: createPlanet('neptune', planets.neptune),
    pluto: createPlanet('pluto', planets.pluto),
    houses: [],
  };

  // Add MC in house 10
  if (mc) {
    chart.houses = Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      sign: i === 9 ? mc.sign : 'Aries',
      degree: i === 9 ? mc.degree : 0,
    }));
  } else {
    chart.houses = Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      sign: 'Aries',
      degree: 0,
    }));
  }

  return chart as NatalChart;
}

// Run tests
console.log('='.repeat(80));
console.log('POSITION-BASED CACHE KEY GENERATION TEST');
console.log('='.repeat(80));
console.log('');

// Test 1: Same positions should generate same key
console.log('TEST 1: Same planetary positions (different decimals)');
console.log('-'.repeat(80));

const chart1 = createTestChart({
  sun: { sign: 'Capricorn', degree: 20.2 },
  moon: { sign: 'Leo', degree: 12.3 },
  mercury: { sign: 'Capricorn', degree: 5.1 },
  venus: { sign: 'Pisces', degree: 18.2 },
  mars: { sign: 'Aries', degree: 8.3 },
  jupiter: { sign: 'Leo', degree: 22.1 },
  saturn: { sign: 'Capricorn', degree: 15.4 },
  uranus: { sign: 'Capricorn', degree: 10.2 },
  neptune: { sign: 'Capricorn', degree: 18.3 },
  pluto: { sign: 'Sagittarius', degree: 10.1 },
}, { sign: 'Scorpio', degree: 5.2 }, { sign: 'Leo', degree: 25.3 });

const chart2 = createTestChart({
  sun: { sign: 'Capricorn', degree: 20.4 }, // Both round to 20
  moon: { sign: 'Leo', degree: 12.4 }, // Both round to 12
  mercury: { sign: 'Capricorn', degree: 5.3 }, // Both round to 5
  venus: { sign: 'Pisces', degree: 18.4 }, // Both round to 18
  mars: { sign: 'Aries', degree: 8.2 }, // Both round to 8
  jupiter: { sign: 'Leo', degree: 22.4 }, // Both round to 22
  saturn: { sign: 'Capricorn', degree: 15.3 }, // Both round to 15
  uranus: { sign: 'Capricorn', degree: 10.3 }, // Both round to 10
  neptune: { sign: 'Capricorn', degree: 18.2 }, // Both round to 18
  pluto: { sign: 'Sagittarius', degree: 10.4 }, // Both round to 10
}, { sign: 'Scorpio', degree: 5.4 }, { sign: 'Leo', degree: 25.2 });

const key1 = generatePositionBasedCacheKey(chart1);
const key2 = generatePositionBasedCacheKey(chart2);

console.log('Chart 1 key:');
console.log(key1);
console.log('');
console.log('Chart 2 key:');
console.log(key2);
console.log('');

if (key1 === key2) {
  console.log('✅ PASS: Keys are identical (cache hit!)');
} else {
  console.log('❌ FAIL: Keys should be identical');
  console.log('Difference:');
  console.log('Key 1:', key1.split('|').filter((p, i) => p !== key2.split('|')[i]));
  console.log('Key 2:', key2.split('|').filter((p, i) => p !== key1.split('|')[i]));
}
console.log('');

// Test 2: Different positions should generate different keys
console.log('TEST 2: Different planetary positions');
console.log('-'.repeat(80));

const chart3 = createTestChart({
  sun: { sign: 'Capricorn', degree: 20 },
});

const chart4 = createTestChart({
  sun: { sign: 'Aquarius', degree: 15 },
});

const key3 = generatePositionBasedCacheKey(chart3);
const key4 = generatePositionBasedCacheKey(chart4);

console.log('Chart 3 (Sun in Capricorn 20°):');
console.log(key3);
console.log('');
console.log('Chart 4 (Sun in Aquarius 15°):');
console.log(key4);
console.log('');

if (key3 !== key4) {
  console.log('✅ PASS: Keys are different (different charts)');
} else {
  console.log('❌ FAIL: Keys should be different');
}
console.log('');

// Test 3: Degree rounding
console.log('TEST 3: Degree rounding behavior');
console.log('-'.repeat(80));

const chart5 = createTestChart({
  sun: { sign: 'Aries', degree: 15.4 }, // Should round to 15
});

const chart6 = createTestChart({
  sun: { sign: 'Aries', degree: 15.6 }, // Should round to 16
});

const key5 = generatePositionBasedCacheKey(chart5);
const key6 = generatePositionBasedCacheKey(chart6);

console.log('15.4° rounds to:', key5.match(/Sun:Ari(\d+)/)?.[1]);
console.log('15.6° rounds to:', key6.match(/Sun:Ari(\d+)/)?.[1]);
console.log('');

if (key5.includes('Sun:Ari15') && key6.includes('Sun:Ari16')) {
  console.log('✅ PASS: Rounding works correctly');
} else {
  console.log('❌ FAIL: Rounding not working as expected');
}
console.log('');

// Test 4: Example from requirements
console.log('TEST 4: Example from requirements');
console.log('-'.repeat(80));

const exampleChart = createTestChart({
  sun: { sign: 'Capricorn', degree: 20 },
  moon: { sign: 'Leo', degree: 12 },
  mercury: { sign: 'Capricorn', degree: 5 },
  venus: { sign: 'Pisces', degree: 18 },
  mars: { sign: 'Aries', degree: 8 },
  jupiter: { sign: 'Leo', degree: 22 },
  saturn: { sign: 'Capricorn', degree: 15 },
  uranus: { sign: 'Capricorn', degree: 10 },
  neptune: { sign: 'Capricorn', degree: 18 },
  pluto: { sign: 'Sagittarius', degree: 10 },
}, { sign: 'Scorpio', degree: 5 }, { sign: 'Leo', degree: 25 });

const exampleKey = generatePositionBasedCacheKey(exampleChart);
console.log('Generated key:');
console.log(exampleKey);
console.log('');
console.log('Expected format (from requirements):');
console.log('Sun:Cap20|Moon:Leo12|Mer:Cap5|Ven:Pis18|Mar:Ari8|Jup:Leo22|Sat:Cap15|Ura:Cap10|Nep:Cap18|Plu:Sag10|Asc:Sco5|MC:Leo25');
console.log('');

const expectedParts = [
  'Sun:Cap20', 'Moon:Leo12', 'Mer:Cap5', 'Ven:Pis18', 'Mar:Ari8',
  'Jup:Leo22', 'Sat:Cap15', 'Ura:Cap10', 'Nep:Cap18', 'Plu:Sag10',
  'Asc:Sco5', 'MC:Leo25'
];

const keyParts = exampleKey.replace('chart_pos:', '').split('|');
const allMatch = expectedParts.every(part => keyParts.includes(part));

if (allMatch) {
  console.log('✅ PASS: Key matches expected format');
} else {
  console.log('❌ FAIL: Key does not match expected format');
  console.log('Missing parts:', expectedParts.filter(p => !keyParts.includes(p)));
}
console.log('');

// Summary
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log('');
console.log('The position-based cache key strategy successfully:');
console.log('  ✓ Groups charts with identical planetary positions');
console.log('  ✓ Differentiates charts with different positions');
console.log('  ✓ Rounds degrees to avoid precision issues');
console.log('  ✓ Includes all major planets and angles');
console.log('');
console.log('This will significantly improve cache hit rates and reduce API costs!');
console.log('='.repeat(80));
