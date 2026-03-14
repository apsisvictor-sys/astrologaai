"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminPrices = getAdminPrices;
exports.invalidatePriceCache = invalidatePriceCache;
exports.calcMessageCostUsdCents = calcMessageCostUsdCents;
exports.getUserCostEurCents = getUserCostEurCents;
exports.getUserCostAlert = getUserCostAlert;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
let priceCache = {};
let priceCacheTime = 0;
const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;
async function getAdminPrices() {
    if (Date.now() - priceCacheTime < PRICE_CACHE_TTL_MS && Object.keys(priceCache).length > 0) {
        return priceCache;
    }
    const configs = await prisma.adminConfig.findMany();
    const prices = {};
    for (const c of configs) {
        const parsed = parseInt(c.value, 10);
        if (!isNaN(parsed)) prices[c.key] = parsed;
    }
    priceCache = prices;
    priceCacheTime = Date.now();
    return prices;
}
function invalidatePriceCache() {
    priceCacheTime = 0;
}
function calcMessageCostUsdCents(model, inputTokens, outputTokens, prices) {
    const inputPrice = prices[`price_input_${model}`] ?? 0;
    const outputPrice = prices[`price_output_${model}`] ?? 0;
    return Math.round((inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000);
}
async function getUserCostEurCents(userId, startDate, endDate) {
    const prices = await getAdminPrices();
    const eurUsdRate = prices['eur_usd_rate'] ?? 108;
    const sessions = await prisma.chatSession.findMany({
        where: { userId },
        select: { id: true },
    });
    if (sessions.length === 0) return 0;
    const sessionIds = sessions.map(s => s.id);
    const messages = await prisma.chatMessage.findMany({
        where: {
            sessionId: { in: sessionIds },
            role: 'ASSISTANT',
            createdAt: { gte: startDate, lte: endDate },
        },
        select: { metadata: true },
    });
    let totalUsdCents = 0;
    for (const msg of messages) {
        const meta = msg.metadata;
        if (!meta?.model) continue;
        totalUsdCents += calcMessageCostUsdCents(meta.model, meta.inputTokens ?? 0, meta.outputTokens ?? 0, prices);
    }
    return Math.round((totalUsdCents * 100) / eurUsdRate);
}
async function getUserCostAlert(userId, tier, billingStart) {
    const prices = await getAdminPrices();
    const thresholdKey = {
        FREE: 'alert_threshold_free_eur_cents',
        PRO: 'alert_threshold_pro_eur_cents',
        PREMIUM: 'alert_threshold_premium_eur_cents',
    };
    const thresholdEurCents = prices[thresholdKey[tier] ?? ''] ?? Infinity;
    const costEurCents = await getUserCostEurCents(userId, billingStart, new Date());
    return { aboveThreshold: costEurCents >= thresholdEurCents, costEurCents, thresholdEurCents };
}
