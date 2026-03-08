"use strict";
/**
 * Reconnection Service Tests
 * US-38: WebSocket/Stream Reconnection Strategy
 *
 * Tests for heartbeat, stream state management, and message queuing
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Use vi.hoisted to avoid hoisting issues
const { mockRedis } = vitest_1.vi.hoisted(() => {
    return {
        mockRedis: {
            setex: vitest_1.vi.fn().mockResolvedValue('OK'),
            set: vitest_1.vi.fn().mockResolvedValue('OK'),
            get: vitest_1.vi.fn().mockResolvedValue(null),
            del: vitest_1.vi.fn().mockResolvedValue(1),
            lrange: vitest_1.vi.fn().mockResolvedValue([]),
            rpush: vitest_1.vi.fn().mockResolvedValue(1),
        },
    };
});
vitest_1.vi.mock('../utils/redis', () => ({
    redisClient: mockRedis,
}));
vitest_1.vi.mock('@prisma/client', () => ({
    PrismaClient: vitest_1.vi.fn().mockImplementation(() => ({})),
}));
(0, vitest_1.describe)('Reconnection Service', () => {
    const testUserId = 'user-123';
    const testConversationId = 'conv-456';
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('storeStreamState', () => {
        (0, vitest_1.it)('should store stream state in Redis', async () => {
            const { storeStreamState } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            const state = {
                lastTokenIndex: 5,
                lastContent: 'Hello ',
                messageId: 'msg-789',
            };
            await storeStreamState(testUserId, testConversationId, state);
            (0, vitest_1.expect)(mockRedis.setex).toHaveBeenCalledWith(`stream:state:${testUserId}:${testConversationId}`, 3600, JSON.stringify(state));
        });
        (0, vitest_1.it)('should handle errors gracefully without throwing', async () => {
            const { storeStreamState } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            mockRedis.setex.mockRejectedValueOnce(new Error('Redis error'));
            // Should not throw
            await (0, vitest_1.expect)(storeStreamState(testUserId, testConversationId, {})).resolves.toBeUndefined();
        });
    });
    (0, vitest_1.describe)('getStreamState', () => {
        (0, vitest_1.it)('should return null when no state exists', async () => {
            const { getStreamState } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            mockRedis.get.mockResolvedValueOnce(null);
            const result = await getStreamState(testUserId, testConversationId);
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should return stored stream state', async () => {
            const { getStreamState } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            const storedState = {
                lastTokenIndex: 10,
                lastContent: 'Hello world',
                messageId: 'msg-123',
            };
            mockRedis.get.mockResolvedValueOnce(JSON.stringify(storedState));
            const result = await getStreamState(testUserId, testConversationId);
            (0, vitest_1.expect)(result).toEqual(storedState);
        });
        (0, vitest_1.it)('should handle errors gracefully', async () => {
            const { getStreamState } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));
            const result = await getStreamState(testUserId, testConversationId);
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('clearStreamState', () => {
        (0, vitest_1.it)('should delete stream state from Redis', async () => {
            const { clearStreamState } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            await clearStreamState(testUserId, testConversationId);
            (0, vitest_1.expect)(mockRedis.del).toHaveBeenCalledWith(`stream:state:${testUserId}:${testConversationId}`);
        });
    });
    (0, vitest_1.describe)('queueMessage', () => {
        (0, vitest_1.it)('should add message to queue', async () => {
            const { queueMessage } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            mockRedis.lrange.mockResolvedValueOnce([]);
            await queueMessage(testUserId, {
                conversationId: testConversationId,
                content: 'Test message',
                language: 'bg',
            });
            (0, vitest_1.expect)(mockRedis.rpush).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should limit queue size to 50 messages', async () => {
            const { queueMessage } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            // Create 50 mock messages
            const existingMessages = Array(50).fill(null).map((_, i) => JSON.stringify({ content: `Message ${i}` }));
            mockRedis.lrange.mockResolvedValueOnce(existingMessages);
            await queueMessage(testUserId, {
                conversationId: testConversationId,
                content: 'New message',
            });
            // Should not add more messages
            (0, vitest_1.expect)(mockRedis.rpush).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('getQueuedMessages', () => {
        (0, vitest_1.it)('should return empty array when no messages', async () => {
            const { getQueuedMessages } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            mockRedis.lrange.mockResolvedValueOnce([]);
            const result = await getQueuedMessages(testUserId);
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)('should return queued messages', async () => {
            const { getQueuedMessages } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            const messages = [
                { conversationId: 'conv-1', content: 'Hello', queuedAt: '2024-01-01T00:00:00Z' },
                { conversationId: 'conv-2', content: 'World', queuedAt: '2024-01-01T00:00:01Z' },
            ];
            mockRedis.lrange.mockResolvedValueOnce(messages.map(m => JSON.stringify(m)));
            const result = await getQueuedMessages(testUserId);
            (0, vitest_1.expect)(result).toEqual(messages);
        });
    });
    (0, vitest_1.describe)('clearMessageQueue', () => {
        (0, vitest_1.it)('should delete queue from Redis', async () => {
            const { clearMessageQueue } = await Promise.resolve().then(() => __importStar(require('../services/reconnection')));
            await clearMessageQueue(testUserId);
            (0, vitest_1.expect)(mockRedis.del).toHaveBeenCalledWith(`message:queue:${testUserId}`);
        });
    });
});
// Test configuration constants directly from the module
(0, vitest_1.describe)('Reconnection Configuration Constants', () => {
    (0, vitest_1.it)('should export heartbeat interval of 30 seconds', async () => {
        // Read the file and extract constants
        const fs = require('fs');
        const path = require('path');
        const reconnectionPath = path.join(__dirname, '../services/reconnection.ts');
        const content = fs.readFileSync(reconnectionPath, 'utf-8');
        // Check that HEARTBEAT_INTERVAL_MS is defined as 30000
        (0, vitest_1.expect)(content).toContain('HEARTBEAT_INTERVAL_MS = 30000');
        (0, vitest_1.expect)(content).toContain('MAX_RECONNECT_ATTEMPTS = 3'); // US-38: Updated from 5 to 3
    });
    (0, vitest_1.it)('should have correct constants in the source', () => {
        const fs = require('fs');
        const path = require('path');
        const reconnectionPath = path.join(__dirname, '../services/reconnection.ts');
        const content = fs.readFileSync(reconnectionPath, 'utf-8');
        // Verify the actual values in source
        (0, vitest_1.expect)(content).toMatch(/HEARTBEAT_INTERVAL_MS\s*=\s*30000/);
        (0, vitest_1.expect)(content).toMatch(/MAX_RECONNECT_ATTEMPTS\s*=\s*3/); // US-38: Updated from 5 to 3
    });
});
//# sourceMappingURL=reconnection.test.js.map