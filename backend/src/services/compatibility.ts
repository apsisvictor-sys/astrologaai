/**
 * Compatibility Analysis Service
 * US-20: Compatibility Analysis
 * 
 * Provides detailed compatibility analysis between user and partner
 * Includes element compatibility, planetary aspects, and category breakdowns
 * 
 * Categories: Love, Communication, Trust, Adventure, Values
 */

import { prisma } from '../utils/prisma';
import { redisClient } from '../utils/redis';
import { calculateSynastryChart, SynastryChart, InterPlanetaryAspect } from './synastry.service';
import { calculateNatalChart, BirthDataInput, NatalChart, PlanetPosition } from './astrology';

// ============================================
// Types
// ============================================

export interface CompatibilityAnalysis {
  partnerId: string;
  partnerName: string;
  overallScore: number;
  scoreLevel: 'exceptional' | 'high' | 'moderate' | 'challenging' | 'difficult';
  categories: CategoryScores;
  elementCompatibility: ElementCompatibility;
  planetaryAnalysis: PlanetaryAnalysis;
  keyAspects: KeyAspect[];
  strengths: RelationshipInsight[];
  challenges: RelationshipInsight[];
  advice: {
    en: string;
    bg: string;
  };
  calculatedAt: string;
  cachedAt?: string;
}

export interface CategoryScores {
  love: CategoryScore;
  communication: CategoryScore;
  trust: CategoryScore;
  adventure: CategoryScore;
  values: CategoryScore;
}

export interface CategoryScore {
  score: number;
  level: 'excellent' | 'good' | 'moderate' | 'challenging';
  description: {
    en: string;
    bg: string;
  };
  contributingAspects: string[];
}

export interface ElementCompatibility {
  userElements: { fire: number; earth: number; air: number; water: number };
  partnerElements: { fire: number; earth: number; air: number; water: number };
  compatibility: {
    score: number;
    analysis: {
      en: string;
      bg: string;
    };
  };
  dominantElement: {
    user: string;
    partner: string;
    harmony: 'harmonious' | 'complementary' | 'challenging';
  };
}

export interface PlanetaryAnalysis {
  sun: PlanetaryComparison;
  moon: PlanetaryComparison;
  rising: PlanetaryComparison;
  venus: PlanetaryComparison;
  mars: PlanetaryComparison;
}

export interface PlanetaryComparison {
  user: { sign: string; degree: number };
  partner: { sign: string; degree: number };
  compatibility: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
  interpretation: {
    en: string;
    bg: string;
  };
}

export interface KeyAspect {
  aspect: string;
  aspectBg: string;
  userPlanet: string;
  partnerPlanet: string;
  orb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
  interpretation: {
    en: string;
    bg: string;
  };
}

export interface RelationshipInsight {
  title: {
    en: string;
    bg: string;
  };
  description: {
    en: string;
    bg: string;
  };
  planets: string[];
}

// ============================================
// Constants
// ============================================

const COMPATIBILITY_CACHE_TTL = 86400; // 24 hours

// Element compatibility matrix (trine = high, sextile = medium, square = challenging, opposition = mixed)
const ELEMENT_COMPATIBILITY: Record<string, Record<string, number>> = {
  fire: { fire: 90, earth: 40, air: 75, water: 35 },
  earth: { fire: 40, earth: 85, air: 45, water: 80 },
  air: { fire: 75, earth: 45, air: 85, water: 50 },
  water: { fire: 35, earth: 80, air: 50, water: 90 },
};

// Sign element mapping
const SIGN_ELEMENTS: Record<string, string> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};

// Planet importance weights for category scoring
const PLANET_WEIGHTS = {
  love: { venus: 3, mars: 2.5, moon: 2, sun: 1.5, mercury: 0.5 },
  communication: { mercury: 3, sun: 1.5, moon: 1.5, mars: 1, venus: 1 },
  trust: { saturn: 3, moon: 2.5, sun: 2, pluto: 1.5, venus: 1 },
  adventure: { mars: 3, jupiter: 2.5, uranus: 2, sun: 1.5, mercury: 1 },
  values: { jupiter: 3, saturn: 2, venus: 2, sun: 1.5, moon: 1 },
};

