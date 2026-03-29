import { prisma } from '../utils/prisma';
import { getActiveTransitsForUser, type TransitAspectType } from './transits';

const DEFAULT_LOOKAHEAD_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const PLANET_INTENSITY: Record<string, number> = {
  pluto: 100,
  neptune: 95,
  uranus: 90,
  saturn: 82,
  jupiter: 74,
  mars: 66,
  venus: 58,
  mercury: 52,
  sun: 48,
  moon: 42,
  northNode: 60,
  southNode: 60,
  chiron: 72,
};

const ASPECT_INTENSITY: Record<string, number> = {
  conjunction: 16,
  opposition: 14,
  square: 12,
  trine: 9,
  sextile: 7,
};

export type ActiveTransitForecast = {
  id: string;
  transitType: string;
  planet: string;
  aspect: string;
  startDate: string;
  endDate: string;
  intensity: number;
  description: string;
  orb: number;
  influence: TransitAspectType['influence'];
  natalPlanet: string;
  transitPlanetBg: string;
  natalPlanetBg: string;
  aspectBg: string;
  generatedAt: string;
};

type DailyTransitSnapshot = {
  date: Date;
  aspect: TransitAspectType;
};

type TransitWindow = {
  transitType: string;
  planet: string;
  aspect: string;
  natalPlanet: string;
  startDate: Date;
  endDate: Date;
  intensity: number;
  description: string;
};

function normalizeUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDateOnly(date: Date): string {
  return normalizeUtcDate(date).toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const next = normalizeUtcDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23,
    59,
    59,
    999,
  ));
}

function buildTransitType(aspect: TransitAspectType): string {
  return `${aspect.transitPlanet}_${aspect.aspect}_${aspect.natalPlanet}`;
}

function buildForecastId(date: Date, aspect: TransitAspectType): string {
  return `${buildTransitType(aspect)}:${formatDateOnly(date)}`;
}

function calculateIntensity(aspect: TransitAspectType): number {
  const base = PLANET_INTENSITY[aspect.transitPlanet] ?? 50;
  const aspectBoost = ASPECT_INTENSITY[aspect.aspect] ?? 5;
  const orbPenalty = Math.min(Math.round(aspect.orb * 6), 24);
  return Math.max(1, base + aspectBoost - orbPenalty);
}

async function getBirthChartOrThrow(userId: string) {
  const birthChart = await prisma.birthChart.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!birthChart?.chartData) {
    throw new Error('CHART_NOT_FOUND');
  }

  return birthChart.chartData;
}

function groupTransitSnapshots(snapshots: DailyTransitSnapshot[]): TransitWindow[] {
  const grouped = new Map<string, DailyTransitSnapshot[]>();

  for (const snapshot of snapshots) {
    const key = buildTransitType(snapshot.aspect);
    const existing = grouped.get(key) ?? [];
    existing.push(snapshot);
    grouped.set(key, existing);
  }

  const windows: TransitWindow[] = [];

  for (const [transitType, entries] of grouped.entries()) {
    const sortedEntries = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
    let chunk: DailyTransitSnapshot[] = [];

    const flushChunk = () => {
      if (chunk.length === 0) {
        return;
      }

      const bestEntry = [...chunk].sort((a, b) => a.aspect.orb - b.aspect.orb)[0];
      const startDate = normalizeUtcDate(chunk[0].date);
      const endDate = endOfUtcDay(chunk[chunk.length - 1].date);
      const intensity = Math.max(...chunk.map(entry => calculateIntensity(entry.aspect)));

      windows.push({
        transitType,
        planet: bestEntry.aspect.transitPlanet,
        aspect: bestEntry.aspect.aspect,
        natalPlanet: bestEntry.aspect.natalPlanet,
        startDate,
        endDate,
        intensity,
        description: bestEntry.aspect.description,
      });

      chunk = [];
    };

    for (const entry of sortedEntries) {
      const last = chunk[chunk.length - 1];
      if (!last) {
        chunk.push(entry);
        continue;
      }

      const diffDays = Math.round((normalizeUtcDate(entry.date).getTime() - normalizeUtcDate(last.date).getTime()) / DAY_IN_MS);
      if (diffDays <= 1) {
        chunk.push(entry);
        continue;
      }

      flushChunk();
      chunk.push(entry);
    }

    flushChunk();
  }

  return windows.sort((a, b) => {
    if (a.startDate.getTime() !== b.startDate.getTime()) {
      return a.startDate.getTime() - b.startDate.getTime();
    }

    return b.intensity - a.intensity;
  });
}

