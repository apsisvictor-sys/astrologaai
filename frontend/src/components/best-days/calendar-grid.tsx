'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { BestDay, DayCell, DayCellSkeleton, DayCellPad } from './day-cell';
import { DayDetailPanel } from './day-detail-panel';

interface BestDaysResponse {
  month: string;
  tier: 'FREE' | 'PRO' | 'PREMIUM';
  days: BestDay[];
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildCalendarGrid(year: number, month: number, days: BestDay[]) {
  const dayMap = new Map(days.map(d => [d.date, d]));
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Monday-first week: convert JS Sun=0 to Mon=0
  const firstWeekday = (firstDay.getDay() + 6) % 7;

  const padStart = Array.from({ length: firstWeekday }, (_, i) =>
    prevMonthLastDay - firstWeekday + i + 1
  );

  const currentDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNumber = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    return { dayNumber, dateStr, day: dayMap.get(dateStr) ?? null };
  });

  const totalCells = padStart.length + daysInMonth;
  const padEndCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const padEnd = Array.from({ length: padEndCount }, (_, i) => i + 1);

  return { padStart, currentDays, padEnd };
}

interface BestDaysCalendarProps {
  tier: 'FREE' | 'PRO' | 'PREMIUM';
  hasBirthData: boolean;
}

export function BestDaysCalendar({ tier, hasBirthData }: BestDaysCalendarProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [days, setDays] = useState<BestDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDay, setSelectedDay] = useState<BestDay | null>(null);

  // Navigation bounds: 1 month back, 1 month ahead
  const canGoBack = !(year === today.getFullYear() && month === today.getMonth() - 1) &&
    new Date(year, month - 1, 1) >= new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const canGoForward = new Date(year, month + 1, 1) <= new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const fetchDays = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(false);
    setSelectedDay(null);
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    try {
      const res = await apiGet<BestDaysResponse>(`/api/v1/forecasts/best-days?month=${monthKey}`);
      if (res.success) setDays(res.data.days);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasBirthData) fetchDays(year, month);
    else setLoading(false);
  }, [year, month, hasBirthData, fetchDays]);

  function navigate(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  // Empty state — no birth data
  if (!hasBirthData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(228,26,255,0.06)', border: '1px solid rgba(228,26,255,0.15)' }}
        >
          <span className="text-2xl">✦</span>
        </div>
        <div>
          <p className="text-white font-semibold mb-1">Add your birth details</p>
          <p className="text-text-muted text-sm max-w-xs">
            Your Best Days calendar is personalized to your natal chart.
          </p>
        </div>
        <Link
          href="/chart"
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
        >
          Add Birth Data
        </Link>
      </div>
    );
  }

  const { padStart, currentDays, padEnd } = loading
    ? { padStart: [], currentDays: [], padEnd: [] }
    : buildCalendarGrid(year, month, days);

  return (
    <div className="flex gap-4 items-start">
      {/* Calendar column */}
      <div className="flex-1 min-w-0">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            disabled={!canGoBack}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-white transition-all disabled:opacity-25"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-white">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={() => navigate(1)}
            disabled={!canGoForward}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-white transition-all disabled:opacity-25"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Colour legend */}
        <div className="flex items-center justify-center gap-3 flex-wrap mb-3">
          {[
            { color: '#34D399', label: 'Great' },
            { color: '#F59E0B', label: 'Mixed' },
            { color: '#EF4444', label: 'Challenging' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] text-text-muted">{label}</span>
            </div>
          ))}
          <span className="text-[10px] text-text-muted ml-1">❤️ 💼 🏃 💰</span>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_HEADERS.map(h => (
            <div key={h} className="text-center text-[9px] uppercase tracking-wider text-text-muted py-1 font-bold">
              {h}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => <DayCellSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-text-muted text-sm">Couldn&apos;t load calendar data. Please try again later.</p>
          </div>
        ) : (
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7 gap-1"
          >
            {padStart.map(d => <DayCellPad key={`ps-${d}`} dayNumber={d} />)}

            {currentDays.map(({ dayNumber, dateStr, day }) => {
              // Day with no API data — show unavailable state
              const resolvedDay: BestDay = day ?? {
                date: dateStr,
                love: null, career: null, health: null, money: null,
                composite: null, locked: false, unavailable: true,
              };
              return (
                <DayCell
                  key={dayNumber}
                  day={resolvedDay}
                  dayNumber={dayNumber}
                  isToday={dateStr === todayStr}
                  isSelected={selectedDay?.date === dateStr}
                  onClick={() => {
                    if (!resolvedDay.locked && !resolvedDay.unavailable) {
                      setSelectedDay(prev => prev?.date === dateStr ? null : resolvedDay);
                    }
                  }}
                />
              );
            })}

            {padEnd.map(d => <DayCellPad key={`pe-${d}`} dayNumber={d} />)}
          </motion.div>
        )}

        {/* FREE upgrade banner */}
        {tier === 'FREE' && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 rounded-xl p-3.5 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(228,26,255,0.08), rgba(0,240,255,0.04))',
              border: '1px solid rgba(228,26,255,0.20)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(228,26,255,0.12)', border: '1px solid rgba(228,26,255,0.25)' }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white mb-0.5">Unlock your full month</p>
              <p className="text-[10px] text-text-muted">All 4 areas &amp; transits for every day</p>
            </div>
            <Link
              href="/pricing"
              className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
            >
              PRO
            </Link>
          </motion.div>
        )}
      </div>

      {/* Desktop side panel */}
      <DayDetailPanel day={selectedDay} tier={tier} onClose={() => setSelectedDay(null)} />
    </div>
  );
}