// Interpretation templates
const INTERPRETATIONS = {
  sunSign: {
    harmonious: {
      en: 'Your sun signs create natural harmony. You understand each other\'s core identity and life purpose.',
      bg: 'Вашите слънчеви знаци създават естествена хармония. Разбирате основната идентичност и жизнена цел един на друг.',
    },
    challenging: {
      en: 'Your sun signs create dynamic tension. This brings growth opportunities through different approaches to life.',
      bg: 'Вашите слънчеви знаци създават динамично напрежение. Това носи възможности за растеж чрез различни подходи към живота.',
    },
    neutral: {
      en: 'Your sun signs have a neutral connection. You can learn from each other\'s different perspectives.',
      bg: 'Вашите слънчеви знаци имат неутрална връзка. Можете да се учите от различните перспективи един на друг.',
    },
  },
  moonSign: {
    harmonious: {
      en: 'Your moon signs align beautifully. Emotional understanding and nurturing come naturally.',
      bg: 'Вашите лунни знаци се съчетават прекрасно. Емоционалното разбиране и грижата идват естествено.',
    },
    challenging: {
      en: 'Your moon signs require emotional adaptation. Understanding each other\'s emotional needs takes conscious effort.',
      bg: 'Вашите лунни знаци изискват емоционална адаптация. Разбирането на емоционалните нужди един на друг изисква съзнателни усилия.',
    },
    neutral: {
      en: 'Your moon signs have complementary qualities. Emotional growth comes through honoring differences.',
      bg: 'Вашите лунни знаци имат допълващи се качества. Емоционалният растеж идва чрез почитане на различията.',
    },
  },
  risingSign: {
    harmonious: {
      en: 'Your rising signs create instant rapport. First impressions and outward expressions align naturally.',
      bg: 'Вашите асценденти създават незабавна връзка. Първите впечатления и външните изразявания се съчетават естествено.',
    },
    challenging: {
      en: 'Your rising signs present different social masks. This creates interesting dynamic in how you present as a couple.',
      bg: 'Вашите асценденти представят различни социални маски. Това създава интересна динамика в това как се представяте като двойка.',
    },
    neutral: {
      en: 'Your rising signs bring different social approaches. Balance is found through appreciating each other\'s style.',
      bg: 'Вашите асценденти носят различни социални подходи. Балансът се намира чрез оценяване на стила един на друг.',
    },
  },
  venus: {
    harmonious: {
      en: 'Your Venus signs align for romantic harmony. Love languages and values around affection match beautifully.',
      bg: 'Вашите Венери се съчетават за романтична хармония. Любовните езици и ценности около обичта съвпадат прекрасно.',
    },
    challenging: {
      en: 'Your Venus signs approach love differently. This creates opportunity to expand your understanding of romance.',
      bg: 'Вашите Венери подходят към любовта по различен начин. Това създава възможност да разширите разбирането си за романтика.',
    },
    neutral: {
      en: 'Your Venus signs have complementary approaches to love. Different styles can enhance your romantic life.',
      bg: 'Вашите Венери имат допълващи се подходи към любовта. Различните стилове могат да обогатят романтичния ви живот.',
    },
  },
  mars: {
    harmonious: {
      en: 'Your Mars signs create dynamic synergy. Action, passion, and drive align powerfully.',
      bg: 'Вашите Марси създават динамична синергия. Действието, страстта и драйвът се съчетават мощно.',
    },
    challenging: {
      en: 'Your Mars signs energize each other in different ways. Channeling this energy constructively brings excitement.',
      bg: 'Вашите Марси се енергизират взаимно по различни начини. Канализирането на тази енергия конструктивно носи вълнение.',
    },
    neutral: {
      en: 'Your Mars signs bring complementary energies. Together you can accomplish more than separately.',
      bg: 'Вашите Марси носят допълващи се енергии. Заедно можете да постигнете повече, отколкото поотделно.',
    },
  },
};

