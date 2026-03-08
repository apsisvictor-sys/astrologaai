/**
 * next-intl Routing Configuration
 * BMAD 03-technical-architecture.md: i18n routing with next-intl
 * 
 * URL Structure:
 * - /login → English (default)
 * - /bg/login → Bulgarian
 */

import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'bg'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
