/**
 * Language Detection Middleware
 * US-26: Auto-Detect User Language
 * 
 * Detects user's preferred language from:
 * 1. User's stored preference (if authenticated)
 * 2. Accept-Language header
 * 3. Default to Bulgarian (bg) for BG market
 */

import { Request, Response, NextFunction } from 'express';

// Supported languages
export const SUPPORTED_LANGUAGES = ['bg', 'en'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Default language for BG market
export const DEFAULT_LANGUAGE: SupportedLanguage = 'bg';

// Extend Express Request type for user and detectedLanguage
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tier: string;
        language?: string;
      };
      detectedLanguage?: SupportedLanguage;
    }
  }
}

/**
 * Detect language from Accept-Language header
 * 
 * Examples:
 * - "bg-BG,bg;q=0.9,en;q=0.8" -> "bg"
 * - "en-US,en;q=0.9,bg;q=0.8" -> "en"
 * - "bg" -> "bg"
 */
export function detectLanguageFromHeader(acceptLanguage: string | undefined): SupportedLanguage {
  if (!acceptLanguage) {
    return DEFAULT_LANGUAGE;
  }

  // Parse Accept-Language header
  // Format: "language-region;q=quality,language;q=quality"
  const languages = acceptLanguage.split(',').map(lang => {
    const [code, qualityStr] = lang.trim().split(';');
    const quality = qualityStr ? parseFloat(qualityStr.replace('q=', '')) : 1.0;
    return {
      code: code?.toLowerCase().split('-')[0] || '', // Get language code without region
      quality,
    };
  });

  // Sort by quality (highest first)
  languages.sort((a, b) => b.quality - a.quality);

  // Find first supported language
  for (const lang of languages) {
    if (SUPPORTED_LANGUAGES.includes(lang.code as SupportedLanguage)) {
      return lang.code as SupportedLanguage;
    }
  }

  // No supported language found, use default
  return DEFAULT_LANGUAGE;
}

/**
 * Language detection middleware
 * 
 * Sets req.detectedLanguage based on:
 * 1. User's stored preference (if authenticated)
 * 2. Accept-Language header
 * 3. Default (Bulgarian)
 */
export function languageDetectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Priority 1: Use user's stored preference if authenticated
  if (req.user?.language && SUPPORTED_LANGUAGES.includes(req.user.language as SupportedLanguage)) {
    req.detectedLanguage = req.user.language as SupportedLanguage;
    next();
    return;
  }

  // Priority 2: Detect from Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  req.detectedLanguage = detectLanguageFromHeader(acceptLanguage);

  next();
}

/**
 * Get detected language from request
 * Falls back to default if not set
 */
export function getDetectedLanguage(req: Request): SupportedLanguage {
  return req.detectedLanguage || DEFAULT_LANGUAGE;
}

export default languageDetectionMiddleware;
