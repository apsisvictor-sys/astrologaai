/**
 * Middleware for next-intl Locale Detection
 * BMAD 03-technical-architecture.md: URL-based locale routing
 *
 * Routes:
 * - /login → English (default, no prefix)
 * - /bg/login → Bulgarian
 */

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
