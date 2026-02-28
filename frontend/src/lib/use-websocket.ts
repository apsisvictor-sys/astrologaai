/**
 * WebSocket Hook
 * US-10: Streaming Responses
 * 
 * Custom hook for WebSocket connection management
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  getSocketClient, 
  initializeSocketClient,
  disconnectSocketClient,
  ConnectionState,
  type SocketCallbacks
} from '@/lib/socket-client';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
}

interface UseWebSocketReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
}

/**
 * Hook for managing WebSocket connection
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    onConnected,
    onDisconnected,
    onError,
    onReconnecting,
    onReconnected,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const reconnectAttemptRef = useRef(0);
  const isInitializedRef = useRef(false);

  const getAccessToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('astrologaai_access_token');
  }, []);

  const connect = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      throw new Error('No access token');
    }

    try {
      const client = initializeSocketClient({
        onStateChange: setConnectionState,
        onConnected: (data) => {
          console.log('[WebSocket] Connected:', data);
          reconnectAttemptRef.current = 0;
          onConnected?.();
        },
        onDisconnected: (reason) => {
          console.log('[WebSocket] Disconnected:', reason);
          onDisconnected?.(reason);
        },
        onConnectionError: (error) => {
          console.error('[WebSocket] Connection error:', error);
          reconnectAttemptRef.current++;
          onError?.(error);
        },
        onReconnecting: (attempt) => {
          console.log('[WebSocket] Reconnecting, attempt:', attempt);
          onReconnecting?.(attempt);
        },
        onReconnected: () => {
          console.log('[WebSocket] Reconnected');
          reconnectAttemptRef.current = 0;
          onReconnected?.();
        },
      });

      await client.connect();
      isInitializedRef.current = true;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      throw error;
    }
  }, [getAccessToken, onConnected, onDisconnected, onError, onReconnecting, onReconnected]);

  const disconnect = useCallback(() => {
    disconnectSocketClient();
    isInitializedRef.current = false;
    setConnectionState('disconnected');
  }, []);

  const reconnect = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    await connect();
  }, [disconnect, connect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && getAccessToken() && !isInitializedRef.current) {
      connect().catch(console.error);
    }

    return () => {
      // Don't disconnect on unmount, let the app manage lifecycle
    };
  }, [autoConnect, connect, getAccessToken]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    isReconnecting: connectionState === 'reconnecting',
    connect,
    disconnect,
    reconnect,
  };
}

/**
 * Hook for subscribing to a conversation
 */
export function useConversationSubscription(conversationId: string | null) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setIsSubscribed(false);
      return;
    }

    const client = getSocketClient();
    if (client.isConnected()) {
      client.subscribeToConversation(conversationId);
      setIsSubscribed(true);
    }

    return () => {
      if (conversationId && client.isConnected()) {
        client.unsubscribeFromConversation(conversationId);
      }
    };
  }, [conversationId]);

  return isSubscribed;
}

/**
 * Hook for typing indicator
 */
export function useTypingIndicator(
  conversationId: string | null,
  isTyping: boolean,
  debounceMs: number = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef(false);

  useEffect(() => {
    if (!conversationId) return;

    const client = getSocketClient();
    if (!client.isConnected()) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only send if state changed
    if (isTyping !== lastSentRef.current) {
      client.sendTyping(conversationId, isTyping);
      lastSentRef.current = isTyping;
    }

    // Auto-stop typing after debounce
    if (isTyping) {
      timeoutRef.current = setTimeout(() => {
        client.sendTyping(conversationId, false);
        lastSentRef.current = false;
      }, debounceMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [conversationId, isTyping, debounceMs]);
}

export default useWebSocket;
