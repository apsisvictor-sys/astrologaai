/**
 * Chat Controller
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History
 * US-09: Chat Context Persistence
 *
 * Handles chat message sending with streaming responses
 * Implements rate limiting based on user tier
 * Implements context persistence via Redis with session summarization
 */
import { Request, Response } from 'express';
/**
 * POST /api/v1/chat/message
 * Send a message to the AI astrologer with streaming response
 */
export declare function sendMessage(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/chat/sessions
 * List user's chat sessions with optional search
 * US-08: Chat History - Full-text search support
 */
export declare function listSessions(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/chat/sessions/:id
 * Get a specific chat session with messages
 */
export declare function getSession(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/chat/sessions
 * Create a new chat session
 */
export declare function createSession(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/v1/chat/sessions/:id
 * Delete a chat session
 */
export declare function deleteSession(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/chat/new
 * Start a new conversation with fresh context
 * US-09: New Conversation - clears session context
 */
export declare function startNewConversation(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/v1/chat/sessions
 * Clear all chat sessions for the user
 * US-08: Chat History - Clear all history
 */
export declare function clearAllSessions(req: Request, res: Response): Promise<void>;
/**
 * PATCH /api/v1/chat/sessions/:id
 * Update a chat session (e.g., rename title)
 * US-08: Chat History - Rename conversation
 */
export declare function updateSession(req: Request, res: Response): Promise<void>;
/**
 * GET /api/v1/chat/usage
 * Get user's chat usage statistics
 */
export declare function getUsage(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/chat/sessions/:id/import
 * Import guest messages into an existing session
 * Used when a guest user registers to migrate their homepage chat
 */
export declare function importGuestMessages(req: Request, res: Response): Promise<void>;
declare const _default: {
    sendMessage: typeof sendMessage;
    listSessions: typeof listSessions;
    getSession: typeof getSession;
    createSession: typeof createSession;
    deleteSession: typeof deleteSession;
    getUsage: typeof getUsage;
};
export default _default;
//# sourceMappingURL=chatController.d.ts.map