/**
 * Location Routes
 * US-05: Birth Data Collection
 * 
 * Routes for location search (geocoding)
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { searchLocationsHandler } from '../controllers/birthDataController';

const router = Router();

// All location routes require authentication
router.use(authMiddleware);

// GET /api/v1/locations/search - Search for locations (autocomplete)
// Rate limited to prevent abuse of geocoding API
router.get('/search', rateLimiter(20, 60), searchLocationsHandler);

export default router;
