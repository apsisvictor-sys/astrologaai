'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { useChat } from '@/lib/chat-context';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { MessageList } from './message-list';
import { ChatInputBar } from './chat-input-bar';
import { EmptyState } from './empty-state';
import { OracleWelcome } from './oracle-welcome';
import { SessionRating } from './session-rating';
import { SuggestionChips } from './suggestion-chips';
import { UsageCounter } from './usage-counter';

interface ChatWindowProps {
  sessionId?: string;
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [hasBirthData, setHasBirthData] = useState<boolean | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [prefillText, setPrefillText] = useState('');
  const prevAssistantCount = useRef<number | null>(null);
  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    dailyLimitReached,
    usage,
    hasMoreMessages,
    isLoadingMore,
    currentSession,
    sendMessage,
    cancelGeneration,
    clearError,
    createSession,
    loadSession,
    loadMoreMessages,
    suggestions,
    clearSuggestions,
  } = useChat();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Check if user has birth data (for oracle welcome state)
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('astrologaai_access_token');
    fetch(`${getApiBaseUrl()}/api/v1/birth-data`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        // Only show OracleWelcome if API explicitly confirms 0 profiles.
        // Auth errors (401), server errors (500) must not trigger it — fall safe to true.
        if (data.success === true) {
          setHasBirthData((data.data?.profiles?.length || 0) > 0);
        } else {
          setHasBirthData(true);
        }
      })
      .catch(() => setHasBirthData(true)); // network error — fail safe
  }, [isAuthenticated]);

  // Session init
  useEffect(() => {
    if (!isAuthenticated) return;
    if (sessionId) {
      loadSession(sessionId).catch(console.error);
    } else if (!currentSession && !isLoading) {
      createSession().catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isAuthenticated]);

  // Reset rating when session changes
  useEffect(() => {
    prevAssistantCount.current = null;
    setShowRating(false);
  }, [currentSession?.id]);

  // Show rating after 3rd Oracle response (only when threshold is crossed, not on initial load)
  useEffect(() => {
    const count = messages.filter(m => m.role === 'assistant').length;
    if (prevAssistantCount.current === null) {
      prevAssistantCount.current = count;
      return;
    }
    if (!showRating && count >= 3 && prevAssistantCount.current < 3) {
      setShowRating(true);
    }
    prevAssistantCount.current = count;
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Error banner */}
      {error && (
        <div
          className="mx-4 mt-3 px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm text-red-400 shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
        >
          <span className="flex-1 text-sm">{error}</span>
          <button onClick={clearError} className="text-red-400/50 hover:text-red-400 text-xl leading-none">×</button>
        </div>
      )}

      {/* Daily limit banner — shown after the last message completes */}
      {dailyLimitReached && (
        <div
          className="mx-4 mt-3 px-4 py-3 rounded-xl shrink-0 flex items-center justify-between gap-4"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}
        >
          <span className="text-xs text-pro-gold">
            ✦ You&apos;ve used your 3 free questions today. Come back tomorrow or upgrade to Pro for unlimited.
          </span>
          <a
            href="/pricing"
            className="text-xs font-medium whitespace-nowrap px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            Upgrade to Pro →
          </a>
        </div>
      )}

      {/* Messages or empty state */}
      {messages.length === 0 && !isLoading && !isStreaming ? (
        hasBirthData === false ? (
          <OracleWelcome onBirthDataSaved={() => setHasBirthData(true)} />
        ) : (
          <EmptyState onPrompt={(text) => sendMessage(text)} />
        )
      ) : (
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMoreMessages={hasMoreMessages}
          onLoadMore={loadMoreMessages}
        />
      )}

      {/* Suggestion chips — shown after Oracle response, hidden while streaming */}
      {suggestions.length > 0 && !isStreaming && (
        <SuggestionChips
          suggestions={suggestions}
          onSelect={(text) => { setPrefillText(text); clearSuggestions(); }}
        />
      )}

      {/* Session rating — after 3rd Oracle response, once per session */}
      {showRating && currentSession && (
        <div className="px-4 pb-1 shrink-0">
          <SessionRating
            sessionId={currentSession.id}
            onRated={() => setShowRating(false)}
          />
        </div>
      )}

      {/* Proactive usage counter — shown for FREE users before limit is hit */}
      {usage && user && !dailyLimitReached && (
        <div className="px-4 pb-1 shrink-0">
          <UsageCounter
            used={usage.used}
            limit={usage.limit}
            remaining={usage.remaining}
            resetAt={usage.resetAt}
            tier={user.tier}
            nearLimit={typeof usage.remaining === 'number' && usage.remaining === 1}
            language={user.language === 'en' ? 'en' : 'bg'}
          />
        </div>
      )}

      {/* Input */}
      <ChatInputBar
        onSend={(content) => sendMessage(content)}
        onCancel={cancelGeneration}
        isStreaming={isStreaming}
        disabled={isLoading || dailyLimitReached}
        placeholder={dailyLimitReached ? '3 free questions used today — upgrade to continue' : 'Ask the Oracle...'}
        sendError={error}
        prefill={prefillText}
        onPrefillConsumed={() => setPrefillText('')}
      />
    </div>
  );
}
