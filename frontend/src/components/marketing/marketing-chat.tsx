'use client';

import React, { useState } from 'react';
import { Send, Sparkles, User, Lock } from 'lucide-react';
import Link from 'next/link';

export function MarketingChat() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Оракулът е пробуден. Задайте своя въпрос, за да разкрия какво са отредили звездите за вас.' }
    ]);
    const [input, setInput] = useState('');
    const [attemptCount, setAttemptCount] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || attemptCount >= 2) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setAttemptCount(prev => prev + 1);

        // Simulate Oracle response
        setTimeout(() => {
            let oracleResponse = '';
            if (attemptCount === 0) {
                oracleResponse = 'Интересно запитване. Звездите показват дълбока трансформация. За да направя пълно изчисление на вашите транзити, ми трябват координатите на вашето раждане.';
            } else if (attemptCount === 1) {
                oracleResponse = 'Връзката със звездната карта е установена, но се нуждая от вашата регистрация, за да запазя данните и да отключа пълната натална карта.';
            }

            setMessages(prev => [...prev, { role: 'assistant', content: oracleResponse }]);
        }, 1500);
    };

    return (
        <div className="relative w-full max-w-2xl mx-auto z-10 p-[1px] rounded-2xl bg-gradient-to-b from-primary-glow to-transparent shadow-glow-lg animate-fade-in-up mt-12">
            <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-[500px]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-glass bg-background-深/50">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-background-deep border border-primary-glow shadow-glow overflow-hidden">
                            <Sparkles className="w-5 h-5 text-primary-light animate-pulse-glow" />
                        </div>
                        <div>
                            <h3 className="font-display text-lg font-bold text-white tracking-wide">The Oracle</h3>
                            <p className="text-xs text-primary-light font-mono opacity-80">99.9% Ephemeris Accuracy</p>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-primary-dark/40 border border-primary/30 text-white rounded-tr-sm'
                                    : 'bg-surface/60 border border-border-glass text-text-secondary rounded-tl-sm'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {attemptCount >= 2 && (
                        <div className="flex justify-start">
                            <div className="max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed bg-gradient-to-r from-primary-dark/80 to-secondary/40 border border-primary flex flex-col items-center text-center gap-4 rounded-tl-sm shadow-glow animate-fade-in-up">
                                <Lock className="w-6 h-6 text-white animate-pulse-glow" />
                                <p className="text-white font-medium">
                                    Оракулът картографира вашия космически план. Създайте безплатен профил, за да разкриете вашата ефирна натална карта и да запазите съдбата си.
                                </p>
                                <Link href="/register" className="w-full bg-white text-primary-dark font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors shadow-lg">
                                    Отключи Наталната Карта
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-background-deep/80 border-t border-border-glass backdrop-blur-md">
                    <form onSubmit={handleSubmit} className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={attemptCount >= 2}
                            placeholder={attemptCount >= 2 ? "Регистрирайте се за да продължите комуникацията..." : "Попитайте звездите..."}
                            className="w-full bg-surface/50 border border-border-glass rounded-full py-4 pl-6 pr-14 text-white placeholder-text-muted focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition-all disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || attemptCount >= 2}
                            className="absolute right-2 p-2 rounded-full bg-primary hover:bg-primary-light text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
