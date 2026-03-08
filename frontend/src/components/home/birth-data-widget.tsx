'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface BirthData {
  date: string;
  time: string;
  location: string;
  lat: number;
  lng: number;
}

interface BirthDataWidgetProps {
  onComplete: (data: BirthData) => void;
}

interface LocationSuggestion {
  name: string;
  lat: number;
  lng: number;
}

export function BirthDataWidget({ onComplete }: BirthDataWidgetProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [unknownTime, setUnknownTime] = useState(false);
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);

  const searchLocation = async (query: string) => {
    if (query.length < 3) return;
    try {
      const res = await fetch(`/api/locations/autocomplete?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setLocationSuggestions(data.suggestions || []);
    } catch {
      setLocationSuggestions([]);
    }
  };

  const isComplete = date && (time || unknownTime) && selectedLocation;

  const handleSubmit = () => {
    if (!isComplete || !selectedLocation) return;
    onComplete({
      date,
      time: unknownTime ? '12:00' : time,
      location: selectedLocation.name,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
    });
  };

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4 text-left">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Birth Coordinates</p>

      {/* Date */}
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Date of birth</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Time */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-text-muted">Time of birth</label>
          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unknownTime}
              onChange={(e) => setUnknownTime(e.target.checked)}
              className="accent-primary"
            />
            Unknown
          </label>
        </div>
        <input
          type="time"
          value={time}
          disabled={unknownTime}
          onChange={(e) => setTime(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-40"
        />
      </div>

      {/* Location */}
      <div className="relative">
        <label className="block text-xs text-text-muted mb-1.5">Birth city</label>
        <input
          type="text"
          value={location}
          placeholder="e.g. Sofia, Bulgaria"
          onChange={(e) => {
            setLocation(e.target.value);
            setSelectedLocation(null);
            searchLocation(e.target.value);
          }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder-text-muted"
        />
        {locationSuggestions.length > 0 && !selectedLocation && (
          <div className="absolute top-full left-0 right-0 mt-1 glass-panel rounded-xl overflow-hidden z-10">
            {locationSuggestions.slice(0, 5).map((s, i) => (
              <button
                key={i}
                className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-white/5 transition-colors"
                onClick={() => {
                  setLocation(s.name);
                  setSelectedLocation(s);
                  setLocationSuggestions([]);
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
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
