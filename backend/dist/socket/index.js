"use strict";
/**
 * WebSocket Server - Socket.io Integration
 * US-10: Streaming Responses
 * US-38: WebSocket/Stream Reconnection Strategy
 *
 * Real-time bidirectional communication for chat streaming
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordReconnectionAttempt = exports.getReconnectionStatus = exports.clearMessageQueue = exports.getQueuedMessages = exports.queueMessage = exports.handleHeartbeatPong = exports.createHeartbeatHandler = exports.getConnectionMeta = exports.updateConnectionMeta = exports.clearStreamState = exports.getStreamState = exports.storeStreamState = exports.registerChatHandlers = void 0;
exports.initializeSocketServer = initializeSocketServer;
exports.getSocketServer = getSocketServer;
exports.emitToUser = emitToUser;
exports.emitToSocket = emitToSocket;
exports.getUserSockets = getUserSockets;
exports.isUserConnected = isUserConnected;
exports.getConnectedUsersCount = getConnectedUsersCount;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// SECURITY FIX: Import validated JWT secret (no insecure fallbacks)
const jwt_1 = require("../utils/jwt");
const runtime_1 = require("../config/runtime");
// Re-export chat handlers for external use
var chat_handler_1 = require("./chat-handler");
Object.defineProperty(exports, "registerChatHandlers", { enumerable: true, get: function () { return chat_handler_1.registerChatHandlers; } });
// Re-export reconnection service
var reconnection_1 = require("../services/reconnection");
Object.defineProperty(exports, "storeStreamState", { enumerable: true, get: function () { return reconnection_1.storeStreamState; } });
Object.defineProperty(exports, "getStreamState", { enumerable: true, get: function () { return reconnection_1.getStreamState; } });
Object.defineProperty(exports, "clearStreamState", { enumerable: true, get: function () { return reconnection_1.clearStreamState; } });
Object.defineProperty(exports, "updateConnectionMeta", { enumerable: true, get: function () { return reconnection_1.updateConnectionMeta; } });
Object.defineProperty(exports, "getConnectionMeta", { enumerable: true, get: function () { return reconnection_1.getConnectionMeta; } });
Object.defineProperty(exports, "createHeartbeatHandler", { enumerable: true, get: function () { return reconnection_1.createHeartbeatHandler; } });
Object.defineProperty(exports, "handleHeartbeatPong", { enumerable: true, get: function () { return reconnection_1.handleHeartbeatPong; } });
Object.defineProperty(exports, "queueMessage", { enumerable: true, get: function () { return reconnection_1.queueMessage; } });
Object.defineProperty(exports, "getQueuedMessages", { enumerable: true, get: function () { return reconnection_1.getQueuedMessages; } });
Object.defineProperty(exports, "clearMessageQueue", { enumerable: true, get: function () { return reconnection_1.clearMessageQueue; } });
Object.defineProperty(exports, "getReconnectionStatus", { enumerable: true, get: function () { return reconnection_1.getReconnectionStatus; } });
Object.defineProperty(exports, "recordReconnectionAttempt", { enumerable: true, get: function () { return reconnection_1.recordReconnectionAttempt; } });
// Socket.io server instance
let io = null;
// CORS configuration
/**
 * Initialize Socket.io server
 */
function initializeSocketServer(httpServer) {
    if (io) {
        return io;
    }
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if ((0, runtime_1.isOriginAllowed)(origin)) {
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
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token ||
                socket.handshake.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return next(new Error('Authentication required'));
            }
            // Verify JWT token
            // SECURITY FIX: HTTP tokens use 'sub' claim for userId, not 'userId'
            const decoded = jsonwebtoken_1.default.verify(token, jwt_1.JWT_SECRET);
            // Map 'sub' claim to userId for socket authentication
            socket.userId = decoded.sub;
            socket.userEmail = decoded.email;
            socket.userTier = decoded.tier || 'FREE';
            socket.userLanguage = decoded.language || 'bg';
            next();
        }
        catch (error) {
            console.error('[Socket] Auth error:', error);
            next(new Error('Invalid token'));
        }
    });
    // Connection handler
    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.userId}`);
        // Store user session data
        socket.data.userId = socket.userId;
        // Send connection confirmation
        socket.emit('chat:connected', {
            connectionId: socket.id,
            userId: socket.userId,
            tier: socket.userTier,
            serverTime: new Date().toISOString(),
        });
        // US-38: Initialize heartbeat
        const { createHeartbeatHandler, updateConnectionMeta, handleHeartbeatPong } = require('../services/reconnection');
        // Update connection metadata
        updateConnectionMeta(socket.userId, {
            connectedAt: new Date().toISOString(),
            reconnectCount: 0,
        }).catch(console.error);
        // Set up heartbeat interval
        socket.heartbeatInterval = createHeartbeatHandler(socket.userId, socket);
        // Handle heartbeat pong from client
        socket.on('pong:heartbeat', (data) => {
            handleHeartbeatPong(socket.userId, data.timestamp).catch(console.error);
        });
        // Handle explicit reconnection request from client
        socket.on('reconnection:request', async (data) => {
            console.log(`[Socket] Reconnection request from ${socket.userId}`);
            // Send current stream state if resuming a conversation
            if (data.conversationId) {
                const { getStreamState } = require('../services/reconnection');
                const streamState = await getStreamState(socket.userId, data.conversationId);
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
function getSocketServer() {
    return io;
}
/**
 * Emit event to specific user
 */
function emitToUser(userId, event, data) {
    if (!io)
        return;
    // Find all sockets for this user
    const sockets = Array.from(io.sockets.sockets.values());
    const userSockets = sockets.filter(s => s.userId === userId);
    userSockets.forEach(socket => {
        socket.emit(event, data);
    });
}
/**
 * Emit event to specific socket
 */
function emitToSocket(socketId, event, data) {
    if (!io)
        return;
    io.to(socketId).emit(event, data);
}
/**
 * Get all sockets for a user
 */
function getUserSockets(userId) {
    if (!io)
        return [];
    const sockets = Array.from(io.sockets.sockets.values());
    return sockets.filter(s => s.userId === userId);
}
/**
 * Check if user is connected
 */
function isUserConnected(userId) {
    return getUserSockets(userId).length > 0;
}
/**
 * Get connected users count
 */
function getConnectedUsersCount() {
    if (!io)
        return 0;
    return io.sockets.sockets.size;
}
exports.default = {
    initializeSocketServer,
    getSocketServer,
    emitToUser,
    emitToSocket,
    getUserSockets,
    isUserConnected,
    getConnectedUsersCount,
};
//# sourceMappingURL=index.js.map