/**
 * Forecast Service
 * US-15: Daily Forecast
 * 
 * Generates personalized daily forecasts based on user's natal chart
 * and current planetary transits
 */

import { redisClient } from '../utils/redis';
import { calculateNatalChart, NatalChart, BirthDataInput } from './astrology';
import { chatCompletion, type ChatMessage } from './llm-legacy';

// ============================================
// Types
// ============================================

export interface Transit {
  planet: string;
  planetBg: string;
  sign: string;
  signBg: string;
  degree: number;
  aspectToNatal?: {
    natalPlanet: string;
    aspect: string;
    aspectBg: string;
    orb: number;
    influence: 'positive' | 'challenging' | 'neutral';
    description: string;
  };
}

export interface DailyForecast {
  date: string;
  userId: string;
  overallTheme: string;
  overallThemeBg: string;
  mood: string;
  moodBg: string;
  energy: 'high' | 'medium' | 'low';
  transits: Transit[];
  moonPhase: {
    phase: string;
    phaseBg: string;
    illumination: number;
    sign: string;
    signBg: string;
  };
  horoscope: {
    general: string;
    generalBg: string;
    love: string;
    loveBg: string;
    career: string;
    careerBg: string;
    health: string;
    healthBg: string;
    luckyNumbers: number[];
    powerHours: string[];
  };
  recommendations: string[];
  recommendationsBg: string[];
  generatedAt: string;
  cached: boolean;
}

export interface WeeklyForecast {
  weekStart: string;
  weekEnd: string;
  overview: string;
  overviewBg: string;
  dailyBreakdown: {
    date: string;
    dayName: string;
    dayNameBg: string;
    theme: string;
    themeBg: string;
    highlight: string;
    highlightBg: string;
  }[];
  majorTransits: {
    date: string;
    event: string;
    eventBg: string;
    significance: string;
    significanceBg: string;
  }[];
  bestDays: {
    career: string;
    love: string;
    decisions: string;
    selfCare: string;
  };
  generatedAt: string;
}

// ============================================
// Constants
// ============================================

const FORECAST_CACHE_TTL = 43200; // 12 hours in seconds (daily forecasts change twice a day)
const WEEKLY_CACHE_TTL = 604800; // 7 days in seconds

// Planet translations
const PLANET_TRANSLATIONS: Record<string, string> = {
  sun: 'Слънце',
  moon: 'Луна',
  mercury: 'Меркурий',
  venus: 'Венера',
  mars: 'Марс',
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
  northNode: 'Северен Възел',
  southNode: 'Южен Възел',
};

// Moon phase translations
const MOON_PHASE_TRANSLATIONS: Record<string, string> = {
  'New Moon': 'Новолуние',
  'Waxing Crescent': 'Нарастващ полумесец',
  'First Quarter': 'Първа четвърт',
  'Waxing Gibbous': 'Нарастващ триъгълник',
  'Full Moon': 'Пълнолуние',
  'Waning Gibbous': 'Намаляващ триъгълник',
  'Last Quarter': 'Последна четвърт',
  'Waning Crescent': 'Намаляващ полумесец',
};

// Sign translations (full)
const SIGN_TRANSLATIONS_FULL: Record<string, string> = {
  Aries: 'Овен',
  Taurus: 'Телец',
  Gemini: 'Близнаци',
  Cancer: 'Рак',
  Leo: 'Лъв',
  Virgo: 'Дева',
  Libra: 'Везни',
  Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец',
  Capricorn: 'Козирог',
  Aquarius: 'Водолей',
  Pisces: 'Риби',
};

// ============================================
// Helper Functions
// ============================================

