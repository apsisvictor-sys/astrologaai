/**
 * WebSocket Server - Socket.io Integration
 * US-10: Streaming Responses
 * US-38: WebSocket/Stream Reconnection Strategy
 *
 * Real-time bidirectional communication for chat streaming
 */
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
export { registerChatHandlers } from './chat-handler';
export { storeStreamState, getStreamState, clearStreamState, updateConnectionMeta, getConnectionMeta, createHeartbeatHandler, handleHeartbeatPong, queueMessage, getQueuedMessages, clearMessageQueue, getReconnectionStatus, recordReconnectionAttempt, } from '../services/reconnection';
export interface AuthenticatedSocket extends Socket {
    userId?: string;
    userEmail?: string;
    userTier?: string;
    userLanguage?: string;
    heartbeatInterval?: NodeJS.Timeout;
}
/**
 * Initialize Socket.io server
 */
export declare function initializeSocketServer(httpServer: HttpServer): SocketIOServer;
/**
 * Get Socket.io server instance
 */
export declare function getSocketServer(): SocketIOServer | null;
/**
 * Emit event to specific user
 */
export declare function emitToUser(userId: string, event: string, data: any): void;
/**
 * Emit event to specific socket
 */
export declare function emitToSocket(socketId: string, event: string, data: any): void;
/**
 * Get all sockets for a user
 */
export declare function getUserSockets(userId: string): AuthenticatedSocket[];
/**
 * Check if user is connected
 */
export declare function isUserConnected(userId: string): boolean;
/**
 * Get connected users count
 */
export declare function getConnectedUsersCount(): number;
declare const _default: {
    initializeSocketServer: typeof initializeSocketServer;
    getSocketServer: typeof getSocketServer;
    emitToUser: typeof emitToUser;
    emitToSocket: typeof emitToSocket;
    getUserSockets: typeof getUserSockets;
    isUserConnected: typeof isUserConnected;
    getConnectedUsersCount: typeof getConnectedUsersCount;
};
export default _default;
//# sourceMappingURL=index.d.ts.map