'use client';

import { useRouter } from '@/i18n/navigation';

interface GuestRegistrationPromptProps {
  variant: 'soft' | 'urgent' | 'block';
  onDismiss?: () => void;
}

const CONFIG = {
  soft: {
    text: "See your unique natal chart and continue your reading — create a free account",
    cta: "Create free account",
    border: 'rgba(228,26,255,0.25)',
    bg: 'rgba(228,26,255,0.06)',
  },
  urgent: {
    text: "Save these insights so they don't get lost — Register for free",
    cta: "Register for free",
    border: 'rgba(228,26,255,0.45)',
    bg: 'rgba(228,26,255,0.10)',
  },
  block: {
    text: "The Oracle can only continue its guidance within your account.",
    cta: "Continue in my account",
    border: 'rgba(228,26,255,0.35)',
    bg: 'rgba(228,26,255,0.08)',
  },
};

export function GuestRegistrationPrompt({ variant, onDismiss }: GuestRegistrationPromptProps) {
  const router = useRouter();
  const c = CONFIG[variant];

  return (
    <div
      className="relative rounded-2xl px-4 py-4"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-3 text-white/30 hover:text-white/60 transition-colors text-xl leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
      <div className="flex items-start gap-3 pr-5">
        <span className="text-primary text-sm shrink-0 mt-0.5">✦</span>
        <div>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">{c.text}</p>
          <button
            onClick={() => router.push('/register')}
            className="gradient-button text-white text-xs font-semibold py-2 px-5 rounded-full hover:opacity-90 transition-all"
          >
            {c.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
