/**
 * Aspect Rendering Tests - US-14: Explore Chart Aspects
 * 
 * Unit tests for aspect rendering, filtering, and interpretation
 */

import {
  getAspectInterpretation,
  getAspectInfo,
  getPlanetName,
  getAspectNatureColor,
  getAspectColor,
  ASPECT_INFO,
  PLANET_NAMES,
  AspectType,
  AspectNature,
} from '../lib/aspect-interpretations';

// Mock chart data for testing
const mockAspects = [
  {
    planet1: 'sun',
    planet2: 'moon',
    aspect: 'trine',
    aspectBg: 'тригон',
    orb: 5.2,
    nature: 'harmonious' as AspectNature,
  },
  {
    planet1: 'venus',
    planet2: 'mars',
    aspect: 'square',
    aspectBg: 'квадрат',
    orb: 2.1,
    nature: 'challenging' as AspectNature,
  },
  {
    planet1: 'mercury',
    planet2: 'jupiter',
    aspect: 'conjunction',
    aspectBg: 'съвпад',
    orb: 3.5,
    nature: 'neutral' as AspectNature,
  },
  {
    planet1: 'sun',
    planet2: 'saturn',
    aspect: 'opposition',
    aspectBg: 'опозиция',
    orb: 1.8,
    nature: 'challenging' as AspectNature,
  },
  {
    planet1: 'moon',
    planet2: 'venus',
    aspect: 'sextile',
    aspectBg: 'секстил',
    orb: 4.0,
    nature: 'harmonious' as AspectNature,
  },
];

describe('Aspect Interpretations Library', () => {
  describe('getAspectInfo', () => {
    it('should return correct info for trine aspect', () => {
      const info = getAspectInfo('trine', 'en');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('Trine');
      expect(info?.angle).toBe(120);
      expect(info?.nature).toBe('harmonious');
    });

    it('should return Bulgarian info for trine aspect', () => {
      const info = getAspectInfo('trine', 'bg');
      expect(info).not.toBeNull();
      expect(info?.nameBg).toBe('Тригон');
      expect(info?.descriptionBg).toContain('хармонична');
    });

    it('should return correct info for square aspect', () => {
      const info = getAspectInfo('square', 'en');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('Square');
      expect(info?.angle).toBe(90);
      expect(info?.nature).toBe('challenging');
    });

    it('should return null for unknown aspect type', () => {
      const info = getAspectInfo('unknown', 'en');
      expect(info).toBeNull();
    });
  });

  describe('getPlanetName', () => {
    it('should return English planet names', () => {
      expect(getPlanetName('sun', 'en')).toBe('Sun');
      expect(getPlanetName('moon', 'en')).toBe('Moon');
      expect(getPlanetName('mercury', 'en')).toBe('Mercury');
    });

    it('should return Bulgarian planet names', () => {
      expect(getPlanetName('sun', 'bg')).toBe('Слънце');
      expect(getPlanetName('moon', 'bg')).toBe('Луна');
      expect(getPlanetName('mercury', 'bg')).toBe('Меркурий');
    });

    it('should return original string for unknown planet', () => {
      expect(getPlanetName('unknown', 'en')).toBe('unknown');
    });
  });

  describe('getAspectInterpretation', () => {
    it('should return interpretation for sun-moon trine in English', () => {
      const result = getAspectInterpretation('sun', 'moon', 'trine', 'en');
      expect(result).not.toBeNull();
      expect(result?.interpretation).toContain('harmony');
      expect(result?.keywords).toContain('harmony');
    });

    it('should return interpretation for sun-moon trine in Bulgarian', () => {
      const result = getAspectInterpretation('sun', 'moon', 'trine', 'bg');
      expect(result).not.toBeNull();
      expect(result?.interpretation).toContain('хармония');
      expect(result?.keywords).toContain('хармония');
    });

    it('should return interpretation regardless of planet order', () => {
      const result1 = getAspectInterpretation('sun', 'moon', 'trine', 'en');
      const result2 = getAspectInterpretation('moon', 'sun', 'trine', 'en');
      expect(result1).toEqual(result2);
    });

    it('should return null for unknown planet pair', () => {
      const result = getAspectInterpretation('unknown1', 'unknown2', 'trine', 'en');
      expect(result).toBeNull();
    });

    it('should return null for unknown aspect type', () => {
      const result = getAspectInterpretation('sun', 'moon', 'unknown' as AspectType, 'en');
      expect(result).toBeNull();
    });
  });

  describe('getAspectNatureColor', () => {
    it('should return green for harmonious aspects', () => {
      expect(getAspectNatureColor('harmonious')).toBe('#10B981');
    });

    it('should return red for challenging aspects', () => {
      expect(getAspectNatureColor('challenging')).toBe('#EF4444');
    });

    it('should return purple for neutral aspects', () => {
      expect(getAspectNatureColor('neutral')).toBe('#8B5CF6');
    });
  });

  describe('getAspectColor', () => {
    it('should return correct color for each aspect type', () => {
      expect(getAspectColor('conjunction')).toBe('#8B5CF6');
      expect(getAspectColor('sextile')).toBe('#10B981');
      expect(getAspectColor('square')).toBe('#EF4444');
      expect(getAspectColor('trine')).toBe('#06B6D4');
      expect(getAspectColor('opposition')).toBe('#EC4899');
      expect(getAspectColor('quincunx')).toBe('#F59E0B');
    });

    it('should return default color for unknown aspect type', () => {
      expect(getAspectColor('unknown')).toBe('#71717A');
    });
  });
});