// Category descriptions based on score
const getCategoryDescription = (category: string, score: number): { en: string; bg: string } => {
  const descriptions: Record<string, Record<string, { en: string; bg: string }>> = {
    love: {
      excellent: {
        en: 'Exceptional romantic chemistry. Your hearts connect deeply and naturally.',
        bg: 'Изключителна романтична химия. Сърцата ви се свързват дълбоко и естествено.',
      },
      good: {
        en: 'Strong romantic connection with natural affection and attraction.',
        bg: 'Силна романтична връзка с естествена обич и привличане.',
      },
      moderate: {
        en: 'Romantic potential that grows with understanding and effort.',
        bg: 'Романтичен потенциал, който расте с разбиране и усилие.',
      },
      challenging: {
        en: 'Romantic differences require patience and conscious effort to bridge.',
        bg: 'Романтичните различия изискват търпение и съзнателни усилия за преодоляване.',
      },
    },
    communication: {
      excellent: {
        en: 'Your minds connect effortlessly. Conversations flow naturally.',
        bg: 'Умовете ви се свързват без усилие. Разговорите текат естествено.',
      },
      good: {
        en: 'Good mental rapport with mutual understanding.',
        bg: 'Добър ментален рапорт с взаимно разбиране.',
      },
      moderate: {
        en: 'Communication requires some adaptation but improves over time.',
        bg: 'Комуникацията изисква известна адаптация, но се подобрява с времето.',
      },
      challenging: {
        en: 'Different communication styles need conscious bridging.',
        bg: 'Различните стилове на комуникация се нуждаят от съзнателно преодоляване.',
      },
    },
    trust: {
      excellent: {
        en: 'Deep foundation of trust and emotional security.',
        bg: 'Дълбока основа на доверие и емоционална сигурност.',
      },
      good: {
        en: 'Strong trust building with reliable emotional support.',
        bg: 'Силно изграждане на доверие с надеждна емоционална подкрепа.',
      },
      moderate: {
        en: 'Trust develops steadily through shared experiences.',
        bg: 'Доверието се развива стабилно чрез споделени преживявания.',
      },
      challenging: {
        en: 'Building trust requires patience and consistent effort.',
        bg: 'Изграждането на доверие изисква търпение и последователни усилия.',
      },
    },
    adventure: {
      excellent: {
        en: 'Perfect adventure partners with shared excitement for life.',
        bg: 'Перфектни партньори за приключения с споделено вълнение от живота.',
      },
      good: {
        en: 'Great companions for exploring life together.',
        bg: 'Страхотни спътници за изследване на живота заедно.',
      },
      moderate: {
        en: 'Adventurous spirit that benefits from compromise.',
        bg: 'Приключенски дух, който се възползва от компромис.',
      },
      challenging: {
        en: 'Different paces and styles of adventure require negotiation.',
        bg: 'Различни темпове и стилове на приключения изискват договаряне.',
      },
    },
    values: {
      excellent: {
        en: 'Deeply aligned values and life philosophy.',
        bg: 'Дълбоко съвпадащи се ценности и жизнена философия.',
      },
      good: {
        en: 'Shared core values with complementary perspectives.',
        bg: 'Споделени основни ценности с допълващи се перспективи.',
      },
      moderate: {
        en: 'Values align in important areas with room for growth.',
        bg: 'Ценностите се съвпадат в важни области с възможност за растеж.',
      },
      challenging: {
        en: 'Different value systems require understanding and respect.',
        bg: 'Различни ценностни системи изискват разбиране и уважение.',
      },
    },
  };

  const level = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'moderate' : 'challenging';
  return descriptions[category]?.[level] || descriptions[category]?.moderate || {
    en: 'Neutral compatibility in this area.',
    bg: 'Неутрална съвместимост в тази област.',
  };
};

// ============================================
// Helper Functions
// ============================================

function getScoreLevel(score: number): 'exceptional' | 'high' | 'moderate' | 'challenging' | 'difficult' {
  if (score >= 90) return 'exceptional';
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'challenging';
  return 'difficult';
}

