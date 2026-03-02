/**
 * Language Context Provider
 * US-27: Toggle Language Mid-Session
 * 
 * Provides real-time language switching without page reload.
 * Syncs with backend API and persists preference.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth-context';

// Language type
export type Language = 'bg' | 'en';

// Context type
interface LanguageContextType {
  language: Language;
  toggleLanguage: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  isChanging: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n, t } = useTranslation();
  const { user, updateUserLanguage } = useAuth();
  const [isChanging, setIsChanging] = useState(false);
  
  // Get current language from i18n
  const language = (i18n.language || 'bg') as Language;
  
  // Sync language with user preference on mount and when user changes
  useEffect(() => {
    if (user?.language && user.language !== i18n.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language, i18n]);
  
  // Update language via API and locally
  const setLanguage = useCallback(async (lang: Language) => {
    if (lang === language) return;
    
    setIsChanging(true);
    
    try {
      // Update i18n immediately for instant UI update
      await i18n.changeLanguage(lang);
      
      // Update local storage
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('astrologaai_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userData.language = lang;
          localStorage.setItem('astrologaai_user', JSON.stringify(userData));
        }
      }
      
      // Sync with backend (if authenticated)
      if (user) {
        try {
          const token = localStorage.getItem('astrologaai_access_token');
          await fetch(`${API_URL}/api/v1/user/preferences`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Accept-Language': lang,
            },
            body: JSON.stringify({ language: lang }),
          });
          
          // Also update via auth context if available
          if (updateUserLanguage) {
            await updateUserLanguage(lang);
          }
        } catch (err) {
          console.error('[Language] Failed to sync with backend:', err);
          // Don't throw - local change is still valid
        }
      }
    } catch (err) {
      console.error('[Language] Failed to change language:', err);
      throw err;
    } finally {
      setIsChanging(false);
    }
  }, [language, i18n, user, updateUserLanguage]);
  
  // Toggle between bg and en
  const toggleLanguage = useCallback(async () => {
    const newLang: Language = language === 'bg' ? 'en' : 'bg';
    await setLanguage(newLang);
  }, [language, setLanguage]);
  
  return (
    <LanguageContext.Provider 
      value={{ 
        language, 
        toggleLanguage, 
        setLanguage, 
        isChanging,
        t 
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to use language context
 */
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