function getTodayDateString(): string {
  const now = new Date();
  const Sofia = 'Europe/Sofia';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: Sofia,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

function getWeekStartDateString(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(now.setDate(diff));
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sofia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(monday);
}

function calculateMoonPhase(date: Date): { phase: string; phaseBg: string; illumination: number; sign: string; signBg: string } {
  // Simplified moon phase calculation
  // Real implementation would use astronomical calculations
  const synodic = 29.53058867;
  const knownNewMoon = new Date('2026-01-13T00:00:00Z'); // Known new moon
  const daysSinceNew = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const lunarAge = daysSinceNew % synodic;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * lunarAge / synodic)) / 2 * 100);
  
  let phase: string;
  let phaseBg: string;
  
  if (lunarAge < 1.85) { phase = 'New Moon'; phaseBg = 'Новолуние'; }
  else if (lunarAge < 7.38) { phase = 'Waxing Crescent'; phaseBg = 'Нарастващ полумесец'; }
  else if (lunarAge < 9.23) { phase = 'First Quarter'; phaseBg = 'Първа четвърт'; }
  else if (lunarAge < 14.77) { phase = 'Waxing Gibbous'; phaseBg = 'Нарастващ триъгълник'; }
  else if (lunarAge < 16.61) { phase = 'Full Moon'; phaseBg = 'Пълнолуние'; }
  else if (lunarAge < 22.15) { phase = 'Waning Gibbous'; phaseBg = 'Намаляващ триъгълник'; }
  else if (lunarAge < 24.00) { phase = 'Last Quarter'; phaseBg = 'Последна четвърт'; }
  else { phase = 'Waning Crescent'; phaseBg = 'Намаляващ полумесец'; }
  
  // Simplified moon sign calculation (rotates through signs every ~2.5 days)
  const moonSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(lunarAge / 2.46) % 12;
  const sign = moonSigns[signIndex];
  
  return {
    phase,
    phaseBg,
    illumination,
    sign,
    signBg: SIGN_TRANSLATIONS_FULL[sign] || sign,
  };
}

function translateToBulgarian(text: string): string {
  // Simplified translation - in production this would use proper translation
  // For now, we'll use the LLM to generate Bulgarian content
  return text; // Placeholder - actual translation happens in LLM generation
}

// ============================================
// Main Service Functions
// ============================================

/**
 * Get current planetary transits
 * Uses astrology-api.io or fallback calculation
 */
async function getCurrentTransits(): Promise<Transit[]> {
  const transits: Transit[] = [];
  const today = new Date();
  
  // Simplified transit calculation
  // In production, this would call astrology-api.io transit endpoint
  const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const signs = ['Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius'];
  
  // Get approximate planet positions based on date
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  
  planets.forEach((planet, index) => {
    // Simplified calculation - real implementation would use ephemeris data
    const speed = index < 2 ? 1 : 0.5 + Math.random() * 0.5; // Approximate daily motion
    const basePosition = (index * 30 + dayOfYear * speed) % 360;
    const signIndex = Math.floor(basePosition / 30);
    const degree = basePosition % 30;
    
    transits.push({
      planet,
      planetBg: PLANET_TRANSLATIONS[planet] || planet,
      sign: signs[signIndex],
      signBg: SIGN_TRANSLATIONS_FULL[signs[signIndex]] || signs[signIndex],
      degree: Math.round(degree * 10) / 10,
    });
  });
  
  return transits;
}

/**
 * Analyze how current transits affect the natal chart
 */
