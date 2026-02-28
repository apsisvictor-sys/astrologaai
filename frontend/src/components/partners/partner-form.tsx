/**
 * Partner Form Component
 * US-18: Add Partner - Form for adding/editing partners
 * 
 * Design: Follows 06-ux-ui-design.md specifications
 * - Background: #050510 (Cosmic Black)
 * - Surface: #0A0A1F (Nebula Dark)
 * - Primary: #8B5CF6 (Stellar Purple)
 * - Secondary: #EC4899 (Nebula Pink)
 * - Border radius: 12px-16px
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Partner, CreatePartnerData, UpdatePartnerData, partnersApi, PartnersAPIError } from '@/lib/partners-api';

interface PartnerFormProps {
  partner?: Partner | null; // If provided, form is in edit mode
  onSuccess: (partner: Partner) => void;
  onCancel: () => void;
  language?: 'bg' | 'en';
}

// Translations
const translations = {
  bg: {
    title: 'Добави партньор',
    editTitle: 'Редактирай партньор',
    nameLabel: 'Име',
    namePlaceholder: 'Име на партньора',
    labelLabel: 'Етикет',
    labelPlaceholder: 'напр. Съпруга, Приятел, Колега',
    typeLabel: 'Тип връзка',
    types: {
      romantic: 'Романтична',
      friend: 'Приятел',
      family: 'Семейство',
      business: 'Бизнес',
      other: 'Друго',
    },
    birthDateLabel: 'Дата на раждане',
    birthTimeLabel: 'Час на раждане',
    birthTimePlaceholder: 'HH:MM',
    unknownTime: 'Не знам точния час',
    locationLabel: 'Място на раждане',
    locationPlaceholder: 'напр. София, България',
    notesLabel: 'Бележки',
    notesPlaceholder: 'Допълнителна информация...',
    cancel: 'Отказ',
    save: 'Запази',
    add: 'Добави',
    saving: 'Запазване...',
    errors: {
      nameRequired: 'Името е задължително',
      birthDateRequired: 'Датата на раждане е задължителна',
      birthDateFuture: 'Датата не може да е в бъдещето',
      locationRequired: 'Мястото на раждане е задължително',
      invalidTime: 'Невалиден формат на часа (използвайте HH:MM)',
    },
  },
  en: {
    title: 'Add Partner',
    editTitle: 'Edit Partner',
    nameLabel: 'Name',
    namePlaceholder: "Partner's name",
    labelLabel: 'Label',
    labelPlaceholder: 'e.g., Spouse, Boyfriend, Colleague',
    typeLabel: 'Relationship Type',
    types: {
      romantic: 'Romantic',
      friend: 'Friend',
      family: 'Family',
      business: 'Business',
      other: 'Other',
    },
    birthDateLabel: 'Birth Date',
    birthTimeLabel: 'Birth Time',
    birthTimePlaceholder: 'HH:MM',
    unknownTime: "I don't know the exact time",
    locationLabel: 'Birth Location',
    locationPlaceholder: 'e.g., Sofia, Bulgaria',
    notesLabel: 'Notes',
    notesPlaceholder: 'Additional information...',
    cancel: 'Cancel',
    save: 'Save',
    add: 'Add',
    saving: 'Saving...',
    errors: {
      nameRequired: 'Name is required',
      birthDateRequired: 'Birth date is required',
      birthDateFuture: 'Birth date cannot be in the future',
      locationRequired: 'Birth location is required',
      invalidTime: 'Invalid time format (use HH:MM)',
    },
  },
};

export function PartnerForm({ partner, onSuccess, onCancel, language = 'bg' }: PartnerFormProps) {
  const t = translations[language];
  const isEditMode = !!partner;

  // Form state
  const [formData, setFormData] = useState({
    name: partner?.name || '',
    label: partner?.label || '',
    relationshipType: partner?.relationshipType || 'romantic',
    birthDate: partner?.birthData?.date || '',
    birthTime: partner?.birthData?.time || '',
    isUnknownTime: partner?.birthData?.isUnknownTime || false,
    locationName: partner?.birthData?.location || '',
    latitude: partner?.birthData?.latitude || 0,
    longitude: partner?.birthData?.longitude || 0,
    timezone: partner?.birthData?.timezone || 'Europe/Sofia',
    notes: partner?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Handle input changes
  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t.errors.nameRequired;
    }

    if (!formData.birthDate) {
      newErrors.birthDate = t.errors.birthDateRequired;
    } else if (new Date(formData.birthDate) > new Date()) {
      newErrors.birthDate = t.errors.birthDateFuture;
    }

    if (!formData.locationName.trim()) {
      newErrors.location = t.errors.locationRequired;
    }

    // Validate time format if provided and not unknown
    if (formData.birthTime && !formData.isUnknownTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(formData.birthTime)) {
        newErrors.birthTime = t.errors.invalidTime;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle location geocoding (simplified - in production would use a geocoding API)
  const handleLocationChange = async (location: string) => {
    handleChange('locationName', location);
    
    // For now, set default coordinates for common Bulgarian cities
    // In production, this would call a geocoding API
    const cityCoords: Record<string, { lat: number; lng: number; tz: string }> = {
      'софия': { lat: 42.6977, lng: 23.3219, tz: 'Europe/Sofia' },
      'sofia': { lat: 42.6977, lng: 23.3219, tz: 'Europe/Sofia' },
      'пловдив': { lat: 42.1354, lng: 24.7453, tz: 'Europe/Sofia' },
      'plovdiv': { lat: 42.1354, lng: 24.7453, tz: 'Europe/Sofia' },
      'варна': { lat: 43.2141, lng: 27.9147, tz: 'Europe/Sofia' },
      'varna': { lat: 43.2141, lng: 27.9147, tz: 'Europe/Sofia' },
      'бургас': { lat: 42.5048, lng: 27.4626, tz: 'Europe/Sofia' },
      'burgas': { lat: 42.5048, lng: 27.4626, tz: 'Europe/Sofia' },
    };

    const cityKey = location.toLowerCase().split(',')[0].trim();
    if (cityCoords[cityKey]) {
      handleChange('latitude', cityCoords[cityKey].lat);
      handleChange('longitude', cityCoords[cityKey].lng);
      handleChange('timezone', cityCoords[cityKey].tz);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (isEditMode && partner) {
        // Update existing partner
        const updateData: UpdatePartnerData = {
          name: formData.name.trim(),
          label: formData.label.trim() || undefined,
          relationshipType: formData.relationshipType as any,
          birthDate: formData.birthDate,
          birthTime: formData.isUnknownTime ? undefined : formData.birthTime,
          locationName: formData.locationName.trim(),
          latitude: formData.latitude,
          longitude: formData.longitude,
          timezone: formData.timezone,
          isUnknownTime: formData.isUnknownTime,
          notes: formData.notes.trim() || undefined,
        };

        const updated = await partnersApi.update(partner.id, updateData);
        onSuccess(updated);
      } else {
        // Create new partner
        const createData: CreatePartnerData = {
          name: formData.name.trim(),
          label: formData.label.trim() || undefined,
          relationshipType: formData.relationshipType as any,
          birthDate: formData.birthDate,
          birthTime: formData.isUnknownTime ? undefined : formData.birthTime,
          locationName: formData.locationName.trim(),
          latitude: formData.latitude || 42.6977, // Default to Sofia
          longitude: formData.longitude || 23.3219,
          timezone: formData.timezone || 'Europe/Sofia',
          isUnknownTime: formData.isUnknownTime,
          notes: formData.notes.trim() || undefined,
        };

        const created = await partnersApi.create(createData);
        onSuccess(created);
      }
    } catch (err) {
      if (err instanceof PartnersAPIError) {
        setApiError(err.message);
      } else {
        setApiError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="w-full max-w-lg mx-auto p-6 rounded-2xl"
      style={{
        background: '#0A0A1F',
        border: '1px solid rgba(124, 58, 237, 0.2)',
      }}
    >
      <h2 
        className="text-2xl font-bold mb-6"
        style={{ color: '#F8FAFC' }}
      >
        {isEditMode ? t.editTitle : t.title}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#CBD5E1' }}
          >
            {t.nameLabel} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={t.namePlaceholder}
            className="w-full px-4 py-3 rounded-xl"
            style={{
              background: '#050510',
              border: errors.name ? '1px solid #EF4444' : '1px solid #1A1A3A',
              color: '#F8FAFC',
            }}
          />
          {errors.name && (
            <p className="mt-1 text-sm" style={{ color: '#EF4444' }}>{errors.name}</p>
          )}
        </div>

        {/* Label */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#CBD5E1' }}
          >
            {t.labelLabel}
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder={t.labelPlaceholder}
            className="w-full px-4 py-3 rounded-xl"
            style={{
              background: '#050510',
              border: '1px solid #1A1A3A',
              color: '#F8FAFC',
            }}
          />
        </div>

        {/* Relationship Type */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#CBD5E1' }}
          >
            {t.typeLabel}
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(t.types).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleChange('relationshipType', value)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: formData.relationshipType === value
                    ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
                    : 'rgba(124, 58, 237, 0.1)',
                  color: formData.relationshipType === value ? '#FAFAFC' : '#CBD5E1',
                  border: formData.relationshipType === value
                    ? 'none'
                    : '1px solid rgba(124, 58, 237, 0.3)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Birth Date */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#CBD5E1' }}
          >
            {t.birthDateLabel} *
          </label>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleChange('birthDate', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 rounded-xl"
            style={{
              background: '#050510',
              border: errors.birthDate ? '1px solid #EF4444' : '1px solid #1A1A3A',
              color: '#F8FAFC',
            }}
          />
          {errors.birthDate && (
            <p className="mt-1 text-sm" style={{ color: '#EF4444' }}>{errors.birthDate}</p>
          )}
        </div>

        {/* Birth Time */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#CBD5E1' }}
          >
            {t.birthTimeLabel}
          </label>
          <input
            type="time"
            value={formData.birthTime}
            onChange={(e) => handleChange('birthTime', e.target.value)}
            placeholder={t.birthTimePlaceholder}
            disabled={formData.isUnknownTime}
            className="w-full px-4 py-3 rounded-xl disabled:opacity-50"
            style={{
              background: '#050510',
              border: errors.birthTime ? '1px solid #EF4444' : '1px solid #1A1A3A',
              color: '#F8FAFC',
            }}
          />
          {errors.birthTime && (
            <p className="mt-1 text-sm" style={{ color: '#EF4444' }}>{errors.birthTime}</p>
          )}
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isUnknownTime}
              onChange={(e) => handleChange('isUnknownTime', e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#8B5CF6' }}
            />
            <span className="text-sm" style={{ color: '#CBD5E1' }}>{t.unknownTime}</span>
          </label>
        </div>

        {/* Location */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#CBD5E1' }}
          >
            {t.locationLabel} *
          </label>
          <input
            type="text"
            value={formData.locationName}
            onChange={(e) => handleLocationChange(e.target.value)}
            placeholder={t.locationPlaceholder}
            className="w-full px-4 py-3 rounded-xl"
            style={{
              background: '#050510',
              border: errors.location ? '1px solid #EF4444' : '1px solid #1A1A3A',
              color: '#F8FAFC',
            }}
          />
          {errors.location && (
            <p className="mt-1 text-sm" style={{ color: '#EF4444' }}>{errors.location}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#CBD5E1' }}
          >
            {t.notesLabel}
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={3}
            className="w-full px-4 py-3 rounded-xl resize-none"
            style={{
              background: '#050510',
              border: '1px solid #1A1A3A',
              color: '#F8FAFC',
            }}
          />
        </div>

        {/* API Error */}
        {apiError && (
          <div 
            className="p-3 rounded-xl text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
          >
            {apiError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-xl font-medium transition-all"
            style={{
              background: 'rgba(124, 58, 237, 0.1)',
              color: '#CBD5E1',
              border: '1px solid rgba(124, 58, 237, 0.3)',
            }}
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              color: '#FAFAFC',
            }}
          >
            {isSubmitting ? t.saving : (isEditMode ? t.save : t.add)}
          </button>
        </div>
      </form>
    </div>
  );
}
