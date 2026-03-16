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

const QUEUE_KEY = 'chart_regeneration_queue'; // kept for any existing queued jobs on startup

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
 * No-op — polling loop removed. Jobs are processed inline in regenerateChartNow.
 * The 5-second Redis poll was generating ~17k empty lPop calls/day with zero users.
 */
export function startRegenerationProcessor(): void {
  // intentionally empty
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
  
  // Always process inline — no separate worker process exists
  await processJob(job);
  
  return job.jobId;
}

export default {
  startRegenerationProcessor,
  regenerateChartNow,
};
