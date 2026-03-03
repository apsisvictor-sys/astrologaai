/**
 * WebSocket Server - Socket.io Integration
 * US-10: Streaming Responses
 * US-38: WebSocket/Stream Reconnection Strategy
 * 
 * Real-time bidirectional communication for chat streaming
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
// SECURITY FIX: Import validated JWT secret (no insecure fallbacks)
import { JWT_SECRET } from '../utils/jwt';
import { isOriginAllowed } from '../config/runtime';

// Re-export chat handlers for external use
export { registerChatHandlers } from './chat-handler';

// Re-export reconnection service
export {
  storeStreamState,
  getStreamState,
  clearStreamState,
  updateConnectionMeta,
  getConnectionMeta,
  createHeartbeatHandler,
  handleHeartbeatPong,
  queueMessage,
  getQueuedMessages,
  clearMessageQueue,
  getReconnectionStatus,
  recordReconnectionAttempt,
} from '../services/reconnection';

// Types
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  userTier?: string;
  userLanguage?: string;
  heartbeatInterval?: NodeJS.Timeout;
}

interface SocketData {
  userId: string;
  sessionId?: string;
}

// Socket.io server instance
let io: SocketIOServer | null = null;

// CORS configuration

/**
 * Initialize Socket.io server
 */
export function initializeSocketServer(httpServer: HttpServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Socket CORS blocked for origin: ${origin || 'unknown'}`));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
    },
    // Ping/pong for connection health
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    // Transports
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                    socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      // SECURITY FIX: HTTP tokens use 'sub' claim for userId, not 'userId'
      const decoded = jwt.verify(token, JWT_SECRET) as {
        sub: string;  // userId is in 'sub' claim (standard JWT claim)
        email: string;
        tier?: string;
        language?: string;
      };

      // Map 'sub' claim to userId for socket authentication
      socket.userId = decoded.sub;
      socket.userEmail = decoded.email;
      socket.userTier = decoded.tier || 'FREE';
      socket.userLanguage = decoded.language || 'bg';

      next();
    } catch (error) {
      console.error('[Socket] Auth error:', error);
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket] User connected: ${socket.userId}`);

    // Store user session data
    socket.data.userId = socket.userId!;

    // Send connection confirmation
    socket.emit('chat:connected', {
      connectionId: socket.id,
      userId: socket.userId,
      tier: socket.userTier,
      serverTime: new Date().toISOString(),
    });

    // US-38: Initialize heartbeat
    const { createHeartbeatHandler, updateConnectionMeta, handleHeartbeatPong } = 
      require('../services/reconnection');

    // Update connection metadata
    updateConnectionMeta(socket.userId!, {
      connectedAt: new Date().toISOString(),
      reconnectCount: 0,
    }).catch(console.error);

    // Set up heartbeat interval
    socket.heartbeatInterval = createHeartbeatHandler(socket.userId!, socket);

    // Handle heartbeat pong from client
    socket.on('pong:heartbeat', (data: { timestamp: number }) => {
      handleHeartbeatPong(socket.userId!, data.timestamp).catch(console.error);
    });

    // Handle explicit reconnection request from client
    socket.on('reconnection:request', async (data: { conversationId?: string }) => {
      console.log(`[Socket] Reconnection request from ${socket.userId}`);
      
      // Send current stream state if resuming a conversation
      if (data.conversationId) {
        const { getStreamState } = require('../services/reconnection');
        const streamState = await getStreamState(socket.userId!, data.conversationId);
        
        if (streamState) {
          socket.emit('reconnection:stream_state', {
            conversationId: data.conversationId,
            ...streamState,
          });
        }
      }
      
      // Send queued messages status
      socket.emit('reconnection:status', {
        canReconnect: true,
        reconnecting: false,
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${socket.userId}, reason: ${reason}`);
      
      // Clear heartbeat interval
      if (socket.heartbeatInterval) {
        clearInterval(socket.heartbeatInterval);
        socket.heartbeatInterval = undefined;
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket] Error for user ${socket.userId}:`, error);
    });
  });

  return io;
}

/**
 * Get Socket.io server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Emit event to specific user
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (!io) return;

  // Find all sockets for this user
  const sockets = Array.from(io.sockets.sockets.values()) as AuthenticatedSocket[];
  const userSockets = sockets.filter(s => s.userId === userId);

  userSockets.forEach(socket => {
    socket.emit(event, data);
  });
}

/**
 * Emit event to specific socket
 */
export function emitToSocket(socketId: string, event: string, data: any): void {
  if (!io) return;
  io.to(socketId).emit(event, data);
}

/**
 * Get all sockets for a user
 */
export function getUserSockets(userId: string): AuthenticatedSocket[] {
  if (!io) return [];
  
  const sockets = Array.from(io.sockets.sockets.values()) as AuthenticatedSocket[];
  return sockets.filter(s => s.userId === userId);
}

/**
 * Check if user is connected
 */
export function isUserConnected(userId: string): boolean {
  return getUserSockets(userId).length > 0;
}

/**
 * Get connected users count
 */
export function getConnectedUsersCount(): number {
  if (!io) return 0;
  return io.sockets.sockets.size;
}

export default {
  initializeSocketServer,
  getSocketServer,
  emitToUser,
  emitToSocket,
  getUserSockets,
  isUserConnected,
  getConnectedUsersCount,
};
