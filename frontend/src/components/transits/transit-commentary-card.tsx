'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { UpgradeModal } from '@/components/shell/upgrade-modal';

interface CommentaryData {
  headline: string;
  body: string;
  significantAspects: string[];
  generatedAt: string;
}

interface TransitCommentaryCardProps {
  locale?: string;
}

function CommentarySkeleton() {
  return (
    <div
      className="rounded-2xl p-5 mb-8 animate-pulse"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(228,26,255,0.12)',
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-7 h-7 rounded-full shrink-0"
          style={{ background: 'rgba(228,26,255,0.08)' }}
        />
        <div className="h-3 rounded w-28" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div className="space-y-2.5">
        <div className="h-4 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-3 rounded w-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-3 rounded w-5/6" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-3 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: 'FREE' | 'PRO' | 'PREMIUM' }) {
  if (tier === 'PREMIUM') {
    return (
      <span
        className="text-[9px] uppercase tracking-[0.15em] font-bold px-2.5 py-0.5 rounded-full"
        style={{
          background: 'rgba(139,92,246,0.15)',
          color: '#A78BFA',
          border: '1px solid rgba(139,92,246,0.3)',
        }}
      >
        PREMIUM
      </span>
    );
  }
  if (tier === 'PRO') {
    return (
      <span
        className="text-[9px] uppercase tracking-[0.15em] font-bold px-2.5 py-0.5 rounded-full"
        style={{
          background: 'rgba(245,158,11,0.12)',
          color: '#F59E0B',
          border: '1px solid rgba(245,158,11,0.28)',
        }}
      >
        PRO
      </span>
    );
  }
  return null;
}

export function TransitCommentaryCard({ locale = 'en' }: TransitCommentaryCardProps) {
  const { user, isAuthenticated } = useAuth();
  const tier = user?.tier ?? 'FREE';

  const [data, setData] = useState<CommentaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('astrologaai_access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch(`${getApiBaseUrl()}/api/v1/transits/commentary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else {
          setHasError(true);
        }
      })
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  if (isLoading) return <CommentarySkeleton />;

  // Error state
  if (hasError || !data) {
    return (
      <div
        className="rounded-2xl p-4 mb-8 flex items-center gap-2.5"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span className="text-base" style={{ filter: 'drop-shadow(0 0 4px rgba(228,26,255,0.4))' }}>
          ✦
        </span>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {locale === 'bg'
            ? 'Oracle коментарът не е наличен днес.'
            : 'Transit commentary unavailable today.'}
        </p>
      </div>
    );
  }

  const isPremium = tier === 'PREMIUM';

  const cardStyle = isPremium
    ? {
        background: 'rgba(139,92,246,0.06)',
        border: '1px solid rgba(139,92,246,0.25)',
        boxShadow: '0 0 32px rgba(139,92,246,0.08)',
      }
    : {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(228,26,255,0.15)',
        boxShadow: '0 0 24px rgba(228,26,255,0.06)',
      };

  const glyphColor = isPremium ? 'rgba(139,92,246,0.8)' : 'rgba(228,26,255,0.8)';
  const glyphBg = isPremium ? 'rgba(139,92,246,0.15)' : 'rgba(228,26,255,0.10)';
  const glyphBorder = isPremium ? 'rgba(139,92,246,0.35)' : 'rgba(228,26,255,0.30)';
  const labelColor = isPremium ? '#A78BFA' : 'rgba(228,26,255,0.85)';
  const aspectBg = isPremium ? 'rgba(139,92,246,0.12)' : 'rgba(228,26,255,0.08)';
  const aspectColor = isPremium ? '#A78BFA' : 'rgba(228,26,255,0.85)';
  const aspectBorder = isPremium ? 'rgba(139,92,246,0.2)' : 'rgba(228,26,255,0.15)';

  // FREE tier: show first ~180 chars as visible teaser, rest blurred
  const TEASER_LEN = 180;
  const visibleText = tier === 'FREE' ? data.body.slice(0, TEASER_LEN).trimEnd() + '…' : data.body;
  const blurredText = tier === 'FREE' ? data.body.slice(TEASER_LEN) : '';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="rounded-2xl p-5 mb-8"
        style={cardStyle}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Oracle glyph */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: glyphBg,
                border: `1px solid ${glyphBorder}`,
              }}
            >
              <span
                className="text-sm leading-none"
                style={{ filter: `drop-shadow(0 0 6px ${glyphColor})` }}
              >
                ✦
              </span>
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: labelColor }}
            >
              {locale === 'bg' ? 'Oracle коментар' : 'Oracle Commentary'}
            </span>
          </div>
          <TierBadge tier={tier} />
        </div>

        {/* Headline */}
        <h3
          className="text-sm font-semibold leading-snug mb-3"
          style={{ color: 'rgba(255,255,255,0.92)' }}
        >
          {data.headline}
        </h3>

        {/* Body */}
        {tier === 'FREE' ? (
          <div>
            {/* Visible teaser */}
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {visibleText}
            </p>
            {/* Blurred continuation */}
            {blurredText && (
              <div className="relative overflow-hidden rounded-lg mt-1">
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: 'rgba(255,255,255,0.55)',
                    filter: 'blur(5px)',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  aria-hidden="true"
                >
                  {blurredText}
                </p>
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(13,0,16,0.0) 0%, rgba(13,0,16,0.92) 65%)',
                  }}
                />
              </div>
            )}
            {/* Upgrade CTA */}
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <motion.button
                onClick={() => setUpgradeOpen(true)}
                whileTap={{ scale: 0.97 }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
              >
                {locale === 'bg' ? 'Отключи с PRO' : 'Unlock with PRO'}
              </motion.button>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {locale === 'bg'
                  ? 'Персонализиран Oracle анализ'
                  : 'Personalised Oracle analysis'}
              </span>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {data.body}
            </p>
            {/* Significant aspects */}
            {data.significantAspects?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.significantAspects.map((aspect, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: aspectBg,
                      color: aspectColor,
                      border: `1px solid ${aspectBorder}`,
                    }}
                  >
                    {aspect}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      <UpgradeModal
        isOpen={upgradeOpen}
        feature={locale === 'bg' ? 'Oracle Transit Коментар' : 'Oracle Transit Commentary'}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}
