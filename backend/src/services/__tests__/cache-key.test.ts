/**
 * Tests for Position-Based Cache Key Generation
 * Verifies that charts with identical planetary positions get the same cache key
 */

import { generatePositionBasedCacheKey, NatalChart, PlanetPosition, HouseCusp } from '../astrology';

// Helper to create a minimal chart for testing
function createTestChart(
  planets: Partial<Record<string, { sign: string; degree: number }>>,
  rising?: { sign: string; degree: number },
  mc?: { sign: string; degree: number }
): NatalChart {
  const defaultPlanet = (name: string): PlanetPosition => ({
    name,
    sign: 'Aries',
    signBg: 'Овен',
    degree: 0,
    house: 1,
    retrograde: false,
    symbol: '',
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
    northNode: defaultPlanet('northNode'),
    southNode: defaultPlanet('southNode'),
    chiron: defaultPlanet('chiron'),
    houses: [],
    aspects: [],
    elements: { fire: 0, earth: 0, air: 0, water: 0 },
    modalities: { cardinal: 0, fixed: 0, mutable: 0 },
    calculatedAt: new Date().toISOString(),
    source: 'test',
  };

  // Add MC in house 10
  if (mc) {
    chart.houses = Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      sign: i === 9 ? mc.sign : 'Aries',
      signBg: i === 9 ? 'Овен' : 'Овен',
      degree: i === 9 ? mc.degree : 0,
    })) as HouseCusp[];
  } else {
    chart.houses = Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      sign: 'Aries',
      signBg: 'Овен',
      degree: 0,
    })) as HouseCusp[];
  }

  return chart as NatalChart;
}

