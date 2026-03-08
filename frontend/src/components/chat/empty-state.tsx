'use client';

const SUGGESTED_PROMPTS = [
  'What does my natal chart reveal about my life purpose?',
  'Which transits are most significant for me right now?',
  'Tell me about my relationship patterns from my chart.',
];

interface EmptyStateProps {
  onPrompt: (text: string) => void;
}

export function EmptyState({ onPrompt }: EmptyStateProps) {
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
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            className="px-4 py-3 rounded-xl text-sm text-text-muted text-left hover:text-white transition-all hover:border-primary/20"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
