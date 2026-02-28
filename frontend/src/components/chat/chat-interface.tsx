/**
 * Chat Interface Component
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History - Added history button
 * US-10: Streaming Responses - Connection status & cancel
 * US-27: Toggle Language Mid-Session - Uses useLanguage hook
 * 
 * Main chat interface with message history and input
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useChat } from '@/lib/chat-context';
import { ChatMessage, StreamingMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { UsageCounter } from './usage-counter';
import { ConnectionStatus, ConnectionBanner } from './connection-status';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export function ChatInterface() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  
  const {
    currentSession,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    usage,
    sendMessage,
    clearError,
    createSession,
    loadSession,
    startNewConversation,
    hasMoreMessages,
    isLoadingMore,
    loadMoreMessages,
    cancelGeneration,
    connectionState,
    reconnect,
    useWebSocket,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages (but not when loading more)
  useEffect(() => {
    if (messagesEndRef.current && !isLoadingMore) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, isLoadingMore]);

  // Load session from URL or create new one
  useEffect(() => {
    if (sessionId) {
      // Load existing session
      loadSession(sessionId).catch(console.error);
    } else if (messages.length === 0 && !isLoading && !currentSession) {
      // Create new session
      createSession().catch(console.error);
    }
  }, [sessionId]);

  // US-20: Handle pre-filled question from compatibility page
  useEffect(() => {
    const prefillQuestion = sessionStorage.getItem('astrologaai_prefill_question');
    if (prefillQuestion && currentSession && messages.length === 0 && !isLoading) {
      // Clear the prefill so it doesn't get sent again
      sessionStorage.removeItem('astrologaai_prefill_question');
      // Send the pre-filled question
      sendMessage(prefillQuestion);
    }
  }, [currentSession, messages.length, isLoading, sendMessage]);

  // US-09: Handle scroll to load more messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Load more when user scrolls to the top
    if (target.scrollTop < 50 && hasMoreMessages && !isLoadingMore && !isLoading) {
      loadMoreMessages();
    }
  };

  const handleSend = (content: string) => {
    sendMessage(content);
  };

  const handleCancel = () => {
    cancelGeneration();
  };

  const goToHistory = () => {
    router.push('/chat/history');
  };

  // US-09: Start new conversation with fresh context
  const startNewChat = async () => {
    try {
      // Use the new startNewConversation which clears Redis context
      await startNewConversation();
      // Navigate to fresh chat page
      router.push('/chat');
    } catch (err) {
      console.error('Failed to start new conversation:', err);
      // Fallback to basic reset
      router.push('/chat');
    }
  };

  // Translations from i18n
  const texts = {
    astrologer: t('chat.astrologer'),
    typing: t('chat.typing'),
    welcomeTitle: t('chat.welcomeTitle'),
    welcomeDesc: t('chat.welcomeDesc'),
    thinking: t('chat.thinking'),
    limitReached: t('chat.limitReached'),
    askPlaceholder: t('chat.askPlaceholder'),
    disclaimer: t('chat.disclaimer'),
    history: t('chat.history'),
    newChat: t('chat.newChat'),
    forecast: t('forecast.title'),
    suggestions: [
      t('chat.suggestions.career'),
      t('chat.suggestions.transits'),
      t('chat.suggestions.compatibility'),
    ],
    connectionLost: t('chat.connectionLost'),
  };

  return (
    <div className="flex flex-col h-full bg-[#050510]">
      {/* Connection status banner for WebSocket */}
      {useWebSocket && (
        <ConnectionBanner 
          state={connectionState} 
          language={language}
          onRetry={reconnect}
        />
      )}
      
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
            {/* Connection status indicator (WebSocket mode) */}
            {useWebSocket && (
              <ConnectionStatus 
                state={connectionState} 
                language={language}
                onRetry={reconnect}
              />
            )}
            
            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/20">
                <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                <span className="text-xs text-[#8B5CF6]">{texts.typing}</span>
              </div>
            )}
            
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
            
            {/* History button - US-08 */}
            <Link
              href="/forecast"
              className="p-2 rounded-xl hover:bg-[#1A1A3A] text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              title={texts.forecast}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </Link>
            
            {/* History button - US-08 */}
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
              {t('chat.loadOlder')}
            </button>
          </div>
        )}

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-2 mb-2">
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <div className="w-4 h-4 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
              {t('common.loading')}
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

        {/* Loading indicator (when not streaming) */}
        {isLoading && !isStreaming && (
          <div className="flex justify-start mb-4">
            <div className="bg-[#0A0A1F] border border-[#1A1A3A] rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-[#64748B]">{texts.thinking}</span>
              </div>
            </div>
          </div>
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
          onCancel={handleCancel}
          disabled={isLoading || (usage?.remaining === 0)}
          isStreaming={isStreaming}
          placeholder={
            usage?.remaining === 0 
              ? texts.limitReached 
              : texts.askPlaceholder
          }
        />
        <p className="text-center text-xs text-[#64748B] mt-2">
          {texts.disclaimer}
        </p>
      </div>
    </div>
  );
}

export default ChatInterface;
