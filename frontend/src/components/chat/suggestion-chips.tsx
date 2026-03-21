'use client';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pt-1 pb-2">
      {suggestions.map((text, i) => (
        <button
          key={i}
          onClick={() => onSelect(text)}
          className="px-3 py-1.5 rounded-xl text-xs text-left transition-all"
          style={{
            background: 'rgba(228,26,255,0.06)',
            border: '1px solid rgba(228,26,255,0.18)',
            color: 'rgba(255,255,255,0.6)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(228,26,255,0.12)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(228,26,255,0.06)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