describe('Position-Based Cache Key Generation', () => {
  test('should generate same key for charts with identical planetary positions', () => {
    // Two charts with same planetary positions but potentially different metadata
    const chart1 = createTestChart({
      sun: { sign: 'Capricorn', degree: 20.4 },
      moon: { sign: 'Leo', degree: 12.7 },
      mercury: { sign: 'Capricorn', degree: 5.2 },
      venus: { sign: 'Pisces', degree: 18.9 },
      mars: { sign: 'Aries', degree: 8.1 },
      jupiter: { sign: 'Leo', degree: 22.3 },
      saturn: { sign: 'Capricorn', degree: 15.6 },
      uranus: { sign: 'Capricorn', degree: 10.2 },
      neptune: { sign: 'Capricorn', degree: 18.4 },
      pluto: { sign: 'Sagittarius', degree: 10.8 },
    }, { sign: 'Scorpio', degree: 5.3 }, { sign: 'Leo', degree: 25.7 });

    const chart2 = createTestChart({
      sun: { sign: 'Capricorn', degree: 20.8 }, // Different decimal, should round to same
      moon: { sign: 'Leo', degree: 12.2 },
      mercury: { sign: 'Capricorn', degree: 5.7 },
      venus: { sign: 'Pisces', degree: 18.1 },
      mars: { sign: 'Aries', degree: 8.6 },
      jupiter: { sign: 'Leo', degree: 22.9 },
      saturn: { sign: 'Capricorn', degree: 15.1 },
      uranus: { sign: 'Capricorn', degree: 10.8 },
      neptune: { sign: 'Capricorn', degree: 18.9 },
      pluto: { sign: 'Sagittarius', degree: 10.2 },
    }, { sign: 'Scorpio', degree: 5.8 }, { sign: 'Leo', degree: 25.2 });

    const key1 = generatePositionBasedCacheKey(chart1);
    const key2 = generatePositionBasedCacheKey(chart2);

    console.log('Key 1:', key1);
    console.log('Key 2:', key2);

    expect(key1).toBe(key2);
    expect(key1).toContain('Sun:Cap20');
    expect(key1).toContain('Moon:Leo12');
    expect(key1).toContain('Asc:Sco5');
    expect(key1).toContain('MC:Leo25');
  });

  test('should generate different keys for charts with different planetary positions', () => {
    const chart1 = createTestChart({
      sun: { sign: 'Capricorn', degree: 20 },
      moon: { sign: 'Leo', degree: 12 },
    });

    const chart2 = createTestChart({
      sun: { sign: 'Aquarius', degree: 15 }, // Different sign
      moon: { sign: 'Leo', degree: 12 },
    });

    const key1 = generatePositionBasedCacheKey(chart1);
    const key2 = generatePositionBasedCacheKey(chart2);

    console.log('Key 1:', key1);
    console.log('Key 2:', key2);

    expect(key1).not.toBe(key2);
    expect(key1).toContain('Sun:Cap20');
    expect(key2).toContain('Sun:Aqu15');
  });

  test('should handle degree rounding correctly', () => {
    const chart1 = createTestChart({
      sun: { sign: 'Aries', degree: 15.4 }, // Should round to 15
    });

    const chart2 = createTestChart({
      sun: { sign: 'Aries', degree: 15.6 }, // Should round to 16
    });

    const key1 = generatePositionBasedCacheKey(chart1);
    const key2 = generatePositionBasedCacheKey(chart2);

    expect(key1).toContain('Sun:Ari15');
    expect(key2).toContain('Sun:Ari16');
    expect(key1).not.toBe(key2);
  });

  test('should include all major planets in cache key', () => {
    const chart = createTestChart({
      sun: { sign: 'Leo', degree: 10 },
      moon: { sign: 'Cancer', degree: 15 },
      mercury: { sign: 'Virgo', degree: 5 },
      venus: { sign: 'Libra', degree: 20 },
      mars: { sign: 'Scorpio', degree: 8 },
      jupiter: { sign: 'Sagittarius', degree: 12 },
      saturn: { sign: 'Capricorn', degree: 25 },
      uranus: { sign: 'Aquarius', degree: 3 },
      neptune: { sign: 'Pisces', degree: 18 },
      pluto: { sign: 'Aries', degree: 7 },
    });

    const key = generatePositionBasedCacheKey(chart);

    expect(key).toContain('Sun:Leo10');
    expect(key).toContain('Moon:Can15');
    expect(key).toContain('Mer:Vir5');
    expect(key).toContain('Ven:Lib20');
    expect(key).toContain('Mar:Sco8');
    expect(key).toContain('Jup:Sag12');
    expect(key).toContain('Sat:Cap25');
    expect(key).toContain('Ura:Aqu3');
    expect(key).toContain('Nep:Pis18');
    expect(key).toContain('Plu:Ari7');
  });

  test('should format key correctly with pipe separators', () => {
    const chart = createTestChart({
      sun: { sign: 'Capricorn', degree: 20 },
      moon: { sign: 'Leo', degree: 12 },
    });

    const key = generatePositionBasedCacheKey(chart);

    // Should start with chart_pos: prefix
    expect(key.startsWith('chart_pos:')).toBe(true);
    
    // Should use | as separator
    expect(key).toMatch(/\|/);
    
    // Should not have trailing or leading pipes
    const parts = key.split('|');
    parts.forEach((part: string) => {
      expect(part).not.toMatch(/^\|/);
      expect(part).not.toMatch(/\|$/);
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  console.log('Running position-based cache key tests...\n');
  
  // Simple test runner
  const tests = [
    {
      name: 'Same positions should generate same key',
      fn: () => {
        const chart1 = createTestChart({
          sun: { sign: 'Capricorn', degree: 20.4 },
          moon: { sign: 'Leo', degree: 12.7 },
        }, { sign: 'Scorpio', degree: 5.3 });

        const chart2 = createTestChart({
          sun: { sign: 'Capricorn', degree: 20.8 },
          moon: { sign: 'Leo', degree: 12.2 },
        }, { sign: 'Scorpio', degree: 5.8 });

        const key1 = generatePositionBasedCacheKey(chart1);
        const key2 = generatePositionBasedCacheKey(chart2);

        console.log('Chart 1 key:', key1);
        console.log('Chart 2 key:', key2);

        if (key1 !== key2) {
          throw new Error('Keys should be identical');
        }
        console.log('✓ PASS: Keys are identical\n');
      },
    },
    {
      name: 'Different positions should generate different keys',
      fn: () => {
        const chart1 = createTestChart({
          sun: { sign: 'Capricorn', degree: 20 },
        });

        const chart2 = createTestChart({
          sun: { sign: 'Aquarius', degree: 15 },
        });

        const key1 = generatePositionBasedCacheKey(chart1);
        const key2 = generatePositionBasedCacheKey(chart2);

        console.log('Chart 1 key:', key1);
        console.log('Chart 2 key:', key2);

        if (key1 === key2) {
          throw new Error('Keys should be different');
        }
        console.log('✓ PASS: Keys are different\n');
      },
    },
    {
      name: 'Degree rounding should work correctly',
      fn: () => {
        const chart1 = createTestChart({
          sun: { sign: 'Aries', degree: 15.4 },
        });

        const chart2 = createTestChart({
          sun: { sign: 'Aries', degree: 15.6 },
        });

        const key1 = generatePositionBasedCacheKey(chart1);
        const key2 = generatePositionBasedCacheKey(chart2);

        console.log('15.4 rounds to:', key1.match(/Sun:Ari(\d+)/)?.[1]);
        console.log('15.6 rounds to:', key2.match(/Sun:Ari(\d+)/)?.[1]);

        if (!key1.includes('Sun:Ari15') || !key2.includes('Sun:Ari16')) {
          throw new Error('Rounding not working correctly');
        }
        console.log('✓ PASS: Rounding works correctly\n');
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      console.log(`Test: ${test.name}`);
      test.fn();
      passed++;
    } catch (error: any) {
      console.log(`✗ FAIL: ${error.message}\n`);
      failed++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
