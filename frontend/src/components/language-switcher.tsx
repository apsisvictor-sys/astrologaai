/**
 * Language Switcher Component
 * US-27: Toggle Language Mid-Session
 * 
 * Allows users to switch between Bulgarian and English
 */

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useState } from 'react';

export function LanguageSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const switchLocale = (newLocale: 'bg' | 'en') => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{
          background: 'rgba(26, 26, 42, 0.8)',
          border: '1px solid #1A1A3A',
          color: '#CBD5E1',
        }}
        aria-label={t('settings.language.selectLanguage')}
      >
        <span className="text-lg">
          {locale === 'bg' ? '🇧🇬' : '🇬🇧'}
        </span>
        <span className="text-sm font-medium">
          {locale === 'bg' ? 'BG' : 'EN'}
        </span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="absolute right-0 mt-2 w-40 rounded-lg shadow-lg z-20"
            style={{
              background: '#0A0A1F',
              border: '1px solid #1A1A3A',
            }}
          >
            <button
              onClick={() => switchLocale('bg')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1A1A3A]"
              style={{
                color: locale === 'bg' ? '#8B5CF6' : '#CBD5E1',
              }}
            >
              <span className="text-lg">🇧🇬</span>
              <span className="text-sm">Български</span>
              {locale === 'bg' && (
                <span className="ml-auto text-xs" style={{ color: '#8B5CF6' }}>✓</span>
              )}
            </button>
            <button
              onClick={() => switchLocale('en')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1A1A3A]"
              style={{
                color: locale === 'en' ? '#8B5CF6' : '#CBD5E1',
              }}
            >
              <span className="text-lg">🇬🇧</span>
              <span className="text-sm">English</span>
              {locale === 'en' && (
                <span className="ml-auto text-xs" style={{ color: '#8B5CF6' }}>✓</span>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
