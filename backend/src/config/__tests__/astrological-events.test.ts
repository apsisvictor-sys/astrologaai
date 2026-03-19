import { describe, it, expect } from 'vitest';
import { getCurrentEvents, ASTROLOGICAL_EVENTS } from '../astrological-events';

describe('astrological-events', () => {
  it('returns empty array when no events are active', () => {
    const events = getCurrentEvents(new Date('2025-01-01'));
    expect(events).toEqual([]);
  });

  it('returns active Mercury retrograde event', () => {
    const events = getCurrentEvents(new Date('2026-05-20'));
    expect(events.length).toBeGreaterThan(0);
    const rx = events.find(e => e.id === 'mercury-rx-2026-may');
    expect(rx).toBeDefined();
    expect(rx?.planet).toBe('Mercury');
  });

  it('returns eclipse on its exact date', () => {
    const events = getCurrentEvents(new Date('2026-03-03'));
    const eclipse = events.find(e => e.id === 'eclipse-lunar-2026-mar');
    expect(eclipse).toBeDefined();
    expect(eclipse?.type).toBe('eclipse');
  });

  it('all events have required fields', () => {
    for (const event of ASTROLOGICAL_EVENTS) {
      expect(event.id).toBeTruthy();
      expect(event.message.en).toBeTruthy();
      expect(event.oraclePrompt).toBeTruthy();
    }
  });
});
