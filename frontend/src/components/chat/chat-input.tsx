/**
 * Chat Input Component
 * US-07: Send Message to AI Astrologer
 * US-10: Streaming Responses - Cancel button
 * 
 * Text input for sending messages to the AI with cancel functionality
 */

'use client';

import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onCancel, disabled, isStreaming, placeholder }: ChatInputProps) {
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

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) {
        handleCancel();
      } else {
        handleSend();
      }
    }
    // Escape key to cancel streaming
    if (e.key === 'Escape' && isStreaming) {
      handleCancel();
    }
  };

  // Show cancel button when streaming
  if (isStreaming) {
    return (
      <div className="flex items-center gap-3 p-4 bg-[#0A0A1F] rounded-2xl border border-[#8B5CF6]/30">
        <div className="flex-1 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div 
                className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div 
                className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div 
                className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <span className="text-sm text-[#8B5CF6]">Генериране на отговор...</span>
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="flex-shrink-0 px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 bg-[#EF4444] hover:bg-[#DC2626] text-white"
          aria-label="Спри генерирането"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          <span className="text-sm font-medium">Спри</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 p-4 bg-[#0A0A1F] rounded-2xl border border-[#1A1A3A] focus-within:border-[#8B5CF6]/50 transition-colors">
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
