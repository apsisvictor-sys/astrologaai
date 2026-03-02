/**
 * Chat Context Provider with WebSocket Support
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History
 * US-09: Chat Context Persistence
 * US-10: Streaming Responses (WebSocket)
 * 
 * Manages chat state with WebSocket streaming and SSE fallback
 */

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { 
  getSocketClient, 
  initializeSocketClient, 
  disconnectSocketClient,
  ConnectionState 
} from '@/lib/socket-client';

// Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
  };
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageInfo {
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  resetAt: string;
}

export interface ChatContextType {
  // State
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  usage: UsageInfo | null;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  connectionState: ConnectionState;
  useWebSocket: boolean;
  queuedMessagesCount: number;
  
  // Actions
  createSession: (birthProfileId?: string) => Promise<ChatSession>;
  loadSession: (sessionId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  resetChat: () => void;
  startNewConversation: () => Promise<ChatSession>;
  cancelGeneration: () => void;
  reconnect: () => Promise<void>;
  toggleWebSocket: (enabled: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

// Storage keys
const ACCESS_TOKEN_KEY = 'astrologaai_access_token';
const SESSION_ID_KEY = 'astrologaai_chat_session';
const USE_WEBSOCKET_KEY = 'astrologaai_use_websocket';

export function ChatProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [useWebSocket, setUseWebSocket] = useState(true);
  const [queuedMessagesCount, setQueuedMessagesCount] = useState(0);

  const streamingContentRef = useRef('');
  const socketInitialized = useRef(false);

  /**
   * Get access token from storage
   */
  const getAccessToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }, []);

