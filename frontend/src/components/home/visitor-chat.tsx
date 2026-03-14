'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BirthDataWidget } from './birth-data-widget';
import { InputOval } from '@/components/ui/input-oval';
import { GuestRegistrationPrompt } from '@/components/chat/guest-registration-prompt';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from '@/i18n/navigation';

// localStorage keys (plan spec)
const GUEST_BIRTH_KEY = 'astrologaai_guest_birth_data';
const GUEST_SESSION_KEY = 'astrologaai_guest_session';
const GUEST_MSGS_KEY  = 'astrologaai_guest_messages';
const ORACLE_COUNT_KEY = 'astrologaai_guest_oracle_count';
const USER_COUNT_KEY   = 'astrologaai_guest_user_count';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

interface Message {
  role: 'oracle' | 'user';
  content: string;
  widget?: 'birth-data';
  regPrompt?: 'soft' | 'urgent';
}

interface VisitorChatProps {
  onRegisterPrompt: () => void; // kept for compat — inline prompts handle this now
}

export function VisitorChat({ onRegisterPrompt: _ }: VisitorChatProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'oracle',
      content: "I am The Oracle — your personal astrologer. To read your chart and speak to your cosmic blueprint, I need to know when and where you arrived in this world.",
      widget: 'birth-data',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [birthDataCollected, setBirthDataCollected] = useState(false);
  const [sessionToken, setSessionToken] = useState<{ sessionId: string; token: string } | null>(null);
  const [streamingContent, setStreamingContent] = useState('');

  const [oracleCount, setOracleCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(ORACLE_COUNT_KEY) || '0');
  });
  const [userCount, setUserCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(USER_COUNT_KEY) || '0');
  });
  const [dismissedPrompts, setDismissedPrompts] = useState<Set<number>>(new Set());
  const [isBlocked, setIsBlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return parseInt(localStorage.getItem(USER_COUNT_KEY) || '0') >= 6;
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Skip birth data widget if already stored
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(GUEST_BIRTH_KEY)) setBirthDataCollected(true);
  }, []);

  // Trigger recognition sequence when logged-in user is detected
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    setRedirectCountdown(5);
  }, [isAuthenticated, authLoading]);

  // Countdown tick
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown === 0) {
      router.push('/chat');
      return;
    }
    const timer = setTimeout(() => setRedirectCountdown(c => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [redirectCountdown, router]);

  // Init guest session token
  useEffect(() => {
    if (typeof window === 'undefined' || isAuthenticated) return;
    // Try to reuse stored session
    const stored = localStorage.getItem(GUEST_SESSION_KEY);
    if (stored) {
      try {
        setSessionToken(JSON.parse(stored));
        return;
      } catch {}
    }
    // Fetch new session token
    fetch(`${API_URL}/api/v1/chat/guest/start`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const sess = { sessionId: d.data.sessionId, token: d.data.token };
          localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(sess));
          setSessionToken(sess);
        }
      })
      .catch(() => {}); // fail silently — chat still shows, send button just stays disabled
  }, [isAuthenticated]);

  const persistMessage = (msg: { role: 'oracle' | 'user'; content: string }) => {
    if (typeof window === 'undefined') return;
    const existing: Array<{ role: string; content: string; timestamp: string }> =
      JSON.parse(localStorage.getItem(GUEST_MSGS_KEY) || '[]');
    existing.push({ ...msg, timestamp: new Date().toISOString() });
    localStorage.setItem(GUEST_MSGS_KEY, JSON.stringify(existing));
  };

  const handleBirthData = (data: { date: string; time: string; location: string; lat: number; lng: number; timezone: string }) => {
    setBirthDataCollected(true);

    localStorage.setItem(GUEST_BIRTH_KEY, JSON.stringify({
      birthDate: data.date,
      birthTime: data.time || null,
      locationName: data.location,
      timezone: data.timezone || undefined,
      latitude: data.lat,
      longitude: data.lng,
    }));

    const userContent = `Born ${data.date}${data.time ? ' at ' + data.time : ''} in ${data.location}`;
    const oracleContent = "Beautiful. I can feel the architecture of your chart taking shape. What would you like to explore first — who you are at your core, what's happening in your life right now, or something else entirely?";

    persistMessage({ role: 'user', content: userContent });
    persistMessage({ role: 'oracle', content: oracleContent });

    // Birth data response counts as oracle reply #1
    localStorage.setItem(ORACLE_COUNT_KEY, '1');
    setOracleCount(1);

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userContent },
      { role: 'oracle', content: oracleContent },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !birthDataCollected || isBlocked || !sessionToken) return;
    const userContent = input.trim();
    setInput('');

    const newUserCount = userCount + 1;
    setUserCount(newUserCount);
    localStorage.setItem(USER_COUNT_KEY, String(newUserCount));
    persistMessage({ role: 'user', content: userContent });
    setMessages(prev => [...prev, { role: 'user', content: userContent }]);

    if (newUserCount >= 6) {
      setIsBlocked(true);
      return;
    }

    setIsLoading(true);
    setStreamingContent('');

    // Get birth data for chart context
    const storedBirthData = localStorage.getItem(GUEST_BIRTH_KEY);
    const birthData = storedBirthData ? JSON.parse(storedBirthData) : null;

    try {
      const response = await fetch(`${API_URL}/api/v1/chat/guest/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: sessionToken.token,
          sessionId: sessionToken.sessionId,
          content: userContent,
          birthData: birthData ? {
            birthDate: birthData.birthDate,
            birthTime: birthData.birthTime,
            latitude: birthData.latitude,
            longitude: birthData.longitude,
          } : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({}));
        if (err?.error?.code === 'GUEST_LIMIT_REACHED') {
          setIsBlocked(true);
          setIsLoading(false);
          return;
        }
        throw new Error('Stream failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) { currentEvent = line.slice(7).trim(); continue; }
          if (!line.startsWith('data: ')) continue;
          let evt: { content?: string; done?: boolean; message?: string };
          try {
            evt = JSON.parse(line.slice(6));
          } catch {
            continue; // skip malformed SSE lines
          }
          if (currentEvent === 'chunk' && evt.content) {
            accumulated += evt.content;
            setStreamingContent(accumulated);
          } else if (currentEvent === 'error') {
            throw new Error(evt.message || 'Stream error');
          }
        }
      }

      if (!accumulated) accumulated = "The stars are momentarily quiet. Please try again.";

      const newOracleCount = oracleCount + 1;
      setOracleCount(newOracleCount);
      localStorage.setItem(ORACLE_COUNT_KEY, String(newOracleCount));
      persistMessage({ role: 'oracle', content: accumulated });

      const regPrompt: 'soft' | 'urgent' | undefined =
        newOracleCount === 3 ? 'soft' :
        newOracleCount === 5 ? 'urgent' :
        undefined;

      setMessages(prev => [...prev, { role: 'oracle', content: accumulated, regPrompt }]);
      setStreamingContent('');
    } catch {
      setMessages(prev => [...prev, {
        role: 'oracle',
        content: "The stars are momentarily quiet. Please try again.",
      }]);
      setStreamingContent('');
    } finally {
      setIsLoading(false);
    }
  };

  // Show nothing while auth resolves — prevents flash of guest chat for logged-in users
  if (authLoading) return null;

  if (isAuthenticated && redirectCountdown !== null) {
    const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Seeker';
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6">
        {/* Oracle glyph */}
        <div className="relative mb-8">
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(228,26,255,0.20) 0%, transparent 70%)',
              filter: 'blur(32px)',
              transform: 'scale(2.5)',
            }}
          />
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(228,26,255,0.08)', border: '1px solid rgba(228,26,255,0.30)' }}
          >
            <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 12px rgba(228,26,255,0.8))' }}>✦</span>
          </div>
        </div>

        {/* Oracle message */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center text-base text-white/90 max-w-xs leading-relaxed mb-10"
        >
          <span className="text-primary font-medium">{firstName}</span>
          {' '}— I recognize you. Let me take you to{' '}
          <span className="text-primary font-semibold">The Inner Sanctum</span>.
        </motion.p>

        {/* Countdown number — animate each number change */}
        <AnimatePresence mode="wait">
          <motion.div
            key={redirectCountdown}
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.35 }}
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold text-primary"
            style={{
              border: '2px solid rgba(228,26,255,0.40)',
              background: 'rgba(228,26,255,0.06)',
              boxShadow: '0 0 28px rgba(228,26,255,0.18)',
            }}
          >
            {redirectCountdown}
          </motion.div>
        </AnimatePresence>

        <p className="text-xs text-text-muted mt-4 opacity-60">Taking you inside...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              {msg.role === 'oracle' ? (
                <div className="max-w-[88%] space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-primary">✦</span>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed pt-0.5">{msg.content}</p>
                  </div>
                  {msg.widget === 'birth-data' && !birthDataCollected && (
                    <div className="ml-9">
                      <BirthDataWidget onComplete={handleBirthData} />
                    </div>
                  )}
                  {msg.regPrompt && !dismissedPrompts.has(i) && (
                    <div className="ml-9">
                      <GuestRegistrationPrompt
                        variant={msg.regPrompt}
                        onDismiss={() => setDismissedPrompts(prev => new Set([...prev, i]))}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm"
                  style={{
                    background: 'rgba(228, 26, 255, 0.08)',
                    border: '1px solid rgba(228, 26, 255, 0.25)',
                  }}
                >
                  <p className="text-white text-sm">{msg.content}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Live streaming oracle bubble */}
        {isLoading && streamingContent && (
          <div className="flex justify-start">
            <div
              className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-w-[85%]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {streamingContent}
            </div>
          </div>
        )}

        {/* Oracle typing indicator */}
        {isLoading && !streamingContent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-[10px] text-primary">✦</span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area — only after birth data collected */}
      {birthDataCollected && (
        <div className="p-4 border-t border-white/5">
          {isBlocked ? (
            <GuestRegistrationPrompt variant="block" />
          ) : (
            <InputOval
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              onSend={sendMessage}
              isLoading={isLoading}
              disabled={!sessionToken}
              placeholder="Ask the Oracle..."
            />
          )}
        </div>
      )}
    </div>
  );
}