function analyzeTransitImpact(transits: Transit[], natalChart: NatalChart): Transit[] {
  return transits.map(transit => {
    // Find if this transit makes any significant aspects to natal planets
    const natalPlanetRecord = natalChart[transit.planet as keyof NatalChart];
    if (!natalPlanetRecord || typeof natalPlanetRecord !== 'object') return transit;
    
    const planetPosition = natalPlanetRecord as { degree: number };
    const natalDegree = planetPosition.degree;
    const transitDegree = transit.degree;
    
    // Calculate aspect
    const aspectAngle = Math.abs(natalDegree - transitDegree);
    const normalizedAngle = Math.min(aspectAngle, 360 - aspectAngle);
    
    let aspect = '';
    let aspectBg = '';
    let influence: 'positive' | 'challenging' | 'neutral' = 'neutral';
    let description = '';
    
    // Check for major aspects
    if (normalizedAngle < 8) {
      aspect = 'conjunction';
      aspectBg = 'съвпад';
      influence = 'neutral';
      description = 'Нова енергия и фокус в тази област';
    } else if (normalizedAngle < 8 + 8) {
      aspect = 'sextile';
      aspectBg = 'секстил';
      influence = 'positive';
      description = 'Възможности за растеж и хармония';
    } else if (normalizedAngle < 90 + 8) {
      aspect = 'square';
      aspectBg = 'квадрат';
      influence = 'challenging';
      description = 'Напрежение и предизвикателства';
    } else if (normalizedAngle < 120 + 8) {
      aspect = 'trine';
      aspectBg = 'тригон';
      influence = 'positive';
      description = 'Хармония и подкрепа';
    } else if (normalizedAngle < 180 + 8) {
      aspect = 'opposition';
      aspectBg = 'опозиция';
      influence = 'challenging';
      description = 'Баланс между вътрешни и външни влияния';
    }
    
    if (aspect) {
      transit.aspectToNatal = {
        natalPlanet: transit.planet === 'sun' ? 'Вашето Слънце' : 
                      transit.planet === 'moon' ? 'Вашата Луна' : 
                      `Вашият ${PLANET_TRANSLATIONS[transit.planet] || transit.planet}`,
        aspect,
        aspectBg,
        orb: Math.round(normalizedAngle * 10) / 10,
        influence,
        description,
      };
    }
    
    return transit;
  });
}

/**
 * Generate daily forecast using LLM
 */
