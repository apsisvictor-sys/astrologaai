/**
 * Chat Context Provider — HTTP POST + SSE
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History
 * US-09: Chat Context Persistence
 * US-10: Streaming Responses (SSE)
 *
 * WebSocket removed — all chat goes through POST /api/v1/chat/message (SSE stream)
 */

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';

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
  connectionState: 'connected' | 'error';

  // Actions
  createSession: (birthProfileId?: string) => Promise<ChatSession>;
  loadSession: (sessionId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  resetChat: () => void;
  startNewConversation: () => Promise<ChatSession>;
  cancelGeneration: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

// Storage keys
const ACCESS_TOKEN_KEY = 'astrologaai_access_token';
const SESSION_ID_KEY = 'astrologaai_chat_session';

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

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Get access token from storage
   */
  const getAccessToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }, []);

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
   * Send message via SSE stream
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

    // Create AbortController for this request
    abortControllerRef.current = new AbortController();

    let assistantContent = '';
    let assistantMessageId: string | undefined;

    try {
      const response = await fetch(`${API_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content, sessionId }),
        signal: abortControllerRef.current.signal,
      });

      if (response.status === 429) {
        const data = await response.json();
        setError(data.error?.message || 'Rate limit exceeded');
        // Force remaining=0 so the upgrade CTA banner activates in the UI
        setUsage((prev) => prev ? { ...prev, remaining: 0 } : null);
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              if (currentEvent === 'metadata' || data.rateLimit) {
                if (data.rateLimit) {
                  setUsage((prev) => prev ? {
                    ...prev,
                    remaining: data.rateLimit.remaining,
                    used: typeof prev.used === 'number' ? prev.used + 1 : prev.used,
                  } : null);
                }
              } else if (currentEvent === 'chunk' || (data.content && !data.done)) {
                assistantContent += data.content;
                setStreamingContent(assistantContent);
              } else if (currentEvent === 'error') {
                setError(data.message || 'Stream error');
                // Only remove user message if no content was received (stream never started)
                if (!assistantContent) {
                  setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
                }
              } else if (currentEvent === 'complete' || data.messageId) {
                assistantMessageId = data.messageId || assistantMessageId;
              }
            } catch {
              // Skip invalid JSON
            }
            currentEvent = '';
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
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled — keep partial content if any
        if (assistantContent) {
          setMessages((prev) => [...prev, {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: assistantContent + ' [cancelled]',
            createdAt: new Date().toISOString(),
          }]);
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        }
      } else {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  }, [getAccessToken]);

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    let sessionId = currentSession?.id;
    if (!sessionId) {
      const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
      if (storedSessionId) {
        sessionId = storedSessionId;
      } else {
        try {
          const newSession = await createSession();
          sessionId = newSession.id;
        } catch {
          setError('Failed to create chat session');
          return;
        }
      }
    }
    await sendMessageSSE(content, sessionId);
  }, [currentSession, createSession, sendMessageSSE]);

  /**
   * Cancel ongoing generation
   */
  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent('');
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
    connectionState: 'connected',
    createSession,
    loadSession,
    loadMoreMessages,
    sendMessage,
    clearError,
    resetChat,
    startNewConversation,
    cancelGeneration,
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
