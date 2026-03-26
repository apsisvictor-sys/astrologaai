'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/format';

// Design system colors
const colors = {
  background: '#050510',
  surface: '#0A0A1F',
  primary: '#8B5CF6',
  secondary: '#EC4899',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  border: '#252532',
  error: '#EF4444',
  success: '#10B981',
};

interface FormData {
  name: string;
  birthDate: string;
  birthTime: string;
  isUnknownTime: boolean;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
}

interface LocationResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  country: string;
  city: string;
  timezone?: string;
}

const initialFormData: FormData = {
  name: '',
  birthDate: '',
  birthTime: '',
  isUnknownTime: false,
  locationName: '',
  latitude: null,
  longitude: null,
  timezone: '',
};

export default function BirthDataForm() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Debounced location search
  useEffect(() => {
    if (formData.locationName.length < 2) {
      setLocationResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingLocations(true);
      try {
        const token = localStorage.getItem('astrologaai_access_token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app'}/api/v1/locations/search?q=${encodeURIComponent(formData.locationName)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setLocationResults(data.data.locations || []);
          setShowLocationDropdown(true);
        }
      } catch (error) {
        console.error('Location search error:', error);
      } finally {
        setIsSearchingLocations(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formData.locationName]);

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Profile name is required';
      }
      if (!formData.birthDate) {
        newErrors.birthDate = 'Birth date is required';
      } else {
        const date = new Date(formData.birthDate);
        if (date > new Date()) {
          newErrors.birthDate = 'Birth date must be in the past';
        }
      }
    }

    if (stepNumber === 2) {
      if (!formData.isUnknownTime && formData.birthTime) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(formData.birthTime)) {
          newErrors.birthTime = 'Invalid time format (use HH:MM)';
        }
      }
    }

    if (stepNumber === 3) {
      if (!formData.locationName.trim()) {
        newErrors.locationName = 'Location is required';
      }
      if (formData.latitude === null || formData.longitude === null) {
        newErrors.locationName = 'Please select a valid location';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 4) {
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleLocationSelect = (location: LocationResult) => {
    setFormData({
      ...formData,
      locationName: `${location.city}${location.country ? ', ' + location.country : ''}`,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone || '',
    });
    setShowLocationDropdown(false);
    setErrors({ ...errors, locationName: '' });
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('astrologaai_access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app'}/api/v1/birth-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            birthDate: formData.birthDate,
            birthTime: formData.isUnknownTime ? '12:00' : formData.birthTime || '12:00',
            locationName: formData.locationName,
            latitude: formData.latitude,
            longitude: formData.longitude,
            timezone: formData.timezone,
            isUnknownTime: formData.isUnknownTime,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to save birth data');
      }

      // Success - redirect to birth data list
      router.push('/settings/birth-data?success=true');
    } catch (error) {
      console.error('Submit error:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save birth data' });
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercentage = (step / 4) * 100;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: colors.primary }}></div>
          <p className="mt-4" style={{ color: colors.textSecondary }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: colors.background }}>
      <div className="max-w-xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span style={{ color: colors.textSecondary }}>Step {step} of 4</span>
            <span style={{ color: colors.textSecondary }}>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: colors.surface }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${progressPercentage}%`,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          {/* Step 1: Profile Name + Birth Date */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2" style={{ color: colors.textPrimary }}>
                  Profile Name
                </h2>
                <p style={{ color: colors.textSecondary }}>
                  Give this chart a name (e.g., "My Chart", "Partner's Chart")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                  Profile Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., My Chart"
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: colors.background,
                    border: `1px solid ${errors.name ? colors.error : colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
                {errors.name && (
                  <p className="mt-1 text-sm" style={{ color: colors.error }}>{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                  Birth Date *
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: colors.background,
                    border: `1px solid ${errors.birthDate ? colors.error : colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
                {errors.birthDate && (
                  <p className="mt-1 text-sm" style={{ color: colors.error }}>{errors.birthDate}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Birth Time */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2" style={{ color: colors.textPrimary }}>
                  Birth Time
                </h2>
                <p style={{ color: colors.textSecondary }}>
                  Exact time improves chart accuracy. If unknown, we&apos;ll use 12:00 PM.
                </p>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isUnknownTime: !formData.isUnknownTime, birthTime: '12:00' })}
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                  style={{
                    background: formData.isUnknownTime ? colors.primary : 'transparent',
                    border: `2px solid ${formData.isUnknownTime ? colors.primary : colors.border}`,
                  }}
                >
                  {formData.isUnknownTime && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <label
                  className="cursor-pointer"
                  style={{ color: colors.textPrimary }}
                  onClick={() => setFormData({ ...formData, isUnknownTime: !formData.isUnknownTime, birthTime: '12:00' })}
                >
                  I don&apos;t know my birth time
                </label>
              </div>

              {!formData.isUnknownTime && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                    Birth Time (optional)
                  </label>
                  <input
                    type="time"
                    value={formData.birthTime}
                    onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                    style={{
                      background: colors.background,
                      border: `1px solid ${errors.birthTime ? colors.error : colors.border}`,
                      color: colors.textPrimary,
                    }}
                  />
                  {errors.birthTime && (
                    <p className="mt-1 text-sm" style={{ color: colors.error }}>{errors.birthTime}</p>
                  )}
                  <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
                    Don&apos;t know your birth time? We&apos;ll use noon — update it later.
                  </p>
                </div>
              )}

              {formData.isUnknownTime && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: `${colors.primary}15`, borderLeft: `3px solid ${colors.primary}` }}
                >
                  <p style={{ color: colors.textSecondary }}>
                    Rising sign and house cusps will be approximate.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2" style={{ color: colors.textPrimary }}>
                  Birth Location
                </h2>
                <p style={{ color: colors.textSecondary }}>
                  Enter the city where you were born
                </p>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value, latitude: null, longitude: null })}
                  placeholder="Start typing a city name..."
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: colors.background,
                    border: `1px solid ${errors.locationName ? colors.error : colors.border}`,
                    color: colors.textPrimary,
                  }}
                />
                {isSearchingLocations && (
                  <div className="absolute right-3 top-10">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: colors.primary }}></div>
                  </div>
                )}

                {/* Location Dropdown */}
                {showLocationDropdown && locationResults.length > 0 && (
                  <div
                    className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
                    style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
                  >
                    {locationResults.map((location, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleLocationSelect(location)}
                        className="w-full text-left px-4 py-3 hover:bg-opacity-50 transition-colors"
                        style={{ 
                          color: colors.textPrimary,
                          background: 'transparent',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = `${colors.primary}20`}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div className="font-medium">{location.city || location.name}</div>
                        <div className="text-sm" style={{ color: colors.textSecondary }}>
                          {location.displayName}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {errors.locationName && (
                  <p className="mt-1 text-sm" style={{ color: colors.error }}>{errors.locationName}</p>
                )}
              </div>

              {formData.latitude !== null && formData.longitude !== null && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: `${colors.success}15`, borderLeft: `3px solid ${colors.success}` }}
                >
                  <p style={{ color: colors.textSecondary }}>
                    ✓ Location found: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                  </p>
                  <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                    Timezone: {formData.timezone}
                  </p>
                </div>
              )}

              {formData.latitude !== null && formData.latitude > 66 && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: '#F59E0B15', borderLeft: '3px solid #F59E0B' }}
                >
                  <p style={{ color: '#F59E0B' }}>
                    ⚠ Polar latitude detected (&gt;66°N). Ascendant (ASC) calculations may be less accurate at extreme northern latitudes. Other placements are not affected.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2" style={{ color: colors.textPrimary }}>
                  Review & Save
                </h2>
                <p style={{ color: colors.textSecondary }}>
                  Please review your birth data before saving
                </p>
              </div>

              <div className="space-y-4">
                <div
                  className="p-4 rounded-xl"
                  style={{ background: colors.background }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm" style={{ color: colors.textSecondary }}>Profile Name</span>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>{formData.name}</p>
                    </div>
                    <div>
                      <span className="text-sm" style={{ color: colors.textSecondary }}>Birth Date</span>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        {formatDate(formData.birthDate, 'long')}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm" style={{ color: colors.textSecondary }}>Birth Time</span>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        {formData.isUnknownTime ? 'Unknown (12:00 PM default)' : formData.birthTime || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm" style={{ color: colors.textSecondary }}>Location</span>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>{formData.locationName}</p>
                    </div>
                  </div>
                </div>

                {errors.submit && (
                  <div
                    className="p-4 rounded-xl"
                    style={{ background: `${colors.error}15`, borderLeft: `3px solid ${colors.error}` }}
                  >
                    <p style={{ color: colors.error }}>{errors.submit}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={step === 1 ? () => router.back() : handleBack}
              className="px-6 py-3 rounded-xl font-medium transition-all"
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
              }}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-3 rounded-xl font-medium transition-all"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  color: 'white',
                }}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-8 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  color: 'white',
                }}
              >
                {isLoading ? 'Saving...' : 'Save Profile'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
