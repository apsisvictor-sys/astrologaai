'use client';

import { useRouter } from '@/i18n/navigation';
import { Partner } from '@/lib/partners-api';
import { formatDate } from '@/lib/format';

interface PartnerCardProps {
  partner: Partner;
  onEdit: (partner: Partner) => void;
  onDelete: (partner: Partner) => void;
  language?: 'bg' | 'en';
}

const TYPE_LABELS: Record<string, { en: string; bg: string; color: string }> = {
  romantic: { en: 'Romantic',  bg: 'Романтична', color: '#ff0080' },
  friend:   { en: 'Friend',    bg: 'Приятел',    color: '#00f0ff' },
  family:   { en: 'Family',    bg: 'Семейство',  color: '#F59E0B' },
  business: { en: 'Business',  bg: 'Бизнес',     color: '#A78BFA' },
  other:    { en: 'Other',     bg: 'Друго',       color: '#64748B' },
};

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

function signSym(sign?: string) {
  return sign ? (SIGN_SYMBOLS[sign] ?? '') + ' ' + sign : '—';
}

function fmtPartnerDate(dateStr: string, language: 'bg' | 'en') {
  return formatDate(dateStr, 'short', language === 'bg' ? 'bg-BG' : undefined);
}

export function PartnerCard({ partner, onEdit, onDelete, language = 'bg' }: PartnerCardProps) {
  const router = useRouter();
  const typeInfo = TYPE_LABELS[partner.relationshipType] ?? TYPE_LABELS.other;
  const typeLabel = language === 'bg' ? typeInfo.bg : typeInfo.en;
  const typeColor = typeInfo.color;

  return (
    <div
      className="group relative p-5 rounded-2xl transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(228,26,255,0.25)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 24px rgba(228,26,255,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.07)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Relationship type badge */}
      <span
        className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{
          background: `${typeColor}15`,
          color: typeColor,
          border: `1px solid ${typeColor}30`,
        }}
      >
        {typeLabel}
      </span>

      {/* Name + label */}
      <h3 className="text-lg font-bold text-white pr-20 mb-0.5">{partner.name}</h3>
      {partner.label && (
        <p className="text-xs mb-3" style={{ color: 'rgba(228,26,255,0.7)' }}>{partner.label}</p>
      )}

      {/* Big 3 signs */}
      {partner.chartSummary && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {partner.chartSummary.sunSign && (
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}>
              ☉ {signSym(partner.chartSummary.sunSign)}
            </span>
          )}
          {partner.chartSummary.moonSign && (
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(203,213,225,0.08)', color: '#CBD5E1', border: '1px solid rgba(203,213,225,0.15)' }}>
              ☽ {signSym(partner.chartSummary.moonSign)}
            </span>
          )}
          {partner.chartSummary.risingSign && (
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,240,255,0.08)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)' }}>
              ↑ {signSym(partner.chartSummary.risingSign)}
            </span>
          )}
        </div>
      )}

      {/* Birth data */}
      <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {fmtPartnerDate(partner.birthData.date, language)}
        {partner.birthData.time ? ` · ${partner.birthData.time}` : ' · time unknown'}
      </p>
      <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {partner.birthData.location}
      </p>

      {/* Action buttons — always visible */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/partners/${partner.id}/report`)}
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
        >
          Report
        </button>
        <button
          onClick={() => router.push(`/partners/${partner.id}/synastry`)}
          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{ background: 'rgba(0,240,255,0.08)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)' }}
        >
          Synastry
        </button>
        <button
          onClick={() => router.push(`/partners/${partner.id}/composite`)}
          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{ background: 'rgba(228,26,255,0.08)', color: '#e41aff', border: '1px solid rgba(228,26,255,0.2)' }}
        >
          Composite
        </button>
        <button
          onClick={() => onEdit(partner)}
          className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(partner)}
          className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{ background: 'rgba(239,68,68,0.06)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
