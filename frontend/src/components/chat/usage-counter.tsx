/**
 * Usage Counter Component
 * US-07: Send Message to AI Astrologer
 * US-36: Free-tier Query Limit Enforcement
 * 
 * Shows remaining queries for free tier users
 * Displays upgrade prompt when limit reached
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/format';

interface UsageCounterProps {
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  resetAt: string;
  tier: string;
  percentage?: number | null;
  nearLimit?: boolean;
  language?: 'bg' | 'en';
}

export function UsageCounter({ 
  used, 
  limit, 
  remaining, 
  resetAt, 
  tier,
  percentage = null,
  nearLimit = false,
  language = 'bg'
}: UsageCounterProps) {
  // Don't show for unlimited tiers
  if (limit === 'unlimited' || tier === 'PRO' || tier === 'PREMIUM') {
    return null;
  }

  const isLimited = remaining === 0 || (typeof remaining === 'number' && remaining <= 0);
  const resetDate = formatDate(resetAt, 'long', language === 'bg' ? 'bg-BG' : undefined);

  // Translations
  const texts = {
    limited: language === 'bg' ? 'Достигнахте лимита' : 'Limit reached',
    remaining: language === 'bg' ? 'въпроса остават' : 'questions remaining',
    resetOn: language === 'bg' ? `Лимитът се нулира на ${resetDate}` : `Resets on ${resetDate}`,
    perMonth: language === 'bg' ? `от ${limit} на месец` : `of ${limit} per month`,
    upgradeText: language === 'bg' 
      ? 'Надградете до Pro за неограничени въпроси и още функции!'
      : 'Upgrade to Pro for unlimited questions and more features!',
    upgradeButton: language === 'bg' ? 'Надгради сега' : 'Upgrade now',
  };

  return (
    <div 
      className={`rounded-xl p-4 mb-4 ${
        isLimited 
          ? 'bg-red-500/10 border border-red-500/30' 
          : nearLimit
            ? 'bg-yellow-500/10 border border-yellow-500/30'
            : 'bg-[#0A0A1F] border border-[#1A1A3A]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isLimited 
                ? 'bg-red-500/20' 
                : nearLimit
                  ? 'bg-yellow-500/20'
                  : 'bg-[#8B5CF6]/20'
            }`}
          >
            {isLimited ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : nearLimit ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-[#F8FAFC]">
              {isLimited ? (
                texts.limited
              ) : (
                `${remaining} ${texts.remaining}`
              )}
            </div>
            <div className="text-xs text-[#64748B]">
              {isLimited 
                ? texts.resetOn
                : texts.perMonth
              }
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {!isLimited && typeof limit === 'number' && (
          <div className="w-24 h-2 bg-[#1A1A3A] rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((limit - used) / limit) * 100}%`,
                background: nearLimit
                  ? 'linear-gradient(135deg, #EAB308 0%, #EF4444 100%)'
                  : 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              }}
            />
          </div>
        )}
      </div>

      {/* Near limit warning */}
      {nearLimit && !isLimited && (
        <div className="mt-3 pt-3 border-t border-yellow-500/20">
          <p className="text-xs text-yellow-400">
            {language === 'bg'
              ? '⚠️ Приближавате месечния си лимит. Обмислете надграждане.'
              : '⚠️ You\'re approaching your monthly limit. Consider upgrading.'}
          </p>
        </div>
      )}

      {/* Upgrade prompt */}
      {isLimited && (
        <div className="mt-4 pt-4 border-t border-[#1A1A3A]">
          <p className="text-sm text-[#CBD5E1] mb-3">
            {texts.upgradeText}
          </p>
          <Link
            href="/subscription/plans"
            className="block w-full py-2.5 rounded-lg font-semibold text-white text-sm text-center transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            }}
          >
            {texts.upgradeButton}
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Compact usage indicator for header
 */
export function UsageIndicator({ 
  remaining, 
  tier,
  language = 'bg'
}: { 
  remaining: number | 'unlimited'; 
  tier: string;
  language?: 'bg' | 'en';
}) {
  if (tier === 'PRO' || tier === 'PREMIUM' || remaining === 'unlimited') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-medium">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <span>Premium</span>
      </div>
    );
  }

  const text = language === 'bg' ? 'остават' : 'remaining';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
      remaining === 0 
        ? 'bg-red-500/20 text-red-400' 
        : remaining <= 2
          ? 'bg-yellow-500/20 text-yellow-400'
          : 'bg-[#1A1A3A] text-[#CBD5E1]'
    }`}>
      <span>{remaining} {text}</span>
    </div>
  );
}

export default UsageCounter;
