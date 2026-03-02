/**
 * Socket.io Client - Enhanced with US-38 Reconnection Strategy
 * US-10: Streaming Responses
 * US-38: WebSocket/Stream Reconnection Strategy
 * 
 * WebSocket client for real-time chat communication with:
 * - Client-side reconnection with exponential backoff
 * - Heartbeat ping/pong every 30 seconds
 * - Message queuing during disconnection
 * - Stream resumption from last token
 * - Visual connection status indicator
 * - Max 5 reconnection attempts
 */

import { io, Socket } from 'socket.io-client';

// Types
export interface SocketEvents {
  // Client to Server
  'chat:subscribe': { conversationId: string };
  'chat:send_message': {
    conversationId: string;
    content: string;
    language?: 'bg' | 'en';
    context?: {
      includeChart?: boolean;
      includeTransits?: boolean;
      partnerId?: string | null;
    };
    messageId?: string;
    lastTokenIndex?: number; // For stream resumption
  };
  'chat:typing': { conversationId: string; isTyping: boolean };
  'chat:cancel_generation': { conversationId: string; messageId?: string };
  'chat:unsubscribe': { conversationId: string };
  'pong:heartbeat': { timestamp: number }; // Client responds to heartbeat
  
  // Server to Client
  'chat:connected': {
    connectionId: string;
    userId: string;
    tier: string;
    serverTime: string;
  };
  'chat:subscribed': {
    conversationId: string;
    message: string;
  };
  'chat:message_received': {
    clientMessageId?: string;
    serverMessageId: string | null;
    status: 'accepted' | 'saved';
    rateLimit?: {
      remaining: number;
      limit: number;
    };
  };
  'chat:generation_started': {
    messageId: string | null;
    conversationId: string;
    estimatedTokens: number;
  };
  'chat:message_chunk': {
    messageId: string | null;
    chunk: string;
    index: number;
    isComplete: boolean;
  };
  'chat:message_complete': {
    messageId: string;
    conversationId: string;
    content: string;
    metadata: {
      model: string;
      tokensUsed: number;
      processingTime: number;
      finishReason: string;
    };
  };
  'chat:typing_indicator': {
    conversationId: string;
    isTyping: boolean;
  };
  'chat:generation_cancelled': {
    conversationId: string;
    message: string;
  };
  'chat:unsubscribed': {
    conversationId: string;
    message: string;
  };
  'chat:error': {
    code: string;
    message: string;
    conversationId?: string;
    retryAfter?: number;
    limit?: number;
  };
  'chat:partner_typing': {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  };
  // Heartbeat
  'ping:heartbeat': { timestamp: number };
  // Reconnection
  'reconnection:stream_state': {
    conversationId: string;
    lastTokenIndex?: number;
    lastContent?: string;
    messageId?: string;
  };
  'reconnection:status': {
    canReconnect: boolean;
    reconnecting: boolean;
  };
}

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Stream state for resumption
export interface StreamState {
  conversationId: string;
  lastTokenIndex: number;
  lastContent: string;
  messageId: string | null;
}

// Event callbacks
export interface SocketCallbacks {
  onConnected?: (data: SocketEvents['chat:connected']) => void;
  onDisconnected?: (reason: string) => void;
  onConnectionError?: (error: Error) => void;
  onReconnecting?: (attempt: number, maxAttempts: number) => void;
  onReconnected?: (wasResuming?: boolean, streamState?: StreamState) => void;
  onReconnectionFailed?: (error: Error) => void;
  onSubscribed?: (data: SocketEvents['chat:subscribed']) => void;
  onMessageReceived?: (data: SocketEvents['chat:message_received']) => void;
  onGenerationStarted?: (data: SocketEvents['chat:generation_started']) => void;
  onMessageChunk?: (data: SocketEvents['chat:message_chunk']) => void;
  onMessageComplete?: (data: SocketEvents['chat:message_complete']) => void;
  onTypingIndicator?: (data: SocketEvents['chat:typing_indicator']) => void;
  onGenerationCancelled?: (data: SocketEvents['chat:generation_cancelled']) => void;
  onError?: (data: SocketEvents['chat:error']) => void;
  onStateChange?: (state: ConnectionState) => void;
  onHeartbeat?: (latency: number) => void;
  onStreamState?: (state: StreamState) => void;
}

// Configuration
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const DEFAULT_INITIAL_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_DELAY = 30000;
const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_MESSAGE_QUEUE_SIZE = 50;

