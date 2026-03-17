/**
 * Birth Data Routes
 * US-05: Birth Data Collection
 * US-30: Edit Birth Data
 * 
 * Routes for managing birth profiles and chart history
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  listBirthProfiles,
  getBirthProfile,
  createBirthProfile,
  updateBirthProfile,
  deleteBirthProfile,
  getRegenerationStatus,
  getChartHistory,
  getHistoricalChart,
} from '../controllers/birthDataController';

const router = Router();

// All birth data routes require authentication
router.use(authMiddleware);

/**
 * Birth Profile CRUD
 */

// GET /api/v1/birth-data - List all user's birth profiles
router.get('/', listBirthProfiles);

// GET /api/v1/birth-data/:id - Get specific birth profile
router.get('/:id', getBirthProfile);

// POST /api/v1/birth-data - Create new birth profile
router.post('/', rateLimiter(10, 60), createBirthProfile);

// PUT /api/v1/birth-data/:id - Update birth profile (US-30: triggers chart regeneration)
router.put('/:id', updateBirthProfile);

// DELETE /api/v1/birth-data/:id - Delete birth profile
router.delete('/:id', deleteBirthProfile);

/**
 * US-30: Chart Regeneration & History
 */

// GET /api/v1/birth-data/:id/regeneration-status - Check chart regeneration status
router.get('/:id/regeneration-status', getRegenerationStatus);

// GET /api/v1/birth-data/:id/history - Get chart history for a profile
router.get('/:id/history', getChartHistory);

// GET /api/v1/birth-data/:id/history/:historyId - Get a specific historical chart
router.get('/:id/history/:historyId', getHistoricalChart);

export default router;