export async function calculateActiveTransits(userId: string): Promise<ActiveTransitForecast[]> {
  const natalChart = await getBirthChartOrThrow(userId);
  const transitData = await getActiveTransitsForUser(natalChart);
  const today = normalizeUtcDate(new Date());
  const startDate = today.toISOString();
  const endDate = endOfUtcDay(today).toISOString();

  return transitData.aspectsToNatal.map(aspect => ({
    id: buildForecastId(today, aspect),
    transitType: buildTransitType(aspect),
    planet: aspect.transitPlanet,
    aspect: aspect.aspect,
    startDate,
    endDate,
    intensity: calculateIntensity(aspect),
    description: aspect.description,
    orb: aspect.orb,
    influence: aspect.influence,
    natalPlanet: aspect.natalPlanet,
    transitPlanetBg: aspect.transitPlanetBg,
    natalPlanetBg: aspect.natalPlanetBg,
    aspectBg: aspect.aspectBg,
    generatedAt: transitData.generatedAt,
  }));
}

export function generateTransitForecast(userId: string, transit: TransitWindow) {
  return {
    userId,
    transitType: transit.transitType,
    planet: transit.planet,
    aspect: transit.aspect,
    startDate: transit.startDate,
    endDate: transit.endDate,
    intensity: transit.intensity,
    description: transit.description,
  };
}

export async function buildTransitForecastsForUser(
  userId: string,
  lookaheadDays: number = DEFAULT_LOOKAHEAD_DAYS,
) {
  const natalChart = await getBirthChartOrThrow(userId);
  const startDate = normalizeUtcDate(new Date());
  const snapshots: DailyTransitSnapshot[] = [];

  for (let offset = 0; offset < lookaheadDays; offset++) {
    const targetDate = addDays(startDate, offset);
    const transitData = await getActiveTransitsForUser(natalChart, targetDate);

    for (const aspect of transitData.aspectsToNatal) {
      snapshots.push({ date: targetDate, aspect });
    }
  }

  return groupTransitSnapshots(snapshots).map(transit => generateTransitForecast(userId, transit));
}

export async function refreshTransitForecastsForUser(
  userId: string,
  lookaheadDays: number = DEFAULT_LOOKAHEAD_DAYS,
): Promise<number> {
  const startDate = normalizeUtcDate(new Date());
  const rangeEnd = endOfUtcDay(addDays(startDate, lookaheadDays - 1));
  const forecasts = await buildTransitForecastsForUser(userId, lookaheadDays);

  await prisma.userTransitForecast.deleteMany({
    where: {
      userId,
      startDate: { lte: rangeEnd },
      endDate: { gte: startDate },
    },
  });

  if (forecasts.length > 0) {
    await prisma.userTransitForecast.createMany({
      data: forecasts,
      skipDuplicates: true,
    });
  }

  return forecasts.length;
}

export async function getUpcomingTransitForecasts(userId: string, limit: number = 20) {
  const today = normalizeUtcDate(new Date());

  return prisma.userTransitForecast.findMany({
    where: {
      userId,
      endDate: { gte: today },
    },
    orderBy: [
      { startDate: 'asc' },
      { intensity: 'desc' },
    ],
    take: limit,
  });
}

export async function getTransitForecastById(userId: string, id: string) {
  return prisma.userTransitForecast.findFirst({
    where: {
      id,
      userId,
    },
  });
}
