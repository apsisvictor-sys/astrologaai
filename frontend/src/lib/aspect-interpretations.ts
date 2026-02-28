/**
 * Aspect Interpretations - US-14: Explore Chart Aspects
 * 
 * Comprehensive aspect interpretations in Bulgarian and English
 * Used for the aspect interpretation modal
 */

// Aspect type definitions
export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition' | 'quincunx';

// Nature of aspects
export type AspectNature = 'harmonious' | 'challenging' | 'neutral';

// Aspect metadata
export interface AspectInfo {
  name: string;
  nameBg: string;
  angle: number;
  orb: number;
  nature: AspectNature;
  symbol: string;
  description: string;
  descriptionBg: string;
  generalMeaning: string;
  generalMeaningBg: string;
}

// Planet pair interpretation
export interface PlanetPairInterpretation {
  planets: [string, string];
  interpretations: Partial<Record<AspectType, {
    en: string;
    bg: string;
    keywords: string[];
    keywordsBg: string[];
  }>>;
}

// Aspect metadata
export const ASPECT_INFO: Record<AspectType, AspectInfo> = {
  conjunction: {
    name: 'Conjunction',
    nameBg: 'Съвпад',
    angle: 0,
    orb: 8,
    nature: 'neutral',
    symbol: '☌',
    description: 'Planets in the same position, blending their energies intensely',
    descriptionBg: 'Планети на едно и също място, смесващи енергиите си интензивно',
    generalMeaning: 'A powerful merging of planetary energies. The planets work as one unit, amplifying each other\'s influence.',
    generalMeaningBg: 'Мощно сливане на планетарни енергии. Планетите работят като едно цяло, усилвайки влиянието си взаимно.',
  },
  sextile: {
    name: 'Sextile',
    nameBg: 'Секстил',
    angle: 60,
    orb: 6,
    nature: 'harmonious',
    symbol: '⚹',
    description: 'A harmonious aspect that brings opportunities and talents',
    descriptionBg: 'Хармоничен аспект, който носи възможности и таланти',
    generalMeaning: 'A creative and harmonious connection. These planets support each other and bring opportunities for growth.',
    generalMeaningBg: 'Творческа и хармонична връзка. Тези планети се подкрепят взаимно и носят възможности за растеж.',
  },
  square: {
    name: 'Square',
    nameBg: 'Квадрат',
    angle: 90,
    orb: 8,
    nature: 'challenging',
    symbol: '◻',
    description: 'A dynamic tension that demands action and creates growth through challenge',
    descriptionBg: 'Динамично напрежение, което изисква действие и създава растеж чрез предизвикателства',
    generalMeaning: 'A challenging but dynamic aspect. Tension between these planets creates motivation for change and growth.',
    generalMeaningBg: 'Предизвикателен, но динамичен аспект. Напрежението между тези планети създава мотивация за промяна и растеж.',
  },
  trine: {
    name: 'Trine',
    nameBg: 'Тригон',
    angle: 120,
    orb: 8,
    nature: 'harmonious',
    symbol: '△',
    description: 'A flowing, harmonious connection that brings ease and natural talents',
    descriptionBg: 'Плавна, хармонична връзка, която носи лекота и естествени таланти',
    generalMeaning: 'A natural flow of energy between these planets. Talents and abilities come easily.',
    generalMeaningBg: 'Естествен поток от енергия между тези планети. Талантите и способностите идват с лекота.',
  },
  opposition: {
    name: 'Opposition',
    nameBg: 'Опозиция',
    angle: 180,
    orb: 8,
    nature: 'challenging',
    symbol: '☍',
    description: 'A polarity that creates awareness through contrast and relationship',
    descriptionBg: 'Полярност, която създава осъзнатост чрез контраст и връзка',
    generalMeaning: 'Planets pull in opposite directions, creating awareness and requiring balance.',
    generalMeaningBg: 'Планетите се привличат в противоположни посоки, създавайки осъзнатост и изисквайки баланс.',
  },
  quincunx: {
    name: 'Quincunx',
    nameBg: 'Квинкункс',
    angle: 150,
    orb: 3,
    nature: 'neutral',
    symbol: ' inconj',
    description: 'An adjustment aspect requiring adaptation and integration',
    descriptionBg: 'Аспект на адаптация, изискващ нагаждане и интеграция',
    generalMeaning: 'An awkward connection requiring adjustment. These planets need to find new ways to work together.',
    generalMeaningBg: 'Неудобна връзка, изискваща нагаждане. Тези планети трябва да намерят нови начини да работят заедно.',
  },
};

