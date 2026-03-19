import { Router, Request, Response } from 'express';
import { getCurrentEvents } from '../config/astrological-events';
import { redisClient } from '../utils/redis';

const router = Router();

// GET /api/v1/transits/current-events
router.get('/current-events', async (req: Request, res: Response) => {
  try {
    const cacheKey = `transits:current_events:${new Date().toISOString().split('T')[0]}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const events = getCurrentEvents();
    await redisClient.setEx(cacheKey, 60 * 60, JSON.stringify(events));
    return res.json({ success: true, data: events });
  } catch (err) {
    console.error('[Transits] current-events error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to get current events' } });
  }
});

export default router;