function getScoreCategoryLevel(score: number): 'excellent' | 'good' | 'moderate' | 'challenging' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'moderate';
  return 'challenging';
}

function getDominantElement(elements: { fire: number; earth: number; air: number; water: number }): string {
  return Object.entries(elements)
    .sort(([, a], [, b]) => b - a)[0][0];
}

function getElementHarmony(element1: string, element2: string): 'harmonious' | 'complementary' | 'challenging' {
  const score = ELEMENT_COMPATIBILITY[element1]?.[element2] || 50;
  if (score >= 75) return 'harmonious';
  if (score >= 50) return 'complementary';
  return 'challenging';
}

function calculateCategoryScore(
  category: keyof typeof PLANET_WEIGHTS,
  aspects: InterPlanetaryAspect[]
): { score: number; contributingAspects: string[] } {
  const weights = PLANET_WEIGHTS[category];
  let totalScore = 0;
  let totalWeight = 0;
  const contributingAspects: string[] = [];

  for (const aspect of aspects) {
    const userWeight = weights[aspect.userPlanet as keyof typeof weights] || 0;
    const partnerWeight = weights[aspect.partnerPlanet as keyof typeof weights] || 0;
    const weight = Math.max(userWeight, partnerWeight);

    if (weight > 0 && aspect.orb < 6) {
      let aspectScore = 50;
      if (aspect.nature === 'harmonious') aspectScore = 85;
      else if (aspect.nature === 'challenging') aspectScore = 25;

      // Tighter orbs = stronger influence
      const orbFactor = 1 - (aspect.orb / 10);
      const effectiveScore = aspectScore * orbFactor;

      totalScore += effectiveScore * weight;
      totalWeight += weight;

      if (contributingAspects.length < 3) {
        contributingAspects.push(`${aspect.userPlanet}-${aspect.aspect}-${aspect.partnerPlanet}`);
      }
    }
  }

  const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
  return { score: Math.max(0, Math.min(100, score)), contributingAspects };
}

function getPlanetaryInterpretation(planet: string, nature: 'harmonious' | 'challenging' | 'neutral'): { en: string; bg: string } {
  const planetKey = planet as keyof typeof INTERPRETATIONS;
  if (INTERPRETATIONS[planetKey]) {
    return INTERPRETATIONS[planetKey][nature];
  }
  return {
    en: `${planet} connects ${nature === 'harmonious' ? 'positively' : nature === 'challenging' ? 'dynamically' : 'neutrally'} between your charts.`,
    bg: `${planet} се свързва ${nature === 'harmonious' ? 'позитивно' : nature === 'challenging' ? 'динамично' : 'неутрално'} между вашите карти.`,
  };
}

function generateAdvice(
  score: number,
  categories: CategoryScores,
  strengths: RelationshipInsight[],
  challenges: RelationshipInsight[]
): { en: string; bg: string } {
  const level = getScoreLevel(score);

  if (level === 'exceptional') {
    return {
      en: 'This is a rare and special connection. Nurture it with appreciation and conscious presence. Your natural harmony is a gift—don\'t take it for granted.',
      bg: 'Това е рядка и специална връзка. Грижете се за нея с признателност и осъзнато присъствие. Вашата естествена хармония е дар—не я приемайте за даденост.',
    };
  }

  if (level === 'high') {
    return {
      en: 'You have strong compatibility with natural flow. Focus on communication and shared values to deepen your bond. Your strengths outweigh the challenges.',
      bg: 'Имате силна съвместимост с естествен поток. Фокусирайте се върху комуникацията и споделените ценности, за да задълбочите връзката си. Вашите силни страни надвишават предизвикателствата.',
    };
  }

  if (level === 'moderate') {
    return {
      en: 'Your relationship has both harmonious and challenging areas. Growth comes from understanding your differences and building on your natural strengths.',
      bg: 'Вашата връзка има както хармонични, така и предизвикателни области. Растежът идва от разбиране на различията ви и изграждане върху естествените ви силни страни.',
    };
  }

  return {
    en: 'This connection requires conscious work but offers profound growth opportunities. Focus on understanding, patience, and celebrating the unique gifts you bring to each other.',
    bg: 'Тази връзка изисква съзнателна работа, но предлага дълбоки възможности за растеж. Фокусирайте се върху разбирането, търпението и празнуването на уникалните дарби, които носите един на друг.',
  };
}

