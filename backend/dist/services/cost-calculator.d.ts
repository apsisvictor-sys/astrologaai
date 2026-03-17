/**
 * Cost Calculator Service
 * Calculates per-user LLM costs from ChatMessage.metadata
 * Prices are stored in AdminConfig and updatable without code deploys.
 *
 * AdminConfig keys used:
 *   price_input_{model}           — USD cents per 1M input tokens
 *   price_output_{model}          — USD cents per 1M output tokens
 *   eur_usd_rate                  — EUR/USD rate × 100 (e.g. 108 = 1.08)
 *   alert_threshold_free_eur_cents
 *   alert_threshold_pro_eur_cents
 *   alert_threshold_premium_eur_cents
 */
export declare function getAdminPrices(): Promise<Record<string, number>>;
/** Invalidate the price cache (call after admin updates model prices) */
export declare function invalidatePriceCache(): void;
/**
 * Calculate cost in USD cents for one message.
 * prices = the result of getAdminPrices()
 */
export declare function calcMessageCostUsdCents(model: string, inputTokens: number, outputTokens: number, prices: Record<string, number>): number;
/**
 * Sum a user's LLM costs in EUR cents for a given date range.
 * Reads from ChatMessage.metadata (populated by chat-handler after each stream).
 */
export declare function getUserCostEurCents(userId: string, startDate: Date, endDate: Date): Promise<number>;
/**
 * Check whether a user's cost for the current billing month
 * exceeds the configured threshold for their tier.
 */
export declare function getUserCostAlert(userId: string, tier: string, billingStart: Date): Promise<{
    aboveThreshold: boolean;
    costEurCents: number;
    thresholdEurCents: number;
}>;
//# sourceMappingURL=cost-calculator.d.ts.map