// Planet names
export const PLANET_NAMES: Record<string, { en: string; bg: string }> = {
  sun: { en: 'Sun', bg: 'Слънце' },
  moon: { en: 'Moon', bg: 'Луна' },
  mercury: { en: 'Mercury', bg: 'Меркурий' },
  venus: { en: 'Venus', bg: 'Венера' },
  mars: { en: 'Mars', bg: 'Марс' },
  jupiter: { en: 'Jupiter', bg: 'Юпитер' },
  saturn: { en: 'Saturn', bg: 'Сатурн' },
  uranus: { en: 'Uranus', bg: 'Уран' },
  neptune: { en: 'Neptune', bg: 'Нептун' },
  pluto: { en: 'Pluto', bg: 'Плутон' },
  northNode: { en: 'North Node', bg: 'Северен възел' },
  southNode: { en: 'South Node', bg: 'Южен възел' },
  chiron: { en: 'Chiron', bg: 'Хирон' },
  rising: { en: 'Ascendant', bg: 'Асцендент' },
};

// Key planet pair interpretations (most important combinations)
export const PLANET_PAIR_INTERPRETATIONS: PlanetPairInterpretation[] = [
  // Sun aspects
  {
    planets: ['sun', 'moon'],
    interpretations: {
      conjunction: {
        en: 'A powerful blend of conscious and unconscious drives. You are a unified individual with great vitality and emotional depth.',
        bg: 'Мощно съчетание на съзнателни и несъзнателни подтици. Вие сте единна личност с голяма жизненост и емоционална дълбочина.',
        keywords: ['vitality', 'unity', 'self-expression'],
        keywordsBg: ['жизненост', 'единство', 'самоизразяване'],
      },
      trine: {
        en: 'Natural harmony between your inner self and outer expression. Emotional balance and creativity flow easily.',
        bg: 'Естествена хармония между вътрешното ви аз и външното изразяване. Емоционалният баланс и творчеството текат с лекота.',
        keywords: ['harmony', 'creativity', 'balance'],
        keywordsBg: ['хармония', 'творчество', 'баланс'],
      },
      square: {
        en: 'Tension between ego needs and emotional needs requires conscious integration. Inner conflicts drive personal growth.',
        bg: 'Напрежението между его нуждите и емоционалните нужди изисква съзнателна интеграция. Вътрешните конфликти управляват личностния растеж.',
        keywords: ['growth', 'integration', 'challenge'],
        keywordsBg: ['растеж', 'интеграция', 'предизвикателство'],
      },
      opposition: {
        en: 'You may feel pulled between your conscious desires and emotional needs. Finding balance is your key to wholeness.',
        bg: 'Може да се чувствате разкъсани между съзнателните си желания и емоционални нужди. Намирането на баланс е вашият ключ към цялост.',
        keywords: ['balance', 'awareness', 'relationships'],
        keywordsBg: ['баланс', 'осъзнатост', 'връзки'],
      },
    },
  },
  {
    planets: ['sun', 'venus'],
    interpretations: {
      conjunction: {
        en: 'A charming and creative personality. Love, beauty, and artistic expression are central to your identity.',
        bg: 'Очарователна и творческа личност. Любовта, красотата и художественото изразяване са централни за вашата идентичност.',
        keywords: ['charm', 'creativity', 'love'],
        keywordsBg: ['чар', 'творчество', 'любов'],
      },
      trine: {
        en: 'Natural artistic abilities and social grace. Love and relationships come easily and harmoniously.',
        bg: 'Естествени художествени способности и социална грация. Любовта и връзките идват лесно и хармонично.',
        keywords: ['art', 'beauty', 'relationships'],
        keywordsBg: ['изкуство', 'красота', 'връзки'],
      },
      square: {
        en: 'Challenges in relationships or self-worth may arise. Growth comes through learning to love yourself authentically.',
        bg: 'Могат да възникнат предизвикателства във връзките или самооценката. Растежът идва чрез научаване да обичате себе си автентично.',
        keywords: ['self-worth', 'relationships', 'values'],
        keywordsBg: ['самооценка', 'връзки', 'ценности'],
      },
    },
  },
  {
    planets: ['sun', 'mars'],
    interpretations: {
      conjunction: {
        en: 'Powerful drive and ambition. You have abundant energy and assertiveness to pursue your goals.',
        bg: 'Мощен драйв и амбиция. Имате изобилна енергия и решителност да преследвате целите си.',
        keywords: ['energy', 'drive', 'assertiveness'],
        keywordsBg: ['енергия', 'драйв', 'решителност'],
      },
      trine: {
        en: 'Natural ability to take action and assert yourself. Physical energy and confidence flow easily.',
        bg: 'Естествена способност да предприемате действия и да се утвърждавате. Физическата енергия и увереност текат лесно.',
        keywords: ['action', 'confidence', 'vitality'],
        keywordsBg: ['действие', 'увереност', 'жизненост'],
      },
      square: {
        en: 'Inner tension between desires and actions. Learning to channel your energy constructively is your path to success.',
        bg: 'Вътрешно напрежение между желания и действия. Научаването да канализирате енергията си конструктивно е вашият път към успеха.',
        keywords: ['willpower', 'competition', 'frustration'],
        keywordsBg: ['воля', 'състезание', 'фрустрация'],
      },
      opposition: {
        en: 'You may experience conflicts between your ego and your drive. Finding healthy outlets for your energy is essential.',
        bg: 'Може да изпитвате конфликти между егото си и драйва си. Намирането на здравни отдушници за енергията ви е от съществено значение.',
        keywords: ['conflict', 'energy', 'balance'],
        keywordsBg: ['конфликт', 'енергия', 'баланс'],
      },
    },
  },
  // Moon aspects
  {
    planets: ['moon', 'venus'],
    interpretations: {
      conjunction: {
        en: 'Deep capacity for love and nurturing. Your emotional nature is gentle, affectionate, and artistically inclined.',
        bg: 'Дълбок капацитет за любов и грижа. Емоционалната ви природа е нежна, привързана и с художествени наклонности.',
        keywords: ['nurturing', 'love', 'beauty'],
        keywordsBg: ['грижа', 'любов', 'красота'],
      },
      trine: {
        en: 'Natural emotional harmony and artistic sensitivity. Relationships and domestic life bring joy.',
        bg: 'Естествена емоционална хармония и художествена чувствителност. Връзките и домашният живот носят радост.',
        keywords: ['harmony', 'sensitivity', 'home'],
        keywordsBg: ['хармония', 'чувствителност', 'дом'],
      },
      square: {
        en: 'Tension between emotional needs and desires in love. Learning self-love is a key theme.',
        bg: 'Напрежение между емоционалните нужди и желанията в любовта. Научаването на самообич е ключова тема.',
        keywords: ['self-love', 'emotional growth', 'relationships'],
        keywordsBg: ['самообич', 'емоционален растеж', 'връзки'],
      },
    },
  },
  {
    planets: ['moon', 'mars'],
    interpretations: {
      conjunction: {
        en: 'Emotional intensity and assertiveness. Your feelings are passionate and you react quickly to situations.',
        bg: 'Емоционална интензивност и решителност. Чувствата ви са страстни и реагирате бързо на ситуации.',
        keywords: ['passion', 'reactivity', 'courage'],
        keywordsBg: ['страст', 'реактивност', 'смелост'],
      },
      trine: {
        en: 'Emotional courage and the ability to act on feelings. You handle emotional situations with confidence.',
        bg: 'Емоционална смелост и способност да действате според чувствата си. Справяте се с емоционални ситуации с увереност.',
        keywords: ['courage', 'action', 'emotional strength'],
        keywordsBg: ['смелост', 'действие', 'емоционална сила'],
      },
      square: {
        en: 'Emotional impatience or reactivity. Learning to manage your emotional responses is part of your growth.',
        bg: 'Емоционално нетърпение или реактивност. Научаването да управлявате емоционалните си реакции е част от растежа ви.',
        keywords: ['patience', 'emotional control', 'impulsiveness'],
        keywordsBg: ['търпение', 'емоционален контрол', 'импулсивност'],
      },
    },
  },
  // Venus aspects
  {
    planets: ['venus', 'mars'],
    interpretations: {
      conjunction: {
        en: 'Magnetic charm and passionate nature. You blend love and desire naturally, attracting others easily.',
        bg: 'Магнитен чар и страстна природа. Смесвате любовта и желанието естествено, привличайки другите лесно.',
        keywords: ['passion', 'attraction', 'creativity'],
        keywordsBg: ['страст', 'привличане', 'творчество'],
      },
      trine: {
        en: 'Natural harmony between love and desire. Your romantic and creative expression flows easily.',
        bg: 'Естествена хармония между любовта и желанието. Романтичното и творческото ви изразяване текат лесно.',
        keywords: ['romance', 'creativity', 'balance'],
        keywordsBg: ['романтика', 'творчество', 'баланс'],
      },
      square: {
        en: 'Tension between what you want and what you need in relationships. Growth comes through understanding your desires.',
        bg: 'Напрежение между това, което искате, и това, от което се нуждаете във връзките. Растежът идва чрез разбиране на желанията ви.',
        keywords: ['desire', 'tension', 'relationships'],
        keywordsBg: ['желание', 'напрежение', 'връзки'],
      },
      opposition: {
        en: 'You may experience conflicts between love and passion. Balancing these energies creates fulfillment.',
        bg: 'Може да изпитвате конфликти между любовта и страстта. Балансирането на тези енергии създава удовлетворение.',
        keywords: ['balance', 'love', 'desire'],
        keywordsBg: ['баланс', 'любов', 'желание'],
      },
    },
  },
  // Jupiter aspects
  {
    planets: ['sun', 'jupiter'],
    interpretations: {
      conjunction: {
        en: 'Expansive optimism and good fortune. You have a generous spirit and natural leadership abilities.',
        bg: 'Разширен оптимизъм и добър късмет. Имате щедър дух и естествени лидерски способности.',
        keywords: ['abundance', 'optimism', 'leadership'],
        keywordsBg: ['изобилие', 'оптимизъм', 'лидерство'],
      },
      trine: {
        en: 'Natural good luck and opportunities. Your positive attitude attracts success.',
        bg: 'Естествен късмет и възможности. Позитивното ви отношение привлича успех.',
        keywords: ['luck', 'opportunity', 'growth'],
        keywordsBg: ['късмет', 'възможност', 'растеж'],
      },
      square: {
        en: 'Tendency toward excess or overconfidence. Moderation and realistic goals help you succeed.',
        bg: 'Склонност към излишък или прекалена увереност. Умереността и реалистичните цели ви помагат да успеете.',
        keywords: ['moderation', 'growth', 'wisdom'],
        keywordsBg: ['умереност', 'растеж', 'мъдрост'],
      },
    },
  },
  // Saturn aspects
  {
    planets: ['sun', 'saturn'],
    interpretations: {
      conjunction: {
        en: 'Serious nature with strong sense of responsibility. Success comes through discipline and hard work.',
        bg: 'Сериозна природа със силно чувство за отговорност. Успехът идва чрез дисциплина и упорит труд.',
        keywords: ['discipline', 'responsibility', 'achievement'],
        keywordsBg: ['дисциплина', 'отговорност', 'постигане'],
      },
      trine: {
        en: 'Natural organizational abilities and practical wisdom. You build lasting structures in life.',
        bg: 'Естествени организационни способности и практическа мъдрост. Изграждате трайни структури в живота.',
        keywords: ['structure', 'wisdom', 'achievement'],
        keywordsBg: ['структура', 'мъдрост', 'постигане'],
      },
      square: {
        en: 'Challenges with authority or self-doubt. Overcoming limitations builds your character and strength.',
        bg: 'Предизвикателства с авторитета или съмнение в себе си. Преодоляването на ограничения изгражда характера и силата ви.',
        keywords: ['limitations', 'growth', 'perseverance'],
        keywordsBg: ['ограничения', 'растеж', 'настойчивост'],
      },
    },
  },
  // Mercury aspects
  {
    planets: ['mercury', 'venus'],
    interpretations: {
      conjunction: {
        en: 'Artistic mind with refined communication skills. You express yourself beautifully through words or art.',
        bg: 'Художествен ум с изтънчени комуникационни умения. Изразявате се красиво чрез думи или изкуство.',
        keywords: ['communication', 'art', 'beauty'],
        keywordsBg: ['комуникация', 'изкуство', 'красота'],
      },
      trine: {
        en: 'Natural charm in communication. Diplomatic skills and artistic talents flow easily.',
        bg: 'Естествен чар в комуникацията. Дипломатически умения и художествени таланти текат лесно.',
        keywords: ['diplomacy', 'art', 'communication'],
        keywordsBg: ['дипломация', 'изкуство', 'комуникация'],
      },
    },
  },
  {
    planets: ['mercury', 'mars'],
    interpretations: {
      conjunction: {
        en: 'Sharp mind with quick thinking and assertive communication. You speak your mind directly.',
        bg: 'Остър ум с бързо мислене и решителна комуникация. Говорите ума си директно.',
        keywords: ['sharp mind', 'debate', 'action'],
        keywordsBg: ['остър ум', 'дебат', 'действие'],
      },
      trine: {
        en: 'Mental energy and decisiveness. You can think quickly and act on your ideas.',
        bg: 'Ментална енергия и решителност. Можете да мислите бързо и да действате според идеите си.',
        keywords: ['decisiveness', 'mental energy', 'action'],
        keywordsBg: ['решителност', 'ментална енергия', 'действие'],
      },
      square: {
        en: 'Mental tension or impatience in communication. Learning to think before speaking helps you.',
        bg: 'Ментално напрежение или нетърпение в комуникацията. Научаването да мислите преди да говорите ви помага.',
        keywords: ['patience', 'communication', 'tension'],
        keywordsBg: ['търпение', 'комуникация', 'напрежение'],
      },
    },
  },
];

