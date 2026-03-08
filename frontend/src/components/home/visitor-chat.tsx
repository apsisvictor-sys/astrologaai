'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BirthDataWidget } from './birth-data-widget';
import { InputOval } from '@/components/ui/input-oval';

interface Message {
  role: 'oracle' | 'user';
  content: string;
  widget?: 'birth-data';
}

const PROMPT_COUNT_KEY = 'oracle_visitor_prompts';
const REGISTER_THRESHOLD = 3;

interface VisitorChatProps {
  onRegisterPrompt: () => void;
}

export function VisitorChat({ onRegisterPrompt }: VisitorChatProps) {
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
  const [promptCount, setPromptCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(sessionStorage.getItem(PROMPT_COUNT_KEY) || '0');
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBirthData = (data: { date: string; time: string; location: string; lat: number; lng: number }) => {
    setBirthDataCollected(true);
    sessionStorage.setItem('guest_birth_data', JSON.stringify(data));
    setMessages(prev => [
      ...prev,
      { role: 'user', content: `Born ${data.date}${data.time ? ' at ' + data.time : ''} in ${data.location}` },
      {
        role: 'oracle',
        content: "Beautiful. I can feel the architecture of your chart taking shape. What would you like to explore first — who you are at your core, what's happening in your life right now, or something else entirely?",
      },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !birthDataCollected) return;

    const newCount = promptCount + 1;
    setPromptCount(newCount);
    sessionStorage.setItem(PROMPT_COUNT_KEY, String(newCount));

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    if (newCount >= REGISTER_THRESHOLD) {
      onRegisterPrompt();
      return;
    }

    setIsLoading(true);
    // TODO: Connect to backend guest chat endpoint in Task 5
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: 'oracle',
          content: "Your chart reveals something fascinating here. To continue this conversation and save your insights, I invite you to create your free account — your chart and this session will be waiting for you.",
        },
      ]);
      setIsLoading(false);
    }, 1500);
  };

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
                    {/* Oracle ✦ mark */}
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
                </div>
              ) : (
                /* User bubble — glass with fuchsia border glow */
                <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm"
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

        {/* Oracle typing indicator */}
        {isLoading && (
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

      {/* Input — only shown once birth data is collected */}
      {birthDataCollected && (
        <div className="p-4 border-t border-white/5">
          <InputOval
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            onSend={sendMessage}
            isLoading={isLoading}
            placeholder="Ask the Oracle..."
          />
        </div>
      )}
    </div>
  );
}