function generateCacheKey(userId: string, partnerId: string): string {
  return `compatibility:${userId}:${partnerId}`;
}

// ============================================
// Main Service Functions
// ============================================

/**
 * Calculate comprehensive compatibility analysis
 */
export async function calculateCompatibility(
  userId: string,
  partnerId: string
): Promise<CompatibilityAnalysis> {
  // Check cache first
  const cacheKey = generateCacheKey(userId, partnerId);
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`[Compatibility] Cache hit for ${cacheKey}`);
      const parsed = JSON.parse(cached);
      parsed.cachedAt = new Date().toISOString();
      return parsed;
    }
  } catch (error) {
    console.warn('[Compatibility] Cache read error:', error);
  }

  // Get user's birth data - need to include the birth profile or birth data relation
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      birthChart: {
        include: {
          birthProfile: true,
          birthData: true,
        }
      }
    },
  });

  if (!user || !user.birthChart) {
    throw new Error('User birth chart not found');
  }

  // Get partner data
  const partner = await prisma.partner.findFirst({
    where: { id: partnerId, userId },
  });

  if (!partner) {
    throw new Error('Partner not found');
  }

  // Get birth data from either birthProfile or legacy birthData
  const userBirthSource = user.birthChart.birthProfile || user.birthChart.birthData;
  
  if (!userBirthSource) {
    throw new Error('User birth data not found');
  }

  // Handle different field names between BirthProfile and BirthData models
  // BirthProfile uses: birthDate, birthTime, locationName
  // BirthData uses: date, time, place
  const isBirthProfile = 'birthTime' in userBirthSource;
  const birthDate = isBirthProfile ? userBirthSource.birthDate : userBirthSource.date;
  const birthTime = isBirthProfile ? userBirthSource.birthTime : userBirthSource.time;

  // Prepare birth data for calculations
  const userBirthData: BirthDataInput = {
    year: birthDate.getFullYear(),
    month: birthDate.getMonth() + 1,
    day: birthDate.getDate(),
    hour: birthTime ? parseInt(birthTime.split(':')[0]) : 12,
    minute: birthTime ? parseInt(birthTime.split(':')[1]) : 0,
    latitude: userBirthSource.latitude,
    longitude: userBirthSource.longitude,
    timezone: userBirthSource.timezone,
  };

  const partnerBirthData: BirthDataInput = {
    year: partner.birthDate.getFullYear(),
    month: partner.birthDate.getMonth() + 1,
    day: partner.birthDate.getDate(),
    hour: partner.birthTime ? parseInt(partner.birthTime.split(':')[0]) : 12,
    minute: partner.birthTime ? parseInt(partner.birthTime.split(':')[1]) : 0,
    latitude: partner.latitude,
    longitude: partner.longitude,
    timezone: partner.timezone,
  };

  // Calculate synastry chart
  const synastryChart = await calculateSynastryChart(
    userBirthData,
    partnerBirthData,
    userId,
    partnerId
  );

  // Get user's natal chart for element analysis
  const userNatalChart = await calculateNatalChart(userBirthData);
  const partnerNatalChart = await calculateNatalChart(partnerBirthData);

  // Build compatibility analysis
  const analysis = buildCompatibilityAnalysis(
    partnerId,
    partner.name,
    synastryChart,
    userNatalChart,
    partnerNatalChart
  );

  // Cache the result
  try {
    await redisClient.setEx(cacheKey, COMPATIBILITY_CACHE_TTL, JSON.stringify(analysis));
    console.log(`[Compatibility] Cached analysis for ${cacheKey}`);
  } catch (error) {
    console.warn('[Compatibility] Cache write error:', error);
  }

  return analysis;
}

