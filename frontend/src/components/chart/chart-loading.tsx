'use client';

import React from 'react';

// Design system colors
const colors = {
  background: '#050510',
  surface: '#0A0A1F',
  primary: '#8B5CF6',
  secondary: '#EC4899',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
};

interface ChartLoadingProps {
  message?: string;
  subMessage?: string;
}

export default function ChartLoading({ 
  message = 'Calculating your cosmic blueprint...', 
  subMessage = 'This takes just a few seconds' 
}: ChartLoadingProps) {
  return (
    <div 
      className="min-h-[400px] flex flex-col items-center justify-center p-8"
      style={{ background: colors.surface }}
    >
      {/* Cosmic Spinner */}
      <div className="relative w-32 h-32 mb-8">
        {/* Outer ring */}
        <div 
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: '3px solid transparent',
            borderTopColor: colors.primary,
            borderRightColor: colors.secondary,
            animationDuration: '2s',
          }}
        />
        
        {/* Middle ring */}
        <div 
          className="absolute inset-3 rounded-full animate-spin"
          style={{
            border: '2px solid transparent',
            borderTopColor: colors.secondary,
            borderLeftColor: colors.primary,
            animationDuration: '1.5s',
            animationDirection: 'reverse',
          }}
        />
        
        {/* Inner ring */}
        <div 
          className="absolute inset-6 rounded-full animate-spin"
          style={{
            border: '2px solid transparent',
            borderBottomColor: colors.primary,
            borderTopColor: colors.secondary,
            animationDuration: '1s',
          }}
        />

        {/* Center star */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg 
            className="w-8 h-8 animate-pulse"
            viewBox="0 0 24 24" 
            fill="none"
          >
            <path 
              d="M12 2L13.09 8.26L19 6L14.74 10.91L21 12L14.74 13.09L19 18L13.09 15.74L12 22L10.91 15.74L5 18L9.26 13.09L3 12L9.26 10.91L5 6L10.91 8.26L12 2Z" 
              fill={colors.primary}
            />
          </svg>
        </div>

        {/* Floating particles */}
        <div 
          className="absolute -inset-4"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${colors.primary}20 0%, transparent 70%)`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Loading text */}
      <h3 
        className="text-xl font-semibold mb-2 text-center"
        style={{ color: colors.textPrimary }}
      >
        {message}
      </h3>
      <p 
        className="text-center"
        style={{ color: colors.textSecondary }}
      >
        {subMessage}
      </p>

      {/* Progress dots */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0);
            opacity: 0.3;
          }
          40% { 
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
