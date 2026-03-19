export interface AstrologicalEvent {
  id: string;
  type: 'retrograde' | 'eclipse';
  planet?: string;
  glyph?: string;
  subtype?: 'solar' | 'lunar';
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  sign: string;
  message: { en: string; bg: string };
  oraclePrompt: string;
}

export const ASTROLOGICAL_EVENTS: AstrologicalEvent[] = [
  // 2026 Mercury Retrogrades (astronomically accurate)
  {
    id: 'mercury-rx-2026-jan',
    type: 'retrograde', planet: 'Mercury', glyph: '☿',
    startDate: '2026-01-20', endDate: '2026-02-11', sign: 'Aquarius',
    message: {
      en: '☿ Mercury Retrograde in Aquarius — review communications, technology, and plans until Feb 11.',
      bg: '☿ Меркурий ретроградно в Водолей — преразгледайте комуникациите, технологиите и плановете до 11 февруари.',
    },
    oraclePrompt: 'Mercury is retrograde in Aquarius. What should I be careful about and how can I use this retrograde energy wisely?',
  },
  {
    id: 'mercury-rx-2026-may',
    type: 'retrograde', planet: 'Mercury', glyph: '☿',
    startDate: '2026-05-10', endDate: '2026-06-03', sign: 'Gemini',
    message: {
      en: '☿ Mercury Retrograde in Gemini — slow down on contracts, travel plans, and key conversations until Jun 3.',
      bg: '☿ Меркурий ретроградно в Близнаци — забавете темпото с договори, пътувания и важни разговори до 3 юни.',
    },
    oraclePrompt: 'Mercury is retrograde in Gemini. What should I watch for and how can I work with this energy?',
  },
  {
    id: 'mercury-rx-2026-sep',
    type: 'retrograde', planet: 'Mercury', glyph: '☿',
    startDate: '2026-09-11', endDate: '2026-10-02', sign: 'Libra',
    message: {
      en: '☿ Mercury Retrograde in Libra — relationships and decisions need extra care until Oct 2.',
      bg: '☿ Меркурий ретроградно в Везни — отношенията и решенията изискват повече внимание до 2 октомври.',
    },
    oraclePrompt: 'Mercury is retrograde in Libra. How does this affect my relationships and what decisions should I postpone?',
  },
  // 2026 Eclipses
  {
    id: 'eclipse-solar-2026-feb',
    type: 'eclipse', subtype: 'solar',
    startDate: '2026-02-17', endDate: '2026-02-17', sign: 'Pisces',
    message: {
      en: '🌑 Solar Eclipse in Pisces — powerful new beginnings in themes of spirituality and surrender.',
      bg: '🌑 Слънчево затъмнение в Риби — мощни нови начала в темите на духовността и себепредаването.',
    },
    oraclePrompt: 'There is a Solar Eclipse in Pisces today. What new beginning is this eclipse activating in my chart?',
  },
  {
    id: 'eclipse-lunar-2026-mar',
    type: 'eclipse', subtype: 'lunar',
    startDate: '2026-03-03', endDate: '2026-03-03', sign: 'Virgo',
    message: {
      en: '🌕 Full Moon Lunar Eclipse in Virgo — release what no longer serves your daily life and health.',
      bg: '🌕 Пълнолунно лунно затъмнение в Дева — освободете се от това, което вече не служи на ежедневието и здравето ви.',
    },
    oraclePrompt: 'There is a Lunar Eclipse in Virgo today. What am I being called to release, and what does this eclipse mean for my chart?',
  },
  {
    id: 'eclipse-solar-2026-aug',
    type: 'eclipse', subtype: 'solar',
    startDate: '2026-08-12', endDate: '2026-08-12', sign: 'Leo',
    message: {
      en: '🌑 Solar Eclipse in Leo — bold new beginnings in creativity, self-expression, and leadership.',
      bg: '🌑 Слънчево затъмнение в Лъв — смели нови начала в творчеството, себеизразяването и лидерството.',
    },
    oraclePrompt: 'There is a Solar Eclipse in Leo today. What new chapter is opening for me, and how can I step into it fully?',
  },
  // 2027 Mercury Retrogrades
  {
    id: 'mercury-rx-2027-jan',
    type: 'retrograde', planet: 'Mercury', glyph: '☿',
    startDate: '2027-01-07', endDate: '2027-01-27', sign: 'Capricorn',
    message: {
      en: '☿ Mercury Retrograde in Capricorn — review career decisions and long-term plans until Jan 27.',
      bg: '☿ Меркурий ретроградно в Козирог — преразгледайте кариерните решения и дългосрочните планове до 27 януари.',
    },
    oraclePrompt: 'Mercury is retrograde in Capricorn. What career or long-term plans need revisiting right now?',
  },
];

export function getCurrentEvents(now: Date = new Date()): AstrologicalEvent[] {
  const today = now.toISOString().split('T')[0];
  return ASTROLOGICAL_EVENTS.filter(e => e.startDate <= today && e.endDate >= today);
}
