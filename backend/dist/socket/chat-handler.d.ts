/**
 * Chat WebSocket Handler
 * US-10: Streaming Responses
 * US-36: Free-tier Query Limit Enforcement
 *
 * Handles chat-related WebSocket events for real-time streaming
 */
import { AuthenticatedSocket } from './index';
/**
 * Handle chat:subscribe event
 * Subscribe to a conversation for receiving messages
 */
export declare function handleChatSubscribe(socket: AuthenticatedSocket, data: {
    conversationId: string;
}): Promise<void>;
/**
 * Handle chat:send_message event
 * Send a message and stream AI response
 */
export declare function handleChatSendMessage(socket: AuthenticatedSocket, data: {
    conversationId: string;
    content: string;
    language?: 'bg' | 'en';
    context?: {
        includeChart?: boolean;
        includeTransits?: boolean;
        partnerId?: string | null;
    };
    messageId?: string;
}): Promise<void>;
/**
 * Handle chat:typing event
 * User typing indicator
 */
export declare function handleChatTyping(socket: AuthenticatedSocket, data: {
    conversationId: string;
    isTyping: boolean;
}): Promise<void>;
/**
 * Handle chat:cancel_generation event
 * Cancel ongoing AI response generation
 */
export declare function handleChatCancelGeneration(socket: AuthenticatedSocket, data: {
    conversationId: string;
    messageId?: string;
}): Promise<void>;
/**
 * Handle chat:unsubscribe event
 * Unsubscribe from a conversation
 */
export declare function handleChatUnsubscribe(socket: AuthenticatedSocket, data: {
    conversationId: string;
}): Promise<void>;
/**
 * Register all chat event handlers
 */
export declare function registerChatHandlers(socket: AuthenticatedSocket): void;
declare const _default: {
    registerChatHandlers: typeof registerChatHandlers;
    handleChatSubscribe: typeof handleChatSubscribe;
    handleChatSendMessage: typeof handleChatSendMessage;
    handleChatTyping: typeof handleChatTyping;
    handleChatCancelGeneration: typeof handleChatCancelGeneration;
    handleChatUnsubscribe: typeof handleChatUnsubscribe;
};
export default _default;
//# sourceMappingURL=chat-handler.d.ts.map