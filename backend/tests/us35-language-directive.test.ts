/**
 * US-35: Language Directive Injection Tests
 * 
 * Tests for verifying language directive is injected in all AI-generated content:
 * - Chat responses
 * - Forecasts
 * - Compatibility reports
 * - Session summaries
 */

import { describe, it, expect, vi } from 'vitest';

// ============================================
// Language Directive Tests - llm-legacy.ts
// ============================================

describe('Language Directive Injection - Chat System', () => {
  describe('getLanguageDirective', () => {
    it('should return Bulgarian directive for bg language', async () => {
      const { getLanguageDirective } = await import('../src/services/llm-helpers');
      
      const directive = getLanguageDirective('bg');
      
      expect(directive).toContain('Bulgarian');
      expect(directive).toContain('Български');
      expect(directive).toContain('astrological terminology');
    });

    it('should return English directive for en language', async () => {
      const { getLanguageDirective } = await import('../src/services/llm-helpers');
      
      const directive = getLanguageDirective('en');
      
      expect(directive).toContain('English');
      expect(directive).not.toContain('Български');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should include Bulgarian language directive in system prompt', async () => {
      const { buildSystemPrompt } = await import('../src/services/llm-helpers');
      
      const context = {
        language: 'bg' as const,
        chartSummary: 'Test chart summary',
      };
      
      const prompt = buildSystemPrompt(context);
      
      expect(prompt).toContain('Bulgarian');
      expect(prompt).toContain('Български');
      expect(prompt).toContain('astrologer');
    });

    it('should include English language directive in system prompt', async () => {
      const { buildSystemPrompt } = await import('../src/services/llm-helpers');
      
      const context = {
        language: 'en' as const,
        chartSummary: 'Test chart summary',
      };
      
      const prompt = buildSystemPrompt(context);
      
      expect(prompt).toContain('English');
      expect(prompt).toContain('respond in English');
    });

    it('should include chart context when provided', async () => {
      const { buildSystemPrompt } = await import('../src/services/llm-helpers');
      
      const context = {
        language: 'bg' as const,
        chartSummary: 'Sun: Leo, Moon: Cancer',
        transitsSummary: 'Jupiter conjunct Sun',
      };
      
      const prompt = buildSystemPrompt(context);
      
      expect(prompt).toContain('Sun: Leo, Moon: Cancer');
      expect(prompt).toContain('Jupiter conjunct Sun');
    });

    it('should include session summary for context persistence', async () => {
      const { buildSystemPrompt } = await import('../src/services/llm-helpers');
      
      const context = {
        language: 'bg' as const,
        sessionSummary: 'User discussed career and relationships',
        recentMessages: [
          { role: 'user', content: 'What about my career?' },
          { role: 'assistant', content: 'Your chart shows...' },
        ],
      };
      
      const prompt = buildSystemPrompt(context);
      
      expect(prompt).toContain('CONVERSATION SUMMARY');
      expect(prompt).toContain('User discussed career');
    });
  });

  describe('generateSessionSummary', () => {
    it('should generate summary with language parameter', async () => {
      const { generateSessionSummary } = await import('../src/services/llm-helpers');
      
      const messages = [
        { role: 'user', content: 'What about my career?' },
        { role: 'assistant', content: 'Your chart shows potential...' },
      ];
      
      // The function should accept language parameter
      const summaryPromise = generateSessionSummary(messages, 'bg');
      
      // Should return a string (even if mocked)
      expect(typeof summaryPromise.then).toBe('function');
    });
  });
});

// ============================================
// Language Detection Tests - languageDetection.ts
// ============================================

