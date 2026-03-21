'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface ChatInputBarProps {
  onSend: (message: string) => void;
  onCancel: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  sendError?: string | null;
  prefill?: string;
  onPrefillConsumed?: () => void;
}

export function ChatInputBar({ onSend, onCancel, isStreaming, disabled, placeholder, sendError, prefill, onPrefillConsumed }: ChatInputBarProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSentRef = useRef('');

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [message]);

  // Restore message to input if send failed
  useEffect(() => {
    if (sendError && lastSentRef.current) {
      setMessage(lastSentRef.current);
      lastSentRef.current = '';
    }
  }, [sendError]);

  // Prefill from suggestion chip selection
  useEffect(() => {
    if (prefill) {
      setMessage(prefill);
      textareaRef.current?.focus();
      onPrefillConsumed?.();
    }
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled && !isStreaming) {
      lastSentRef.current = trimmed;
      onSend(trimmed);
      setMessage('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      isStreaming ? onCancel() : handleSend();
    }
    if (e.key === 'Escape' && isStreaming) onCancel();
  };

  const canSend = message.trim().length > 0 && !disabled && !isStreaming;

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div
        className="flex items-end gap-2 px-4 py-3 rounded-2xl transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Ask the Oracle...'}
          disabled={disabled && !isStreaming}
          rows={1}
          className="flex-1 bg-transparent outline-none resize-none text-white placeholder-text-muted text-sm leading-relaxed py-0.5"
          style={{ maxHeight: '140px' }}
        />

        {isStreaming ? (
          <button
            onClick={onCancel}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'rgba(228,26,255,0.15)', border: '1px solid rgba(228,26,255,0.35)' }}
            title="Stop generating"
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="#e41aff">
              <rect width="10" height="10" rx="1.5" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-25"
            style={{
              background: canSend ? 'linear-gradient(135deg, #ff0080, #e41aff)' : 'rgba(255,255,255,0.06)',
              boxShadow: canSend ? '0 0 14px rgba(228,26,255,0.35)' : 'none',
            }}
            title="Send message"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-center text-[10px] text-text-muted/50 mt-2">
        The Oracle interprets, not predicts. Shift+Enter for new line.
      </p>
    </div>
  );
}
