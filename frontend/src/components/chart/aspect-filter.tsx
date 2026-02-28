/**
 * Aspect Filter Component - US-14: Explore Chart Aspects
 * 
 * Filter aspects by type and nature
 */

'use client';

import React from 'react';

// Design system colors (US-12 spec)
const colors = {
  background: '#0A0A0F',
  surface: '#0A0A1F',
  primary: '#7C3AED',
  secondary: '#EC4899',
  textPrimary: '#FAFAFA',
  textSecondary: '#CBD5E1',
  border: '#252532',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

export type AspectType = 'all' | 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
export type AspectNature = 'all' | 'harmonious' | 'challenging' | 'neutral';

interface AspectFilterProps {
  selectedType: AspectType;
  selectedNature: AspectNature;
  onTypeChange: (type: AspectType) => void;
  onNatureChange: (nature: AspectNature) => void;
  language: 'en' | 'bg';
}

const ASPECT_TYPES: { value: AspectType; labelEn: string; labelBg: string; color: string }[] = [
  { value: 'all', labelEn: 'All', labelBg: 'Всички', color: colors.textSecondary },
  { value: 'conjunction', labelEn: 'Conjunction', labelBg: 'Съвпад', color: colors.primary },
  { value: 'sextile', labelEn: 'Sextile', labelBg: 'Секстил', color: colors.success },
  { value: 'square', labelEn: 'Square', labelBg: 'Квадрат', color: colors.error },
  { value: 'trine', labelEn: 'Trine', labelBg: 'Тригон', color: '#06B6D4' },
  { value: 'opposition', labelEn: 'Opposition', labelBg: 'Опозиция', color: colors.secondary },
];

const ASPECT_NATURES: { value: AspectNature; labelEn: string; labelBg: string; color: string }[] = [
  { value: 'all', labelEn: 'All', labelBg: 'Всички', color: colors.textSecondary },
  { value: 'harmonious', labelEn: 'Harmonious', labelBg: 'Хармонични', color: colors.success },
  { value: 'challenging', labelEn: 'Challenging', labelBg: 'Напрегнати', color: colors.error },
  { value: 'neutral', labelEn: 'Neutral', labelBg: 'Неутрални', color: colors.primary },
];

export default function AspectFilter({
  selectedType,
  selectedNature,
  onTypeChange,
  onNatureChange,
  language,
}: AspectFilterProps) {
  const isBulgarian = language === 'bg';

  return (
    <div className="space-y-4">
      {/* Aspect Type Filter */}
      <div>
        <h4 className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
          {isBulgarian ? 'Тип аспект' : 'Aspect Type'}
        </h4>
        <div className="flex flex-wrap gap-2">
          {ASPECT_TYPES.map((type) => {
            const isSelected = selectedType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => onTypeChange(type.value)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: isSelected ? `${type.color}20` : colors.background,
                  color: isSelected ? type.color : colors.textSecondary,
                  border: `1px solid ${isSelected ? type.color : colors.border}`,
                }}
              >
                {isBulgarian ? type.labelBg : type.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aspect Nature Filter */}
      <div>
        <h4 className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
          {isBulgarian ? 'Характер на аспекта' : 'Aspect Nature'}
        </h4>
        <div className="flex flex-wrap gap-2">
          {ASPECT_NATURES.map((nature) => {
            const isSelected = selectedNature === nature.value;
            return (
              <button
                key={nature.value}
                onClick={() => onNatureChange(nature.value)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: isSelected ? `${nature.color}20` : colors.background,
                  color: isSelected ? nature.color : colors.textSecondary,
                  border: `1px solid ${isSelected ? nature.color : colors.border}`,
                }}
              >
                {isBulgarian ? nature.labelBg : nature.labelEn}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { ASPECT_TYPES, ASPECT_NATURES };
