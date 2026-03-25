/**
 * Composite Chart Service
 * FEAT-11: Composite chart (PREMIUM)
 *
 * Calculates the midpoint composite chart between two people.
 * Uses AstrologyClient directly (same pattern as agent-tools get_composite tool).
 */

import { AstrologyClient } from '@astro-api/astroapi-typescript';

// ============================================
// Types
// ============================================

export interface CompositeBirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timezone?: string;
}

// ============================================
// Helpers
// ============================================

const CHART_OPTIONS = {
  house_system: 'P' as const,
  zodiac_type: 'Tropic' as const,
  active_points: [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
    'Uranus', 'Neptune', 'Pluto', 'True_Node', 'Chiron',
  ],
};

function getClient(): AstrologyClient {
  return new AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
}

function toSubject(b: CompositeBirthInput) {
  return {
    name: 'subject',
    birth_data: {
      year: b.year, month: b.month, day: b.day,
      hour: b.hour, minute: b.minute, second: 0,
      latitude: b.latitude, longitude: b.longitude, timezone: b.timezone,
    },
  };
}

// ============================================
// Main Service Function
// ============================================

/**
 * Calculate composite chart between two people using AstrologyClient directly.
 */
export async function calculateCompositeChart(
  userBirth: CompositeBirthInput,
  partnerBirth: CompositeBirthInput,
): Promise<any> {
  const client = getClient();
  return await client.charts.getCompositeChart({
    subject1: toSubject(userBirth),
    subject2: toSubject(partnerBirth),
    options: CHART_OPTIONS,
  });
}
