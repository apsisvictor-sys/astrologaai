/**
 * Root Layout
 * Wraps the entire application with providers
 * US-27: Includes LanguageProvider for language toggle
 * 
 * Note: This layout provides AuthProvider for pages NOT under [locale]
 * The [locale]/layout.tsx provides the same for locale-aware pages
 */

import { Inter, Outfit } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ClientProviders } from '@/components/client-providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
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
    <html lang="en" className={`${inter.variable} ${outfit.variable} dark`} suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased min-h-screen selection:bg-primary-glow selection:text-white`}
      >
        <AuthProvider>
          <ClientProviders>
            {children}
          </ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
