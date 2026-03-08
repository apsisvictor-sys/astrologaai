/**
 * Chart Regeneration Service
 * US-30: Edit Birth Data - Background Chart Regeneration
 *
 * Processes chart regeneration jobs from Redis queue
 */
/**
 * Start the regeneration queue processor
 * In development, this runs in a setInterval
 * In production, this could be a separate worker process
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