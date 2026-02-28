/**
 * Chat Page
 * US-07: Send Message to AI Astrologer
 * 
 * Main chat page with the AI astrologer
 * Route: /chat (Bulgarian default) or /en/chat (English)
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ChatProvider } from '@/lib/chat-context';
import { ChatInterface } from '@/components/chat/chat-interface';

function ChatPageContent() {
  const t = useTranslations();
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#050510' }}>
      {/* Chat interface */}
      <ChatInterface />
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthProvider>
      <ChatProvider>
        <ChatPageContent />
      </ChatProvider>
    </AuthProvider>
  );
}
