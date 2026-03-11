"use strict";
/**
 * Location Routes
 * US-05: Birth Data Collection
 *
 * Routes for location search (geocoding)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rateLimiter_1 = require("../middleware/rateLimiter");
const birthDataController_1 = require("../controllers/birthDataController");
const router = (0, express_1.Router)();
// GET /api/v1/locations/search - Search for locations (autocomplete)
// No auth required — used by guest users on homepage
// Rate limited to prevent abuse of geocoding API
router.get('/search', (0, rateLimiter_1.rateLimiter)(20, 60), birthDataController_1.searchLocationsHandler);
exports.default = router;
//# sourceMappingURL=locations.js.map