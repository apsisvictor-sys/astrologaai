/**
 * Chat Routes
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History
 * 
 * Handles AI chat functionality with streaming responses
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { queryLimitMiddleware } from '../middleware/queryLimit';
import {
  sendMessage,
  listSessions,
  getSession,
  createSession,
  deleteSession,
  clearAllSessions,
  updateSession,
  getUsage,
  startNewConversation,
  importGuestMessages,
  shareSession,
  unshareSession,
  getSharedSession,
  rateSession,
} from '../controllers/chatController';

const router = Router();

// Public route — no auth required (must be before authMiddleware)
router.get('/share/:token', getSharedSession);

// All chat routes require authentication
router.use(authMiddleware);

// Chat routes that consume queries - apply rate limiting
router.post('/message', queryLimitMiddleware, sendMessage);
router.post('/sessions', queryLimitMiddleware, createSession);
router.post('/new', queryLimitMiddleware, startNewConversation);

// Read-only routes - no rate limiting needed
router.get('/sessions', listSessions);
router.delete('/sessions', clearAllSessions);
router.get('/sessions/:id', getSession);
router.patch('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);
router.post('/sessions/:id/import', importGuestMessages);
router.post('/sessions/:id/share', shareSession);
router.delete('/sessions/:id/share', unshareSession);
router.post('/sessions/:id/rate', rateSession);
router.get('/usage', getUsage);

export default router;
