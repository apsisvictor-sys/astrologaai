/**
 * Root Layout
 * Wraps the entire application with providers
 * US-27: Includes LanguageProvider for language toggle
 *
 * Note: This layout provides AuthProvider for pages NOT under [locale]
 * The [locale]/layout.tsx provides the same for locale-aware pages
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import { AuthProvider } from '@/lib/auth-context';
import { ClientProviders } from '@/components/client-providers';
import { ReferralCapture } from '@/components/referral-capture';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
});

const APP_URL = 'https://astrologa.bg';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'The Oracle | Ethereal Astrology AI',
  description: 'Your personal AI astrologer with perfect Swiss Ephemeris mathematical accuracy.',
  keywords: ['astrology', 'AI', 'natal chart', 'horoscope', 'астрология', 'натална карта'],
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    title: 'The Oracle | Ethereal Astrology AI',
    description: 'Your personal AI astrologer with perfect Swiss Ephemeris mathematical accuracy.',
    url: APP_URL,
    siteName: 'The Oracle',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'The Oracle — Ethereal Astrology AI',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Oracle | Ethereal Astrology AI',
    description: 'Your personal AI astrologer with perfect Swiss Ephemeris mathematical accuracy.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} dark`} suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.className} antialiased min-h-screen`}
      >
        <NextTopLoader color="#6366f1" showSpinner={false} />
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        <AuthProvider>
          <ClientProviders>
            {children}
          </ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
