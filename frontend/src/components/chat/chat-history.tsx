/**
 * Chat History Component
 * US-08: Chat History
 * 
 * Displays list of past conversations with search and delete functionality
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { formatDistanceToNow } from 'date-fns';
import { bg, enUS } from 'date-fns/locale';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatHistoryProps {
  language?: 'bg' | 'en';
  onSelectSession?: (sessionId: string) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

export function ChatHistory({ language = 'bg', onSelectSession }: ChatHistoryProps) {
  const t = useTranslations('chat.historyPage');
  const router = useRouter();
  const dateLocale = language === 'bg' ? bg : enUS;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [renameSession, setRenameSession] = useState<ChatSession | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Get access token
  const getAccessToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('astrologaai_access_token');
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch sessions
  const fetchSessions = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setIsLoading(!append);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '20',
      });

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await fetch(`${API_URL}/api/v1/chat/sessions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      
      if (append) {
        setSessions(prev => [...prev, ...data.data.sessions]);
      } else {
        setSessions(data.data.sessions);
      }
      
      setHasMore(data.data.pagination.hasMore);
      setTotalCount(data.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, getAccessToken, router]);

  // Initial fetch and search changes
  useEffect(() => {
    fetchSessions(1, false);
  }, [fetchSessions]);

  // Load more
  const loadMore = () => {
    if (hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSessions(nextPage, true);
    }
  };

  // Delete single session
  const deleteSession = async (sessionId: string) => {
    const token = getAccessToken();
    if (!token) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear all sessions
  const clearAllSessions = async () => {
    const token = getAccessToken();
    if (!token) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/chat/sessions`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear history');
      }

      setSessions([]);
      setTotalCount(0);
      setShowClearConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history');
    } finally {
      setIsDeleting(false);
    }
  };

  // Rename session
  const handleRename = async () => {
    if (!renameSession || !newTitle.trim()) return;

    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/chat/sessions/${renameSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename session');
      }

      const data = await response.json();
      
      setSessions(prev => prev.map(s => 
        s.id === renameSession.id 
          ? { ...s, title: data.data.session.title, updatedAt: data.data.session.updatedAt }
          : s
      ));
      
      setRenameSession(null);
      setNewTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      return t('justNow');
    }
    
    return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
  };

  // Handle session click
  const handleSessionClick = (sessionId: string) => {
    if (onSelectSession) {
      onSelectSession(sessionId);
    } else {
      // Navigate to chat with session
      router.push(`/chat?session=${sessionId}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050510]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-[#1A1A3A] bg-[#0A0A1F]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-[#F8FAFC]">{t('title')}</h1>
          {sessions.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-sm text-[#EF4444] hover:text-red-400 transition-colors"
            >
              {t('clearAll')}
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full px-4 py-3 pl-10 rounded-xl bg-[#1A1A3A] border border-[#252545] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6] transition-colors"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F8FAFC]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Loading state */}
        {isLoading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-10 h-10 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state - no conversations */}
        {!isLoading && sessions.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#0A0A1F] border border-[#1A1A3A] flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">{t('noConversations')}</h3>
            <p className="text-sm text-[#64748B] max-w-xs">{t('noConversationsDesc')}</p>
          </div>
        )}

        {/* Empty state - no search results */}
        {!isLoading && sessions.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#0A0A1F] border border-[#1A1A3A] flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">{t('noResults')}</h3>
            <p className="text-sm text-[#64748B] max-w-xs">{t('noResultsDesc')}</p>
          </div>
        )}

        {/* Session list */}
        {sessions.length > 0 && (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="group relative bg-[#0A0A1F] border border-[#1A1A3A] rounded-xl p-4 hover:border-[#8B5CF6]/50 transition-colors cursor-pointer"
                onClick={() => handleSessionClick(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#F8FAFC] truncate mb-1">
                      {session.title || (language === 'bg' ? 'Нов разговор' : 'New conversation')}
                    </h3>
                    <p className="text-sm text-[#64748B] truncate mb-2">
                      {session.lastMessage || '...'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[#475569]">
                      <span>{formatDate(session.updatedAt)}</span>
                      <span>•</span>
                      <span>{session.messageCount} {t('messages')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameSession(session);
                        setNewTitle(session.title || '');
                      }}
                      className="p-2 rounded-lg hover:bg-[#1A1A3A] text-[#64748B] hover:text-[#F8FAFC] transition-colors"
                      title={t('rename')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      disabled={isDeleting}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-[#64748B] hover:text-[#EF4444] transition-colors disabled:opacity-50"
                      title={t('delete')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="w-full py-3 text-sm text-[#8B5CF6] hover:text-[#A78BFA] transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-md bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span className="text-sm text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Clear all confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#0A0A1F] border border-[#1A1A3A] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-2">{t('clearAll')}</h3>
            <p className="text-sm text-[#94A3B8] mb-6">{t('clearAllConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-[#1A1A3A] text-[#F8FAFC] hover:bg-[#252545] transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={clearAllSessions}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-xl bg-[#EF4444] text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? '...' : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#0A0A1F] border border-[#1A1A3A] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">{t('renameTitle')}</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('newTitlePlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-[#1A1A3A] border border-[#252545] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6] transition-colors mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRenameSession(null);
                  setNewTitle('');
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-[#1A1A3A] text-[#F8FAFC] hover:bg-[#252545] transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleRename}
                disabled={!newTitle.trim()}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatHistory;
