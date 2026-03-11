/**
 * Shared date/time formatting utilities.
 * System standard: dd/mm/yyyy dates, 24h time.
 *
 * For locale-aware display (future US support), pass locale explicitly.
 * Internal DB/API exchange format stays ISO 8601 — these helpers are display-only.
 */

/**
 * Format a date as dd/mm/yyyy (default) or with full month name.
 *
 * @param date - ISO string, Date object, or any parseable date value
 * @param style
 *   'short'        → "15/10/2024"
 *   'long'         → "15 October 2024" (uses en-GB or provided locale)
 *   'weekday'      → "Monday"
 *   'weekday-short'→ "Mon 15"
 * @param locale - override locale for long/weekday styles (e.g. 'bg-BG' for Bulgarian)
 */
export function formatDate(
  date: Date | string | null | undefined,
  style: 'short' | 'long' | 'weekday' | 'weekday-short' = 'short',
  locale?: string,
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  if (style === 'short') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  if (style === 'long') {
    return d.toLocaleDateString(locale || 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (style === 'weekday') {
    return d.toLocaleDateString(locale || 'en-GB', { weekday: 'long' });
  }

  if (style === 'weekday-short') {
    return d.toLocaleDateString(locale || 'en-GB', { weekday: 'short', day: 'numeric' });
  }

  return '';
}

/**
 * Format a time value as HH:MM (24h).
 *
 * Accepts:
 *  - "HH:MM" or "HH:MM:SS" string → returned as-is (trimmed to HH:MM)
 *  - Date object → formatted using 24h clock
 *  - ISO datetime string → extracts and formats the time portion
 */
export function formatTime(time: string | Date | null | undefined): string {
  if (!time) return '';

  if (typeof time === 'string') {
    // Already in HH:MM or HH:MM:SS format
    if (/^\d{2}:\d{2}/.test(time)) return time.substring(0, 5);
    // ISO datetime — parse and format
    const d = new Date(time);
    if (isNaN(d.getTime())) return time;
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  return time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Format a date+time as "dd/mm/yyyy HH:MM" (24h).
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return `${formatDate(d)} ${formatTime(d)}`;
}
