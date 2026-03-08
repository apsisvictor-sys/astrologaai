'use client';

import { useState } from 'react';
import { Partner, CreatePartnerData, UpdatePartnerData, partnersApi, PartnersAPIError } from '@/lib/partners-api';

interface PartnerFormProps {
  partner?: Partner | null;
  onSuccess: (partner: Partner) => void;
  onCancel: () => void;
  language?: 'bg' | 'en';
}

const RELATIONSHIP_TYPES = [
  { value: 'romantic', label: 'Romantic', color: '#ff0080' },
  { value: 'friend',   label: 'Friend',   color: '#00f0ff' },
  { value: 'family',   label: 'Family',   color: '#F59E0B' },
  { value: 'business', label: 'Business', color: '#A78BFA' },
  { value: 'other',    label: 'Other',    color: '#64748B' },
];

// Simplified geocoding for common cities
const CITY_COORDS: Record<string, { lat: number; lng: number; tz: string }> = {
  'sofia':    { lat: 42.6977, lng: 23.3219, tz: 'Europe/Sofia' },
  'софия':   { lat: 42.6977, lng: 23.3219, tz: 'Europe/Sofia' },
  'plovdiv':  { lat: 42.1354, lng: 24.7453, tz: 'Europe/Sofia' },
  'пловдив': { lat: 42.1354, lng: 24.7453, tz: 'Europe/Sofia' },
  'varna':    { lat: 43.2141, lng: 27.9147, tz: 'Europe/Sofia' },
  'варна':   { lat: 43.2141, lng: 27.9147, tz: 'Europe/Sofia' },
  'burgas':   { lat: 42.5048, lng: 27.4626, tz: 'Europe/Sofia' },
  'бургас':  { lat: 42.5048, lng: 27.4626, tz: 'Europe/Sofia' },
};

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  borderRadius: '12px',
  padding: '10px 14px',
  width: '100%',
  fontSize: '14px',
  outline: 'none',
};

const labelStyle = { color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: 6, display: 'block' as const };

