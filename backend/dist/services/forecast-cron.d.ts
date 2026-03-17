/**
 * Forecast Cron Service
 *
 * Runs a nightly job at 02:00 UTC to pre-generate horoscopes and daily
 * forecasts for every PRO/PREMIUM user who has birth data.
 *
 * Results are stored in the `daily_forecasts` DB table.  API endpoints
 * read from that table — zero LLM calls happen on page load.
 *
 * Mid-day new signups: the API endpoint falls back to on-demand generation
 * and stores the result so it's only ever called once per user per day.
 */
export declare function ensureDailyForecastTable(): Promise<void>;
export declare function getStoredForecast(userId: string, date: string): Promise<{
    horoscope: any;
    forecast: any;
} | null>;
export declare function storeForecast(userId: string, date: string, horoscope: any | null, forecast: any | null): Promise<void>;
export declare function runNightlyForecastJob(): Promise<void>;
/**
 * Start the nightly cron.  Checks every hour whether it is 02:00 UTC and
 * whether the job has already run today.  If both conditions are met, runs.
 */
export declare function startForecastCron(): void;
//# sourceMappingURL=forecast-cron.d.ts.map