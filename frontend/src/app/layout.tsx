/**
 * Root Layout
 * Wraps the entire application with providers
 * US-27: Includes LanguageProvider for language toggle
 * 
 * Note: This layout provides AuthProvider for pages NOT under [locale]
 * The [locale]/layout.tsx provides the same for locale-aware pages
 */

import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ClientProviders } from '@/components/client-providers';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'], // Support Bulgarian Cyrillic
  variable: '--font-inter',
});

export const metadata = {
  title: 'AstroLogAI - Вашият личен AI астролог',
  description: 'Персонализиран AI астролог с постоянна памет за вашата натална карта',
  keywords: ['astrology', 'AI', 'natal chart', 'horoscope', 'астрология', 'натална карта'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bg" className={inter.variable} suppressHydrationWarning>
      <body 
        className={`${inter.className} antialiased`}
        style={{ 
          background: '#050510',
          color: '#F8FAFC',
        }}
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
