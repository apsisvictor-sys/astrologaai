'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

interface BirthData {
  date: string;   // ISO: YYYY-MM-DD
  time: string;   // HH:MM (24h) or empty string
  location: string;
  lat: number;
  lng: number;
  timezone: string;
}

interface BirthDataWidgetProps {
  onComplete: (data: BirthData) => void;
}

interface LocationSuggestion {
  city: string;
  country: string;
  displayName: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

// Parse dd/mm/yyyy text input → ISO YYYY-MM-DD
function parseDateInput(value: string): string {
  const parts = value.replace(/\D/g, '/').split('/').filter(Boolean);
  if (parts.length !== 3) return '';
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy || yyyy.length < 4) return '';
  const d = parseInt(dd, 10), m = parseInt(mm, 10), y = parseInt(yyyy, 10);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) return '';
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

// Parse HH:MM text input (24h) → HH:MM
function parseTimeInput(value: string): string {
  const parts = value.replace(/\D/g, ':').split(':').filter(Boolean);
  if (parts.length < 2) return '';
  const [hh, mm] = parts;
  const h = parseInt(hh, 10), m = parseInt(mm, 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function BirthDataWidget({ onComplete }: BirthDataWidgetProps) {
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [unknownTime, setUnknownTime] = useState(false);
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [locationSearching, setLocationSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQueryRef = useRef('');

  const isoDate = parseDateInput(dateInput);
  const isoTime = parseTimeInput(timeInput);
  const isComplete = isoDate && (unknownTime || isoTime) && selectedLocation;

  const searchLocation = async (query: string) => {
    currentQueryRef.current = query;
    if (query.length < 2) { setLocationSuggestions([]); setLocationSearching(false); return; }
    setLocationSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/locations/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      // Discard if a newer query has already been issued
      if (currentQueryRef.current !== query) return;
      setLocationSuggestions(data.data?.locations || []);
    } catch {
      if (currentQueryRef.current === query) setLocationSuggestions([]);
    } finally {
      if (currentQueryRef.current === query) setLocationSearching(false);
    }
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    setSelectedLocation(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.length < 2) { setLocationSuggestions([]); return; }
    searchTimerRef.current = setTimeout(() => searchLocation(value), 300);
  };

  const handleSubmit = () => {
    if (!isComplete || !selectedLocation) return;
    onComplete({
      date: isoDate,
      time: unknownTime ? '' : isoTime,
      location: selectedLocation.city
        ? `${selectedLocation.city}${selectedLocation.country ? ', ' + selectedLocation.country : ''}`
        : selectedLocation.displayName,
      lat: selectedLocation.latitude,
      lng: selectedLocation.longitude,
      timezone: selectedLocation.timezone || '',
    });
  };

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4 text-left">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Birth Coordinates</p>

      {/* Date — text input, dd/mm/yyyy */}
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Date of birth</label>
        <input
          type="text"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          placeholder="DD/MM/YYYY"
          maxLength={10}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder-text-muted"
        />
        {dateInput.length > 0 && !isoDate && (
          <p className="text-[10px] text-red-400/70 mt-1">Use DD/MM/YYYY format, e.g. 15/10/1990</p>
        )}
      </div>

      {/* Time — text input, 24h HH:MM */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-text-muted">Time of birth</label>
          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unknownTime}
              onChange={(e) => { setUnknownTime(e.target.checked); if (e.target.checked) setTimeInput(''); }}
              className="accent-primary"
            />
            Unknown
          </label>
        </div>
        <input
          type="text"
          value={timeInput}
          disabled={unknownTime}
          onChange={(e) => setTimeInput(e.target.value)}
          placeholder="HH:MM  (e.g. 14:30)"
          maxLength={5}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder-text-muted disabled:opacity-40"
        />
        {!unknownTime && timeInput.length > 0 && !isoTime && (
          <p className="text-[10px] text-red-400/70 mt-1">Use 24h format, e.g. 14:30</p>
        )}
      </div>

      {/* Location */}
      <div className="relative">
        <label className="block text-xs text-text-muted mb-1.5">Birth city</label>
        <div className="relative">
          <input
            type="text"
            value={location}
            placeholder="e.g. Sofia, Bulgaria"
            onChange={(e) => handleLocationChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder-text-muted"
          />
          {locationSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(228,26,255,0.6)', borderTopColor: 'transparent' }} />
          )}
        </div>
        {locationSuggestions.length > 0 && !selectedLocation && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20" style={{ background: '#1a0b1c', border: '1px solid rgba(228,26,255,0.2)' }}>
            {locationSuggestions.slice(0, 5).map((s, i) => (
              <button
                key={i}
                className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-white/5 transition-colors"
                onClick={() => {
                  const label = s.city ? `${s.city}${s.country ? ', ' + s.country : ''}` : s.displayName;
                  setLocation(label);
                  setSelectedLocation(s);
                  setLocationSuggestions([]);
                }}
              >
                <div className="text-white/80">{s.city || s.displayName}</div>
                {s.country && <div className="text-[10px] text-text-muted mt-0.5">{s.displayName}</div>}
              </button>
            ))}
          </div>
        )}
        {selectedLocation && (
          <p className="text-[10px] text-green-400/80 mt-1">✓ Location confirmed</p>
        )}
        {!selectedLocation && location.length > 1 && !locationSearching && locationSuggestions.length === 0 && (
          <p className="text-[10px] text-red-400/70 mt-1">Please select a city from the dropdown</p>
        )}
      </div>

      <Button
        variant="gradient"
        className="w-full"
        disabled={!isComplete}
        onClick={handleSubmit}
      >
        Calculate My Chart
      </Button>
    </div>
  );
}
