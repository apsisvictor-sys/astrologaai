'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/chat-context-ws';
import { MessageItem } from './message-item';
import { ToolIndicator } from './tool-indicator';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  onLoadMore: () => void;
}

export function MessageList({
  messages,
  isStreaming,
  streamingContent,
  isLoading,
  isLoadingMore,
  hasMoreMessages,
  onLoadMore,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, isLoadingMore]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop < 50 && hasMoreMessages && !isLoadingMore) {
      onLoadMore();
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-6 space-y-5"
      onScroll={handleScroll}
    >
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {hasMoreMessages && !isLoadingMore && (
        <button
          onClick={onLoadMore}
          className="w-full text-[11px] text-text-muted hover:text-white transition-colors py-1"
        >
          Load older messages
        </button>
      )}

      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}

      {/* Streaming content */}
      {isStreaming && streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[85%]">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(228,26,255,0.12)', border: '1px solid rgba(228,26,255,0.28)' }}
              >
                <span className="text-[9px] text-primary">✦</span>
              </div>
              <span className="text-[10px] font-medium text-white/40">The Oracle</span>
              <span className="text-[10px] text-primary/50 ml-auto animate-pulse">reading...</span>
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-text-secondary leading-relaxed whitespace-pre-wrap"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {streamingContent}
            </div>
          </div>
        </div>
      )}

      {/* Thinking indicator */}
      {(isLoading || (isStreaming && !streamingContent)) && <ToolIndicator />}

      <div ref={bottomRef} />
    </div>
  );
}