/**
 * Build the complete compatibility analysis from synastry data
 */
function buildCompatibilityAnalysis(
  partnerId: string,
  partnerName: string,
  synastryChart: SynastryChart,
  userChart: NatalChart,
  partnerChart: NatalChart
): CompatibilityAnalysis {
  // Calculate category scores
  const loveScore = calculateCategoryScore('love', synastryChart.interAspects);
  const communicationScore = calculateCategoryScore('communication', synastryChart.interAspects);
  const trustScore = calculateCategoryScore('trust', synastryChart.interAspects);
  const adventureScore = calculateCategoryScore('adventure', synastryChart.interAspects);
  const valuesScore = calculateCategoryScore('values', synastryChart.interAspects);

  // Build category details
  const categories: CategoryScores = {
    love: {
      score: loveScore.score,
      level: getScoreCategoryLevel(loveScore.score),
      description: getCategoryDescription('love', loveScore.score),
      contributingAspects: loveScore.contributingAspects,
    },
    communication: {
      score: communicationScore.score,
      level: getScoreCategoryLevel(communicationScore.score),
      description: getCategoryDescription('communication', communicationScore.score),
      contributingAspects: communicationScore.contributingAspects,
    },
    trust: {
      score: trustScore.score,
      level: getScoreCategoryLevel(trustScore.score),
      description: getCategoryDescription('trust', trustScore.score),
      contributingAspects: trustScore.contributingAspects,
    },
    adventure: {
      score: adventureScore.score,
      level: getScoreCategoryLevel(adventureScore.score),
      description: getCategoryDescription('adventure', adventureScore.score),
      contributingAspects: adventureScore.contributingAspects,
    },
    values: {
      score: valuesScore.score,
      level: getScoreCategoryLevel(valuesScore.score),
      description: getCategoryDescription('values', valuesScore.score),
      contributingAspects: valuesScore.contributingAspects,
    },
  };

  // Calculate overall score (weighted average of categories)
  const overallScore = Math.round(
    (categories.love.score * 0.25 +
    categories.communication.score * 0.2 +
    categories.trust.score * 0.2 +
    categories.adventure.score * 0.15 +
    categories.values.score * 0.2)
  );

  // Element compatibility
  const userDominant = getDominantElement(userChart.elements);
  const partnerDominant = getDominantElement(partnerChart.elements);
  const elementCompatibility: ElementCompatibility = {
    userElements: userChart.elements,
    partnerElements: partnerChart.elements,
    compatibility: {
      score: ELEMENT_COMPATIBILITY[userDominant]?.[partnerDominant] || 50,
      analysis: {
        en: `Your dominant element (${userDominant}) and ${partnerName}'s dominant element (${partnerDominant}) ${getElementHarmony(userDominant, partnerDominant) === 'harmonious' ? 'create natural harmony' : getElementHarmony(userDominant, partnerDominant) === 'complementary' ? 'complement each other well' : 'create dynamic growth opportunities'}.`,
        bg: `Вашият доминиращ елемент (${userDominant}) и доминиращият елемент на ${partnerName} (${partnerDominant}) ${getElementHarmony(userDominant, partnerDominant) === 'harmonious' ? 'създават естествена хармония' : getElementHarmony(userDominant, partnerDominant) === 'complementary' ? 'се допълват добре' : 'създават динамични възможности за растеж'}.`,
      },
    },
    dominantElement: {
      user: userDominant,
      partner: partnerDominant,
      harmony: getElementHarmony(userDominant, partnerDominant),
    },
  };

  // Planetary analysis for key planets
  const planetaryAnalysis: PlanetaryAnalysis = {
    sun: analyzePlanetPair('sun', userChart.sun, partnerChart.sun, synastryChart.interAspects),
    moon: analyzePlanetPair('moon', userChart.moon, partnerChart.moon, synastryChart.interAspects),
    rising: analyzePlanetPair('rising', userChart.rising, partnerChart.rising, synastryChart.interAspects),
    venus: analyzePlanetPair('venus', userChart.venus, partnerChart.venus, synastryChart.interAspects),
    mars: analyzePlanetPair('mars', userChart.mars, partnerChart.mars, synastryChart.interAspects),
  };

  // Key aspects (top 10 tightest)
  const keyAspects: KeyAspect[] = synastryChart.interAspects
    .filter(a => ['sun', 'moon', 'venus', 'mars', 'mercury', 'rising'].includes(a.userPlanet) ||
                  ['sun', 'moon', 'venus', 'mars', 'mercury', 'rising'].includes(a.partnerPlanet))
    .slice(0, 10)
    .map(aspect => ({
      aspect: aspect.aspect,
      aspectBg: aspect.aspectBg,
      userPlanet: aspect.userPlanet,
      partnerPlanet: aspect.partnerPlanet,
      orb: aspect.orb,
      nature: aspect.nature,
      interpretation: aspect.interpretation,
    }));

  // Convert synastry strengths and challenges
  const strengths: RelationshipInsight[] = synastryChart.strengths.map(s => ({
    title: s.title,
    description: s.description,
    planets: s.planets,
  }));

  const challenges: RelationshipInsight[] = synastryChart.challenges.map(c => ({
    title: c.title,
    description: c.description,
    planets: c.planets,
  }));

  // Generate advice
  const advice = generateAdvice(overallScore, categories, strengths, challenges);

  return {
    partnerId,
    partnerName,
    overallScore,
    scoreLevel: getScoreLevel(overallScore),
    categories,
    elementCompatibility,
    planetaryAnalysis,
    keyAspects,
    strengths,
    challenges,
    advice,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Analyze a specific planet pair between charts
 */
function analyzePlanetPair(
  planet: string,
  userPlanet: PlanetPosition,
  partnerPlanet: PlanetPosition,
  aspects: InterPlanetaryAspect[]
): PlanetaryComparison {
  // Find aspect between these planets
  const aspect = aspects.find(
    a => (a.userPlanet === planet && a.partnerPlanet === planet) ||
         (a.userPlanet === planet && a.partnerPlanet === planet)
  );

  // Calculate element-based compatibility
  const userElement = SIGN_ELEMENTS[userPlanet.sign] || 'fire';
  const partnerElement = SIGN_ELEMENTS[partnerPlanet.sign] || 'fire';
  const baseCompatibility = ELEMENT_COMPATIBILITY[userElement]?.[partnerElement] || 50;

  // Adjust based on aspect
  let compatibility = baseCompatibility;
  let nature: 'harmonious' | 'challenging' | 'neutral' = 'neutral';

  if (aspect) {
    if (aspect.nature === 'harmonious') {
      compatibility = Math.min(95, baseCompatibility + 20);
      nature = 'harmonious';
    } else if (aspect.nature === 'challenging') {
      compatibility = Math.max(15, baseCompatibility - 20);
      nature = 'challenging';
    }
  }

  return {
    user: { sign: userPlanet.sign, degree: userPlanet.degree },
    partner: { sign: partnerPlanet.sign, degree: partnerPlanet.degree },
    compatibility,
    nature,
    interpretation: getPlanetaryInterpretation(planet, nature),
  };
}

/**
 * Get cached compatibility analysis
 */
export async function getCachedCompatibility(
  userId: string,
  partnerId: string
): Promise<CompatibilityAnalysis | null> {
  const cacheKey = generateCacheKey(userId, partnerId);

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('[Compatibility] Cache read error:', error);
  }

  return null;
}

/**
 * Invalidate compatibility cache
 */
export async function invalidateCompatibilityCache(
  userId: string,
  partnerId: string
): Promise<void> {
  const cacheKey = generateCacheKey(userId, partnerId);

  try {
    await redisClient.del(cacheKey);
    console.log(`[Compatibility] Invalidated cache for ${cacheKey}`);
  } catch (error) {
    console.warn('[Compatibility] Cache invalidation error:', error);
  }
}
