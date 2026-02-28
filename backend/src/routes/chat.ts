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
} from '../controllers/chatController';

const router = Router();

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
router.get('/usage', getUsage);

export default router;
