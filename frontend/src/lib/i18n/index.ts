/**
 * i18n Configuration
 * US-27: Toggle Language Mid-Session
 * 
 * Configures i18next for client-side language switching.
 * Uses lazy initialization to avoid SSR issues.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bg from './bg.json';
import en from './en.json';

const resources = {
  bg: { translation: bg },
  en: { translation: en },
};

// Get stored language or default to Bulgarian
const getStoredLanguage = (): string => {
  if (typeof window === 'undefined') return 'bg';
  
  try {
    const storedUser = localStorage.getItem('astrologaai_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.language) return user.language;
    }
  } catch {
    // Ignore errors
  }
  
  return 'bg';
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'bg', // Default language, will be updated on client
    fallbackLng: 'bg',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },
    // Skip initialization on server
    initImmediate: false,
  });

// Update language on client side only
if (typeof window !== 'undefined') {
  const storedLang = getStoredLanguage();
  if (storedLang !== i18n.language) {
    i18n.changeLanguage(storedLang);
  }
}

export default i18n;

// Helper to change language and persist
export const changeLanguage = async (lang: 'bg' | 'en'): Promise<void> => {
  await i18n.changeLanguage(lang);
  
  // Update stored user preference
  if (typeof window !== 'undefined') {
    try {
      const storedUser = localStorage.getItem('astrologaai_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.language = lang;
        localStorage.setItem('astrologaai_user', JSON.stringify(user));
      }
    } catch {
      // Ignore errors
    }
  }
};

// Get current language
export const getCurrentLanguage = (): 'bg' | 'en' => {
  return (i18n.language || 'bg') as 'bg' | 'en';
};
