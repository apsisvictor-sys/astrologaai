'use client';

import { ChatMessage } from '@/lib/chat-context-ws';

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[78%] px-4 py-3 rounded-2xl rounded-br-sm text-sm text-white leading-relaxed"
          style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
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
          {message.createdAt && (
            <span className="text-[10px] text-text-muted ml-auto">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div
          className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-text-secondary leading-relaxed whitespace-pre-wrap"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
