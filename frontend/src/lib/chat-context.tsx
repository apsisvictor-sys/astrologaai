/**
 * Chat Context Provider
 * Re-exports the WebSocket-enabled version
 * 
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History
 * US-09: Chat Context Persistence
 * US-10: Streaming Responses (WebSocket)
 */

'use client';

// Re-export from WebSocket-enabled version
export { 
  ChatProvider, 
  useChat,
} from './chat-context-ws';
