"use strict";
/**
 * Chart Regeneration Service
 * US-30: Edit Birth Data - Background Chart Regeneration
 *
 * Processes chart regeneration jobs from Redis queue
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRegenerationProcessor = startRegenerationProcessor;
exports.regenerateChartNow = regenerateChartNow;
const prisma_1 = require("../utils/prisma");
const redis_1 = require("../utils/redis");
const astrology_1 = require("./astrology");
const QUEUE_KEY = 'chart_regeneration_queue'; // kept for any existing queued jobs on startup
/**
 * Process a single regeneration job
 */
async function processJob(job) {
    console.log(`[ChartRegen] Processing job ${job.jobId}`);
    try {
        // Update job status
        job.status = 'processing';
        await redis_1.redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
        // Get the birth profile
        const profile = await prisma_1.prisma.birthProfile.findUnique({
            where: { id: job.profileId },
        });
        if (!profile) {
            console.error(`[ChartRegen] Profile ${job.profileId} not found`);
            return false;
        }
        // Check if chart already exists (prevent duplicates)
        const existingChart = await prisma_1.prisma.birthChart.findFirst({
            where: { birthProfileId: job.profileId },
        });
        if (existingChart) {
            console.log(`[ChartRegen] Chart already exists for profile ${job.profileId}`);
            return true;
        }
        // Prepare birth data for calculation
        const birthDate = new Date(profile.birthDate);
        const birthTime = profile.birthTime || '12:00';
        const [hour, minute] = birthTime.split(':').map(Number);
        const birthDataInput = {
            year: birthDate.getFullYear(),
            month: birthDate.getMonth() + 1,
            day: birthDate.getDate(),
            hour: hour || 12,
            minute: minute || 0,
            latitude: profile.latitude,
            longitude: profile.longitude,
            timezone: profile.timezone,
        };
        // Calculate the natal chart
        const chart = await (0, astrology_1.calculateNatalChart)(birthDataInput);
        // Save to database
        const savedChart = await prisma_1.prisma.birthChart.create({
            data: {
                userId: job.userId,
                birthProfileId: job.profileId,
                chartData: chart,
            },
        });
        console.log(`[ChartRegen] Created chart ${savedChart.id} for profile ${job.profileId}`);
        // Update job status to complete
        job.status = 'complete';
        await redis_1.redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
        return true;
    }
    catch (error) {
        console.error(`[ChartRegen] Error processing job ${job.jobId}:`, error);
        // Update job status to failed
        job.status = 'failed';
        await redis_1.redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
        return false;
    }
}
/**
 * No-op — polling loop removed. Jobs are processed inline in regenerateChartNow.
 * The 5-second Redis poll was generating ~17k empty lPop calls/day with zero users.
 */
function startRegenerationProcessor() {
    // intentionally empty
}
/**
 * Manually trigger regeneration for a profile
 * Used when birth data changes
 */
async function regenerateChartNow(profileId, userId) {
    const job = {
        jobId: `chart_regen:${profileId}:${Date.now()}`,
        profileId,
        userId,
        createdAt: new Date().toISOString(),
        status: 'pending',
    };
    // Store job in Redis
    await redis_1.redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
    // Always process inline — no separate worker process exists
    await processJob(job);
    return job.jobId;
}
exports.default = {
    startRegenerationProcessor,
    regenerateChartNow,
};
//# sourceMappingURL=chart-regeneration.js.map