describe('Aspect Filtering Logic', () => {
  // Helper function to filter aspects (simulating filter component behavior)
  const filterAspects = (
    aspects: typeof mockAspects,
    type: string,
    nature: string
  ) => {
    return aspects.filter((aspect) => {
      if (type !== 'all' && aspect.aspect.toLowerCase() !== type) {
        return false;
      }
      if (nature !== 'all' && aspect.nature !== nature) {
        return false;
      }
      return true;
    });
  };

  it('should return all aspects when no filters applied', () => {
    const filtered = filterAspects(mockAspects, 'all', 'all');
    expect(filtered).toHaveLength(5);
  });

  it('should filter by aspect type (trine)', () => {
    const filtered = filterAspects(mockAspects, 'trine', 'all');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].aspect).toBe('trine');
  });

  it('should filter by aspect type (square)', () => {
    const filtered = filterAspects(mockAspects, 'square', 'all');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].aspect).toBe('square');
  });

  it('should filter by nature (harmonious)', () => {
    const filtered = filterAspects(mockAspects, 'all', 'harmonious');
    expect(filtered).toHaveLength(2);
    filtered.forEach((aspect) => {
      expect(aspect.nature).toBe('harmonious');
    });
  });

  it('should filter by nature (challenging)', () => {
    const filtered = filterAspects(mockAspects, 'all', 'challenging');
    expect(filtered).toHaveLength(2);
    filtered.forEach((aspect) => {
      expect(aspect.nature).toBe('challenging');
    });
  });

  it('should filter by both type and nature', () => {
    const filtered = filterAspects(mockAspects, 'trine', 'harmonious');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].aspect).toBe('trine');
    expect(filtered[0].nature).toBe('harmonious');
  });

  it('should return empty array when no matches', () => {
    const filtered = filterAspects(mockAspects, 'sextile', 'challenging');
    expect(filtered).toHaveLength(0);
  });
});

describe('Aspect Statistics', () => {
  // Helper function to calculate aspect statistics
  const calculateStats = (aspects: typeof mockAspects) => {
    return {
      harmonious: aspects.filter((a) => a.nature === 'harmonious').length,
      challenging: aspects.filter((a) => a.nature === 'challenging').length,
      neutral: aspects.filter((a) => a.nature === 'neutral').length,
      total: aspects.length,
    };
  };

  it('should calculate correct statistics', () => {
    const stats = calculateStats(mockAspects);
    expect(stats.harmonious).toBe(2);
    expect(stats.challenging).toBe(2);
    expect(stats.neutral).toBe(1);
    expect(stats.total).toBe(5);
  });

  it('should handle empty aspects array', () => {
    const stats = calculateStats([]);
    expect(stats.harmonious).toBe(0);
    expect(stats.challenging).toBe(0);
    expect(stats.neutral).toBe(0);
    expect(stats.total).toBe(0);
  });
});

describe('Aspect Data Validation', () => {
  it('should validate aspect nature values', () => {
    const validNatures: AspectNature[] = ['harmonious', 'challenging', 'neutral'];
    mockAspects.forEach((aspect) => {
      expect(validNatures).toContain(aspect.nature);
    });
  });

  it('should validate aspect type values', () => {
    const validTypes: AspectType[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition', 'quincunx'];
    mockAspects.forEach((aspect) => {
      expect(validTypes).toContain(aspect.aspect as AspectType);
    });
  });

  it('should validate orb values are positive numbers', () => {
    mockAspects.forEach((aspect) => {
      expect(typeof aspect.orb).toBe('number');
      expect(aspect.orb).toBeGreaterThan(0);
      expect(aspect.orb).toBeLessThanOrEqual(10); // Typical max orb
    });
  });

  it('should validate Bulgarian translations exist', () => {
    const bgTranslations = {
      conjunction: 'съвпад',
      sextile: 'секстил',
      square: 'квадрат',
      trine: 'тригон',
      opposition: 'опозиция',
    };

    mockAspects.forEach((aspect) => {
      expect(aspect.aspectBg).toBe(bgTranslations[aspect.aspect as keyof typeof bgTranslations]);
    });
  });
});

describe('ASPECT_INFO Constants', () => {
  it('should contain all major aspect types', () => {
    const majorTypes = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
    majorTypes.forEach((type) => {
      expect(ASPECT_INFO[type as AspectType]).toBeDefined();
    });
  });

  it('should have correct angles for each aspect type', () => {
    expect(ASPECT_INFO.conjunction.angle).toBe(0);
    expect(ASPECT_INFO.sextile.angle).toBe(60);
    expect(ASPECT_INFO.square.angle).toBe(90);
    expect(ASPECT_INFO.trine.angle).toBe(120);
    expect(ASPECT_INFO.opposition.angle).toBe(180);
  });

  it('should have Bulgarian translations for all aspects', () => {
    Object.values(ASPECT_INFO).forEach((info) => {
      expect(info.nameBg).toBeDefined();
      expect(info.descriptionBg).toBeDefined();
      expect(info.generalMeaningBg).toBeDefined();
    });
  });
});

describe('PLANET_NAMES Constants', () => {
  it('should contain all major planets', () => {
    const majorPlanets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    majorPlanets.forEach((planet) => {
      expect(PLANET_NAMES[planet]).toBeDefined();
    });
  });

  it('should have Bulgarian translations for all planets', () => {
    Object.values(PLANET_NAMES).forEach((names) => {
      expect(names.bg).toBeDefined();
      expect(names.en).toBeDefined();
    });
  });
});
