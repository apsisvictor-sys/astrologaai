/**
 * Chat Interface Component
 * US-07: Send Message to AI Astrologer
 * US-08: Chat History
 * US-10: Streaming Responses (WebSocket)
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
import { Sparkles, X, Plus, Clock, ArrowRight, Lock } from 'lucide-react';

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

  useEffect(() => {
    if (messagesEndRef.current && !isLoadingMore) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, isLoadingMore]);

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId).catch(console.error);
    } else if (messages.length === 0 && !isLoading && !currentSession) {
      createSession().catch(console.error);
    }
  }, [sessionId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop < 50 && hasMoreMessages && !isLoadingMore && !isLoading) {
      loadMoreMessages();
    }
  };

  const handleSend = (content: string) => sendMessage(content);
  const goToHistory = () => router.push('/chat/history');

  const startNewChat = async () => {
    try {
      await startNewConversation();
      router.push('/chat');
    } catch (err) {
      console.error('Failed to start new conversation:', err);
      router.push('/chat');
    }
  };

  const t = {
    bg: {
      astrologer: 'The Oracle',
      welcomeTitle: 'The Oracle е пробуден',
      welcomeDesc: 'Свързване с математическите ефемериди на Швейцарската обсерватория. Какво искате да разкрият звездите?',
      limitReached: 'Космическият лимит е достигнат',
      askPlaceholder: 'Комуникирай с Вселената...',
      disclaimer: 'Абсолютна поверителност. Насочено от NASA JPL математика.',
      suggestions: [
        'Какво показва картата ми за кариерата?',
        'Какви транзити имам днес?',
        'Каква е кармичната ми мисия?',
      ],
    },
    en: {
      astrologer: 'The Oracle',
      welcomeTitle: 'The Oracle has Awakened',
      welcomeDesc: 'Establishing connection with Swiss Ephemeris mathematical streams. What do you seek from the stars?',
      limitReached: 'Cosmic limit reached',
      askPlaceholder: 'Commune with the universe...',
      disclaimer: 'Absolute privacy. Guided by NASA JPL mathematics.',
      suggestions: [
        'What is my karmic life path?',
        'What transits are affecting me today?',
        'When will I experience a major career shift?',
      ],
    },
  };

  const texts = t[language];
  const isLimitReached = usage?.remaining === 0;

  return (
    <div className="flex flex-col h-full bg-background-dark relative overflow-hidden selection:bg-primary-glow">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[150px] mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] rounded-full bg-secondary/15 blur-[120px] mix-blend-screen"></div>
      </div>

      <ConnectionBanner state={connectionState} language={language} onRetry={reconnect} />

      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 glass-panel border-x-0 border-t-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-background-deep border border-primary-glow shadow-glow overflow-hidden">
              <Sparkles className="w-6 h-6 text-primary-light animate-pulse-glow relative" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white tracking-wide text-lg">{texts.astrologer}</h1>
              <p className="text-xs text-primary-light font-mono opacity-80">Connected to Swiss Ephemeris</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isStreaming && <InlineTypingIndicator language={language} />}
            {isStreaming && (
              <button onClick={cancelGeneration} className="p-2.5 rounded-xl bg-surface hover:bg-red-500/20 text-red-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
            <ConnectionStatus state={connectionState} language={language} />
            <button onClick={startNewChat} className="p-2.5 rounded-xl glass-panel text-text-muted hover:text-white transition-colors" title="New Chat">
              <Plus className="w-5 h-5" />
            </button>
            <button onClick={goToHistory} className="p-2.5 rounded-xl glass-panel text-text-muted hover:text-white transition-colors" title="History">
              <Clock className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Usage counter */}
      {usage && user?.tier === 'FREE' && !isLimitReached && (
        <div className="flex-shrink-0 px-6 py-3 z-10">
          <UsageCounter used={typeof usage.used === 'number' ? usage.used : 0} limit={usage.limit} remaining={usage.remaining} resetAt={usage.resetAt} tier={user.tier} />
        </div>
      )}

      {/* Messages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-6 z-10 scroll-smooth" onScroll={handleScroll}>
        {hasMoreMessages && !isLoading && (
          <div className="flex justify-center py-2 mb-4">
            <button onClick={() => loadMoreMessages()} className="text-xs font-mono tracking-wider uppercase text-primary-light hover:text-white transition-colors">
              {language === 'bg' ? 'Синхронизиране на минали записи...' : 'Syncing past records...'}
            </button>
          </div>
        )}

        {isLoadingMore && (
          <div className="flex justify-center py-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-primary-light">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !isLoading && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
            <div className="relative w-24 h-24 mb-8 flex items-center justify-center rounded-full bg-background-deep border border-primary/30 shadow-glow-lg overflow-hidden group">
              <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/40 transition-colors duration-1000"></div>
              <Sparkles className="w-10 h-10 text-primary-light relative z-10 animate-float" />
            </div>
            <h2 className="text-3xl font-display font-bold text-white mb-4">
              {texts.welcomeTitle}
            </h2>
            <p className="text-text-secondary max-w-md mb-10 leading-relaxed">
              {texts.welcomeDesc}
            </p>
            <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
              {texts.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="px-5 py-3 rounded-2xl glass-panel text-sm text-text-secondary hover:text-white hover:border-primary/50 hover:shadow-glow transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} createdAt={msg.createdAt} />
          ))}

          {isStreaming && streamingContent && <StreamingMessage content={streamingContent} />}
          {isLoading && !isStreaming && <TypingIndicator language={language} variant="full" />}

          {/* Premium Paywall CTA limit prompt */}
          {isLimitReached && (
            <div className="mt-8 animate-fade-in-up">
              <div className="glass-panel relative overflow-hidden p-8 rounded-3xl border-primary/40 shadow-glow-lg flex flex-col items-center text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent-pink/5 z-0"></div>
                <div className="relative z-10 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                  <Lock className="w-8 h-8 text-primary-light" />
                </div>
                <h3 className="relative z-10 text-2xl font-display font-bold text-white mb-3">
                  {language === 'bg' ? 'Звездите се нуждаят от време.' : 'The stars need time to align.'}
                </h3>
                <p className="relative z-10 text-text-secondary max-w-md mx-auto mb-8">
                  {language === 'bg'
                    ? 'Вашият безплатен космически лимит за този месец е изчерпан. Надградете своя достъп, за да позволите на Оракула да продължи вашите изчисления без ограничения.'
                    : 'Your free cosmic allowance for this month has been exhausted. Elevate your access to allow The Oracle to continue calculating your path without limits.'}
                </p>
                <div className="relative z-10 flex gap-4 w-full max-w-sm">
                  <button
                    onClick={() => router.push('/pricing')}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent-pink text-white font-bold py-4 px-6 rounded-xl hover:shadow-glow-lg transition-all"
                  >
                    {language === 'bg' ? 'Отключи Оракула' : 'Unlock The Oracle'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center mt-4">
              <div className="glass-panel border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                <X className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-400">{error}</span>
                <button onClick={clearError} className="text-red-400 hover:text-red-300 ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-6 py-6 glass-panel border-x-0 border-b-0 z-10">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSend={handleSend}
            disabled={isLoading || isStreaming || isLimitReached}
            placeholder={isLimitReached ? texts.limitReached : texts.askPlaceholder}
            isStreaming={isStreaming}
            onCancel={cancelGeneration}
          />
          <p className="text-center text-xs text-text-muted mt-3 font-mono tracking-wide">
            {texts.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;

