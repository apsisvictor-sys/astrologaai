/**
 * Chat Message Component
 * US-07: Send Message to AI Astrologer
 * US-10: Streaming Responses - Enhanced streaming display
 * 
 * Displays individual chat messages with cosmic styling
 */

'use client';

import React from 'react';
import { StreamingCursor } from './typing-indicator';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  createdAt?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
  };
}

export function ChatMessage({ 
  role, 
  content, 
  isStreaming, 
  createdAt,
  metadata 
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-up`}
      style={{ animationDelay: '0.05s' }}
    >
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3 ${
          isUser
            ? 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white'
            : 'bg-[#0A0A1F] border border-[#1A1A3A] text-[#F8FAFC]'
        }`}
        style={{
          boxShadow: isUser
            ? '0 4px 20px rgba(139, 92, 246, 0.3)'
            : '0 2px 10px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Avatar indicator for AI */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ 
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              }}
            >
              ✨
            </div>
            <span className="text-xs text-[#CBD5E1] font-medium">AstroLogAI</span>
            {metadata?.model && (
              <span className="text-xs text-[#64748B] ml-auto">
                {metadata.model}
              </span>
            )}
          </div>
        )}

        {/* Message content */}
        <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {content}
          {isStreaming && <StreamingCursor />}
        </div>

        {/* Timestamp */}
        {createdAt && !isStreaming && (
          <div className={`text-xs mt-2 ${isUser ? 'text-white/70' : 'text-[#64748B]'}`}>
            {new Date(createdAt).toLocaleTimeString('bg-BG', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}

        {/* Metadata for AI messages */}
        {!isUser && metadata && !isStreaming && (
          <div className="text-xs text-[#64748B] mt-1 flex gap-3">
            {metadata.tokensUsed && (
              <span>{metadata.tokensUsed} tokens</span>
            )}
            {metadata.processingTime && (
              <span>{metadata.processingTime.toFixed(1)}s</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Streaming Message Component
 * Shows the AI response as it streams in with enhanced styling
 */
export function StreamingMessage({ 
  content,
  isComplete = false 
}: { 
  content: string;
  isComplete?: boolean;
}) {
  if (!content) return null;

  return (
    <div className="flex justify-start mb-4 animate-fade-up">
      <div 
        className="max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3 bg-[#0A0A1F] border border-[#1A1A3A] text-[#F8FAFC]"
        style={{
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Avatar indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ 
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            }}
          >
            ✨
          </div>
          <span className="text-xs text-[#CBD5E1] font-medium">AstroLogAI</span>
          {!isComplete && (
            <span className="text-xs text-[#8B5CF6] ml-auto animate-pulse">
              генерира...
            </span>
          )}
        </div>

        {/* Streaming content */}
        <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {content}
          {!isComplete && <StreamingCursor />}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading Message Component
 * Shows a placeholder while waiting for AI to start responding
 */
export function LoadingMessage() {
  return (
    <div className="flex justify-start mb-4 animate-fade-up">
      <div 
        className="max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-4 bg-[#0A0A1F] border border-[#1A1A3A] text-[#F8FAFC]"
        style={{
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Avatar indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ 
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            }}
          >
            ✨
          </div>
          <span className="text-xs text-[#CBD5E1] font-medium">AstroLogAI</span>
        </div>

        {/* Loading animation */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div 
              className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div 
              className="w-2 h-2 rounded-full bg-[#A78BFA] animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div 
              className="w-2 h-2 rounded-full bg-[#C4B5FD] animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-sm text-[#64748B]">Мисля...</span>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