async function generateLLMForecast(
  natalChart: NatalChart,
  transits: Transit[],
  moonPhase: ReturnType<typeof calculateMoonPhase>,
  userLanguage: string = 'bg'
): Promise<{
  overallTheme: string;
  overallThemeBg: string;
  horoscope: {
    general: string;
    generalBg: string;
    love: string;
    loveBg: string;
    career: string;
    careerBg: string;
    health: string;
    healthBg: string;
  };
  recommendations: string[];
  recommendationsBg: string[];
}> {
  // Format chart info for prompt
  const chartInfo = `
Потребителска натална карта:
- Слънце: ${natalChart.sun.signBg} (${natalChart.sun.sign}) в ${natalChart.sun.house}ти дом
- Луна: ${natalChart.moon.signBg} (${natalChart.moon.sign}) в ${natalChart.moon.house}ти дом
- Асцендент: ${natalChart.rising.signBg} (${natalChart.rising.sign})

Днешни транзити:
${transits.map(t => `- ${t.planetBg}: ${t.signBg} ${t.degree}°${t.aspectToNatal ? ` - ${t.aspectToNatal.aspectBg} ${t.aspectToNatal.natalPlanet} (${t.aspectToNatal.description})` : ''}`).join('\n')}

Лунна фаза: ${moonPhase.phaseBg} (${moonPhase.illumination}% осветеност)
Лунен знак: ${moonPhase.signBg}
`;

  const systemPrompt = userLanguage === 'bg'
    ? `Ти си AstroLogAI, експертен AI астролог. Базирай се на потребителската натална карта и текущите транзити, за да генерираш персонализирана дневна прогноза.

ВНИМАНИЕ: Винаги отговаряй на БЪЛГАРСКИ ЕЗИК с правилна българска астрологическа терминология.

Използвай следните български термини:
- Слънце, Луна, Меркурий, Венера, Марс, Юпитер, Сатурн, Уран, Нептун, Плутон
- Овен, Телец, Близнаци, Рак, Лъв, Дева, Везни, Скорпион, Стрелец, Козирог, Водолей, Риби
- Съвпад, Секстил, Квадрат, Тригон, Опозиция
- 1-ви до 12-ти дом

Генерирай прогнозата в следния JSON формат (само JSON, без допълнителен текст):
{
  "overallTheme": "Кратко заглавие на деня в 2-3 думи",
  "horoscope": {
    "general": "Общ преглед на деня - 2-3 изречения",
    "love": "Любов и отношения - 2 изречения",
    "career": "Кариера и работа - 2 изречения", 
    "health": "Здраве и енергия - 2 изречения"
  },
  "recommendations": ["Препоръка 1", "Препоръка 2", "Препоръка 3"]
}`
    : `You are AstroLogAI, an expert AI astrologer. Based on the user's natal chart and current transits, generate a personalized daily forecast.

Generate the forecast in the following JSON format (JSON only, no additional text):
{
  "overallTheme": "Brief theme of the day in 2-3 words",
  "horoscope": {
    "general": "General overview of the day - 2-3 sentences",
    "love": "Love and relationships - 2 sentences",
    "career": "Career and work - 2 sentences",
    "health": "Health and energy - 2 sentences"
  },
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}`;

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: chartInfo },
    ];
    
    const response = await chatCompletion(messages, { temperature: 0.7, maxTokens: 1000 });
    
    // Parse the JSON response - extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      overallTheme: parsed.overallTheme || 'Ден на предизвикателствата',
      overallThemeBg: parsed.overallTheme || 'Ден на предизвикателствата',
      horoscope: {
        general: parsed.horoscope?.general || 'Денят носи интересни енергии.',
        generalBg: parsed.horoscope?.general || 'Денят носи интересни енергии.',
        love: parsed.horoscope?.love || 'Отношенията изискват внимание.',
        loveBg: parsed.horoscope?.love || 'Отношенията изискват внимание.',
        career: parsed.horoscope?.career || 'Кариерните възможности са налице.',
        careerBg: parsed.horoscope?.career || 'Кариерните възможности са налице.',
        health: parsed.horoscope?.health || 'Обърнете внимание на енергията си.',
        healthBg: parsed.horoscope?.health || 'Обърнете внимание на енергията си.',
      },
      recommendations: parsed.recommendations || ['Отделете време за почивка', 'Слушайте интуицията си', 'Бъдете отворени към нови възможности'],
      recommendationsBg: parsed.recommendations || ['Отделете време за почивка', 'Слушайте интуицията си', 'Бъдете отворени към нови възможности'],
    };
  } catch (error) {
    console.error('[Forecast] LLM generation error:', error);
    // Return fallback forecast
    return {
      overallTheme: 'Ден на новите начала',
      overallThemeBg: 'Ден на новите начала',
      horoscope: {
        general: 'Днес е един ден на нови начала и възможности. Слушайте интуицията си и бъдете отворени към промени.',
        generalBg: 'Днес е един ден на нови начала и възможности. Слушайте интуицията си и бъдете отворени към промени.',
        love: 'Време за дълбоки разговори с партньора. Емоционалната връзка е подсилена.',
        loveBg: 'Време за дълбоки разговори с партньора. Емоционалната връзка е подсилена.',
        career: 'Професионалните ви усилия ще бъдат забележини. Това е добър ден за нови проекти.',
        careerBg: 'Професионалните ви усилия ще бъдат забележини. Това е добър ден за нови проекти.',
        health: 'Обърнете внимание на съня и почивката. Енергията може да варира през деня.',
        healthBg: 'Обърнете внимание на съня и почивката. Енергията може да варира през деня.',
      },
      recommendations: [
        'Създайте сутрешна рутина за медитация',
        'Практикувайте благодарност',
        'Избягвайте конфликти'
      ],
      recommendationsBg: [
        'Създайте сутрешна рутина за медитация',
        'Практикувайте благодарност',
        'Избягвайте конфликти'
      ],
    };
  }
}

/**
 * Generate daily forecast for a user
 */
