/**
 * Chat Interface Component
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History
 * US-10: Streaming Responses (WebSocket)
 * 
 * Main chat interface with message history, streaming, and connection status
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChat } from '@/lib/chat-context-ws';
import { ChatMessage, StreamingMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { UsageCounter } from './usage-counter';
import { TypingIndicator, InlineTypingIndicator } from './typing-indicator';
import { ConnectionStatus, ConnectionBanner } from './connection-status';
import { useAuth } from '@/lib/auth-context';

export function ChatInterface() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const language = (user?.language as 'bg' | 'en') || 'bg';
  
  const {
    currentSession,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    usage,
    connectionState,
    sendMessage,
    clearError,
    createSession,
    loadSession,
    startNewConversation,
    hasMoreMessages,
    isLoadingMore,
    loadMoreMessages,
    cancelGeneration,
    reconnect,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && !isLoadingMore) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, isLoadingMore]);

  // Load session from URL or create new one
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId).catch(console.error);
    } else if (messages.length === 0 && !isLoading && !currentSession) {
      createSession().catch(console.error);
    }
  }, [sessionId]);

  // Handle scroll to load more messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop < 50 && hasMoreMessages && !isLoadingMore && !isLoading) {
      loadMoreMessages();
    }
  };

  const handleSend = (content: string) => {
    sendMessage(content);
  };

  const goToHistory = () => {
    router.push('/chat/history');
  };

  // Start new conversation
  const startNewChat = async () => {
    try {
      await startNewConversation();
      router.push('/chat');
    } catch (err) {
      console.error('Failed to start new conversation:', err);
      router.push('/chat');
    }
  };

  // Translations
  const t = {
    bg: {
      astrologer: 'Твоят личен астролог',
      welcomeTitle: 'Добре дошъл в AstroLogAI!',
      welcomeDesc: 'Задай въпрос за своята натална карта, транзити, връзки или кариера. Аз ще ти помогна да разбереш космическите влияния в живота си.',
      limitReached: 'Достигнахте лимита на въпросите',
      askPlaceholder: 'Попитай астролога...',
      disclaimer: 'AstroLogAI може да прави грешки. Проверявай важна информация.',
      history: 'История',
      newChat: 'Нов разговор',
      cancel: 'Спри',
      suggestions: [
        'Какво показва картата ми за кариерата?',
        'Какви транзити има днес?',
        'Съвместими ли сме с партньора ми?',
      ],
    },
    en: {
      astrologer: 'Your Personal Astrologer',
      welcomeTitle: 'Welcome to AstroLogAI!',
      welcomeDesc: 'Ask about your natal chart, transits, relationships, or career. I\'ll help you understand cosmic influences in your life.',
      limitReached: 'Query limit reached',
      askPlaceholder: 'Ask the astrologer...',
      disclaimer: 'AstroLogAI can make mistakes. Verify important information.',
      history: 'History',
      newChat: 'New Chat',
      cancel: 'Stop',
      suggestions: [
        'What does my chart say about my career?',
        'What transits are happening today?',
        'Are we compatible with my partner?',
      ],
    },
  };

  const texts = t[language];

  return (
    <div className="flex flex-col h-full bg-[#050510]">
      {/* Connection Banner (shown when disconnected) */}
      <ConnectionBanner 
        state={connectionState} 
        language={language}
        onRetry={reconnect}
      />

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#1A1A3A] bg-[#0A0A1F]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              }}
            >
              <span className="text-xl">✨</span>
            </div>
            <div>
              <h1 className="font-semibold text-[#F8FAFC]">AstroLogAI</h1>
              <p className="text-xs text-[#64748B]">{texts.astrologer}</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Typing indicator */}
            {isStreaming && (
              <InlineTypingIndicator language={language} />
            )}
            
            {/* Cancel button during streaming */}
            {isStreaming && (
              <button
                onClick={cancelGeneration}
                className="p-2 rounded-xl hover:bg-[#EF4444]/20 text-[#EF4444] transition-colors"
                title={texts.cancel}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </button>
            )}
            
            {/* Connection status */}
            <ConnectionStatus state={connectionState} language={language} />
            
            {/* New chat button */}
            <button
              onClick={startNewChat}
              className="p-2 rounded-xl hover:bg-[#1A1A3A] text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              title={texts.newChat}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            
            {/* History button */}
            <button
              onClick={goToHistory}
              className="p-2 rounded-xl hover:bg-[#1A1A3A] text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              title={texts.history}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Usage counter (for free tier) */}
      {usage && user?.tier === 'FREE' && (
        <div className="flex-shrink-0 px-4 py-2">
          <UsageCounter
            used={typeof usage.used === 'number' ? usage.used : 0}
            limit={usage.limit}
            remaining={usage.remaining}
            resetAt={usage.resetAt}
            tier={user.tier}
          />
        </div>
      )}

      {/* Messages area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ scrollBehavior: 'smooth' }}
        onScroll={handleScroll}
      >
        {/* Load more indicator */}
        {hasMoreMessages && !isLoading && (
          <div className="flex justify-center py-2 mb-2">
            <button
              onClick={() => loadMoreMessages()}
              className="text-xs text-[#8B5CF6] hover:text-[#A78BFA] transition-colors"
            >
              {language === 'bg' ? 'Зареди по-стари съобщения' : 'Load older messages'}
            </button>
          </div>
        )}

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-2 mb-2">
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <div className="w-4 h-4 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
              {language === 'bg' ? 'Зареждане...' : 'Loading...'}
            </div>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !isLoading && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                boxShadow: '0 8px 30px rgba(139, 92, 246, 0.3)',
              }}
            >
              <span className="text-4xl">🌟</span>
            </div>
            <h2 className="text-xl font-semibold text-[#F8FAFC] mb-2">
              {texts.welcomeTitle}
            </h2>
            <p className="text-[#CBD5E1] max-w-md mb-6">
              {texts.welcomeDesc}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {texts.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="px-4 py-2 rounded-xl bg-[#0A0A1F] border border-[#1A1A3A] text-sm text-[#CBD5E1] hover:border-[#8B5CF6] transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            createdAt={msg.createdAt}
          />
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <StreamingMessage content={streamingContent} />
        )}

        {/* Loading indicator (before streaming starts) */}
        {isLoading && !isStreaming && (
          <TypingIndicator language={language} variant="full" />
        )}

        {/* Error message */}
        {error && (
          <div className="flex justify-center mb-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="text-sm text-red-400">{error}</span>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-[#1A1A3A] bg-[#050510]">
        <ChatInput
          onSend={handleSend}
          disabled={isLoading || isStreaming || (usage?.remaining === 0)}
          placeholder={
            usage?.remaining === 0 
              ? texts.limitReached 
              : texts.askPlaceholder
          }
          isStreaming={isStreaming}
          onCancel={cancelGeneration}
        />
        <p className="text-center text-xs text-[#64748B] mt-2">
          {texts.disclaimer}
        </p>
      </div>
    </div>
  );
}

export default ChatInterface;
