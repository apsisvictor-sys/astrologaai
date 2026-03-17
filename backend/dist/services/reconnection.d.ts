/**
 * WebSocket Reconnection Service
 * US-38: WebSocket/Stream Reconnection Strategy
 *
 * Handles heartbeat, connection state management, and stream resumption
 */
export declare const HEARTBEAT_INTERVAL_MS = 30000;
export declare const MAX_RECONNECT_ATTEMPTS = 3;
/**
 * Store stream state for resumption
 */
export declare function storeStreamState(userId: string, conversationId: string, state: {
    lastTokenIndex?: number;
    lastContent?: string;
    messageId?: string;
    sessionContext?: string;
}): Promise<void>;
/**
 * Get stored stream state for resumption
 */
export declare function getStreamState(userId: string, conversationId: string): Promise<{
    lastTokenIndex?: number;
    lastContent?: string;
    messageId?: string;
    sessionContext?: string;
} | null>;
/**
 * Clear stream state after completion
 */
export declare function clearStreamState(userId: string, conversationId: string): Promise<void>;
/**
 * Store connection metadata for monitoring
 */
export declare function updateConnectionMeta(userId: string, data: {
    connectedAt?: string;
    lastHeartbeat?: string;
    reconnectCount?: number;
    lastConversationId?: string;
}): Promise<void>;
/**
 * Get connection metadata
 */
export declare function getConnectionMeta(userId: string): Promise<{
    connectedAt?: string;
    lastHeartbeat?: string;
    reconnectCount?: number;
    lastConversationId?: string;
} | null>;
/**
 * Register heartbeat interval for a socket
 */
export declare function createHeartbeatHandler(userId: string, socket: any, intervalMs?: number): NodeJS.Timeout;
/**
 * Handle pong response from client
 */
export declare function handleHeartbeatPong(userId: string, timestamp: number): Promise<void>;
/**
 * Store message queue for disconnected state
 */
export declare function queueMessage(userId: string, message: {
    conversationId: string;
    content: string;
    language?: 'bg' | 'en';
    messageId?: string;
}): Promise<void>;
/**
 * Get queued messages for user
 */
export declare function getQueuedMessages(userId: string): Promise<Array<{
    conversationId: string;
    content: string;
    language?: 'bg' | 'en';
    messageId?: string;
    queuedAt: string;
}>>;
/**
 * Clear message queue after successful delivery
 */
export declare function clearMessageQueue(userId: string): Promise<void>;
/**
 * Get reconnection status for a user
 */
export declare function getReconnectionStatus(userId: string): Promise<{
    canReconnect: boolean;
    reconnectCount: number;
    lastConnected?: string;
    lastHeartbeat?: string;
}>;
/**
 * Record reconnection attempt
 */
export declare function recordReconnectionAttempt(userId: string, success: boolean): Promise<void>;
declare const _default: {
    storeStreamState: typeof storeStreamState;
    getStreamState: typeof getStreamState;
    clearStreamState: typeof clearStreamState;
    updateConnectionMeta: typeof updateConnectionMeta;
    getConnectionMeta: typeof getConnectionMeta;
    createHeartbeatHandler: typeof createHeartbeatHandler;
    handleHeartbeatPong: typeof handleHeartbeatPong;
    queueMessage: typeof queueMessage;
    getQueuedMessages: typeof getQueuedMessages;
    clearMessageQueue: typeof clearMessageQueue;
    getReconnectionStatus: typeof getReconnectionStatus;
    recordReconnectionAttempt: typeof recordReconnectionAttempt;
    HEARTBEAT_INTERVAL_MS: number;
    MAX_RECONNECT_ATTEMPTS: number;
};
export default _default;
//# sourceMappingURL=reconnection.d.ts.map