export async function generateDailyForecast(
  userId: string,
  birthData: BirthDataInput,
  userLanguage: string = 'bg'
): Promise<DailyForecast> {
  const dateString = getTodayDateString();
  const cacheKey = `forecast:daily:${userId}:${dateString}`;
  
  // Try cache first
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`[Forecast] Daily forecast cache hit for user ${userId}`);
      const forecast = JSON.parse(cached) as DailyForecast;
      forecast.cached = true;
      return forecast;
    }
  } catch (error) {
    console.warn('[Forecast] Cache read error:', error);
  }
  
  // Get natal chart
  const natalChart = await calculateNatalChart(birthData);
  
  // Get current transits
  const transits = await getCurrentTransits();
  
  // Analyze transit impact on natal chart
  const analyzedTransits = analyzeTransitImpact(transits, natalChart);
  
  // Calculate moon phase
  const moonPhase = calculateMoonPhase(new Date());
  
  // Generate LLM-based forecast
  const llmForecast = await generateLLMForecast(natalChart, analyzedTransits, moonPhase, userLanguage);
  
  // Determine energy level based on transits
  const challengingCount = analyzedTransits.filter(t => t.aspectToNatal?.influence === 'challenging').length;
  const positiveCount = analyzedTransits.filter(t => t.aspectToNatal?.influence === 'positive').length;
  let energy: 'high' | 'medium' | 'low' = 'medium';
  if (positiveCount > challengingCount + 1) energy = 'high';
  else if (challengingCount > positiveCount + 1) energy = 'low';
  
  // Determine mood based on moon
  const moods: Record<string, string> = {
    'New Moon': 'Рефлективен',
    'Waxing Crescent': 'Оптимистичен',
    'First Quarter': 'Енергичен',
    'Waxing Gibbous': 'Продуктивен',
    'Full Moon': 'Интензивен',
    'Waning Gibbous': 'Благодарен',
    'Last Quarter': 'Освобождаващ',
    'Waning Crescent': 'Спокоен',
  };
  const mood = moods[moonPhase.phase] || 'Балансиран';
  
  // Determine power hours (simplified - based on sun's position)
  const hour = new Date().getHours();
  const powerHours = [
    `${(hour + 2) % 24}:00-${(hour + 4) % 24}:00`,
    `${(hour + 8) % 24}:00-${(hour + 10) % 24}:00`,
  ];
  
  // Generate lucky numbers based on natal chart
  const luckyNumbers = [
    natalChart.sun.degree % 10 + 1,
    natalChart.moon.degree % 10 + 1,
    natalChart.rising.degree % 10 + 1,
    (natalChart.sun.degree + natalChart.moon.degree) % 10 + 1,
    (natalChart.mars?.degree || 10) % 10 + 1,
  ].filter((v, i, a) => a.indexOf(v) === i); // Unique numbers
  
  const forecast: DailyForecast = {
    date: dateString,
    userId,
    overallTheme: llmForecast.overallTheme,
    overallThemeBg: llmForecast.overallThemeBg,
    mood,
    moodBg: mood,
    energy,
    transits: analyzedTransits,
    moonPhase: {
      phase: moonPhase.phase,
      phaseBg: moonPhase.phaseBg,
      illumination: moonPhase.illumination,
      sign: moonPhase.sign,
      signBg: moonPhase.signBg,
    },
    horoscope: {
      ...llmForecast.horoscope,
      luckyNumbers,
      powerHours,
    },
    recommendations: llmForecast.recommendations,
    recommendationsBg: llmForecast.recommendationsBg,
    generatedAt: new Date().toISOString(),
    cached: false,
  };
  
  // Cache the forecast
  try {
    await redisClient.setEx(cacheKey, FORECAST_CACHE_TTL, JSON.stringify(forecast));
    console.log(`[Forecast] Cached daily forecast for user ${userId}`);
  } catch (error) {
    console.warn('[Forecast] Cache write error:', error);
  }
  
  return forecast;
}

/**
 * Get daily forecast (from cache or generate)
 */
export async function getDailyForecast(
  userId: string,
  birthData: BirthDataInput,
  userLanguage: string = 'bg'
): Promise<DailyForecast> {
  return generateDailyForecast(userId, birthData, userLanguage);
}

/**
 * Generate weekly forecast
 */
