/**
 * Chat Components Index
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History
 * US-09: Chat Context Persistence
 * US-10: Streaming Responses
 */

// Main interface (use the WebSocket-enabled version)
export { ChatInterface } from './chat-interface-ws';
export { default as ChatInterfaceWS } from './chat-interface-ws';

// Legacy interface (SSE-only)
export { default as ChatInterfaceLegacy } from './chat-interface';

// Input component
export { ChatInput } from './chat-input-ws';
export { default as ChatInputLegacy } from './chat-input';

// Message display
export { ChatMessage, StreamingMessage } from './chat-message';

// History
export { ChatHistory } from './chat-history';

// Usage counter
export { UsageCounter } from './usage-counter';

// US-10: Streaming components
export { 
  TypingIndicator, 
  InlineTypingIndicator, 
  StreamingCursor 
} from './typing-indicator';

// US-10: Connection status
export { 
  ConnectionStatus, 
  ConnectionBanner 
} from './connection-status';
