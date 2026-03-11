/**
 * Reconnection Service Tests
 * US-38: WebSocket/Stream Reconnection Strategy
 * 
 * Tests for heartbeat, stream state management, and message queuing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to avoid hoisting issues
const { mockRedis } = vi.hoisted(() => {
  return {
    mockRedis: {
      setEx: vi.fn().mockResolvedValue('OK'),
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(1),
      lRange: vi.fn().mockResolvedValue([]),
      rPush: vi.fn().mockResolvedValue(1),
    },
  };
});

vi.mock('../utils/redis', () => ({
  redisClient: mockRedis,
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({})),
}));

describe('Reconnection Service', () => {
  const testUserId = 'user-123';
  const testConversationId = 'conv-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('storeStreamState', () => {
    it('should store stream state in Redis', async () => {
      const { storeStreamState } = await import('../services/reconnection');
      
      const state = {
        lastTokenIndex: 5,
        lastContent: 'Hello ',
        messageId: 'msg-789',
      };

      await storeStreamState(testUserId, testConversationId, state);

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `stream:state:${testUserId}:${testConversationId}`,
        3600,
        JSON.stringify(state)
      );
    });

    it('should handle errors gracefully without throwing', async () => {
      const { storeStreamState } = await import('../services/reconnection');
      mockRedis.setEx.mockRejectedValueOnce(new Error('Redis error'));

      // Should not throw
      await expect(
        storeStreamState(testUserId, testConversationId, {})
      ).resolves.toBeUndefined();
    });
  });

  describe('getStreamState', () => {
    it('should return null when no state exists', async () => {
      const { getStreamState } = await import('../services/reconnection');
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await getStreamState(testUserId, testConversationId);

      expect(result).toBeNull();
    });

    it('should return stored stream state', async () => {
      const { getStreamState } = await import('../services/reconnection');
      const storedState = {
        lastTokenIndex: 10,
        lastContent: 'Hello world',
        messageId: 'msg-123',
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(storedState));

      const result = await getStreamState(testUserId, testConversationId);

      expect(result).toEqual(storedState);
    });

    it('should handle errors gracefully', async () => {
      const { getStreamState } = await import('../services/reconnection');
      mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));

      const result = await getStreamState(testUserId, testConversationId);

      expect(result).toBeNull();
    });
  });

  describe('clearStreamState', () => {
    it('should delete stream state from Redis', async () => {
      const { clearStreamState } = await import('../services/reconnection');
      
      await clearStreamState(testUserId, testConversationId);

      expect(mockRedis.del).toHaveBeenCalledWith(
        `stream:state:${testUserId}:${testConversationId}`
      );
    });
  });

  describe('queueMessage', () => {
    it('should add message to queue', async () => {
      const { queueMessage } = await import('../services/reconnection');
      mockRedis.lRange.mockResolvedValueOnce([]);

      await queueMessage(testUserId, {
        conversationId: testConversationId,
        content: 'Test message',
        language: 'bg',
      });

      expect(mockRedis.rPush).toHaveBeenCalled();
    });

    it('should limit queue size to 50 messages', async () => {
      const { queueMessage } = await import('../services/reconnection');
      // Create 50 mock messages
      const existingMessages = Array(50).fill(null).map((_, i) => 
        JSON.stringify({ content: `Message ${i}` })
      );
      mockRedis.lRange.mockResolvedValueOnce(existingMessages);

      await queueMessage(testUserId, {
        conversationId: testConversationId,
        content: 'New message',
      });

      // Should not add more messages
      expect(mockRedis.rPush).not.toHaveBeenCalled();
    });
  });

  describe('getQueuedMessages', () => {
    it('should return empty array when no messages', async () => {
      const { getQueuedMessages } = await import('../services/reconnection');
      mockRedis.lRange.mockResolvedValueOnce([]);

      const result = await getQueuedMessages(testUserId);

      expect(result).toEqual([]);
    });

    it('should return queued messages', async () => {
      const { getQueuedMessages } = await import('../services/reconnection');
      const messages = [
        { conversationId: 'conv-1', content: 'Hello', queuedAt: '2024-01-01T00:00:00Z' },
        { conversationId: 'conv-2', content: 'World', queuedAt: '2024-01-01T00:00:01Z' },
      ];
      mockRedis.lRange.mockResolvedValueOnce(
        messages.map(m => JSON.stringify(m))
      );

      const result = await getQueuedMessages(testUserId);

      expect(result).toEqual(messages);
    });
  });

  describe('clearMessageQueue', () => {
    it('should delete queue from Redis', async () => {
      const { clearMessageQueue } = await import('../services/reconnection');
      
      await clearMessageQueue(testUserId);

      expect(mockRedis.del).toHaveBeenCalledWith(`message:queue:${testUserId}`);
    });
  });
});

// Test configuration constants directly from the module
describe('Reconnection Configuration Constants', () => {
  it('should export heartbeat interval of 30 seconds', async () => {
    // Read the file and extract constants
    const fs = require('fs');
    const path = require('path');
    const reconnectionPath = path.join(__dirname, '../services/reconnection.ts');
    const content = fs.readFileSync(reconnectionPath, 'utf-8');
    
    // Check that HEARTBEAT_INTERVAL_MS is defined as 30000
    expect(content).toContain('HEARTBEAT_INTERVAL_MS = 30000');
    expect(content).toContain('MAX_RECONNECT_ATTEMPTS = 3'); // US-38: Updated from 5 to 3
  });

  it('should have correct constants in the source', () => {
    const fs = require('fs');
    const path = require('path');
    const reconnectionPath = path.join(__dirname, '../services/reconnection.ts');
    const content = fs.readFileSync(reconnectionPath, 'utf-8');
    
    // Verify the actual values in source
    expect(content).toMatch(/HEARTBEAT_INTERVAL_MS\s*=\s*30000/);
    expect(content).toMatch(/MAX_RECONNECT_ATTEMPTS\s*=\s*3/); // US-38: Updated from 5 to 3
  });
});
