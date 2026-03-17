/**
 * Chart Regeneration Service
 * US-30: Edit Birth Data - Background Chart Regeneration
 *
 * Processes chart regeneration jobs from Redis queue
 */
/**
 * No-op — polling loop removed. Jobs are processed inline in regenerateChartNow.
 * The 5-second Redis poll was generating ~17k empty lPop calls/day with zero users.
 */
export declare function startRegenerationProcessor(): void;
/**
 * Manually trigger regeneration for a profile
 * Used when the queue processor is not running
 */
export declare function regenerateChartNow(profileId: string, userId: string): Promise<string | null>;
declare const _default: {
    startRegenerationProcessor: typeof startRegenerationProcessor;
    regenerateChartNow: typeof regenerateChartNow;
};
export default _default;
//# sourceMappingURL=chart-regeneration.d.ts.map