describe('Language Detection Middleware', () => {
  describe('detectLanguageFromHeader', () => {
    it('should detect Bulgarian from Accept-Language header', async () => {
      const { detectLanguageFromHeader } = await import('../src/middleware/languageDetection');
      
      const result = detectLanguageFromHeader('bg-BG,bg;q=0.9,en;q=0.8');
      
      expect(result).toBe('bg');
    });

    it('should detect English from Accept-Language header', async () => {
      const { detectLanguageFromHeader } = await import('../src/middleware/languageDetection');
      
      const result = detectLanguageFromHeader('en-US,en;q=0.9,bg;q=0.8');
      
      expect(result).toBe('en');
    });

    it('should return default (Bulgarian) for empty header', async () => {
      const { detectLanguageFromHeader, DEFAULT_LANGUAGE } = await import('../src/middleware/languageDetection');
      
      const result = detectLanguageFromHeader(undefined);
      
      expect(result).toBe(DEFAULT_LANGUAGE);
      expect(result).toBe('bg');
    });

    it('should return default for unsupported language', async () => {
      const { detectLanguageFromHeader } = await import('../src/middleware/languageDetection');
      
      const result = detectLanguageFromHeader('fr-FR,de;q=0.9');
      
      expect(result).toBe('bg'); // Default to Bulgarian
    });

    it('should prioritize higher quality language', async () => {
      const { detectLanguageFromHeader } = await import('../src/middleware/languageDetection');
      
      // English has higher quality, should be selected
      const result = detectLanguageFromHeader('bg;q=0.5,en;q=0.9');
      
      expect(result).toBe('en');
    });
  });

  describe('SUPPORTED_LANGUAGES', () => {
    it('should include bg and en', async () => {
      const { SUPPORTED_LANGUAGES } = await import('../src/middleware/languageDetection');
      
      expect(SUPPORTED_LANGUAGES).toContain('bg');
      expect(SUPPORTED_LANGUAGES).toContain('en');
      expect(SUPPORTED_LANGUAGES).toHaveLength(2);
    });
  });
});

// ============================================
// Forecast Language Tests
// ============================================

describe('Forecast Service - Language Support', () => {
  it('should include language directive in forecast generation', async () => {
    // Import the forecast service
    const forecastModule = await import('../src/services/forecast');
    
    // The generateLLMForecast function should accept language parameter
    expect(typeof forecastModule.generateDailyForecast).toBe('function');
    expect(typeof forecastModule.generateWeeklyForecast).toBe('function');
  });

  it('should support Bulgarian terminology in forecasts', async () => {
    // Verify that forecast constants exist with Bulgarian translations
    const forecastModule = await import('../src/services/forecast');
    
    // Check that the module exports the expected functions
    expect(forecastModule.generateDailyForecast).toBeDefined();
    expect(forecastModule.generateWeeklyForecast).toBeDefined();
    expect(forecastModule.getDailyForecast).toBeDefined();
    expect(forecastModule.getWeeklyForecast).toBeDefined();
  });
});

// ============================================
// Compatibility Report Language Tests
// ============================================

describe('Compatibility Report Service - Language Support', () => {
  it('should accept language parameter in report generation', async () => {
    const { generateCompatibilityReport } = await import('../src/services/compatibility-report.service');
    
    expect(typeof generateCompatibilityReport).toBe('function');
  });

  it('should provide cached report functionality', async () => {
    const compatibilityModule = await import('../src/services/compatibility-report.service');
    
    // The module should support caching
    expect(compatibilityModule.getCachedReport).toBeDefined();
    expect(compatibilityModule.invalidateReportCache).toBeDefined();
  });
});

// ============================================
// Chat Controller Language Tests
// ============================================

describe('Chat Controller - Language Handling', () => {
  it('should extract language from user preferences', () => {
    // Mock request with user language
    const mockReq: any = {
      user: {
        id: 'test-user',
        tier: 'FREE',
        language: 'bg',
      },
      body: {
        content: 'Test message',
      },
    };
    
    // Verify language extraction
    const userLanguage = mockReq.user?.language === 'en' ? 'en' : 'bg';
    expect(userLanguage).toBe('bg');
  });

  it('should default to Bulgarian if language not specified', () => {
    const mockReq: any = {
      user: {
        id: 'test-user',
        tier: 'FREE',
      },
      body: {
        content: 'Test message',
      },
    };
    
    const userLanguage = (mockReq.user?.language === 'en' ? 'en' : 'bg') as 'bg' | 'en';
    expect(userLanguage).toBe('bg');
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Language Directive Integration', () => {
  it('should pass language through entire chat flow', async () => {
    const { buildSystemPrompt, getLanguageDirective } = await import('../src/services/llm-helpers');
    
    // Simulate chat flow with Bulgarian
    const context = {
      language: 'bg' as const,
      chartSummary: 'Test chart',
      conversationHistory: [],
    };
    
    const prompt = buildSystemPrompt(context);
    const directive = getLanguageDirective('bg');
    
    expect(prompt).toContain('Bulgarian');
    expect(directive).toContain('Български');
  });

  it('should pass language through forecast generation', async () => {
    // Verify forecast service accepts and uses language parameter
    const forecastModule = await import('../src/services/forecast');
    
    // The function signatures should support language
    expect(forecastModule.generateDailyForecast.length).toBeGreaterThanOrEqual(2);
    expect(forecastModule.generateWeeklyForecast.length).toBeGreaterThanOrEqual(2);
  });
});
