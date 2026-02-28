/**
 * next-intl Routing Configuration
 * BMAD 03-technical-architecture.md: i18n routing with next-intl
 * 
 * URL Structure:
 * - /login → Bulgarian (default)
 * - /en/login → English
 */

import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['bg', 'en'],
  defaultLocale: 'bg',
  localePrefix: {
    mode: 'as-needed',
    prefixes: {
      bg: '',  // Bulgarian is default, no prefix
      en: '/en' // English uses /en prefix
    }
  }
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
