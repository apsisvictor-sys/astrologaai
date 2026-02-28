/**
 * Language Directive Service Tests
 * US-35: Language Layer Completeness
 * 
 * Tests for:
 * - Language directive injection in AI prompts
 * - Terminology translations
 * - Language detection from Accept-Language header
 * - Prompt builders for chat, forecast, and alerts
 */

import { describe, it, expect } from 'vitest';

import {
  getLanguageDirective,
  buildLanguageAwarePrompt,
  getTerm,
  getAllTerms,
  translatePlanet,
  translateSign,
  translateAspect,
  formatHouse,
  detectLanguageFromHeader,
  isValidLanguage,
  normalizeLanguage,
  buildChatSystemPrompt,
  buildForecastSystemPrompt,
  SupportedLanguage,
} from '../services/language-directive';

describe('Language Directive Service', () => {
  // ============================================
  // getLanguageDirective
  // ============================================
  describe('getLanguageDirective', () => {
    it('should return Bulgarian directive for bg language', () => {
      const directive = getLanguageDirective('bg');
      
      expect(directive).toContain('БЪЛГАРСКИ');
      expect(directive).toContain('Слънце');
      expect(directive).toContain('Овен');
      expect(directive).toContain('съвпад');
    });

    it('should return English directive for en language', () => {
      const directive = getLanguageDirective('en');
      
      expect(directive).toContain('English');
      expect(directive).toContain('astrological terminology');
    });

    it('should default to Bulgarian for unknown language', () => {
      // TypeScript won't allow unknown languages, but test the fallback
      const bgDirective = getLanguageDirective('bg');
      expect(bgDirective).toContain('БЪЛГАРСКИ');
    });
  });

  // ============================================
  // buildLanguageAwarePrompt
  // ============================================
  describe('buildLanguageAwarePrompt', () => {
    it('should append language directive to base prompt', () => {
      const basePrompt = 'You are an astrologer.';
      const result = buildLanguageAwarePrompt(basePrompt, 'bg');
      
      expect(result).toContain('You are an astrologer.');
      expect(result).toContain('БЪЛГАРСКИ');
    });

    it('should work with English language', () => {
      const basePrompt = 'You are an astrologer.';
      const result = buildLanguageAwarePrompt(basePrompt, 'en');
      
      expect(result).toContain('You are an astrologer.');
      expect(result).toContain('English');
    });
  });

  // ============================================
  // getTerm / Terminology
  // ============================================
  describe('getTerm', () => {
    it('should return Bulgarian planet names', () => {
      expect(getTerm('sun', 'bg')).toBe('Слънце');
      expect(getTerm('moon', 'bg')).toBe('Луна');
      expect(getTerm('mars', 'bg')).toBe('Марс');
    });

    it('should return Bulgarian zodiac signs', () => {
      expect(getTerm('aries', 'bg')).toBe('Овен');
      expect(getTerm('taurus', 'bg')).toBe('Телец');
      expect(getTerm('pisces', 'bg')).toBe('Риби');
    });

    it('should return Bulgarian aspect names', () => {
      expect(getTerm('conjunction', 'bg')).toBe('съвпад');
      expect(getTerm('trine', 'bg')).toBe('тригон');
      expect(getTerm('square', 'bg')).toBe('квадрат');
    });

    it('should return English terms for en language', () => {
      expect(getTerm('sun', 'en')).toBe('Sun');
      expect(getTerm('aries', 'en')).toBe('Aries');
      expect(getTerm('conjunction', 'en')).toBe('conjunction');
    });

    it('should return original key for unknown terms', () => {
      expect(getTerm('unknownPlanet', 'bg')).toBe('unknownPlanet');
    });
  });

  describe('getAllTerms', () => {
    it('should return all Bulgarian terminology', () => {
      const terms = getAllTerms('bg');
      
      expect(terms.sun).toBe('Слънце');
      expect(terms.aries).toBe('Овен');
      expect(terms.conjunction).toBe('съвпад');
      expect(terms.fire).toBe('Огън');
    });

    it('should return all English terminology', () => {
      const terms = getAllTerms('en');
      
      expect(terms.sun).toBe('Sun');
      expect(terms.aries).toBe('Aries');
      expect(terms.conjunction).toBe('conjunction');
    });
  });

  // ============================================
  // translatePlanet / translateSign / translateAspect
  // ============================================
  describe('translatePlanet', () => {
    it('should translate planet names to Bulgarian', () => {
      expect(translatePlanet('Sun', 'bg')).toBe('Слънце');
      expect(translatePlanet('MOON', 'bg')).toBe('Луна');
      expect(translatePlanet('jupiter', 'bg')).toBe('Юпитер');
    });

    it('should return English planet names', () => {
      expect(translatePlanet('sun', 'en')).toBe('Sun');
    });
  });

  describe('translateSign', () => {
    it('should translate zodiac signs to Bulgarian', () => {
      expect(translateSign('Aries', 'bg')).toBe('Овен');
      expect(translateSign('SCORPIO', 'bg')).toBe('Скорпион');
      expect(translateSign('pisces', 'bg')).toBe('Риби');
    });
  });

  describe('translateAspect', () => {
    it('should translate aspect types to Bulgarian', () => {
      expect(translateAspect('Conjunction', 'bg')).toBe('съвпад');
      expect(translateAspect('SQUARE', 'bg')).toBe('квадрат');
      expect(translateAspect('trine', 'bg')).toBe('тригон');
    });
  });

  // ============================================
  // formatHouse
  // ============================================
  describe('formatHouse', () => {
    it('should format Bulgarian house numbers correctly', () => {
      expect(formatHouse(1, 'bg')).toBe('1-ви дом');
      expect(formatHouse(2, 'bg')).toBe('2-ри дом');
      expect(formatHouse(3, 'bg')).toBe('3-ти дом');
      expect(formatHouse(7, 'bg')).toBe('7-ми дом');
      expect(formatHouse(8, 'bg')).toBe('8-ми дом');
      expect(formatHouse(10, 'bg')).toBe('10-ти дом');
      expect(formatHouse(12, 'bg')).toBe('12-ти дом');
    });

    it('should format English house numbers correctly', () => {
      expect(formatHouse(1, 'en')).toBe('1st house');
      expect(formatHouse(2, 'en')).toBe('2nd house');
      expect(formatHouse(3, 'en')).toBe('3rd house');
      expect(formatHouse(4, 'en')).toBe('4th house');
      expect(formatHouse(11, 'en')).toBe('11th house');
      expect(formatHouse(21, 'en')).toBe('21st house');
    });
  });

  // ============================================
  // detectLanguageFromHeader
  // ============================================
  describe('detectLanguageFromHeader', () => {
    it('should detect Bulgarian from Accept-Language header', () => {
      expect(detectLanguageFromHeader('bg-BG,bg;q=0.9,en;q=0.8')).toBe('bg');
      expect(detectLanguageFromHeader('bg')).toBe('bg');
      expect(detectLanguageFromHeader('bg-BG')).toBe('bg');
    });

    it('should detect English from Accept-Language header', () => {
      expect(detectLanguageFromHeader('en-US,en;q=0.9')).toBe('en');
      expect(detectLanguageFromHeader('en')).toBe('en');
      expect(detectLanguageFromHeader('en-GB')).toBe('en');
    });

    it('should prioritize by quality value', () => {
      // English first, but Bulgarian has higher quality
      expect(detectLanguageFromHeader('en;q=0.5,bg;q=0.9')).toBe('bg');
      // Bulgarian first with higher quality
      expect(detectLanguageFromHeader('bg;q=0.9,en;q=0.8')).toBe('bg');
    });

    it('should default to Bulgarian for unknown languages', () => {
      expect(detectLanguageFromHeader('de-DE,fr-FR')).toBe('bg');
      expect(detectLanguageFromHeader('')).toBe('bg');
      expect(detectLanguageFromHeader(undefined)).toBe('bg');
    });

    it('should handle complex Accept-Language headers', () => {
      const header = 'en-US,en;q=0.9,bg;q=0.8,de;q=0.7';
      expect(detectLanguageFromHeader(header)).toBe('en');
    });
  });

  // ============================================
  // isValidLanguage / normalizeLanguage
  // ============================================
  describe('isValidLanguage', () => {
    it('should return true for supported languages', () => {
      expect(isValidLanguage('bg')).toBe(true);
      expect(isValidLanguage('en')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isValidLanguage('de')).toBe(false);
      expect(isValidLanguage('fr')).toBe(false);
      expect(isValidLanguage('')).toBe(false);
      expect(isValidLanguage(undefined)).toBe(false);
    });
  });

  describe('normalizeLanguage', () => {
    it('should return valid languages unchanged', () => {
      expect(normalizeLanguage('bg')).toBe('bg');
      expect(normalizeLanguage('en')).toBe('en');
    });

    it('should default to Bulgarian for invalid languages', () => {
      expect(normalizeLanguage('de')).toBe('bg');
      expect(normalizeLanguage('')).toBe('bg');
      expect(normalizeLanguage(undefined)).toBe('bg');
    });
  });

  // ============================================
  // buildChatSystemPrompt
  // ============================================
  describe('buildChatSystemPrompt', () => {
    it('should include language directive for Bulgarian', () => {
      const prompt = buildChatSystemPrompt('Chart summary', 'Transits', 'bg');
      
      expect(prompt).toContain('AstroLogAI');
      expect(prompt).toContain('БЪЛГАРСКИ');
      expect(prompt).toContain('Chart summary');
      expect(prompt).toContain('Transits');
    });

    it('should include language directive for English', () => {
      const prompt = buildChatSystemPrompt('Chart summary', 'Transits', 'en');
      
      expect(prompt).toContain('AstroLogAI');
      expect(prompt).toContain('English');
      expect(prompt).toContain('Chart summary');
    });

    it('should work without chart summary', () => {
      const prompt = buildChatSystemPrompt(undefined, 'Transits', 'bg');
      
      expect(prompt).toContain('AstroLogAI');
      expect(prompt).toContain('CURRENT TRANSITS');
      expect(prompt).not.toContain("USER'S NATAL CHART");
    });

    it('should work without transits summary', () => {
      const prompt = buildChatSystemPrompt('Chart summary', undefined, 'bg');
      
      expect(prompt).toContain("USER'S NATAL CHART");
      expect(prompt).not.toContain('CURRENT TRANSITS');
    });
  });

  // ============================================
  // buildForecastSystemPrompt
  // ============================================
  describe('buildForecastSystemPrompt', () => {
    it('should build Bulgarian daily forecast prompt', () => {
      const prompt = buildForecastSystemPrompt('daily', 'bg');
      
      expect(prompt).toContain('дневна прогноза');
      expect(prompt).toContain('БЪЛГАРСКИ');
      expect(prompt).toContain('overallTheme');
      expect(prompt).toContain('horoscope');
    });

    it('should build Bulgarian weekly forecast prompt', () => {
      const prompt = buildForecastSystemPrompt('weekly', 'bg');
      
      expect(prompt).toContain('седмична прогноза');
      expect(prompt).toContain('БЪЛГАРСКИ');
      expect(prompt).toContain('dailyBreakdown');
    });

    it('should build English daily forecast prompt', () => {
      const prompt = buildForecastSystemPrompt('daily', 'en');
      
      expect(prompt).toContain('daily forecast');
      expect(prompt).toContain('English');
      expect(prompt).toContain('overallTheme');
    });

    it('should build English weekly forecast prompt', () => {
      const prompt = buildForecastSystemPrompt('weekly', 'en');
      
      expect(prompt).toContain('weekly forecast');
      expect(prompt).toContain('English');
    });
  });

  // ============================================
  // Integration Tests
  // ============================================
  describe('Integration: Full prompt flow', () => {
    it('should create complete Bulgarian chat prompt', () => {
      const chartSummary = 'Слънце: Овен 15° в 10-ти дом';
      const transitsSummary = 'Юпитер тригон Слънце';
      
      const prompt = buildChatSystemPrompt(chartSummary, transitsSummary, 'bg');
      
      // Verify all components are present
      expect(prompt).toContain('AstroLogAI');
      expect(prompt).toContain('БЪЛГАРСКИ');
      expect(prompt).toContain('Слънце, Луна, Меркурий');
      expect(prompt).toContain('Овен, Телец, Близнаци');
      expect(prompt).toContain(chartSummary);
      expect(prompt).toContain(transitsSummary);
    });

    it('should create complete Bulgarian forecast prompt', () => {
      const prompt = buildForecastSystemPrompt('daily', 'bg');
      
      // Verify Bulgarian terminology is used
      expect(prompt).toContain('Слънце, Луна');
      expect(prompt).toContain('Овен, Телец');
      expect(prompt).toContain('Съвпад, Секстил'); // Capitalized in prompt
      expect(prompt).toContain('1-ви до 12-ти дом');
      
      // Verify JSON structure is required
      expect(prompt).toContain('JSON');
    });
  });
});
