/**
 * Horoscope Generation Service
 * US-15: Daily Forecast - Horoscope text generation
 * 
 * Generates personalized horoscope texts based on transits and natal chart
 */

import type { TransitAspect } from './transits';

// ============================================
// Types
// ============================================

export interface HoroscopeContent {
  general: string;
  love: string;
  career: string;
  health: string;
  luckyNumbers: number[];
  powerHours: string[];
}

// ============================================
// Constants
// ============================================

// Sign-based lucky number ranges
const SIGN_LUCKY_NUMBERS: Record<string, number[]> = {
  Aries: [1, 9, 17, 28],
  Taurus: [2, 6, 15, 24],
  Gemini: [3, 12, 18, 33],
  Cancer: [2, 7, 16, 25],
  Leo: [1, 5, 19, 28],
  Virgo: [3, 14, 23, 32],
  Libra: [4, 6, 13, 22],
  Scorpio: [8, 11, 18, 27],
  Sagittarius: [3, 9, 21, 30],
  Capricorn: [4, 8, 17, 26],
  Aquarius: [5, 11, 22, 31],
  Pisces: [3, 7, 12, 21],
};

// Horoscope templates by influence type
const INFLUENCE_TEMPLATES = {
  positive: {
    general: [
      'Днес звездите са на твоя страна.',
      'Хармоничните аспекти ти носят позитивна енергия.',
      'Космическите сили те подкрепят днес.',
      'Времето е благоприятно за нови начинания.',
    ],
    love: [
      'Връзките процъфтяват под това влияние.',
      'Любовта е в центъра на вниманието ти днес.',
      'Романтичните енергии са силни.',
      'Партньорството е благословено от звездите.',
    ],
    career: [
      'Професионалните успехи са на достигане.',
      'Творческата енергия тече свободно.',
      'Време е за амбициозни ходове.',
      'Кариерните възможности се отварят.',
    ],
    health: [
      'Виталността ти е на високо ниво.',
      'Енергията ти е балансирана и устойчива.',
      'Тялото и умът са в хармония.',
      'Чувстваш се свеж и мотивиран.',
    ],
  },
  challenging: {
    general: [
      'Днес изисква търпение и мъдрост.',
      'Предизвикателствата са възможности за растеж.',
      'Звездите те съветват да бъдеш внимателен.',
      'Време за вътрешна работа и рефлексия.',
    ],
    love: [
      'Отношенията изискват допълнително внимание.',
      'Комуникацията е ключова днес.',
      'Избягвай прибързани решения в любовта.',
      'Днес не е време за емоционални конфликти.',
    ],
    career: [
      'Професионалните предизвикателства изискват фокус.',
      'Внимавай с важни решения.',
      'Практическостта е твоят съюзник.',
      'Потвърди фактите преди да действаш.',
    ],
    health: [
      'Обърни внимание на сигналите на тялото.',
      'Време за почивка и възстановяване.',
      'Избягвай прекомерното напрежение.',
      'Балансът е от ключово значение.',
    ],
  },
  neutral: {
    general: [
      'Денят носи смесени енергии.',
      'Времето е подходящо за рутинни задачи.',
      'Наблюдавай и учи от ситуацията.',
      'Нейтрален ден за планиране.',
    ],
    love: [
      'Отношенията са в стабилна фаза.',
      'Време за спокойни моменти с близките.',
      'Любовта не изисква спешни действия.',
      'Приеми нещата такива, каквито са.',
    ],
    career: [
      'Работата върви по инерция.',
      'Фокусирай се на текущите проекти.',
      'Ден за изпълнение на задачи.',
      'Не очаквай драматични промени.',
    ],
    health: [
      'Поддържай баланса в ежедневието.',
      'Редовните навици са важни.',
      'Средно ниво на енергия.',
      'Слушай тялото си.',
    ],
  },
};

