// frontend/src/lib/question-bank.ts

export type QuestionTier = 'FREE' | 'PRO' | 'PREMIUM';
export type QuestionCategory =
  | 'self-reflection'
  | 'chart'
  | 'forecast'
  | 'partner'
  | 'year-ahead';

export interface Question {
  id: string;
  text: string;
  minTier: QuestionTier;
  category: QuestionCategory;
}

export const QUESTION_BANK: Question[] = [
  // ── Self-reflection (FREE) ──────────────────────────────────────────────────
  { id: 'sr-01', text: 'Why do I keep repeating the same patterns in relationships?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-02', text: 'Why is it so hard for me to ask for help?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-03', text: 'Am I living in alignment with who I truly am?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-04', text: 'What is holding me back from going after what I want?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-05', text: 'Why do I sometimes feel like I never fully belong anywhere?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-06', text: 'Why do I overthink everything — and how can I stop?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-07', text: 'What kind of partner am I, really?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-08', text: 'What does my chart say about how I handle conflict?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-09', text: 'Am I using my natural talents, or working against my own nature?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-10', text: 'What does astrology say about my relationship with money?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-11', text: 'What does my Sun sign reveal about my core identity?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-12', text: 'What does my Moon sign say about my emotional world?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-13', text: 'What does my rising sign tell me about how others first see me?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-14', text: 'What are my natural strengths according to my birth chart?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-15', text: "What is my chart's biggest challenge — and how do I work with it?", minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-16', text: 'What does my birth chart reveal about my life purpose?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-17', text: 'What does my Venus say about what I find beautiful and valuable?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-18', text: 'How does my Mars express itself — and where does my energy want to go?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-19', text: 'Which planet has the strongest influence in my chart right now?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-20', text: 'What does my chart say about how I make decisions — instinct or logic?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-21', text: 'What is my Chiron placement, and what does it say about my deepest wound?', minTier: 'FREE', category: 'self-reflection' },
  { id: 'sr-22', text: 'What does my North Node reveal about the direction my soul is heading?', minTier: 'FREE', category: 'self-reflection' },

  // ── Chart deep-dives (FREE) ─────────────────────────────────────────────────
  { id: 'cd-01', text: 'What is the single most important thing my birth chart wants me to know?', minTier: 'FREE', category: 'chart' },
  { id: 'cd-02', text: 'What does my chart say about my relationship with my parents and family?', minTier: 'FREE', category: 'chart' },
  { id: 'cd-03', text: 'Does my chart point to a calling or career path?', minTier: 'FREE', category: 'chart' },
  { id: 'cd-04', text: 'What does my chart reveal about how I experience joy?', minTier: 'FREE', category: 'chart' },
  { id: 'cd-05', text: 'What does my 12th house hold, and what does it mean for my inner life?', minTier: 'FREE', category: 'chart' },
  { id: 'cd-06', text: 'What is the strongest aspect in my chart and how does it shape me?', minTier: 'FREE', category: 'chart' },
  { id: 'cd-07', text: 'What do the planets in my 1st house say about my personality and presence?', minTier: 'FREE', category: 'chart' },
  { id: 'cd-08', text: 'What does my IC and 4th house say about my roots and sense of home?', minTier: 'FREE', category: 'chart' },

  // ── Forecast & Transits (PRO+) ──────────────────────────────────────────────
  { id: 'fc-01', text: 'What energies are surrounding me this month?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-02', text: 'Is this a good time to start something new?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-03', text: 'Everything feels heavy lately — what is going on in my chart?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-04', text: 'Should I hold off on a big decision right now, or go for it?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-05', text: 'What opportunities are opening up for me in the coming weeks?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-06', text: 'What are the major transits affecting me right now?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-07', text: 'How is Mercury retrograde impacting me personally?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-08', text: 'What is Jupiter currently expanding in my life?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-09', text: 'What is Saturn currently testing or building in my chart?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-10', text: 'How are the current eclipses activating my chart?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-11', text: 'What themes will dominate the next three months for me?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-12', text: "What does this season's energy mean for my career or public life?", minTier: 'PRO', category: 'forecast' },
  { id: 'fc-13', text: 'Is this a good time to travel, expand, or take a risk?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-14', text: 'What long-term planetary shifts are changing my life over the next year?', minTier: 'PRO', category: 'forecast' },
  { id: 'fc-15', text: 'Which area of life is getting the most cosmic attention right now?', minTier: 'PRO', category: 'forecast' },

  // ── Year ahead / Solar Return (PRO+) ────────────────────────────────────────
  { id: 'ya-01', text: 'What does my year ahead look like from now until my next birthday?', minTier: 'PRO', category: 'year-ahead' },
  { id: 'ya-02', text: 'Is this year more about building, releasing, or transforming?', minTier: 'PRO', category: 'year-ahead' },
  { id: 'ya-03', text: 'When is the best window this year for making a major change?', minTier: 'PRO', category: 'year-ahead' },
  { id: 'ya-04', text: 'What is my Solar Return chart telling me about this coming year?', minTier: 'PRO', category: 'year-ahead' },
  { id: 'ya-05', text: 'Which areas of life will be most active and alive for me in the months ahead?', minTier: 'PRO', category: 'year-ahead' },

  // ── Partner & Relationships (PREMIUM) ───────────────────────────────────────
  { id: 'pt-01', text: 'Why do I keep attracting the same type of person?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-02', text: 'What kind of person am I most compatible with?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-03', text: 'Is the tension between me and someone in my life written in the stars?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-04', text: 'Why do I feel such a strong pull toward someone I probably should not?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-05', text: 'What does astrology say about the timing of meeting the right person?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-06', text: 'Is this relationship meant to teach me something, or is it built to last?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-07', text: 'What does the synastry with my partner reveal about our dynamic?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-08', text: 'Where do we naturally support each other — and where do we clash?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-09', text: 'What is the karmic connection between me and someone I love?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-10', text: 'What does our composite chart show about the relationship as its own entity?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-11', text: 'How does my Venus interact with their Mars — and vice versa?', minTier: 'PREMIUM', category: 'partner' },
  { id: 'pt-12', text: 'What does my 7th house say about the partners I attract?', minTier: 'PREMIUM', category: 'partner' },
];

const TIER_ORDER: Record<QuestionTier, number> = { FREE: 0, PRO: 1, PREMIUM: 2 };

function isEligible(q: Question, tier: QuestionTier): boolean {
  return TIER_ORDER[q.minTier] <= TIER_ORDER[tier];
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export interface SelectedQuestion {
  question: Question;
  locked: boolean;
}

/**
 * Select 3 questions for the empty state.
 * FREE/PRO: 2 eligible + 1 locked from the next tier up.
 * PREMIUM: 3 eligible, no locks.
 */
export function selectQuestions(tier: QuestionTier): SelectedQuestion[] {
  const eligible = QUESTION_BANK.filter(q => isEligible(q, tier));

  if (tier === 'PREMIUM') {
    return pickRandom(eligible, 3).map(q => ({ question: q, locked: false }));
  }

  const nextTier: QuestionTier = tier === 'FREE' ? 'PRO' : 'PREMIUM';
  const locked = QUESTION_BANK.filter(q => q.minTier === nextTier);
  const pick2 = pickRandom(eligible, 2);
  const pick1locked = pickRandom(locked, 1);

  return [
    ...pick2.map(q => ({ question: q, locked: false })),
    ...pick1locked.map(q => ({ question: q, locked: true })),
  ].sort(() => Math.random() - 0.5); // shuffle so lock isn't always last
}
