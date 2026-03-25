"use strict";
/**
 * Partners Routes
 * US-18: Add Partner - CRUD operations
 * US-19: Synastry Chart Generation
 * US-20: Compatibility Report
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const partnerController_1 = require("../controllers/partnerController");
const router = (0, express_1.Router)();
// All partner routes require authentication
router.use(auth_1.authMiddleware);
// GET /api/partners - List all partners
router.get('/', partnerController_1.listPartners);
// POST /api/partners - Create new partner
router.post('/', partnerController_1.createPartner);
// GET /api/partners/:id - Get partner details
router.get('/:id', partnerController_1.getPartner);
// GET /api/partners/:id/synastry - US-19: Get synastry chart
router.get('/:id/synastry', partnerController_1.getSynastry);
// GET /api/partners/:id/report - US-20: Get compatibility report
router.get('/:id/report', partnerController_1.getCompatibilityReport);
// GET /api/partners/:id/composite - FEAT-11: Get composite chart (PREMIUM)
router.get('/:id/composite', partnerController_1.getCompositeChart);
// PUT /api/partners/:id - Update partner
router.put('/:id', partnerController_1.updatePartner);
// DELETE /api/partners/:id - Delete partner
router.delete('/:id', partnerController_1.deletePartner);
exports.default = router;
//# sourceMappingURL=partners.js.map