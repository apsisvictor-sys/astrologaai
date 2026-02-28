/**
 * Chat Input Component
 * US-07: Send Message to AI Astrologer
 * US-10: Streaming Responses - Cancel button
 * 
 * Text input for sending messages with streaming support
 */

'use client';

import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  onCancel?: () => void;
}

export function ChatInput({ 
  onSend, 
  disabled, 
  placeholder, 
  isStreaming,
  onCancel 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled && !isStreaming) {
      onSend(trimmed);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        handleSend();
      }
    }
  };

  // Show cancel button when streaming
  if (isStreaming) {
    return (
      <div className="flex items-center gap-3 p-4 bg-[#0A0A1F] rounded-2xl border border-[#1A1A3A]">
        <div className="flex-1 flex items-center gap-2 text-[#64748B]">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm">Генериране на отговор...</span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-sm font-medium transition-colors"
          >
            Спри
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 p-4 bg-[#0A0A1F] rounded-2xl border border-[#1A1A3A]">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Попитай астролога...'}
        disabled={disabled}
        rows={1}
        className="flex-1 bg-transparent border-none outline-none resize-none text-[#F8FAFC] placeholder-[#64748B] text-[15px] leading-relaxed"
        style={{ maxHeight: '150px' }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: message.trim() && !disabled
            ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
            : '#1A1A3A',
          boxShadow: message.trim() && !disabled
            ? '0 4px 15px rgba(139, 92, 246, 0.3)'
            : 'none',
        }}
        aria-label="Изпрати съобщение"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}

export default ChatInput;
