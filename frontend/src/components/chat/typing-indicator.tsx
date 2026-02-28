/**
 * Typing Indicator Component
 * US-10: Streaming Responses
 * 
 * Shows animated typing indicator when AI is generating response
 */

'use client';

import React from 'react';

interface TypingIndicatorProps {
  language?: 'bg' | 'en';
  variant?: 'dots' | 'text' | 'full';
}

export function TypingIndicator({ 
  language = 'bg', 
  variant = 'full' 
}: TypingIndicatorProps) {
  const texts = {
    bg: {
      thinking: 'Мисля...',
      analyzing: 'Анализирам картата...',
    },
    en: {
      thinking: 'Thinking...',
      analyzing: 'Analyzing your chart...',
    },
  };

  const t = texts[language];

  if (variant === 'dots') {
    return (
      <div className="flex items-center gap-1">
        <div 
          className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div 
          className="w-2 h-2 rounded-full bg-[#A78BFA] animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div 
          className="w-2 h-2 rounded-full bg-[#C4B5FD] animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <span className="text-sm text-[#8B5CF6] animate-pulse">
        {t.thinking}
      </span>
    );
  }

  // Full variant with avatar and message
  return (
    <div className="flex justify-start mb-4 animate-fade-up">
      <div 
        className="bg-[#0A0A1F] border border-[#1A1A3A] rounded-2xl px-5 py-4 max-w-[80%]"
        style={{
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Avatar indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ 
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            }}
          >
            ✨
          </div>
          <span className="text-xs text-[#CBD5E1] font-medium">AstroLogAI</span>
        </div>

        {/* Typing animation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div 
              className="w-2 h-2 rounded-full bg-[#A78BFA] animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div 
              className="w-2 h-2 rounded-full bg-[#C4B5FD] animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-sm text-[#64748B]">{t.thinking}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline Typing Indicator
 * Compact version for use in headers
 */
export function InlineTypingIndicator({ language = 'bg' }: { language?: 'bg' | 'en' }) {
  const text = language === 'bg' ? 'Пише...' : 'Typing...';

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/20">
      <div className="flex items-center gap-1">
        <div 
          className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div 
          className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div 
          className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="text-xs text-[#8B5CF6]">{text}</span>
    </div>
  );
}

/**
 * Streaming Cursor
 * Animated cursor shown at the end of streaming content
 */
export function StreamingCursor() {
  return (
    <span 
      className="inline-block w-2 h-4 ml-1 bg-[#8B5CF6] animate-pulse rounded-sm"
      style={{
        animation: 'blink 1s infinite',
      }}
    />
  );
}

// Add keyframes for cursor blink
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

export default TypingIndicator;
