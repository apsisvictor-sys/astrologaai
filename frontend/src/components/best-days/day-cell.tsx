'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export interface BestDay {
  date: string; // YYYY-MM-DD
  love: number | null;
  career: number | null;
  health: number | null;
  money: number | null;
  composite: number | null;
  locked: boolean;
  unavailable?: boolean;
  transits?: BestDayTransit[];
  oracleCommentary?: string;
}

export interface BestDayTransit {
  planet: string;
  aspect: string;
  natalPlanet: string;
  description: string;
}

const AREAS = ['love', 'career', 'health', 'money'] as const;
type Area = typeof AREAS[number];

export function ratingColor(r: number | null): string {
  if (r === null) return 'rgba(255,255,255,0.12)';
  if (r >= 4) return '#34D399';
  if (r >= 3) return '#F59E0B';
  return '#EF4444';
}

function compositeBg(c: number | null): string {
  if (c === null) return 'rgba(255,255,255,0.02)';
  if (c >= 3.5) return 'rgba(52,211,153,0.08)';
  if (c >= 2.5) return 'rgba(245,158,11,0.06)';
  return 'rgba(239,68,68,0.06)';
}

interface DayCellProps {
  day: BestDay;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export function DayCell({ day, dayNumber, isToday, isSelected, onClick }: DayCellProps) {
  const { locked, unavailable, composite } = day;

  const dots = (
    <div className="grid grid-cols-2 gap-[3px] mt-auto">
      {AREAS.map(area => (
        <div
          key={area}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: ratingColor(day[area as Area]),
            boxShadow: (day[area as Area] ?? 0) >= 4 ? `0 0 4px ${ratingColor(day[area as Area])}70` : 'none',
          }}
        />
      ))}
    </div>
  );

  const innerContent = (
    <div className="flex flex-col items-start justify-between h-full gap-1">
      <span className={`text-[11px] font-semibold leading-none ${isToday ? 'text-primary' : 'text-white/60'}`}>
        {dayNumber}
      </span>
      {unavailable ? (
        <span className="text-white/20 text-xs self-center w-full text-center">—</span>
      ) : dots}
    </div>
  );

  if (locked) {
    return (
      <div
        className="aspect-square rounded-lg p-2 relative overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.015)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ filter: 'blur(3px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
          {innerContent}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-3 h-3 text-white/25" />
        </div>
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className="aspect-square rounded-lg p-2"
      style={{
        background: isSelected
          ? 'rgba(228,26,255,0.14)'
          : isToday
          ? 'rgba(228,26,255,0.08)'
          : compositeBg(composite),
        border: isSelected
          ? '1px solid rgba(228,26,255,0.55)'
          : isToday
          ? '1px solid rgba(228,26,255,0.35)'
          : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isSelected
          ? '0 0 12px rgba(228,26,255,0.25)'
          : isToday
          ? '0 0 8px rgba(228,26,255,0.15)'
          : 'none',
      }}
    >
      {innerContent}
    </motion.button>
  );
}

export function DayCellSkeleton() {
  return (
    <div
      className="aspect-square rounded-lg animate-pulse"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    />
  );
}

export function DayCellPad({ dayNumber }: { dayNumber: number }) {
  return (
    <div className="aspect-square rounded-lg p-2">
      <span className="text-[11px] font-semibold text-white/15">{dayNumber}</span>
    </div>
  );
}
