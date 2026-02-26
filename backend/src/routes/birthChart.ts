import { Router } from 'express';

const router = Router();

// Placeholder routes - to be implemented
router.get('/', (_req, res) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Birth chart endpoints coming soon' },
  });
});

export default router;