  /**
   * Initialize WebSocket connection
   */
  const initializeWebSocket = useCallback(async () => {
    if (socketInitialized.current) return;

    const token = getAccessToken();
    if (!token) return;

    try {
      const client = initializeSocketClient({
        onStateChange: (state) => {
          setConnectionState(state);
        },
        onConnected: (data) => {
          console.log('[Chat] WebSocket connected:', data);
          setConnectionState('connected');
        },
        onDisconnected: (reason) => {
          console.log('[Chat] WebSocket disconnected:', reason);
          setConnectionState('disconnected');
        },
        onReconnecting: (attempt) => {
          console.log('[Chat] WebSocket reconnecting, attempt:', attempt);
          setConnectionState('reconnecting');
        },
        onReconnected: (hadQueuedMessages) => {
          console.log('[Chat] WebSocket reconnected, had queued messages:', hadQueuedMessages);
          setConnectionState('connected');
          
          // Resubscribe to current session if any
          if (currentSession) {
            getSocketClient().subscribeToConversation(currentSession.id);
          }
          
          // If there were queued messages, notify user
          if (hadQueuedMessages) {
            console.log('[Chat] Processing previously queued messages...');
          }
        },
        onStreamState: (data) => {
          console.log('[Chat] Received stream state for resumption:', data);
          
          // If there's partial content from a disconnected stream, restore it
          if (data.lastContent && data.lastTokenIndex !== undefined) {
            streamingContentRef.current = data.lastContent;
            setStreamingContent(data.lastContent);
            // TODO: The UI should show that we're resuming a stream
          }
        },
        onGenerationStarted: (data) => {
          setIsStreaming(true);
          streamingContentRef.current = '';
          setStreamingContent('');
        },
        onMessageChunk: (data) => {
          streamingContentRef.current += data.chunk;
          setStreamingContent(streamingContentRef.current);
        },
        onMessageComplete: (data) => {
          setIsStreaming(false);
          setStreamingContent('');
          
          // Add assistant message to list
          const assistantMessage: ChatMessage = {
            id: data.messageId,
            role: 'assistant',
            content: data.content,
            metadata: data.metadata,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        },
        onError: (data) => {
          console.error('[Chat] WebSocket error:', data);
          setError(data.message);
          setIsStreaming(false);
          setStreamingContent('');
        },
        onGenerationCancelled: (data) => {
          setIsStreaming(false);
          setStreamingContent('');
        },
      });

      await client.connect();
      socketInitialized.current = true;
    } catch (err) {
      console.error('[Chat] Failed to initialize WebSocket:', err);
      // Fall back to SSE
      setUseWebSocket(false);
    }
  }, [getAccessToken, currentSession]);

  /**
   * Update queued messages count periodically and on connection state change
   */
  useEffect(() => {
    const updateQueuedCount = () => {
      const client = getSocketClient();
      setQueuedMessagesCount(client.getQueuedMessageCount());
    };
    
    // Update immediately
    updateQueuedCount();
    
    // Update every 5 seconds while disconnected
    const interval = setInterval(updateQueuedCount, 5000);
    return () => clearInterval(interval);
  }, [connectionState]);

  /**
   * Load WebSocket preference and initialize
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPref = localStorage.getItem(USE_WEBSOCKET_KEY);
      if (savedPref !== null) {
        setUseWebSocket(savedPref === 'true');
      }
    }
  }, []);

  /**
   * Initialize WebSocket when enabled
   */
  useEffect(() => {
    if (useWebSocket && getAccessToken()) {
      initializeWebSocket();
    }

    return () => {
      if (!useWebSocket) {
        disconnectSocketClient();
        socketInitialized.current = false;
      }
    };
  }, [useWebSocket, initializeWebSocket, getAccessToken]);

  /**
   * Subscribe to conversation when session changes
   */
  useEffect(() => {
    if (useWebSocket && currentSession && connectionState === 'connected') {
      getSocketClient().subscribeToConversation(currentSession.id);
    }
  }, [useWebSocket, currentSession, connectionState]);

  /**
   * Create a new chat session
   */
  const createSession = useCallback(async (birthProfileId?: string): Promise<ChatSession> => {
    const token = getAccessToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ birthProfileId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to create session');
    }

    const session = data.data.session;
    setCurrentSession(session);
    
    if (data.data.welcomeMessage) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: data.data.welcomeMessage.content,
        createdAt: new Date().toISOString(),
      }]);
    }
    
    localStorage.setItem(SESSION_ID_KEY, session.id);
    
    return session;
  }, [getAccessToken]);

  /**
   * Load an existing session
   */
  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    const token = getAccessToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/chat/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load session');
      }

      setCurrentSession(data.data.session);
      setMessages(data.data.messages);
      setHasMoreMessages(data.data.hasMore || false);
      
      await loadUsage();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  /**
   * Load older messages for pagination
   */
  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!currentSession || !hasMoreMessages || isLoadingMore) return;
    
    const token = getAccessToken();
    if (!token) return;

    setIsLoadingMore(true);

    try {
      const oldestMessageId = messages[0]?.id;
      
      const response = await fetch(
        `${API_URL}/api/v1/chat/sessions/${currentSession.id}?before=${oldestMessageId}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.data.messages.length > 0) {
        setMessages((prev) => [...data.data.messages, ...prev]);
        setHasMoreMessages(data.data.hasMore);
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentSession, hasMoreMessages, isLoadingMore, getAccessToken, messages]);

  /**
   * Load usage info
   */
  const loadUsage = useCallback(async (): Promise<void> => {
    const token = getAccessToken();
    
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/chat/usage`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUsage(data.data.usage);
      }
    } catch {
      // Silently fail
    }
  }, [getAccessToken]);

  /**
   * Send message via WebSocket
   */
  const sendMessageWebSocket = useCallback(async (content: string, sessionId: string): Promise<void> => {
    const client = getSocketClient();
    
    if (!client.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send via WebSocket
    client.sendMessage(sessionId, content, {
      messageId: userMessage.id,
    });

    // Update usage
    setUsage((prev) => prev ? {
      ...prev,
      remaining: prev.remaining === 'unlimited' ? 'unlimited' : 
        (typeof prev.remaining === 'number' ? prev.remaining - 1 : prev.remaining),
      used: typeof prev.used === 'number' ? prev.used + 1 : prev.used,
    } : null);
  }, []);

  /**
   * Send message via SSE (fallback)
   */
  const sendMessageSSE = useCallback(async (content: string, sessionId: string): Promise<void> => {
    const token = getAccessToken();
    
    if (!token) {
      setError('Not authenticated');
      return;
    }

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    setIsStreaming(true);
    setStreamingContent('');
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          sessionId,
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setError(data.error?.message || 'Rate limit exceeded');
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantMessageId: string | undefined;

      if (!reader) {
        throw new Error('No response stream');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            
            try {
              const data = JSON.parse(dataStr);
              
              if (data.content && !data.done) {
                assistantContent += data.content;
                setStreamingContent(assistantContent);
              }
              
              if (data.rateLimit) {
                setUsage((prev) => prev ? {
                  ...prev,
                  remaining: data.rateLimit.remaining,
                  used: prev.limit === 'unlimited' ? prev.used : prev.used + 1,
                } : null);
              }
              
              if (data.done || data.messageId) {
                assistantMessageId = data.messageId;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      if (assistantContent) {
        const assistantMessage: ChatMessage = {
          id: assistantMessageId || `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantContent,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }

      setStreamingContent('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsStreaming(false);
    }
  }, [getAccessToken]);

  /**
   * Send a message (WebSocket or SSE fallback)
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    // Create session if needed
    let sessionId = currentSession?.id;
    if (!sessionId) {
      const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
      if (storedSessionId) {
        sessionId = storedSessionId;
      } else {
        try {
          const newSession = await createSession();
          sessionId = newSession.id;
        } catch (err) {
          setError('Failed to create chat session');
          return;
        }
      }
    }

    // Try WebSocket first, fall back to SSE
    if (useWebSocket && connectionState === 'connected') {
      try {
        await sendMessageWebSocket(content, sessionId);
        return;
      } catch (err) {
        console.warn('[Chat] WebSocket send failed, falling back to SSE:', err);
      }
    }

    // Fall back to SSE
    await sendMessageSSE(content, sessionId);
  }, [currentSession, createSession, useWebSocket, connectionState, sendMessageWebSocket, sendMessageSSE]);

  /**
   * Cancel ongoing generation
   */
  const cancelGeneration = useCallback(() => {
    if (useWebSocket && currentSession && connectionState === 'connected') {
      getSocketClient().cancelGeneration(currentSession.id);
    }
    setIsStreaming(false);
    setStreamingContent('');
  }, [useWebSocket, currentSession, connectionState]);

  /**
   * Reconnect WebSocket
   */
  const reconnect = useCallback(async () => {
    if (useWebSocket) {
      disconnectSocketClient();
      socketInitialized.current = false;
      await initializeWebSocket();
    }
  }, [useWebSocket, initializeWebSocket]);

  /**
   * Toggle WebSocket usage
   */
  const toggleWebSocket = useCallback((enabled: boolean) => {
    setUseWebSocket(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USE_WEBSOCKET_KEY, String(enabled));
    }
    if (!enabled) {
      disconnectSocketClient();
      socketInitialized.current = false;
      setConnectionState('disconnected');
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset chat state
   */
  const resetChat = useCallback(() => {
    setCurrentSession(null);
    setMessages([]);
    setStreamingContent('');
    setError(null);
    localStorage.removeItem(SESSION_ID_KEY);
  }, []);

  /**
   * Start a new conversation with fresh context
   */
  const startNewConversation = useCallback(async (birthProfileId?: string): Promise<ChatSession> => {
    const token = getAccessToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/v1/chat/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ birthProfileId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to start new conversation');
    }

    const session = data.data.session;
    setCurrentSession(session);
    
    if (data.data.welcomeMessage) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: data.data.welcomeMessage.content,
        createdAt: new Date().toISOString(),
      }]);
    } else {
      setMessages([]);
    }
    
    setStreamingContent('');
    setError(null);
    
    localStorage.setItem(SESSION_ID_KEY, session.id);
    
    await loadUsage();
    
    return session;
  }, [getAccessToken, loadUsage]);

  const value: ChatContextType = {
    currentSession,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    usage,
    hasMoreMessages,
    isLoadingMore,
    connectionState,
    useWebSocket,
    queuedMessagesCount,
    createSession,
    loadSession,
    loadMoreMessages,
    sendMessage,
    clearError,
    resetChat,
    startNewConversation,
    cancelGeneration,
    reconnect,
    toggleWebSocket,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Hook to use chat context
 */
export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export default ChatContext;
