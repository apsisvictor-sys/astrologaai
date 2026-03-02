/**
 * Socket Client Tests
 * US-38: WebSocket/Stream Reconnection Strategy
 * 
 * Tests for client-side reconnection logic, heartbeat, and message queuing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock process.env
vi.stubGlobal('process', {
  env: {
    NEXT_PUBLIC_API_URL: 'https://astrologaai-backend-production.up.railway.app',
  },
});

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('SocketClient', () => {
  let SocketClient: any;
  let client: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('test-token');
    
    // Re-import to get fresh instance
    const module = await import('../lib/socket-client');
    SocketClient = module.default;
    client = new SocketClient();
  });

  afterEach(() => {
    client?.disconnect();
  });

  describe('Initial State', () => {
    it('should start in disconnected state', () => {
      expect(client.getState()).toBe('disconnected');
    });

    it('should have default max reconnect attempts of 5', () => {
      expect(client.getMaxReconnectAttempts()).toBe(5);
    });

    it('should have empty message queue initially', () => {
      expect(client.getQueuedMessageCount()).toBe(0);
    });
  });

  describe('Connection State Management', () => {
    it('should report connected status correctly', () => {
      mockSocket.connected = true;
      expect(client.isConnected()).toBe(true);
      
      mockSocket.connected = false;
      expect(client.isConnected()).toBe(false);
    });

    it('should track reconnect attempts', () => {
      expect(client.getReconnectAttempts()).toBe(0);
    });
  });

  describe('Callbacks', () => {
    it('should accept and store callbacks', () => {
      const callbacks = {
        onConnected: vi.fn(),
        onDisconnected: vi.fn(),
        onStateChange: vi.fn(),
      };
      
      client.setCallbacks(callbacks);
      
      // Call the internal callback
      client.callbacks.onConnected?.({ connectionId: '123', userId: 'user', tier: 'FREE', serverTime: '2024-01-01' });
      
      expect(callbacks.onConnected).toHaveBeenCalled();
    });

    it('should merge callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      client.setCallbacks({ onConnected: callback1 });
      client.setCallbacks({ onDisconnected: callback2 });
      
      client.callbacks.onConnected?.({ connectionId: '123', userId: 'user', tier: 'FREE', serverTime: '2024-01-01' });
      client.callbacks.onDisconnected?.('reason');
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Message Queue', () => {
    it('should queue messages when disconnected', () => {
      mockSocket.connected = false;
      
      // Simulate emit being called when disconnected
      (client as any).emit('chat:send_message', { conversationId: 'conv-1', content: 'Hello' });
      
      expect(client.getQueuedMessageCount()).toBe(1);
    });

    it('should not queue when connected', () => {
      mockSocket.connected = true;
      const emitSpy = vi.spyOn(mockSocket, 'emit');
      
      (client as any).emit('chat:send_message', { conversationId: 'conv-1', content: 'Hello' });
      
      expect(emitSpy).toHaveBeenCalled();
      expect(client.getQueuedMessageCount()).toBe(0);
    });
  });

  describe('Stream State', () => {
    it('should start with null stream state', () => {
      expect(client.getStreamState()).toBeNull();
    });

    it('should allow clearing stream state', () => {
      client.clearStreamState();
      expect(client.getStreamState()).toBeNull();
    });
  });

  describe('Disconnect Reason', () => {
    it('should track last disconnect reason', () => {
      expect(client.getLastDisconnectReason()).toBe('');
    });
  });
});

describe('Socket Client Exports', () => {
  it('should export getSocketClient singleton', async () => {
    const { getSocketClient } = await import('../lib/socket-client');
    
    const client1 = getSocketClient();
    const client2 = getSocketClient();
    
    expect(client1).toBe(client2);
  });

  it('should export initializeSocketClient', async () => {
    const { initializeSocketClient } = await import('../lib/socket-client');
    
    const callbacks = { onConnected: vi.fn() };
    const client = initializeSocketClient(callbacks);
    
    expect(client).toBeDefined();
  });

  it('should export disconnectSocketClient', async () => {
    const { disconnectSocketClient, getSocketClient } = await import('../lib/socket-client');
    
    const client = getSocketClient();
    disconnectSocketClient();
    
    // After disconnect, getSocketClient should return a new instance
    const newClient = getSocketClient();
    expect(newClient).not.toBe(client);
  });
});

describe('Reconnection Configuration', () => {
  it('should have correct default max reconnect attempts', async () => {
    // This is internal but verify via behavior
    const { getSocketClient } = await import('../lib/socket-client');
    const client = getSocketClient();
    
    expect(client.getMaxReconnectAttempts()).toBe(5);
  });
});
