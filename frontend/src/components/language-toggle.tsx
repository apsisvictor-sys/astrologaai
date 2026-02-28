/**
 * Language Toggle Component
 * US-27: Toggle Language Mid-Session
 * 
 * Instant language switch button with flag icons.
 * Displays in header for easy access.
 * 
 * Design Specifications:
 * - Primary: #7C3AED (Stellar Purple)
 * - Secondary: #EC4899 (Nebula Pink)
 * - Text Primary: #FAFAFA
 * - Text Secondary: #CBD5E1
 * - Border radius: 12px
 */

'use client';

import React from 'react';
import { useLanguage } from '@/lib/language-context';

interface LanguageToggleProps {
  /** Compact mode for mobile headers */
  compact?: boolean;
  /** Show label alongside flag */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function LanguageToggle({ 
  compact = false, 
  showLabel = false,
  className = '' 
}: LanguageToggleProps) {
  const { language, toggleLanguage, isChanging, t } = useLanguage();
  
  const flags = {
    bg: '🇧🇬',
    en: '🇬🇧',
  };
  
  const labels = {
    bg: 'БГ',
    en: 'EN',
  };
  
  const nextLang: 'bg' | 'en' = language === 'bg' ? 'en' : 'bg';
  
  return (
    <button
      onClick={toggleLanguage}
      disabled={isChanging}
      className={`
        flex items-center justify-center gap-2 
        px-3 py-2 rounded-xl 
        transition-all duration-200
        hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        background: 'rgba(124, 58, 237, 0.15)',
        border: '1px solid rgba(124, 58, 237, 0.3)',
        borderRadius: '12px',
        minWidth: compact ? '40px' : 'auto',
      }}
      title={t('language.toggleHint')}
      aria-label={`Switch to ${nextLang === 'bg' ? 'Bulgarian' : 'English'}`}
    >
      {/* Current language flag */}
      <span 
        className={`transition-transform duration-200 ${isChanging ? 'animate-pulse' : ''}`}
        style={{ fontSize: compact ? '1.25rem' : '1.25rem' }}
      >
        {flags[language]}
      </span>
      
      {/* Optional label */}
      {showLabel && (
        <span 
          className="text-sm font-medium"
          style={{ color: '#CBD5E1' }}
        >
          {labels[language]}
        </span>
      )}
      
      {/* Loading indicator */}
      {isChanging && (
        <div 
          className="w-3 h-3 rounded-full animate-spin ml-1"
          style={{ 
            background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
          }}
        />
      )}
    </button>
  );
}

/**
 * Expanded Language Toggle with dropdown
 * Shows both language options for clarity
 */
export function LanguageToggleExpanded({ className = '' }: { className?: string }) {
  const { language, setLanguage, isChanging, t } = useLanguage();
  
  const options = [
    { code: 'bg' as const, flag: '🇧🇬', label: t('language.bulgarian'), desc: t('language.bulgarianDesc') },
    { code: 'en' as const, flag: '🇬🇧', label: t('language.english'), desc: t('language.englishDesc') },
  ];
  
  return (
    <div className={`flex gap-2 ${className}`}>
      {options.map((option) => (
        <button
          key={option.code}
          onClick={() => setLanguage(option.code)}
          disabled={isChanging}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl
            transition-all duration-200
            hover:scale-[1.02] active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          style={{
            background: language === option.code 
              ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)'
              : 'rgba(10, 10, 31, 0.5)',
            border: language === option.code 
              ? '1px solid rgba(124, 58, 237, 0.5)' 
              : '1px solid rgba(124, 58, 237, 0.2)',
            borderRadius: '12px',
          }}
        >
          <span className="text-2xl">{option.flag}</span>
          <div className="text-left">
            <div 
              className="font-medium"
              style={{ color: '#FAFAFA' }}
            >
              {option.label}
            </div>
            <div 
              className="text-xs"
              style={{ color: '#CBD5E1' }}
            >
              {option.desc}
            </div>
          </div>
          {language === option.code && (
            <div 
              className="ml-auto w-5 h-5 rounded-full flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
              }}
            >
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default LanguageToggle;
