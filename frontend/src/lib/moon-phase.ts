/**
 * Pure math moon phase calculation — no API needed.
 * Accurate to ±1 day using the synodic period from a known new moon reference.
 */

interface MoonPhaseData {
  phase: string;
  phaseBg: string;
  illumination: number;
}

export function getCurrentMoonPhase(date: Date = new Date()): MoonPhaseData {
  // Known new moon: 6 Jan 2000 18:14 UTC
  const KNOWN_NEW_MOON_MS = 947182440000;
  const SYNODIC_PERIOD_MS = 29.53058867 * 24 * 60 * 60 * 1000;

  let age = (date.getTime() - KNOWN_NEW_MOON_MS) % SYNODIC_PERIOD_MS;
  if (age < 0) age += SYNODIC_PERIOD_MS;

  const fraction = age / SYNODIC_PERIOD_MS;
  const illumination = Math.round((1 - Math.cos(fraction * 2 * Math.PI)) / 2 * 100);

  let phase: string;
  let phaseBg: string;

  if (fraction < 0.03 || fraction > 0.97)    { phase = 'New Moon';        phaseBg = 'Новолуние'; }
  else if (fraction < 0.22)                   { phase = 'Waxing Crescent'; phaseBg = 'Растяща Луна'; }
  else if (fraction < 0.28)                   { phase = 'First Quarter';   phaseBg = 'Първа Четвърт'; }
  else if (fraction < 0.47)                   { phase = 'Waxing Gibbous';  phaseBg = 'Растяща Пълна'; }
  else if (fraction < 0.53)                   { phase = 'Full Moon';       phaseBg = 'Пълнолуние'; }
  else if (fraction < 0.72)                   { phase = 'Waning Gibbous';  phaseBg = 'Намаляваща Пълна'; }
  else if (fraction < 0.78)                   { phase = 'Last Quarter';    phaseBg = 'Последна Четвърт'; }
  else                                        { phase = 'Waning Crescent'; phaseBg = 'Намаляваща Луна'; }

  return { phase, phaseBg, illumination };
}
