/**
 * Language Detection Middleware Tests
 * US-35: Language Layer Completeness
 * 
 * Unit tests for Accept-Language header detection
 */

import { describe, it, expect } from 'vitest';
import {
  detectLanguageFromHeader,
  languageDetectionMiddleware,
  getDetectedLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from '../middleware/languageDetection';
import { Request, Response } from 'express';

// ============================================
// Helper to create mock request/response
// ============================================

function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: {},
    user: undefined,
    ...overrides,
  } as Partial<Request>;
}

function createMockResponse(): Partial<Response> {
  const res: any = {};
  res.status = () => res;
  res.json = () => res;
  return res;
}

// ============================================
// Header Detection Tests
// ============================================

describe('detectLanguageFromHeader', () => {
  it('should detect Bulgarian from bg-BG header', () => {
    const result = detectLanguageFromHeader('bg-BG');
    expect(result).toBe('bg');
  });

  it('should detect Bulgarian from simple bg header', () => {
    const result = detectLanguageFromHeader('bg');
    expect(result).toBe('bg');
  });

  it('should detect Bulgarian from complex header with quality', () => {
    const result = detectLanguageFromHeader('bg-BG,bg;q=0.9,en;q=0.8');
    expect(result).toBe('bg');
  });

  it('should detect English from en-US header', () => {
    const result = detectLanguageFromHeader('en-US');
    expect(result).toBe('en');
  });

  it('should detect English from simple en header', () => {
    const result = detectLanguageFromHeader('en');
    expect(result).toBe('en');
  });

  it('should detect English from complex header', () => {
    const result = detectLanguageFromHeader('en-US,en;q=0.9,bg;q=0.8');
    expect(result).toBe('en');
  });

  it('should respect quality values in header', () => {
    // Bulgarian has higher quality
    const result = detectLanguageFromHeader('en;q=0.5,bg;q=0.9');
    expect(result).toBe('bg');
  });

  it('should return default for undefined header', () => {
    const result = detectLanguageFromHeader(undefined);
    expect(result).toBe(DEFAULT_LANGUAGE);
  });

  it('should return default for empty header', () => {
    const result = detectLanguageFromHeader('');
    expect(result).toBe(DEFAULT_LANGUAGE);
  });

  it('should return default for unsupported language', () => {
    const result = detectLanguageFromHeader('fr-FR,de-DE');
    expect(result).toBe(DEFAULT_LANGUAGE);
  });

  it('should pick supported language from mixed header', () => {
    // Should pick English from fr,en,de
    const result = detectLanguageFromHeader('fr-FR,en-US;q=0.8,de-DE;q=0.7');
    expect(result).toBe('en');
  });

  it('should handle wildcard header', () => {
    const result = detectLanguageFromHeader('*');
    expect(result).toBe(DEFAULT_LANGUAGE);
  });
});

// ============================================
// Middleware Tests
// ============================================

describe('languageDetectionMiddleware', () => {
  it('should set detectedLanguage from user preference when authenticated', () => {
    const req = createMockRequest({
      user: { id: '1', email: 'test@test.com', tier: 'FREE', language: 'en' },
      headers: { 'accept-language': 'bg-BG' },
    }) as Request;
    const res = createMockResponse() as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    languageDetectionMiddleware(req, res, next);

    expect(req.detectedLanguage).toBe('en');
    expect(nextCalled).toBe(true);
  });

  it('should set detectedLanguage from header when not authenticated', () => {
    const req = createMockRequest({
      headers: { 'accept-language': 'en-US' },
    }) as Request;
    const res = createMockResponse() as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    languageDetectionMiddleware(req, res, next);

    expect(req.detectedLanguage).toBe('en');
    expect(nextCalled).toBe(true);
  });

  it('should default to Bulgarian when no preference or header', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    languageDetectionMiddleware(req, res, next);

    expect(req.detectedLanguage).toBe('bg');
    expect(nextCalled).toBe(true);
  });

  it('should prefer user preference over header', () => {
    const req = createMockRequest({
      user: { id: '1', email: 'test@test.com', tier: 'FREE', language: 'bg' },
      headers: { 'accept-language': 'en-US' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = () => {};

    languageDetectionMiddleware(req, res, next);

    expect(req.detectedLanguage).toBe('bg');
  });

  it('should ignore invalid user language preference', () => {
    const req = createMockRequest({
      user: { id: '1', email: 'test@test.com', tier: 'FREE', language: 'invalid' },
      headers: { 'accept-language': 'en-US' },
    }) as Request;
    const res = createMockResponse() as Response;
    const next = () => {};

    languageDetectionMiddleware(req, res, next);

    // Should fall back to header
    expect(req.detectedLanguage).toBe('en');
  });
});

// ============================================
// Helper Function Tests
// ============================================

describe('getDetectedLanguage', () => {
  it('should return detected language from request', () => {
    const req = createMockRequest() as Request;
    req.detectedLanguage = 'en';

    const result = getDetectedLanguage(req);

    expect(result).toBe('en');
  });

  it('should return default when not set', () => {
    const req = createMockRequest() as Request;

    const result = getDetectedLanguage(req);

    expect(result).toBe(DEFAULT_LANGUAGE);
  });
});

// ============================================
// Constants Tests
// ============================================

describe('Language Constants', () => {
  it('should have Bulgarian and English as supported languages', () => {
    expect(SUPPORTED_LANGUAGES).toContain('bg');
    expect(SUPPORTED_LANGUAGES).toContain('en');
  });

  it('should have Bulgarian as default language', () => {
    expect(DEFAULT_LANGUAGE).toBe('bg');
  });

  it('should have exactly 2 supported languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(2);
  });
});

// ============================================
// Edge Cases
// ============================================

describe('Edge Cases', () => {
  it('should handle malformed Accept-Language header', () => {
    const result = detectLanguageFromHeader(';;;invalid;;;');
    expect(result).toBe(DEFAULT_LANGUAGE);
  });

  it('should handle header with only whitespace', () => {
    const result = detectLanguageFromHeader('   ');
    expect(result).toBe(DEFAULT_LANGUAGE);
  });

  it('should handle header with quality value 0', () => {
    // Language with q=0 should be ignored
    const result = detectLanguageFromHeader('en;q=0,bg;q=0.5');
    expect(result).toBe('bg');
  });

  it('should handle very long Accept-Language header', () => {
    const longHeader = 'en-US,en;q=0.9,fr;q=0.8,de;q=0.7,es;q=0.6,it;q=0.5,pt;q=0.4,nl;q=0.3,ru;q=0.2,ja;q=0.1';
    const result = detectLanguageFromHeader(longHeader);
    expect(result).toBe('en');
  });

  it('should handle case-insensitive language codes', () => {
    expect(detectLanguageFromHeader('BG-BG')).toBe('bg');
    expect(detectLanguageFromHeader('EN-US')).toBe('en');
    expect(detectLanguageFromHeader('Bg')).toBe('bg');
  });
});