/**
 * Get interpretation for a specific planet pair and aspect
 */
export function getAspectInterpretation(
  planet1: string,
  planet2: string,
  aspectType: AspectType,
  language: 'en' | 'bg' = 'bg'
): { interpretation: string; keywords: string[] } | null {
  // Normalize planet names
  const p1 = planet1.toLowerCase();
  const p2 = planet2.toLowerCase();
  
  // Find matching interpretation (check both orders)
  const pairInterp = PLANET_PAIR_INTERPRETATIONS.find(
    (p) =>
      (p.planets[0] === p1 && p.planets[1] === p2) ||
      (p.planets[0] === p2 && p.planets[1] === p1)
  );
  
  if (!pairInterp) return null;
  
  const aspectInterp = pairInterp.interpretations[aspectType];
  if (!aspectInterp) return null;
  
  return {
    interpretation: language === 'bg' ? aspectInterp.bg : aspectInterp.en,
    keywords: language === 'bg' ? aspectInterp.keywordsBg : aspectInterp.keywords,
  };
}

/**
 * Get general aspect information
 */
export function getAspectInfo(
  aspectType: string,
  language: 'en' | 'bg' = 'bg'
): AspectInfo | null {
  const normalized = aspectType.toLowerCase() as AspectType;
  return ASPECT_INFO[normalized] || null;
}

/**
 * Get planet name in specified language
 */
export function getPlanetName(planet: string, language: 'en' | 'bg' = 'bg'): string {
  const names = PLANET_NAMES[planet.toLowerCase()];
  if (!names) return planet;
  return language === 'bg' ? names.bg : names.en;
}

/**
 * Get nature color for aspect
 */
export function getAspectNatureColor(nature: AspectNature): string {
  const colors = {
    harmonious: '#10B981', // green/teal
    challenging: '#EF4444', // red
    neutral: '#8B5CF6', // purple
  };
  return colors[nature];
}

/**
 * Get aspect color by type
 */
export function getAspectColor(aspectType: string): string {
  const colors: Record<string, string> = {
    conjunction: '#8B5CF6', // purple
    sextile: '#10B981', // green
    square: '#EF4444', // red
    trine: '#06B6D4', // cyan/teal
    opposition: '#EC4899', // pink
    quincunx: '#F59E0B', // amber
  };
  return colors[aspectType.toLowerCase()] || '#71717A';
}
