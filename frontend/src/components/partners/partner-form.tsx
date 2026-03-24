'use client';

import { useState, useRef } from 'react';
import { Partner, CreatePartnerData, UpdatePartnerData, partnersApi, PartnersAPIError } from '@/lib/partners-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

interface LocationSuggestion {
  city: string;
  country: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

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

  // Location search state
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(!!partner?.birthData?.location);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQueryRef = useRef('');

  function set(field: string, value: string | boolean | number) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }

  async function searchLocation(query: string) {
    currentQueryRef.current = query;
    if (query.length < 2) { setLocationSuggestions([]); setLocationSearching(false); return; }
    setLocationSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/locations/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (currentQueryRef.current !== query) return;
      setLocationSuggestions(data.data?.locations || []);
    } catch {
      if (currentQueryRef.current === query) setLocationSuggestions([]);
    } finally {
      if (currentQueryRef.current === query) setLocationSearching(false);
    }
  }

  function handleLocationChange(val: string) {
    set('locationName', val);
    setLocationConfirmed(false);
    set('latitude', 0);
    set('longitude', 0);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchLocation(val), 300);
  }

  function selectLocation(s: LocationSuggestion) {
    const label = s.city ? `${s.city}${s.country ? ', ' + s.country : ''}` : s.displayName;
    set('locationName', label);
    set('latitude', s.latitude);
    set('longitude', s.longitude);
    setLocationSuggestions([]);
    setLocationConfirmed(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.birthDate) e.birthDate = 'Birth date is required';
    else if (new Date(form.birthDate) > new Date()) e.birthDate = 'Birth date cannot be in the future';
    if (!form.locationName.trim()) e.locationName = 'Birth location is required';
    else if (!locationConfirmed) e.locationName = 'Select a location from the dropdown';
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
        <div className="relative">
          <label style={labelStyle}>Birth Location *</label>
          <div className="relative">
            <input
              type="text"
              value={form.locationName}
              onChange={e => handleLocationChange(e.target.value)}
              placeholder="e.g. Sofia, Bulgaria"
              style={{ ...inputStyle, borderColor: errors.locationName ? '#EF4444' : locationConfirmed ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)' }}
            />
            {locationSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(228,26,255,0.6)', borderTopColor: 'transparent' }} />
            )}
          </div>
          {locationSuggestions.length > 0 && !locationConfirmed && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20" style={{ background: '#1a0b1c', border: '1px solid rgba(228,26,255,0.2)' }}>
              {locationSuggestions.slice(0, 5).map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => selectLocation(s)}
                >
                  <div>{s.city || s.displayName}</div>
                  {s.country && <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.displayName}</div>}
                </button>
              ))}
            </div>
          )}
          {errors.locationName && <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{errors.locationName}</p>}
          {locationConfirmed && form.latitude > 66 && (
            <p className="mt-1 text-xs" style={{ color: '#F59E0B' }}>
              ⚠ Polar latitude (&gt;66°N) — ASC calculations may be less accurate at extreme northern latitudes.
            </p>
          )}
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