export async function generateWeeklyForecast(
  userId: string,
  birthData: BirthDataInput,
  userLanguage: string = 'bg'
): Promise<WeeklyForecast> {
  const weekStart = getWeekStartDateString();
  const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  
  const cacheKey = `forecast:weekly:${userId}:${weekStart}`;
  
  // Try cache first
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`[Forecast] Weekly forecast cache hit for user ${userId}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('[Forecast] Cache read error:', error);
  }
  
  // Get natal chart
  const natalChart = await calculateNatalChart(birthData);
  
  // Generate simplified weekly overview using LLM
  const chartSummary = `
Потребителска натална карта:
- Слънце: ${natalChart.sun.signBg} в ${natalChart.sun.house}ти дом
- Луна: ${natalChart.moon.signBg} в ${natalChart.moon.house}ти дом  
- Асцендент: ${natalChart.rising.signBg}

Седмица: ${weekStart} до ${weekEnd}
`;
  
  const systemPrompt = userLanguage === 'bg'
    ? `Ти си AstroLogAI, експертен AI астролог. Генерирай седмична прогноза за потребителя.

Винаги отговаряй на БЪЛГАРСКИ.

Генерирай в JSON формат:
{
  "overview": "Общ преглед на седмицата - 3-4 изречения",
  "dailyBreakdown": [
    {"dayName": "Понеделник", "theme": "Тема на деня", "highlight": "Ключово събитие"},
    // ... 7 дни
  ],
  "majorTransits": [
    {"date": "YYYY-MM-DD", "event": "Астрологично събитие", "significance": "Значение"}
  ],
  "bestDays": {"career": "yyyy-mm-dd", "love": "yyyy-mm-dd", "decisions": "yyyy-mm-dd", "selfCare": "yyyy-mm-dd"}
}`
    : `You are AstroLogAI. Generate a weekly forecast in JSON:`;

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: chartSummary },
    ];
    
    const response = await chatCompletion(messages, { temperature: 0.7, maxTokens: 1000 });
    
    // Parse the JSON response - extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    const weeklyForecast: WeeklyForecast = {
      weekStart,
      weekEnd,
      overview: parsed.overview || 'Тази седмица носи интересни енергии и възможности за растеж.',
      overviewBg: parsed.overview || 'Тази седмица носи интересни енергии и възможности за растеж.',
      dailyBreakdown: parsed.dailyBreakdown?.map((d: any) => ({
        date: d.date || weekStart,
        dayName: d.dayName || 'Ден',
        dayNameBg: d.dayName || 'Ден',
        theme: d.theme || 'Баланс',
        themeBg: d.theme || 'Баланс',
        highlight: d.highlight || 'Хармоничен ден',
        highlightBg: d.highlight || 'Хармоничен ден',
      })) || [],
      majorTransits: parsed.majorTransits || [],
      bestDays: parsed.bestDays || {
        career: weekStart,
        love: new Date(new Date(weekStart).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        decisions: new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        selfCare: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      generatedAt: new Date().toISOString(),
    };
    
    // Cache
    try {
      await redisClient.setEx(cacheKey, WEEKLY_CACHE_TTL, JSON.stringify(weeklyForecast));
    } catch (error) {
      console.warn('[Forecast] Cache write error:', error);
    }
    
    return weeklyForecast;
  } catch (error) {
    console.error('[Forecast] Weekly LLM generation error:', error);
    
    // Fallback
    const weeklyForecast: WeeklyForecast = {
      weekStart,
      weekEnd,
      overview: 'Тази седмица е време за преосмисляне и нови начала. Обърнете внимание на вътрешния си глас.',
      overviewBg: 'Тази седмица е време за преосмисляне и нови начала. Обърнете внимание на вътрешния си глас.',
      dailyBreakdown: [],
      majorTransits: [],
      bestDays: {
        career: weekStart,
        love: new Date(new Date(weekStart).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        decisions: new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        selfCare: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      generatedAt: new Date().toISOString(),
    };
    
    return weeklyForecast;
  }
}

/**
 * Get weekly forecast
 */
export async function getWeeklyForecast(
  userId: string,
  birthData: BirthDataInput,
  userLanguage: string = 'bg'
): Promise<WeeklyForecast> {
  return generateWeeklyForecast(userId, birthData, userLanguage);
}
