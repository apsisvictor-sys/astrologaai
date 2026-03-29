import { prisma } from '../utils/prisma';
import { refreshTransitForecastsForUser } from './transit-engine';

const LOOKAHEAD_DAYS = 7;

function normalizeUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDateOnly(date: Date): string {
  return normalizeUtcDate(date).toISOString().split('T')[0];
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function ensureTransitForecastTable(): Promise<void> {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS user_transit_forecasts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transit_type TEXT NOT NULL,
        planet TEXT NOT NULL,
        aspect TEXT NOT NULL,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        intensity INTEGER NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id, transit_type, planet, aspect, start_date, end_date)
      )
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS user_transit_forecasts_user_id_start_date_idx
      ON user_transit_forecasts(user_id, start_date)
    `;

    console.log('[TransitForecastCron] user_transit_forecasts table ready');
  } catch (error) {
    console.error('[TransitForecastCron] Failed to ensure table:', error);
  }
}

export async function runTransitForecastCron(targetDate: Date = new Date()) {
  const dateLabel = formatDateOnly(targetDate);
  const users = await prisma.birthChart.findMany({
    distinct: ['userId'],
    select: { userId: true },
  });

  console.log(`[TransitForecastCron] Refreshing ${LOOKAHEAD_DAYS}-day transit forecasts for ${users.length} users on ${dateLabel}`);

  let processedUsers = 0;
  let generatedForecasts = 0;

  for (const user of users) {
    try {
      generatedForecasts += await refreshTransitForecastsForUser(user.userId, LOOKAHEAD_DAYS);
      processedUsers += 1;
    } catch (error) {
      console.error(`[TransitForecastCron] Failed for user ${user.userId}:`, error);
    }

    await delay(250);
  }

  console.log(`[TransitForecastCron] Done for ${dateLabel}: ${processedUsers}/${users.length} users, ${generatedForecasts} forecasts`);
  return {
    date: dateLabel,
    processedUsers,
    generatedForecasts,
    lookaheadDays: LOOKAHEAD_DAYS,
  };
}

export function startTransitForecastCron(): void {
  console.log('[TransitForecastCron] Scheduler started — will run daily at 03:00 UTC');

  const checkAndRun = () => {
    const now = new Date();
    if (now.getUTCHours() === 3) {
      runTransitForecastCron(now).catch(error => {
        console.error('[TransitForecastCron] Job error:', error);
      });
    }
  };

  setInterval(checkAndRun, 60 * 60 * 1000);
  checkAndRun();
}
