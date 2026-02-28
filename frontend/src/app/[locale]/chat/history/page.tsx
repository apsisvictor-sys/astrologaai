/**
 * Chat History Page
 * US-08: Chat History
 * 
 * Page for viewing and managing chat history
 * Route: /chat/history (Bulgarian default) or /en/chat/history (English)
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ChatHistory } from '@/components/chat/chat-history';

function ChatHistoryPageContent() {
  const t = useTranslations();
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const language = (user?.language as 'bg' | 'en') || 'bg';

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050510' }}>
        <div className="text-center">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            }}
          >
            <span className="text-3xl">✨</span>
          </div>
          <p className="text-[#CBD5E1]">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Handle session selection - navigate to chat
  const handleSelectSession = (sessionId: string) => {
    router.push(`/chat?session=${sessionId}`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#050510' }}>
      {/* Back button header */}
      <div className="flex-shrink-0 px-4 py-3 bg-[#0A0A1F]">
        <button
          onClick={() => router.push('/chat')}
          className="flex items-center gap-2 text-[#CBD5E1] hover:text-[#F8FAFC] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="text-sm">
            {t('chat.historyPage.backToChat')}
          </span>
        </button>
      </div>

      {/* Chat history component */}
      <div className="flex-1">
        <ChatHistory 
          language={language}
          onSelectSession={handleSelectSession}
        />
      </div>
    </div>
  );
}

export default function ChatHistoryPage() {
  return (
    <AuthProvider>
      <ChatHistoryPageContent />
    </AuthProvider>
  );
}
