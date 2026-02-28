/**
 * Root Page - Redirects to locale
 * BMAD 03-technical-architecture.md: Default to Bulgarian
 */

import { redirect } from '@/i18n/routing';

export default function RootPage() {
  redirect({ href: '/register', locale: 'bg' });
}
