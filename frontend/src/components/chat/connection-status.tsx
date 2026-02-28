/**
 * Connection Status Component
 * US-10: Streaming Responses
 * US-38: WebSocket/Stream Reconnection Strategy
 * 
 * Shows WebSocket connection status with reconnection handling
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ConnectionState } from '@/lib/socket-client';

interface ConnectionStatusProps {
  state: ConnectionState;
  language?: 'bg' | 'en';
  onRetry?: () => void;
  showDetails?: boolean;
  queuedMessages?: number;
}

export function ConnectionStatus({ 
  state, 
  language = 'bg',
  onRetry,
  showDetails = false,
  queuedMessages = 0
}: ConnectionStatusProps) {
  const [retryCountdown, setRetryCountdown] = useState(0);

  // Countdown timer for reconnection
  useEffect(() => {
    if (state === 'reconnecting' && retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(retryCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state, retryCountdown]);

  // Start countdown when reconnecting
  useEffect(() => {
    if (state === 'reconnecting') {
      setRetryCountdown(5);
    }
  }, [state]);

  const texts = {
    bg: {
      connected: 'Свързан',
      connecting: 'Свързване...',
      disconnected: 'Изключен',
      reconnecting: 'Повторно свързване',
      retry: 'Опитай отново',
      inSeconds: 'след {seconds}с',
      queuedMessages: '{count} съобщение(я) в опашка',
      queuedMessagesPlural: '{count} съобщения в опашка',
    },
    en: {
      connected: 'Connected',
      connecting: 'Connecting...',
      disconnected: 'Disconnected',
      reconnecting: 'Reconnecting',
      retry: 'Retry',
      inSeconds: 'in {seconds}s',
      queuedMessages: '{count} message queued',
      queuedMessagesPlural: '{count} messages queued',
    },
  };

  const t = texts[language];

  // Status configurations
  const statusConfig = {
    connected: {
      color: 'bg-[#10B981]',
      textColor: 'text-[#10B981]',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ),
      text: t.connected,
      pulse: false,
    },
    connecting: {
      color: 'bg-[#F59E0B]',
      textColor: 'text-[#F59E0B]',
      icon: (
        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ),
      text: t.connecting,
      pulse: true,
    },
    disconnected: {
      color: 'bg-[#EF4444]',
      textColor: 'text-[#EF4444]',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
      text: t.disconnected,
      pulse: false,
    },
    reconnecting: {
      color: 'bg-[#F59E0B]',
      textColor: 'text-[#F59E0B]',
      icon: (
        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ),
      text: `${t.reconnecting}${retryCountdown > 0 ? ` ${t.inSeconds.replace('{seconds}', String(retryCountdown))}` : '...'}`,
      pulse: true,
    },
  };

  const config = statusConfig[state];

  // Get queued messages text
  const getQueuedText = () => {
    if (queuedMessages === 0) return '';
    const template = queuedMessages === 1 ? t.queuedMessages : t.queuedMessagesPlural;
    return template.replace('{count}', String(queuedMessages));
  };

  // Compact inline version
  if (!showDetails) {
    return (
      <div 
        className={`flex items-center gap-2 px-2 py-1 rounded-lg ${
          state === 'disconnected' ? 'bg-red-500/10' : 
          state === 'reconnecting' ? 'bg-yellow-500/10' : 
          'bg-transparent'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
        <span className={`text-xs ${config.textColor} hidden sm:inline`}>
          {config.text}
        </span>
        {queuedMessages > 0 && state !== 'connected' && (
          <span className="text-xs text-[#F59E0B]">
            ({queuedMessages})
          </span>
        )}
      </div>
    );
  }

  // Detailed version with retry button
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[#0A0A1F] border border-[#1A1A3A]">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
        <div>
          <div className={`text-sm font-medium ${config.textColor}`}>
            {config.text}
          </div>
          {state === 'disconnected' && (
            <p className="text-xs text-[#64748B] mt-0.5">
              {language === 'bg' 
                ? 'Връзката със сървъра е прекъсната' 
                : 'Connection to server lost'}
            </p>
          )}
          {queuedMessages > 0 && (
            <p className="text-xs text-[#F59E0B] mt-0.5">
              {getQueuedText()}
            </p>
          )}
        </div>
      </div>

      {state === 'disconnected' && onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-medium transition-colors"
        >
          {t.retry}
        </button>
      )}
    </div>
  );
}

/**
 * Connection Banner
 * Full-width banner shown when connection is lost
 */
export function ConnectionBanner({ 
  state, 
  language = 'bg',
  onRetry,
  queuedMessages = 0
}: ConnectionStatusProps) {
  if (state === 'connected') return null;

  const texts = {
    bg: {
      disconnected: 'Няма връзка със сървъра. Съобщенията ще бъдат изпратени при възстановяване на връзката.',
      reconnecting: 'Възстановяване на връзката...',
      retry: 'Опитай сега',
      queuedCount: '({count} съобщение(я) в опашка)',
    },
    en: {
      disconnected: 'No server connection. Messages will be sent when connection is restored.',
      reconnecting: 'Restoring connection...',
      retry: 'Retry now',
      queuedCount: '({count} message(s) queued)',
    },
  };

  const t = texts[language];

  return (
    <div 
      className={`w-full px-4 py-3 text-center text-sm ${
        state === 'reconnecting' 
          ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-b border-[#F59E0B]/20' 
          : 'bg-[#EF4444]/10 text-[#EF4444] border-b border-[#EF4444]/20'
      }`}
    >
      <div className="flex items-center justify-center gap-3">
        {state === 'reconnecting' ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>{t.reconnecting}</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{t.disconnected}</span>
            {queuedMessages > 0 && (
              <span className="ml-1 text-xs opacity-75">
                {t.queuedCount.replace('{count}', String(queuedMessages))}
              </span>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-2 px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              >
                {t.retry}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ConnectionStatus;
