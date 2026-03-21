'use client';

import { selectQuestions } from '@/lib/question-bank';
import { useAuth } from '@/lib/auth-context';

interface EmptyStateProps {
  onPrompt: (text: string) => void;
}

export function EmptyState({ onPrompt }: EmptyStateProps) {
  const { user } = useAuth();
  const tier = user?.tier ?? 'FREE';
  const selected = selectQuestions(tier);

  const upgradeLabel = tier === 'FREE' ? 'Upgrade to Pro' : 'Upgrade to Premium';

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* Oracle glyph */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(228,26,255,0.18) 0%, transparent 70%)', filter: 'blur(24px)', transform: 'scale(2)' }}
        />
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(228,26,255,0.08)', border: '1px solid rgba(228,26,255,0.25)' }}
        >
          <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 10px rgba(228,26,255,0.7))' }}>✦</span>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-1.5">Ask The Oracle</h2>
      <p className="text-sm text-text-muted mb-8 max-w-[260px] leading-relaxed">
        Your personal astrologer holds your complete chart in mind — always.
      </p>

      <div className="flex flex-col gap-2 w-full max-w-sm">
        {selected.map(({ question, locked }) =>
          locked ? (
            <div key={question.id} className="relative group">
              <button
                disabled
                aria-disabled="true"
                aria-label={`${question.text}. ${upgradeLabel} to unlock`}
                className="w-full px-4 py-3 rounded-xl text-sm text-left opacity-40 cursor-not-allowed flex items-center gap-2"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#94a3b8',
                }}
              >
                <span className="shrink-0 text-[11px]">🔒</span>
                <span>{question.text}</span>
              </button>
              {/* Upgrade tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                style={{ background: 'rgba(18,6,20,0.95)', border: '1px solid rgba(228,26,255,0.25)' }}>
                {upgradeLabel} to unlock
              </div>
            </div>
          ) : (
            <button
              key={question.id}
              onClick={() => onPrompt(question.text)}
              className="px-4 py-3 rounded-xl text-sm text-text-muted text-left hover:text-white transition-all hover:border-primary/20"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {question.text}
            </button>
          )
        )}
      </div>
    </div>
  );
}
