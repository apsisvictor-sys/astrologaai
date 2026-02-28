/**
 * Chart Regeneration Service
 * US-30: Edit Birth Data - Background Chart Regeneration
 * 
 * Processes chart regeneration jobs from Redis queue
 */

import { prisma } from '../utils/prisma';
import { redisClient } from '../utils/redis';
import { calculateNatalChart, BirthDataInput } from './astrology';

interface RegenerationJob {
  jobId: string;
  profileId: string;
  userId: string;
  createdAt: string;
  status: string;
}

const QUEUE_KEY = 'chart_regeneration_queue';
const POLL_INTERVAL_MS = 5000; // 5 seconds
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Process a single regeneration job
 */
async function processJob(job: RegenerationJob): Promise<boolean> {
  console.log(`[ChartRegen] Processing job ${job.jobId}`);
  
  try {
    // Update job status
    job.status = 'processing';
    await redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
    
    // Get the birth profile
    const profile = await prisma.birthProfile.findUnique({
      where: { id: job.profileId },
    });
    
    if (!profile) {
      console.error(`[ChartRegen] Profile ${job.profileId} not found`);
      return false;
    }
    
    // Check if chart already exists (prevent duplicates)
    const existingChart = await prisma.birthChart.findFirst({
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
    
    const birthDataInput: BirthDataInput = {
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
    const chart = await calculateNatalChart(birthDataInput);
    
    // Save to database
    const savedChart = await prisma.birthChart.create({
      data: {
        userId: job.userId,
        birthProfileId: job.profileId,
        chartData: chart as any,
      },
    });
    
    console.log(`[ChartRegen] Created chart ${savedChart.id} for profile ${job.profileId}`);
    
    // Update job status to complete
    job.status = 'complete';
    await redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
    
    // TODO: Send notification to user (could use WebSocket or push notification)
    // For now, user polls the regeneration status endpoint
    
    return true;
  } catch (error) {
    console.error(`[ChartRegen] Error processing job ${job.jobId}:`, error);
    
    // Update job status to failed
    job.status = 'failed';
    await redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
    
    return false;
  }
}

/**
 * Start the regeneration queue processor
 * In development, this runs in a setInterval
 * In production, this could be a separate worker process
 */
export function startRegenerationProcessor(): void {
  console.log('[ChartRegen] Starting regeneration processor');
  
  // Use setInterval for simple polling
  // In production, consider using BullMQ or similar
  setInterval(async () => {
    try {
      // Pop a job from the queue (non-blocking)
      const jobStr = await redisClient.lPop(QUEUE_KEY);
      
      if (jobStr) {
        const job: RegenerationJob = JSON.parse(jobStr);
        await processJob(job);
      }
    } catch (error) {
      console.error('[ChartRegen] Queue processor error:', error);
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Manually trigger regeneration for a profile
 * Used when the queue processor is not running
 */
export async function regenerateChartNow(profileId: string, userId: string): Promise<string | null> {
  const job: RegenerationJob = {
    jobId: `chart_regen:${profileId}:${Date.now()}`,
    profileId,
    userId,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  
  // Store job in Redis
  await redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
  
  // Process immediately (for development or manual trigger)
  if (isDevelopment) {
    await processJob(job);
  } else {
    // Add to queue for worker to process
    await redisClient.rPush(QUEUE_KEY, JSON.stringify(job));
  }
  
  return job.jobId;
}

export default {
  startRegenerationProcessor,
  regenerateChartNow,
};
