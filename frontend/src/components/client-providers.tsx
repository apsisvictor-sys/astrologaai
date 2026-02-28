/**
 * Client Providers
 * US-27: Toggle Language Mid-Session
 * 
 * Client-side wrapper for providers that need browser APIs.
 * Includes LanguageProvider for real-time language switching.
 */

'use client';

import { ReactNode, useEffect } from 'react';
import { LanguageProvider } from '@/lib/language-context';

// Import i18n to initialize it on client side
import '@/lib/i18n';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  // Initialize i18n language from stored preference on mount
  useEffect(() => {
    // This runs only on client after hydration
  }, []);

  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}
