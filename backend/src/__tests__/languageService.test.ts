/**
 * Language Service Tests
 * US-35: Language Layer Completeness
 * 
 * Unit tests for language directive injection and related functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLanguageDirective,
  getLanguageDirectiveWithContext,
  detectLanguage,
  isValidLanguage,
  normalizeLanguage,
  validateBulgarianAstrologicalTerms,
  buildSystemPromptWithLanguage,
  BULGARIAN_ASTROLOGICAL_TERMS,
} from '../services/languageService';

// ============================================
// Language Directive Tests
// ============================================

describe('getLanguageDirective', () => {
  it('should return Bulgarian directive for bg language', () => {
    const directive = getLanguageDirective('bg');
    
    expect(directive).toContain('Български');
    expect(directive).toContain('Слънце');
    expect(directive).toContain('Луна');
    expect(directive).toContain('Овен');
    expect(directive).toContain('Телец');
  });

  it('should return English directive for en language', () => {
    const directive = getLanguageDirective('en');
    
    expect(directive).toContain('English');
    expect(directive).not.toContain('Български');
  });

  it('should return default (Bulgarian) directive for unknown language', () => {
    const directive = getLanguageDirective('fr' as any);
    
    // Should fall back to default (Bulgarian)
    expect(directive).toContain('Български');
  });
});

describe('getLanguageDirectiveWithContext', () => {
  it('should add chat-specific instructions for Bulgarian', () => {
    const directive = getLanguageDirectiveWithContext('bg', 'chat');
    
    expect(directive).toContain('наталната карта');
    expect(directive).toContain('Български');
  });

  it('should add forecast-specific instructions for Bulgarian', () => {
    const directive = getLanguageDirectiveWithContext('bg', 'forecast');
    
    expect(directive).toContain('прогнозите');
    expect(directive).toContain('Български');
  });

  it('should add compatibility-specific instructions for Bulgarian', () => {
    const directive = getLanguageDirectiveWithContext('bg', 'compatibility');
    
    expect(directive).toContain('съвместимостта');
    expect(directive).toContain('Български');
  });

  it('should not add context for English (uses base directive)', () => {
    const directive = getLanguageDirectiveWithContext('en', 'chat');
    
    expect(directive).toContain('English');
    expect(directive).not.toContain('наталната карта');
  });
});

// ============================================
// Language Detection Tests
// ============================================

describe('detectLanguage', () => {
  it('should prioritize user preference over header', () => {
    const result = detectLanguage('en', 'bg-BG,bg;q=0.9');
    
    expect(result.language).toBe('en');
    expect(result.source).toBe('user_preference');
  });

  it('should use header when no user preference', () => {
    const result = detectLanguage(undefined, 'bg-BG,bg;q=0.9,en;q=0.8');
    
    expect(result.language).toBe('bg');
    expect(result.source).toBe('header');
  });

  it('should detect English from Accept-Language header', () => {
    const result = detectLanguage(undefined, 'en-US,en;q=0.9,bg;q=0.8');
    
    expect(result.language).toBe('en');
    expect(result.source).toBe('header');
  });

  it('should default to Bulgarian when no preference or header', () => {
    const result = detectLanguage(undefined, undefined);
    
    expect(result.language).toBe('bg');
    expect(result.source).toBe('default');
  });

  it('should handle complex Accept-Language headers', () => {
    const result = detectLanguage(undefined, 'en-US,en;q=0.9,fr;q=0.8,de;q=0.7');
    
    expect(result.language).toBe('en');
  });

  it('should ignore invalid user preference and use header', () => {
    const result = detectLanguage('invalid', 'en-US');
    
    expect(result.language).toBe('en');
    expect(result.source).toBe('header');
  });
});

// ============================================
// Language Validation Tests
// ============================================

describe('isValidLanguage', () => {
  it('should return true for supported languages', () => {
    expect(isValidLanguage('bg')).toBe(true);
    expect(isValidLanguage('en')).toBe(true);
  });

  it('should return false for unsupported languages', () => {
    expect(isValidLanguage('fr')).toBe(false);
    expect(isValidLanguage('de')).toBe(false);
    expect(isValidLanguage('')).toBe(false);
    expect(isValidLanguage('BG')).toBe(false); // Case sensitive
  });
});

describe('normalizeLanguage', () => {
  it('should normalize language codes', () => {
    expect(normalizeLanguage('bg')).toBe('bg');
    expect(normalizeLanguage('bg-BG')).toBe('bg');
    expect(normalizeLanguage('en-US')).toBe('en');
    expect(normalizeLanguage('EN')).toBe('en');
  });

  it('should return default for invalid codes', () => {
    expect(normalizeLanguage('fr')).toBe('bg');
    expect(normalizeLanguage(undefined)).toBe('bg');
    expect(normalizeLanguage('')).toBe('bg');
  });
});

// ============================================
// Bulgarian Terminology Validation Tests
// ============================================

describe('validateBulgarianAstrologicalTerms', () => {
  it('should pass for correct Bulgarian content', () => {
    const content = 'Слънцето е в Телец и Луната е в Скорпион.';
    const result = validateBulgarianAstrologicalTerms(content);
    
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect English planet names', () => {
    const content = 'Your Sun is in Taurus and Moon is in Scorpio.';
    const result = validateBulgarianAstrologicalTerms(content);
    
    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some(i => i.toLowerCase().includes('sun'))).toBe(true);
    expect(result.issues.some(i => i.toLowerCase().includes('moon'))).toBe(true);
  });

  it('should detect English sign names', () => {
    const content = 'The Sun in Aries brings energy.';
    const result = validateBulgarianAstrologicalTerms(content);
    
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.toLowerCase().includes('aries'))).toBe(true);
  });

  it('should be case-insensitive for detection', () => {
    const content = 'SUN in TAURUS brings energy.';
    const result = validateBulgarianAstrologicalTerms(content);
    
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.toLowerCase().includes('sun'))).toBe(true);
    expect(result.issues.some(i => i.toLowerCase().includes('taurus'))).toBe(true);
  });
});

// ============================================
// System Prompt Builder Tests
// ============================================

describe('buildSystemPromptWithLanguage', () => {
  it('should append language directive to base prompt', () => {
    const basePrompt = 'You are an astrologer.';
    const result = buildSystemPromptWithLanguage(basePrompt, 'bg');
    
    expect(result).toContain('You are an astrologer.');
    expect(result).toContain('Български');
  });

  it('should include context-specific instructions when provided', () => {
    const basePrompt = 'You are an astrologer.';
    const result = buildSystemPromptWithLanguage(basePrompt, 'bg', 'forecast');
    
    expect(result).toContain('прогнозите');
  });

  it('should work with English', () => {
    const basePrompt = 'You are an astrologer.';
    const result = buildSystemPromptWithLanguage(basePrompt, 'en');
    
    expect(result).toContain('You are an astrologer.');
    expect(result).toContain('English');
  });
});

// ============================================
// Bulgarian Terminology Constants Tests
// ============================================

describe('BULGARIAN_ASTROLOGICAL_TERMS', () => {
  it('should have all 12 zodiac signs', () => {
    const signs = Object.keys(BULGARIAN_ASTROLOGICAL_TERMS.signs);
    expect(signs).toHaveLength(12);
  });

  it('should have all major planets', () => {
    const planets = Object.keys(BULGARIAN_ASTROLOGICAL_TERMS.planets);
    expect(planets).toContain('sun');
    expect(planets).toContain('moon');
    expect(planets).toContain('mercury');
    expect(planets).toContain('venus');
    expect(planets).toContain('mars');
    expect(planets).toContain('jupiter');
    expect(planets).toContain('saturn');
  });

  it('should have all major aspects', () => {
    const aspects = Object.keys(BULGARIAN_ASTROLOGICAL_TERMS.aspects);
    expect(aspects).toContain('conjunction');
    expect(aspects).toContain('opposition');
    expect(aspects).toContain('trine');
    expect(aspects).toContain('square');
    expect(aspects).toContain('sextile');
  });

  it('should have all 12 house ordinals in Bulgarian', () => {
    const ordinals = BULGARIAN_ASTROLOGICAL_TERMS.houses.ordinals;
    expect(ordinals).toHaveLength(12);
    expect(ordinals[0]).toBe('Първи');
    expect(ordinals[11]).toBe('Дванадесети');
  });

  it('should have all 8 moon phases', () => {
    const phases = Object.keys(BULGARIAN_ASTROLOGICAL_TERMS.moonPhases);
    expect(phases).toHaveLength(8);
    expect(BULGARIAN_ASTROLOGICAL_TERMS.moonPhases.newMoon).toBe('Новолуние');
    expect(BULGARIAN_ASTROLOGICAL_TERMS.moonPhases.fullMoon).toBe('Пълнолуние');
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Language Service Integration', () => {
  it('should produce consistent language directive across all contexts', () => {
    const contexts: Array<'chat' | 'forecast' | 'compatibility' | 'alert' | 'tooltip'> = 
      ['chat', 'forecast', 'compatibility', 'alert', 'tooltip'];
    
    for (const context of contexts) {
      const directive = getLanguageDirectiveWithContext('bg', context);
      
      // All should contain the base Bulgarian directive
      expect(directive).toContain('Български');
      expect(directive).toContain('Слънце');
      expect(directive).toContain('Луна');
    }
  });

  it('should handle edge cases in language detection', () => {
    // Empty string header
    expect(detectLanguage(undefined, '').language).toBe('bg');
    
    // Malformed header
    expect(detectLanguage(undefined, 'invalid-format').language).toBe('bg');
    
    // Header with only unsupported languages
    expect(detectLanguage(undefined, 'fr,de,es').language).toBe('bg');
  });
});
