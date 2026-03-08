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
export declare const SUPPORTED_LANGUAGES: readonly ["bg", "en"];
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
export declare const DEFAULT_LANGUAGE: SupportedLanguage;
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
export declare function detectLanguageFromHeader(acceptLanguage: string | undefined): SupportedLanguage;
/**
 * Language detection middleware
 *
 * Sets req.detectedLanguage based on:
 * 1. User's stored preference (if authenticated)
 * 2. Accept-Language header
 * 3. Default (Bulgarian)
 */
export declare function languageDetectionMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Get detected language from request
 * Falls back to default if not set
 */
export declare function getDetectedLanguage(req: Request): SupportedLanguage;
export default languageDetectionMiddleware;
//# sourceMappingURL=languageDetection.d.ts.map