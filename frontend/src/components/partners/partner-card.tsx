/**
 * Partner Card Component
 * US-18: Add Partner - Display card for a single partner
 * US-19: Synastry Chart - View synastry button
 * 
 * Design: Follows 06-ux-ui-design.md specifications
 */

'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { Partner } from '@/lib/partners-api';

interface PartnerCardProps {
  partner: Partner;
  onEdit: (partner: Partner) => void;
  onDelete: (partner: Partner) => void;
  language?: 'bg' | 'en';
}

// Translations
const translations = {
  bg: {
    types: {
      romantic: '💕 Романтична',
      friend: '🤝 Приятел',
      family: '👨‍👩‍👧 Семейство',
      business: '💼 Бизнес',
      other: '✨ Друго',
    },
    bornIn: 'Роден/а в',
    unknownTime: 'часът е неизвестен',
    edit: 'Редактирай',
    delete: 'Изтрий',
    deleteConfirm: 'Сигурни ли сте, че искате да изтриете този партньор?',
    viewSynastry: 'Синастрия',
    viewReport: 'Доклад',
  },
  en: {
    types: {
      romantic: '💕 Romantic',
      friend: '🤝 Friend',
      family: '👨‍👩‍👧 Family',
      business: '💼 Business',
      other: '✨ Other',
    },
    bornIn: 'Born in',
    unknownTime: 'time unknown',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this partner?',
    viewSynastry: 'Synastry',
    viewReport: 'Report',
  },
};

export function PartnerCard({ partner, onEdit, onDelete, language = 'bg' }: PartnerCardProps) {
  const router = useRouter();
  const t = translations[language];

  const handleDelete = () => {
    if (window.confirm(t.deleteConfirm)) {
      onDelete(partner);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'bg' ? 'bg-BG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div 
      className="relative group p-5 rounded-2xl transition-all duration-300"
      style={{
        background: '#0A0A1F',
        border: '1px solid #1A1A3A',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.5)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(124, 58, 237, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1A1A3A';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Relationship Type Badge */}
      <div 
        className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium"
        style={{
          background: 'rgba(124, 58, 237, 0.15)',
          color: '#A78BFA',
        }}
      >
        {t.types[partner.relationshipType]}
      </div>

      {/* Partner Name */}
      <h3 
        className="text-xl font-bold mb-1 pr-20"
        style={{ color: '#F8FAFC' }}
      >
        {partner.name}
      </h3>

      {/* Custom Label */}
      {partner.label && (
        <p 
          className="text-sm mb-3"
          style={{ color: '#8B5CF6' }}
        >
          {partner.label}
        </p>
      )}

      {/* Birth Data */}
      <div 
        className="text-sm mb-3"
        style={{ color: '#CBD5E1' }}
      >
        <p>🎂 {formatDate(partner.birthData.date)}</p>
        <p>
          📍 {t.bornIn} {partner.birthData.location}
          {partner.birthData.time ? (
            <span> at {partner.birthData.time}</span>
          ) : (
            <span style={{ color: '#64748B' }}> ({t.unknownTime})</span>
          )}
        </p>
      </div>

      {/* Chart Summary */}
      {partner.chartSummary && (
        <div 
          className="flex gap-2 mb-3"
        >
          {partner.chartSummary.sunSign && (
            <span 
              className="px-2 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#FBBF24' }}
            >
              ☀️ {partner.chartSummary.sunSign}
            </span>
          )}
          {partner.chartSummary.moonSign && (
            <span 
              className="px-2 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(229, 231, 235, 0.15)', color: '#E5E7EB' }}
            >
              🌙 {partner.chartSummary.moonSign}
            </span>
          )}
          {partner.chartSummary.risingSign && (
            <span 
              className="px-2 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA' }}
            >
              ↑ {partner.chartSummary.risingSign}
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {partner.notes && (
        <p 
          className="text-sm mb-4 line-clamp-2"
          style={{ color: '#64748B' }}
        >
          📝 {partner.notes}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => router.push(`/partners/${partner.id}/report`)}
          className="flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
            color: '#FAFAFA',
          }}
        >
          🔮 {t.viewReport}
        </button>
        <button
          onClick={() => router.push(`/partners/${partner.id}/synastry`)}
          className="flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'rgba(124, 58, 237, 0.1)',
            color: '#8B5CF6',
            border: '1px solid rgba(124, 58, 237, 0.3)',
          }}
        >
          🌟 {t.viewSynastry}
        </button>
        <button
          onClick={() => onEdit(partner)}
          className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'rgba(100, 116, 139, 0.1)',
            color: '#94A3B8',
            border: '1px solid rgba(100, 116, 139, 0.3)',
          }}
        >
          {t.edit}
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#EF4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          {t.delete}
        </button>
      </div>
    </div>
  );
}