// Moon phase influences
const MOON_PHASE_INFLUENCES: Record<string, { general: string; actions: string[] }> = {
  'New Moon': {
    general: 'Новолунието е време за нови начала и поставяне на намерения.',
    actions: ['Постави нови цели', 'Започни нов проект', 'Медитирай за яснота'],
  },
  'Waxing Crescent': {
    general: 'Младият месец подкрепя растежа и развитието на намеренията.',
    actions: ['Развивай идеите си', 'Планирай следващите стъпки', 'Бъди оптимист'],
  },
  'First Quarter': {
    general: 'Първата четвърт носи енергия за действие и преодоляване на препятствия.',
    actions: ['Действай решително', 'Преодолявай препятствия', 'Бъди настойчив'],
  },
  'Waxing Gibbous': {
    general: 'Растящата луна е време за доизпипване и подготовка.',
    actions: ['Довърши започнатото', 'Подготви се за кулминация', 'Рафинирай плановете'],
  },
  'Full Moon': {
    general: 'Пълнолунието е време на кулминация, емоционална интензивност и осъзнаване.',
    actions: ['Празнувай постиженията', 'Освободи старото', 'Бъди благодарен'],
  },
  'Waning Gibbous': {
    general: 'Намаляващата луна е време за споделяне и рефлексия.',
    actions: ['Сподели знанията си', 'Благодари на другите', 'Рефлектирай'],
  },
  'Last Quarter': {
    general: 'Последната четвърт е време за освобождаване и почистване.',
    actions: ['Освободи ненужното', 'Завърши цикли', 'Почисти живота си'],
  },
  'Waning Crescent': {
    general: 'Старият месец е време за почивка и подготовка за новия цикъл.',
    actions: ['Почивай', 'Медитирай', 'Подготви се за новото'],
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get random item from array
 */
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate lucky numbers based on sun sign
 */
function generateLuckyNumbers(sunSign: string): number[] {
  const baseNumbers = SIGN_LUCKY_NUMBERS[sunSign] || [1, 7, 11, 22];
  
  // Add some randomness while keeping base numbers
  const result: number[] = [];
  const usedNumbers = new Set<number>();
  
  // Take 2-3 from base numbers
  const baseCount = Math.floor(Math.random() * 2) + 2;
  for (let i = 0; i < baseCount && i < baseNumbers.length; i++) {
    const num = baseNumbers[i];
    if (!usedNumbers.has(num)) {
      result.push(num);
      usedNumbers.add(num);
    }
  }
  
  // Fill remaining with random numbers 1-36
  while (result.length < 4) {
    const num = Math.floor(Math.random() * 36) + 1;
    if (!usedNumbers.has(num)) {
      result.push(num);
      usedNumbers.add(num);
    }
  }
  
  return result.sort((a, b) => a - b);
}

/**
 * Generate power hours based on planetary positions
 */
function generatePowerHours(transits: any[]): string[] {
  // Simplified: generate 2 power hour windows based on sun position
  const sunTransit = transits.find(t => t.planet === 'sun');
  const moonTransit = transits.find(t => t.planet === 'moon');
  
  const hours: string[] = [];
  
  if (sunTransit) {
    // Morning power hours based on sun sign
    const morningBase = Math.floor(sunTransit.degree / 6);
    const morningHour = (8 + morningBase) % 12;
    hours.push(`${morningHour.toString().padStart(2, '0')}:00-${((morningHour + 2) % 12).toString().padStart(2, '0')}:00`);
  }
  
  if (moonTransit) {
    // Afternoon power hours based on moon sign
    const afternoonBase = Math.floor(moonTransit.degree / 6);
    const afternoonHour = (14 + afternoonBase) % 24;
    hours.push(`${afternoonHour.toString().padStart(2, '0')}:00-${((afternoonHour + 2) % 24).toString().padStart(2, '0')}:00`);
  }
  
  // Fallback if no hours generated
  if (hours.length === 0) {
    hours.push('10:00-12:00', '16:00-18:00');
  }
  
  return hours.slice(0, 2);
}

/**
 * Determine dominant influence from aspects
 */
function getDominantInfluence(aspects: TransitAspect[]): 'positive' | 'challenging' | 'neutral' {
  const counts = { positive: 0, challenging: 0, neutral: 0 };
  
  aspects.forEach(aspect => {
    counts[aspect.influence]++;
  });
  
  if (counts.positive > counts.challenging) return 'positive';
  if (counts.challenging > counts.positive) return 'challenging';
  return 'neutral';
}

// ============================================
// Main Service Functions
// ============================================

/**
 * Generate personalized daily horoscope
 */
export function generateDailyHoroscope(
  sunSign: string,
  moonSign: string,
  aspects: TransitAspect[],
  transits: any[],
  moonPhase: string,
  focus: 'general' | 'love' | 'career' | 'health' = 'general'
): HoroscopeContent {
  const dominantInfluence = getDominantInfluence(aspects);
  const templates = INFLUENCE_TEMPLATES[dominantInfluence];
  const moonInfluence = MOON_PHASE_INFLUENCES[moonPhase] || MOON_PHASE_INFLUENCES['Waxing Crescent'];
  
  // Build general horoscope
  let generalText = getRandomItem(templates.general);
  
  // Add moon phase influence
  generalText += ` ${moonInfluence.general}`;
  
  // Add specific transit influences
  const majorAspects = aspects.slice(0, 3);
  if (majorAspects.length > 0) {
    generalText += ' ';
    majorAspects.forEach(aspect => {
      generalText += `${aspect.transitPlanetBg} в ${ASPECT_BG[aspect.aspect] || aspect.aspect} с ${aspect.natalPlanetBg} влияе на ${aspect.description.toLowerCase()}. `;
    });
  }
  
  // Build focus-specific horoscopes
  const loveText = `${getRandomItem(templates.love)} С Луна в ${moonSign}, емоционалните нужди са на преден план.`;
  
  const careerText = `${getRandomItem(templates.career)} Слънцето в ${sunSign} подчертава твоите природни таланти.`;
  
  const healthText = `${getRandomItem(templates.health)} Внимавай за баланс между активност и почивка.`;
  
  return {
    general: generalText.trim(),
    love: loveText,
    career: careerText,
    health: healthText,
    luckyNumbers: generateLuckyNumbers(sunSign),
    powerHours: generatePowerHours(transits),
  };
}

/**
 * Generate recommended actions based on transits
 */
export function generateRecommendedActions(
  moonPhase: string,
  aspects: TransitAspect[],
  dominantInfluence: 'positive' | 'challenging' | 'neutral'
): string[] {
  const actions: string[] = [];
  
  // Add moon phase actions
  const moonInfluence = MOON_PHASE_INFLUENCES[moonPhase];
  if (moonInfluence) {
    actions.push(...moonInfluence.actions.slice(0, 2));
  }
  
  // Add influence-specific actions
  if (dominantInfluence === 'positive') {
    actions.push('Използвай позитивната енергия', 'Действай смело');
  } else if (dominantInfluence === 'challenging') {
    actions.push('Бъди търпелив', 'Избягвай прибързани решения');
  } else {
    actions.push('Планирай внимателно', 'Поддържай баланса');
  }
  
  // Add aspect-based actions
  const hasVenusAspect = aspects.some(a => a.transitPlanet === 'venus');
  const hasMarsAspect = aspects.some(a => a.transitPlanet === 'mars');
  const hasMercuryAspect = aspects.some(a => a.transitPlanet === 'mercury');
  
  if (hasVenusAspect) actions.push('Обърни внимание на отношенията');
  if (hasMarsAspect) actions.push('Насочни енергията си продуктивно');
  if (hasMercuryAspect) actions.push('Комуникирай ясно');
  
  // Return unique actions, max 5
  return [...new Set(actions)].slice(0, 5);
}

// Aspect translations for descriptions
const ASPECT_BG: Record<string, string> = {
  conjunction: 'съвпад',
  sextile: 'секстил',
  square: 'квадрат',
  trine: 'тригон',
  opposition: 'опозиция',
};
