"use strict";
/**
 * Birth Data Routes
 * US-05: Birth Data Collection
 * US-30: Edit Birth Data
 *
 * Routes for managing birth profiles and chart history
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const birthDataController_1 = require("../controllers/birthDataController");
const router = (0, express_1.Router)();
// All birth data routes require authentication
router.use(auth_1.authMiddleware);
/**
 * Birth Profile CRUD
 */
// GET /api/v1/birth-data - List all user's birth profiles
router.get('/', birthDataController_1.listBirthProfiles);
// GET /api/v1/birth-data/:id - Get specific birth profile
router.get('/:id', birthDataController_1.getBirthProfile);
// POST /api/v1/birth-data - Create new birth profile
router.post('/', (0, rateLimiter_1.rateLimiter)(10, 60), birthDataController_1.createBirthProfile);
// PUT /api/v1/birth-data/:id - Update birth profile (US-30: triggers chart regeneration)
router.put('/:id', birthDataController_1.updateBirthProfile);
// DELETE /api/v1/birth-data/:id - Delete birth profile
router.delete('/:id', birthDataController_1.deleteBirthProfile);
/**
 * US-30: Chart Regeneration & History
 */
// GET /api/v1/birth-data/:id/regeneration-status - Check chart regeneration status
router.get('/:id/regeneration-status', birthDataController_1.getRegenerationStatus);
// GET /api/v1/birth-data/:id/history - Get chart history for a profile
router.get('/:id/history', birthDataController_1.getChartHistory);
// GET /api/v1/birth-data/:id/history/:historyId - Get a specific historical chart
router.get('/:id/history/:historyId', birthDataController_1.getHistoricalChart);
exports.default = router;
//# sourceMappingURL=birthData.js.map