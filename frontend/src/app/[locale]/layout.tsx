/**
 * Locale Layout
 * BMAD 03-technical-architecture.md: next-intl App Router setup
 * 
 * Provides locale context for all pages under [locale]
 * Note: This is a nested layout - html/body tags are in root layout
 */

import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PostHogProvider } from '@/components/posthog-provider';

const locales = ['bg', 'en'] as const;
type Locale = (typeof locales)[number];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Suspense>
        <PostHogProvider />
      </Suspense>
      {children}
    </NextIntlClientProvider>
  );
}
