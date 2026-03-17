'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth-context';
import { useChat } from '@/lib/chat-context';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { MessageList } from './message-list';
import { ChatInputBar } from './chat-input-bar';
import { EmptyState } from './empty-state';
import { OracleWelcome } from './oracle-welcome';

interface ChatWindowProps {
  sessionId?: string;
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [hasBirthData, setHasBirthData] = useState<boolean | null>(null);
  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
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
      .then(data => setHasBirthData((data.data?.profiles?.length || 0) > 0))
      .catch(() => setHasBirthData(true)); // fail safe — don't block chat on error
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

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isLimitReached = usage?.remaining === 0;

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

      {/* Usage limit warning */}
      {isLimitReached && (
        <div
          className="mx-4 mt-3 px-4 py-2.5 rounded-xl text-xs text-pro-gold shrink-0"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}
        >
          Daily limit reached.{' '}
          <a href="/pricing" className="underline hover:opacity-80">Upgrade for unlimited access</a>
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

      {/* Input */}
      <ChatInputBar
        onSend={(content) => sendMessage(content)}
        onCancel={cancelGeneration}
        isStreaming={isStreaming}
        disabled={isLoading || isLimitReached}
        placeholder={isLimitReached ? 'Daily limit reached — upgrade to continue' : 'Ask the Oracle...'}
        sendError={error}
      />
    </div>
  );
}
