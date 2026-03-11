/**
 * Root Layout
 * Wraps the entire application with providers
 * US-27: Includes LanguageProvider for language toggle
 * 
 * Note: This layout provides AuthProvider for pages NOT under [locale]
 * The [locale]/layout.tsx provides the same for locale-aware pages
 */

import { Suspense } from 'react';
import { Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ClientProviders } from '@/components/client-providers';
import { ReferralCapture } from '@/components/referral-capture';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: 'The Oracle | Ethereal Astrology AI',
  description: 'Your personal AI astrologer with perfect Swiss Ephemeris mathematical accuracy.',
  keywords: ['astrology', 'AI', 'natal chart', 'horoscope', 'астрология', 'натална карта'],
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
