"use strict";
/**
 * Chat Routes
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History
 *
 * Handles AI chat functionality with streaming responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const queryLimit_1 = require("../middleware/queryLimit");
const chatController_1 = require("../controllers/chatController");
const router = (0, express_1.Router)();
// All chat routes require authentication
router.use(auth_1.authMiddleware);
// Chat routes that consume queries - apply rate limiting
router.post('/message', queryLimit_1.queryLimitMiddleware, chatController_1.sendMessage);
router.post('/sessions', queryLimit_1.queryLimitMiddleware, chatController_1.createSession);
router.post('/new', queryLimit_1.queryLimitMiddleware, chatController_1.startNewConversation);
// Read-only routes - no rate limiting needed
router.get('/sessions', chatController_1.listSessions);
router.delete('/sessions', chatController_1.clearAllSessions);
router.get('/sessions/:id', chatController_1.getSession);
router.patch('/sessions/:id', chatController_1.updateSession);
router.delete('/sessions/:id', chatController_1.deleteSession);
router.get('/usage', chatController_1.getUsage);
exports.default = router;
//# sourceMappingURL=chat.js.map