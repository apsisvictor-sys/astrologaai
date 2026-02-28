/**
 * Partners Routes
 * US-18: Add Partner - CRUD operations
 * US-19: Synastry Chart Generation
 * US-20: Compatibility Report
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  listPartners,
  getPartner,
  createPartner,
  updatePartner,
  deletePartner,
  getSynastry,
  getCompatibilityReport,
} from '../controllers/partnerController';

const router = Router();

// All partner routes require authentication
router.use(authMiddleware);

// GET /api/partners - List all partners
router.get('/', listPartners);

// POST /api/partners - Create new partner
router.post('/', createPartner);

// GET /api/partners/:id - Get partner details
router.get('/:id', getPartner);

// GET /api/partners/:id/synastry - US-19: Get synastry chart
router.get('/:id/synastry', getSynastry);

// GET /api/partners/:id/report - US-20: Get compatibility report
router.get('/:id/report', getCompatibilityReport);

// PUT /api/partners/:id - Update partner
router.put('/:id', updatePartner);

// DELETE /api/partners/:id - Delete partner
router.delete('/:id', deletePartner);

export default router;
