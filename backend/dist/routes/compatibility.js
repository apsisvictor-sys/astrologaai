"use strict";
/**
 * Compatibility Routes
 * US-20: Compatibility Analysis
 *
 * Routes:
 * - GET /api/v1/compatibility/:partnerId - Get compatibility analysis for a partner
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const compatibilityController_1 = require("../controllers/compatibilityController");
const router = (0, express_1.Router)();
// All compatibility routes require authentication
router.use(auth_1.authMiddleware);
/**
 * @route   GET /api/v1/compatibility/:partnerId
 * @desc    Get compatibility analysis for a specific partner
 * @access  Private
 */
router.get('/:partnerId', compatibilityController_1.getCompatibilityAnalysis);
/**
 * @route   DELETE /api/v1/compatibility/:partnerId/cache
 * @desc    Invalidate cached compatibility analysis
 * @access  Private
 */
router.delete('/:partnerId/cache', compatibilityController_1.invalidateCompatibilityCache);
exports.default = router;
//# sourceMappingURL=compatibility.js.map