// Socket client class
class SocketClient {
  private socket: Socket | null = null;
  private callbacks: SocketCallbacks = {};
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS;
  private initialReconnectDelay = DEFAULT_INITIAL_RECONNECT_DELAY;
  private maxReconnectDelay = DEFAULT_MAX_RECONNECT_DELAY;
  private messageQueue: Array<{
    event: keyof SocketEvents;
    data: any;
  }> = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeatSent: number = 0;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private streamState: StreamState | null = null;
  private currentConversationId: string | null = null;
  private lastDisconnectReason: string = '';

  /**
   * Get access token from storage
   */
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('astrologaai_access_token');
  }

  /**
   * Update connection state
   */
  private setState(state: ConnectionState): void {
    this.connectionState = state;
    this.callbacks.onStateChange?.(state);
  }

  /**
   * Calculate exponential backoff delay
   */
  private getBackoffDelay(): number {
    const delay = this.initialReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.min(delay + jitter, this.maxReconnectDelay);
  }

  /**
   * Start heartbeat ping interval
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.lastHeartbeatSent = Date.now();
        this.socket.emit('ping:heartbeat', { timestamp: this.lastHeartbeatSent });

        // Set timeout for pong response
        if (this.heartbeatTimeout) {
          clearTimeout(this.heartbeatTimeout);
        }
        this.heartbeatTimeout = setTimeout(() => {
          const latency = Date.now() - this.lastHeartbeatSent;
          if (latency > 10000) {
            console.warn('[Socket] Heartbeat timeout, connection may be stale');
            // Force reconnect if heartbeat times out
            this.handleUnexpectedDisconnect('heartbeat_timeout');
          }
        }, 10000);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Handle unexpected disconnect
   */
  private handleUnexpectedDisconnect(reason: string): void {
    this.lastDisconnectReason = reason;
    this.setState('disconnected');
    this.stopHeartbeat();
    this.callbacks.onDisconnected?.(reason);

    // Auto-reconnect if within max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    this.setState('reconnecting');
    this.callbacks.onReconnecting?.(this.reconnectAttempts, this.maxReconnectAttempts);

    const delay = this.getBackoffDelay();
    console.log(`[Socket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      } else {
        // Socket was disposed, create new one
        this.initializeSocket();
      }
    }, delay);
  }

  /**
   * Initialize socket connection
   */
  private initializeSocket(): void {
    const token = this.getAccessToken();
    if (!token) {
      const error = new Error('No access token');
      this.callbacks.onConnectionError?.(error);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';
    
    this.setState('connecting');

    this.socket = io(apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually
      timeout: 10000,
    });

    this.setupSocketListeners();
  }

  /**
   * Set up socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection successful
    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      const wasReconnecting = this.connectionState === 'reconnecting';
      
      this.setState('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();

      // Process queued messages
      this.flushMessageQueue();

      // Request stream state if we were in a conversation
      if (this.currentConversationId) {
        this.requestStreamState(this.currentConversationId);
      }

      if (wasReconnecting) {
        // Check if we need to resume stream
        this.callbacks.onReconnected?.(true, this.streamState || undefined);
      } else {
        this.callbacks.onReconnected?.(false);
      }
    });

    // Server confirmed connection
    this.socket.on('chat:connected', (data: SocketEvents['chat:connected']) => {
      console.log('[Socket] Server confirmed connection:', data);
      this.callbacks.onConnected?.(data);
    });

    // Heartbeat ping from server
    this.socket.on('ping:heartbeat', (data: SocketEvents['ping:heartbeat']) => {
      // Respond with pong
      this.socket?.emit('pong:heartbeat', { timestamp: data.timestamp });
      
      // Calculate latency
      const latency = Date.now() - data.timestamp;
      this.callbacks.onHeartbeat?.(latency);
    });

    // Reconnection stream state
    this.socket.on('reconnection:stream_state', (data: SocketEvents['reconnection:stream_state']) => {
      this.streamState = {
        conversationId: data.conversationId,
        lastTokenIndex: data.lastTokenIndex || 0,
        lastContent: data.lastContent || '',
        messageId: data.messageId || null,
      };
      this.callbacks.onStreamState?.(this.streamState);
    });

    // Reconnection status
    this.socket.on('reconnection:status', (data: SocketEvents['reconnection:status']) => {
      console.log('[Socket] Reconnection status:', data);
    });

    // Disconnection
    this.socket.on('disconnect', (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
      this.lastDisconnectReason = reason;
      this.setState('disconnected');
      this.stopHeartbeat();
      this.callbacks.onDisconnected?.(reason);

      // Auto-reconnect if not manually disconnected
      if (reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.setState('disconnected');
        this.stopHeartbeat();
        this.callbacks.onReconnectionFailed?.(error);
      } else {
        this.setState('reconnecting');
        this.callbacks.onReconnecting?.(this.reconnectAttempts, this.maxReconnectAttempts);
        
        // Try again with backoff
        setTimeout(() => {
          if (this.socket) {
            this.socket.connect();
          }
        }, this.getBackoffDelay());
      }
      
      this.callbacks.onConnectionError?.(error);
    });

    // Register event handlers
    this.registerEventHandlers();
  }

  /**
   * Request stream state for resumption
   */
  private requestStreamState(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('reconnection:request', { conversationId });
    }
  }

  /**
   * Register all event handlers
   */
  private registerEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('chat:subscribed', (data) => {
      this.callbacks.onSubscribed?.(data);
    });

    this.socket.on('chat:message_received', (data) => {
      this.callbacks.onMessageReceived?.(data);
    });

    this.socket.on('chat:generation_started', (data) => {
      this.callbacks.onGenerationStarted?.(data);
    });

    this.socket.on('chat:message_chunk', (data: SocketEvents['chat:message_chunk']) => {
      // Track stream state for resumption
      if (this.currentConversationId) {
        this.streamState = {
          conversationId: this.currentConversationId,
          lastTokenIndex: data.index,
          lastContent: (this.streamState?.lastContent || '') + data.chunk,
          messageId: data.messageId,
        };
      }
      this.callbacks.onMessageChunk?.(data);
    });

    this.socket.on('chat:message_complete', (data) => {
      // Clear stream state on completion
      this.streamState = null;
      this.callbacks.onMessageComplete?.(data);
    });

    this.socket.on('chat:typing_indicator', (data) => {
      this.callbacks.onTypingIndicator?.(data);
    });

    this.socket.on('chat:generation_cancelled', (data) => {
      this.streamState = null;
      this.callbacks.onGenerationCancelled?.(data);
    });

    this.socket.on('chat:error', (data) => {
      this.callbacks.onError?.(data);
    });
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.connected) {
      const { event, data } = this.messageQueue.shift()!;
      this.socket.emit(event as string, data);
    }
  }

  /**
   * Emit event (queue if disconnected)
   */
  private emit<E extends keyof SocketEvents>(
    event: E,
    data: SocketEvents[E]
  ): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // Queue message for later (with size limit)
      if (this.messageQueue.length < MAX_MESSAGE_QUEUE_SIZE) {
        this.messageQueue.push({ event, data });
      } else {
        console.warn('[Socket] Message queue full, dropping message');
      }
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const token = this.getAccessToken();
      if (!token) {
        reject(new Error('No access token'));
        return;
      }

      this.reconnectAttempts = 0;
      this.initializeSocket();

      // Wait for connection or timeout
      const timeout = setTimeout(() => {
        if (this.connectionState !== 'connected') {
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      // Temporary one-time listener
      const originalOnConnected = this.callbacks.onConnected;
      this.callbacks.onConnected = (...args) => {
        clearTimeout(timeout);
        originalOnConnected?.(...args);
        resolve();
      };

      const originalOnConnectionError = this.callbacks.onConnectionError;
      this.callbacks.onConnectionError = (...args) => {
        clearTimeout(timeout);
        originalOnConnectionError?.(...args);
        reject(args[0]);
      };
    });
  }

  /**
   * Manually trigger reconnection
   */
  reconnect(): void {
    this.reconnectAttempts = 0;
    if (this.socket) {
      this.socket.disconnect();
    }
    this.initializeSocket();
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setState('disconnected');
    this.messageQueue = [];
    this.streamState = null;
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: SocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get connection state
   */
  getState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get reconnect attempts
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Get max reconnect attempts
   */
  getMaxReconnectAttempts(): number {
    return this.maxReconnectAttempts;
  }

  /**
   * Get message queue size
   */
  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  /**
   * Get current stream state
   */
  getStreamState(): StreamState | null {
    return this.streamState;
  }

  /**
   * Get last disconnect reason
   */
  getLastDisconnectReason(): string {
    return this.lastDisconnectReason;
  }

  /**
   * Subscribe to conversation
   */
  subscribeToConversation(conversationId: string): void {
    this.currentConversationId = conversationId;
    this.emit('chat:subscribe', { conversationId });
  }

  /**
   * Unsubscribe from conversation
   */
  unsubscribeFromConversation(conversationId: string): void {
    this.currentConversationId = null;
    this.streamState = null;
    this.emit('chat:unsubscribe', { conversationId });
  }

  /**
   * Send message
   */
  sendMessage(
    conversationId: string,
    content: string,
    options?: {
      language?: 'bg' | 'en';
      context?: SocketEvents['chat:send_message']['context'];
      messageId?: string;
      resumeFromStream?: boolean;
    }
  ): void {
    const data: SocketEvents['chat:send_message'] = {
      conversationId,
      content,
      language: options?.language,
      context: options?.context,
      messageId: options?.messageId,
    };

    // Include stream state for resumption if requested
    if (options?.resumeFromStream && this.streamState) {
      data.lastTokenIndex = this.streamState.lastTokenIndex;
    }

    this.emit('chat:send_message', data);
  }

  /**
   * US-37: Send message with automatic retry on rate limit
   * Returns a promise that resolves when the message is successfully sent
   * or rejects after all retries are exhausted
   */
  async sendMessageWithRetry(
    conversationId: string,
    content: string,
    options?: {
      language?: 'bg' | 'en';
      context?: SocketEvents['chat:send_message']['context'];
      messageId?: string;
      maxRetries?: number;
      resumeFromStream?: boolean;
    }
  ): Promise<void> {
    const maxRetries = options?.maxRetries ?? 5;
    const initialDelay = 1000;
    const maxDelay = 30000;
    
    return new Promise((resolve, reject) => {
      let attempt = 0;
      let retryTimeout: NodeJS.Timeout | null = null;
      
      const attemptSend = () => {
        // Generate unique message ID for this attempt
        const messageId = options?.messageId || `${Date.now()}-${attempt}`;
        
        // Set up one-time error listener for rate limit
        const errorHandler = (data: SocketEvents['chat:error']) => {
          if (data.conversationId !== conversationId) return;
          if (data.code !== 'RATE_LIMIT_EXCEEDED') {
            // Not a rate limit error, reject immediately
            cleanup();
            reject(new Error(data.message));
            return;
          }
          
          // Rate limit error - check if we should retry
          if (attempt >= maxRetries) {
            cleanup();
            reject(new Error(`Rate limit exceeded after ${maxRetries} retries: ${data.message}`));
            return;
          }
          
          // Calculate backoff delay
          const retryAfter = data.retryAfter || 0;
          const backoffDelay = Math.min(
            initialDelay * Math.pow(2, attempt),
            maxDelay
          );
          const delay = retryAfter > 0 ? Math.min(retryAfter * 1000, maxDelay) : backoffDelay;
          
          attempt++;
          console.log(`[Socket] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          
          retryTimeout = setTimeout(attemptSend, delay);
        };
        
        // Set up success listener
        const successHandler = (data: SocketEvents['chat:message_received']) => {
          if (data.clientMessageId === messageId || data.serverMessageId) {
            cleanup();
            resolve();
          }
        };

        const completeHandler = (data: SocketEvents['chat:message_complete']) => {
          if (data.conversationId === conversationId) {
            cleanup();
            resolve();
          }
        };
        
        const cleanup = () => {
          if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
          }
          this.socket?.off('chat:error', errorHandler);
          this.socket?.off('chat:message_received', successHandler);
          this.socket?.off('chat:message_complete', completeHandler);
        };
        
        // Register listeners
        this.socket?.on('chat:error', errorHandler);
        this.socket?.on('chat:message_received', successHandler);
        this.socket?.on('chat:message_complete', completeHandler);
        
        // Send the message
        this.sendMessage(conversationId, content, {
          ...options,
          messageId,
        });
      };
      
      attemptSend();
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId: string, isTyping: boolean): void {
    this.emit('chat:typing', { conversationId, isTyping });
  }

  /**
   * Cancel generation
   */
  cancelGeneration(conversationId: string, messageId?: string): void {
    this.emit('chat:cancel_generation', { conversationId, messageId });
  }

  /**
   * Clear stream state (after successful resume or new message)
   */
  clearStreamState(): void {
    this.streamState = null;
  }
}

// Singleton instance
let socketClient: SocketClient | null = null;

/**
 * Get socket client instance
 */
export function getSocketClient(): SocketClient {
  if (!socketClient) {
    socketClient = new SocketClient();
  }
  return socketClient;
}

/**
 * Initialize socket client with callbacks
 */
export function initializeSocketClient(callbacks: SocketCallbacks): SocketClient {
  const client = getSocketClient();
  client.setCallbacks(callbacks);
  return client;
}

/**
 * Disconnect socket client
 */
export function disconnectSocketClient(): void {
  if (socketClient) {
    socketClient.disconnect();
    socketClient = null;
  }
}

// Export types
export type { SocketClient };
export default SocketClient;
