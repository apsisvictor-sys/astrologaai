'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/runtime-config';

interface SharedMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface SharedSession {
  id: string;
  title: string;
  createdAt: string;
  messages: SharedMessage[];
}

export default function SharedSessionPage() {
  const { token } = useParams();
  const [session, setSession] = useState<SharedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const API = getApiBaseUrl();
    fetch(`${API}/api/v1/chat/share/${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) throw new Error(data.error?.message || 'Not found');
        setSession(data.data.session);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(228,26,255,0.2)', borderTopColor: '#e41aff' }} />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0A0A0F' }}>
        <div className="max-w-md w-full p-8 rounded-2xl text-center" style={{ background: '#0A0A1F', border: '1px solid #252532' }}>
          <div className="text-4xl mb-4">✦</div>
          <h2 className="text-xl font-semibold mb-2 text-white">Link not found</h2>
          <p className="text-sm mb-6" style={{ color: '#CBD5E1' }}>
            {error || 'This conversation link has expired or been removed.'}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)' }}
          >
            Go to AstroLogAI
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#0A0A0F' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(228,26,255,0.08)', border: '1px solid rgba(228,26,255,0.2)', color: '#e41aff' }}>
            <span>✦</span> Oracle Conversation
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{session.title}</h1>
          <p className="text-xs" style={{ color: '#64748B' }}>
            Shared via <a href="/" style={{ color: '#a78bfa' }}>AstroLogAI</a>
          </p>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {session.messages.map((msg) => {
            const isUser = msg.role === 'USER' || msg.role === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="max-w-[85%]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(228,26,255,0.12)', border: '1px solid rgba(228,26,255,0.28)' }}>
                        <span className="text-[9px]" style={{ color: '#e41aff' }}>✦</span>
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>The Oracle</span>
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#CBD5E1' }}>
                      {msg.content}
                    </div>
                  </div>
                )}
                {isUser && (
                  <div className="max-w-[78%] px-4 py-3 rounded-2xl rounded-br-sm text-sm text-white leading-relaxed" style={{ background: 'linear-gradient(135deg, #ff0080, #e41aff)' }}>
                    {msg.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA footer */}
        <div className="mt-10 text-center p-6 rounded-2xl" style={{ background: 'rgba(228,26,255,0.04)', border: '1px solid rgba(228,26,255,0.12)' }}>
          <p className="text-sm font-medium text-white mb-1">Start your own Oracle session</p>
          <p className="text-xs mb-4" style={{ color: '#64748B' }}>Your personal AI astrologer, powered by your birth chart.</p>
          <a
            href="/register"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)' }}
          >
            Sign Up Free
          </a>
        </div>
      </div>
    </div>
  );
}
