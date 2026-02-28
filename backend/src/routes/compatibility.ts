/**
 * Compatibility Routes
 * US-20: Compatibility Analysis
 * 
 * Routes:
 * - GET /api/v1/compatibility/:partnerId - Get compatibility analysis for a partner
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getCompatibilityAnalysis,
  invalidateCompatibilityCache,
} from '../controllers/compatibilityController';

const router = Router();

// All compatibility routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/compatibility/:partnerId
 * @desc    Get compatibility analysis for a specific partner
 * @access  Private
 */
router.get('/:partnerId', getCompatibilityAnalysis);

/**
 * @route   DELETE /api/v1/compatibility/:partnerId/cache
 * @desc    Invalidate cached compatibility analysis
 * @access  Private
 */
router.delete('/:partnerId/cache', invalidateCompatibilityCache);

export default router;