export function PartnerForm({ partner, onSuccess, onCancel, language = 'bg' }: PartnerFormProps) {
  const isEdit = !!partner;

  const [form, setForm] = useState({
    name: partner?.name ?? '',
    label: partner?.label ?? '',
    relationshipType: partner?.relationshipType ?? 'romantic',
    birthDate: partner?.birthData?.date ?? '',
    birthTime: partner?.birthData?.time ?? '',
    isUnknownTime: partner?.birthData?.isUnknownTime ?? false,
    locationName: partner?.birthData?.location ?? '',
    latitude: partner?.birthData?.latitude ?? 0,
    longitude: partner?.birthData?.longitude ?? 0,
    timezone: partner?.birthData?.timezone ?? 'Europe/Sofia',
    notes: partner?.notes ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set(field: string, value: string | boolean | number) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }

  function handleLocation(val: string) {
    set('locationName', val);
    const key = val.toLowerCase().split(',')[0].trim();
    const coords = CITY_COORDS[key];
    if (coords) {
      set('latitude', coords.lat);
      set('longitude', coords.lng);
      set('timezone', coords.tz);
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.birthDate) e.birthDate = 'Birth date is required';
    else if (new Date(form.birthDate) > new Date()) e.birthDate = 'Birth date cannot be in the future';
    if (!form.locationName.trim()) e.locationName = 'Birth location is required';
    if (form.birthTime && !form.isUnknownTime && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(form.birthTime)) {
      e.birthTime = 'Use HH:MM format';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setApiError(null);
    setSubmitting(true);

    try {
      if (isEdit && partner) {
        const data: UpdatePartnerData = {
          name: form.name.trim(),
          label: form.label.trim() || undefined,
          relationshipType: form.relationshipType as any,
          birthDate: form.birthDate,
          birthTime: form.isUnknownTime ? undefined : form.birthTime || undefined,
          locationName: form.locationName.trim(),
          latitude: form.latitude,
          longitude: form.longitude,
          timezone: form.timezone,
          isUnknownTime: form.isUnknownTime,
          notes: form.notes.trim() || undefined,
        };
        const updated = await partnersApi.update(partner.id, data);
        onSuccess(updated);
      } else {
        const data: CreatePartnerData = {
          name: form.name.trim(),
          label: form.label.trim() || undefined,
          relationshipType: form.relationshipType as any,
          birthDate: form.birthDate,
          birthTime: form.isUnknownTime ? undefined : form.birthTime || undefined,
          locationName: form.locationName.trim(),
          latitude: form.latitude || 42.6977,
          longitude: form.longitude || 23.3219,
          timezone: form.timezone || 'Europe/Sofia',
          isUnknownTime: form.isUnknownTime,
          notes: form.notes.trim() || undefined,
        };
        const created = await partnersApi.create(data);
        onSuccess(created);
      }
    } catch (err) {
      setApiError(err instanceof PartnersAPIError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="w-full max-w-lg mx-auto rounded-2xl p-6"
      style={{
        background: '#0D0010',
        border: '1px solid rgba(228,26,255,0.2)',
        backdropFilter: 'blur(16px)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}
    >
      <h2 className="text-xl font-bold text-white mb-5">{isEdit ? 'Edit Partner' : 'Add Partner'}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label style={labelStyle}>Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Partner's name"
            style={{ ...inputStyle, borderColor: errors.name ? '#EF4444' : 'rgba(255,255,255,0.1)' }}
          />
          {errors.name && <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{errors.name}</p>}
        </div>

        {/* Label */}
        <div>
          <label style={labelStyle}>Label</label>
          <input
            type="text"
            value={form.label}
            onChange={e => set('label', e.target.value)}
            placeholder="e.g. Spouse, Best friend"
            style={inputStyle}
          />
        </div>

        {/* Relationship type */}
        <div>
          <label style={labelStyle}>Relationship Type</label>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIP_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => set('relationshipType', type.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={
                  form.relationshipType === type.value
                    ? { background: `${type.color}20`, color: type.color, border: `1px solid ${type.color}50` }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Birth date */}
        <div>
          <label style={labelStyle}>Birth Date *</label>
          <input
            type="date"
            value={form.birthDate}
            onChange={e => set('birthDate', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={{ ...inputStyle, borderColor: errors.birthDate ? '#EF4444' : 'rgba(255,255,255,0.1)', colorScheme: 'dark' }}
          />
          {errors.birthDate && <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{errors.birthDate}</p>}
        </div>

        {/* Birth time */}
        <div>
          <label style={labelStyle}>Birth Time</label>
          <input
            type="time"
            value={form.birthTime}
            onChange={e => set('birthTime', e.target.value)}
            disabled={form.isUnknownTime}
            style={{ ...inputStyle, opacity: form.isUnknownTime ? 0.4 : 1, colorScheme: 'dark', borderColor: errors.birthTime ? '#EF4444' : 'rgba(255,255,255,0.1)' }}
          />
          {errors.birthTime && <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{errors.birthTime}</p>}
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isUnknownTime}
              onChange={e => set('isUnknownTime', e.target.checked)}
              style={{ accentColor: '#e41aff' }}
            />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Time unknown</span>
          </label>
        </div>

        {/* Location */}
        <div>
          <label style={labelStyle}>Birth Location *</label>
          <input
            type="text"
            value={form.locationName}
            onChange={e => handleLocation(e.target.value)}
            placeholder="e.g. Sofia, Bulgaria"
            style={{ ...inputStyle, borderColor: errors.locationName ? '#EF4444' : 'rgba(255,255,255,0.1)' }}
          />
          {errors.locationName && <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{errors.locationName}</p>}
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Additional notes..."
            rows={2}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        {/* API error */}
        {apiError && (
          <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {apiError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff, #00f0ff)' }}
          >
            {submitting ? 'Saving...' : (isEdit ? 'Save' : 'Add Partner')}
          </button>
        </div>
      </form>
    </div>
  );
}
