/**
 * Compatibility Report Service
 * US-20: Generate detailed compatibility analysis reports
 * 
 * Uses synastry data and LLM to generate comprehensive
 * compatibility reports with caching
 */

import { calculateSynastryChart, getCachedSynastry, SynastryChart } from './synastry.service';
import { chatCompletion } from './llm';
import { redisClient } from '../utils/redis';
import type { BirthDataInput } from './astrology';

// ============================================
// Types
// ============================================

export interface CompatibilityReport {
  partnerId: string;
  partnerName: string;
  overallScore: number;
  categories: {
    emotional: CategoryScore;
    communication: CategoryScore;
    physical: CategoryScore;
    longTerm: CategoryScore;
  };
  keyAspects: KeyAspect[];
  strengths: string[];
  challenges: string[];
  advice: string;
  generatedAt: string;
  language: 'bg' | 'en';
}

export interface CategoryScore {
  score: number;
  label: string;
  labelBg: string;
  analysis: string;
}

export interface KeyAspect {
  userPlanet: string;
  partnerPlanet: string;
  aspect: string;
  aspectBg: string;
  description: string;
  nature: 'harmonious' | 'challenging' | 'neutral';
}

// ============================================
// Constants
// ============================================

const REPORT_CACHE_TTL = 604800; // 7 days (reports are more expensive to generate)
const REPORT_CACHE_PREFIX = 'compatibility-report:';

// Planet importance weights for scoring
const PLANET_WEIGHTS: Record<string, number> = {
  sun: 3,
  moon: 3,
  venus: 2.5,
  mars: 2.5,
  mercury: 2,
  jupiter: 1.5,
  saturn: 1.5,
  rising: 2,
  uranus: 1,
  neptune: 1,
  pluto: 1,
  northNode: 1,
  chiron: 1,
};

// ============================================
// Helper Functions
// ============================================

function generateReportCacheKey(userId: string, partnerId: string, language: string): string {
  return `${REPORT_CACHE_PREFIX}${userId}:${partnerId}:${language}`;
}

function getPlanetDisplayName(planet: string, language: 'bg' | 'en'): string {
  const names: Record<string, { en: string; bg: string }> = {
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
  
  return names[planet]?.[language] || planet;
}

function getAspectDisplayName(aspect: string, language: 'bg' | 'en'): string {
  const names: Record<string, { en: string; bg: string }> = {
    conjunction: { en: 'Conjunction', bg: 'Съвпад' },
    opposition: { en: 'Opposition', bg: 'Опозиция' },
    trine: { en: 'Trine', bg: 'Тригон' },
    square: { en: 'Square', bg: 'Квадрат' },
    sextile: { en: 'Sextile', bg: 'Секстил' },
    quincunx: { en: 'Quincunx', bg: 'Квинкункс' },
  };
  
  return names[aspect]?.[language] || aspect;
}

// ============================================
// Category Scoring Functions
// ============================================

function calculateEmotionalScore(synastry: SynastryChart): number {
  const emotionalPlanets = ['moon', 'venus', 'cancer', 'scorpio', 'pisces'];
  let score = 0;
  let totalWeight = 0;
  
  for (const aspect of synastry.interAspects) {
    const isEmotional = 
      emotionalPlanets.includes(aspect.userPlanet) || 
      emotionalPlanets.includes(aspect.partnerPlanet);
    
    if (isEmotional) {
      const weight = (PLANET_WEIGHTS[aspect.userPlanet] || 1) + (PLANET_WEIGHTS[aspect.partnerPlanet] || 1);
      const aspectScore = aspect.nature === 'harmonious' ? 80 : aspect.nature === 'challenging' ? 35 : 50;
      score += aspectScore * weight * (1 - aspect.orb / 10);
      totalWeight += weight;
    }
  }
  
  // Include moon-moon special bonus
  const moonMoon = synastry.interAspects.find(
    a => a.userPlanet === 'moon' && a.partnerPlanet === 'moon'
  );
  if (moonMoon && moonMoon.nature === 'harmonious') {
    score += 15;
  }
  
  return Math.min(100, Math.round(totalWeight > 0 ? score / totalWeight : 50));
}

function calculateCommunicationScore(synastry: SynastryChart): number {
  const communicationPlanets = ['mercury', 'gemini', 'virgo', 'jupiter'];
  let score = 0;
  let totalWeight = 0;
  
  for (const aspect of synastry.interAspects) {
    const isCommunication = 
      communicationPlanets.includes(aspect.userPlanet) || 
      communicationPlanets.includes(aspect.partnerPlanet);
    
    if (isCommunication) {
      const weight = (PLANET_WEIGHTS[aspect.userPlanet] || 1) + (PLANET_WEIGHTS[aspect.partnerPlanet] || 1);
      const aspectScore = aspect.nature === 'harmonious' ? 80 : aspect.nature === 'challenging' ? 35 : 50;
      score += aspectScore * weight * (1 - aspect.orb / 10);
      totalWeight += weight;
    }
  }
  
  return Math.min(100, Math.round(totalWeight > 0 ? score / totalWeight : 50));
}

function calculatePhysicalScore(synastry: SynastryChart): number {
  const physicalPlanets = ['mars', 'venus', 'aries', 'taurus', 'scorpio'];
  let score = 0;
  let totalWeight = 0;
  
  for (const aspect of synastry.interAspects) {
    const isPhysical = 
      physicalPlanets.includes(aspect.userPlanet) || 
      physicalPlanets.includes(aspect.partnerPlanet);
    
    if (isPhysical) {
      const weight = (PLANET_WEIGHTS[aspect.userPlanet] || 1) + (PLANET_WEIGHTS[aspect.partnerPlanet] || 1);
      const aspectScore = aspect.nature === 'harmonious' ? 80 : aspect.nature === 'challenging' ? 35 : 50;
      score += aspectScore * weight * (1 - aspect.orb / 10);
      totalWeight += weight;
    }
  }
  
  // Venus-Mars aspect special bonus
  const venusMars = synastry.interAspects.find(
    a => (a.userPlanet === 'venus' && a.partnerPlanet === 'mars') ||
         (a.userPlanet === 'mars' && a.partnerPlanet === 'venus')
  );
  if (venusMars) {
    score += venusMars.nature === 'harmonious' ? 20 : venusMars.nature === 'challenging' ? -5 : 5;
  }
  
  return Math.min(100, Math.round(totalWeight > 0 ? score / totalWeight : 50));
}

function calculateLongTermScore(synastry: SynastryChart): number {
  const longTermPlanets = ['saturn', 'jupiter', 'northNode', 'southNode'];
  let score = 0;
  let totalWeight = 0;
  
  for (const aspect of synastry.interAspects) {
    const isLongTerm = 
      longTermPlanets.includes(aspect.userPlanet) || 
      longTermPlanets.includes(aspect.partnerPlanet);
    
    if (isLongTerm) {
      const weight = (PLANET_WEIGHTS[aspect.userPlanet] || 1) + (PLANET_WEIGHTS[aspect.partnerPlanet] || 1);
      // Saturn aspects are weighted more for long-term
      const isSaturn = aspect.userPlanet === 'saturn' || aspect.partnerPlanet === 'saturn';
      const aspectScore = aspect.nature === 'harmonious' ? (isSaturn ? 85 : 75) : 
                          aspect.nature === 'challenging' ? 30 : 50;
      score += aspectScore * weight * (1 - aspect.orb / 10);
      totalWeight += weight;
    }
  }
  
  // Sun-Saturn special bonus for commitment potential
  const sunSaturn = synastry.interAspects.find(
    a => (a.userPlanet === 'sun' && a.partnerPlanet === 'saturn') ||
         (a.userPlanet === 'saturn' && a.partnerPlanet === 'sun')
  );
  if (sunSaturn && sunSaturn.nature === 'harmonious') {
    score += 10;
  }
  
  return Math.min(100, Math.round(totalWeight > 0 ? score / totalWeight : 50));
}

// ============================================
// LLM Analysis Generation
// ============================================

async function generateCategoryAnalysis(
  categoryName: string,
  score: number,
  relevantAspects: SynastryChart['interAspects'],
  language: 'bg' | 'en'
): Promise<string> {
  const aspectsText = relevantAspects
    .slice(0, 3)
    .map(a => `${a.userPlanet} ${a.aspect} ${a.partnerPlanet}: ${language === 'bg' ? a.interpretation.bg : a.interpretation.en}`)
    .join('\n');

  const prompt = language === 'bg'
    ? `Ти си експерт астролог. Напиши кратък анализ (2-3 изречения) за "${categoryName}" съвместимост с резултат ${score}/100.

Основни аспекти:
${aspectsText}

Анализът трябва да бъде конкретен, полезен и на български език.`
    : `You are an expert astrologer. Write a brief analysis (2-3 sentences) for "${categoryName}" compatibility with a score of ${score}/100.

Key aspects:
${aspectsText}

Keep the analysis specific, practical, and encouraging.`;

  try {
    const analysis = await chatCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7, maxTokens: 200 }
    );
    return analysis.trim();
  } catch (error) {
    console.error('[CompatibilityReport] LLM error:', error);
    // Fallback analysis
    if (score >= 70) {
      return language === 'bg'
        ? `Силна ${categoryName.toLowerCase()} връзка. Енергиите ви се допълват добре в тази област.`
        : `Strong ${categoryName.toLowerCase()} connection. Your energies complement each other well in this area.`;
    } else if (score >= 50) {
      return language === 'bg'
        ? `Умерена ${categoryName.toLowerCase()} съвместимост. Има място за развитие и разбиране.`
        : `Moderate ${categoryName.toLowerCase()} compatibility. There's room for growth and understanding.`;
    } else {
      return language === 'bg'
        ? `Тази област изисква внимание и работа. Предизвикателствата носят възможности за растеж.`
        : `This area requires attention and work. Challenges bring opportunities for growth.`;
    }
  }
}

async function generateAdvice(
  synastry: SynastryChart,
  strengths: string[],
  challenges: string[],
  language: 'bg' | 'en'
): Promise<string> {
  const summary = language === 'bg' ? synastry.summary.bg : synastry.summary.en;
  
  const prompt = language === 'bg'
    ? `Ти си мъдър астролог. Дай конкретни и полезни съвети за двойка въз основа на техния астрологичен анализ.

СИЛНИ СТРАНИ:
${strengths.map(s => `- ${s}`).join('\n')}

ПРЕДИЗВИКАТЕЛСТВА:
${challenges.map(c => `- ${c}`).join('\n')}

ОБОБЩЕНИЕ:
${summary}

Напиши 3-4 практически съвета на български език, които да им помогнат да развиват връзката си. Всеки съвет трябва да бъде едно изречение.`
    : `You are a wise astrologer. Give concrete and helpful advice for a couple based on their astrological analysis.

STRENGTHS:
${strengths.map(s => `- ${s}`).join('\n')}

CHALLENGES:
${challenges.map(c => `- ${c}`).join('\n')}

SUMMARY:
${summary}

Write 3-4 practical pieces of advice that will help them develop their relationship. Each piece of advice should be one sentence.`;

  try {
    const advice = await chatCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7, maxTokens: 300 }
    );
    return advice.trim();
  } catch (error) {
    console.error('[CompatibilityReport] LLM advice error:', error);
    // Fallback advice
    return language === 'bg'
      ? `Фокусирайте се върху вашите силни страни. Комуникирайте открито за предизвикателствата. Дайте си пространство за индивидуален растеж. Почитайте уникалността на всеки от вас.`
      : `Focus on your strengths together. Communicate openly about challenges. Give each other space for individual growth. Honor the uniqueness in each of you.`;
  }
}

// ============================================
// Main Report Generation
// ============================================

export async function generateCompatibilityReport(
  userBirthData: BirthDataInput,
  partnerBirthData: BirthDataInput,
  partnerId: string,
  partnerName: string,
  userId: string,
  language: 'bg' | 'en' = 'bg'
): Promise<CompatibilityReport> {
  // Check cache first
  const cacheKey = generateReportCacheKey(userId, partnerId, language);
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`[CompatibilityReport] Cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('[CompatibilityReport] Cache read error:', error);
  }

  // Get synastry chart (it has its own caching)
  const synastry = await calculateSynastryChart(
    userBirthData,
    partnerBirthData,
    userId,
    partnerId
  );

  // Calculate category scores
  const emotionalScore = calculateEmotionalScore(synastry);
  const communicationScore = calculateCommunicationScore(synastry);
  const physicalScore = calculatePhysicalScore(synastry);
  const longTermScore = calculateLongTermScore(synastry);

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    emotionalScore * 0.3 +
    communicationScore * 0.25 +
    physicalScore * 0.2 +
    longTermScore * 0.25
  );

  // Get relevant aspects for each category
  const emotionalAspects = synastry.interAspects.filter(
    a => ['moon', 'venus'].includes(a.userPlanet) || ['moon', 'venus'].includes(a.partnerPlanet)
  );
  const communicationAspects = synastry.interAspects.filter(
    a => a.userPlanet === 'mercury' || a.partnerPlanet === 'mercury'
  );
  const physicalAspects = synastry.interAspects.filter(
    a => ['mars', 'venus'].includes(a.userPlanet) && ['mars', 'venus'].includes(a.partnerPlanet)
  );
  const longTermAspects = synastry.interAspects.filter(
    a => ['saturn', 'jupiter', 'northNode'].includes(a.userPlanet) || 
         ['saturn', 'jupiter', 'northNode'].includes(a.partnerPlanet)
  );

  // Generate category analyses in parallel
  const [
    emotionalAnalysis,
    communicationAnalysis,
    physicalAnalysis,
    longTermAnalysis,
  ] = await Promise.all([
    generateCategoryAnalysis('Емоционална', emotionalScore, emotionalAspects, language),
    generateCategoryAnalysis('Комуникация', communicationScore, communicationAspects, language),
    generateCategoryAnalysis('Физическа', physicalScore, physicalAspects, language),
    generateCategoryAnalysis('Дългосрочна', longTermScore, longTermAspects, language),
  ]);

  // Extract key aspects (top 5 most significant)
  const keyAspects: KeyAspect[] = synastry.interAspects
    .filter(a => ['sun', 'moon', 'venus', 'mars', 'rising'].includes(a.userPlanet) ||
                 ['sun', 'moon', 'venus', 'mars', 'rising'].includes(a.partnerPlanet))
    .slice(0, 5)
    .map(aspect => ({
      userPlanet: getPlanetDisplayName(aspect.userPlanet, language),
      partnerPlanet: getPlanetDisplayName(aspect.partnerPlanet, language),
      aspect: getAspectDisplayName(aspect.aspect, language),
      aspectBg: aspect.aspectBg,
      description: language === 'bg' ? aspect.interpretation.bg : aspect.interpretation.en,
      nature: aspect.nature,
    }));

  // Extract strengths and challenges from synastry
  const strengths = synastry.strengths.map(s => 
    language === 'bg' ? `${s.title.bg}: ${s.description.bg}` : `${s.title.en}: ${s.description.en}`
  );
  
  const challenges = synastry.challenges.map(c => 
    language === 'bg' ? `${c.title.bg}: ${c.description.bg}` : `${c.title.en}: ${c.description.en}`
  );

  // Add default strengths/challenges if none found
  if (strengths.length === 0) {
    if (overallScore >= 60) {
      strengths.push(language === 'bg' 
        ? 'Хармонични аспекти между личните планети' 
        : 'Harmonious aspects between personal planets'
      );
    }
    if (emotionalScore >= 60) {
      strengths.push(language === 'bg'
        ? 'Емоционална подкрепа и разбиране'
        : 'Emotional support and understanding'
      );
    }
  }

  if (challenges.length === 0) {
    if (overallScore < 60) {
      challenges.push(language === 'bg'
        ? 'Някои планетарни аспекти изискват работа'
        : 'Some planetary aspects require work'
      );
    }
  }

  // Generate advice
  const advice = await generateAdvice(synastry, strengths, challenges, language);

  // Build the report
  const report: CompatibilityReport = {
    partnerId,
    partnerName,
    overallScore,
    categories: {
      emotional: {
        score: emotionalScore,
        label: 'Emotional',
        labelBg: 'Емоционална',
        analysis: emotionalAnalysis,
      },
      communication: {
        score: communicationScore,
        label: 'Communication',
        labelBg: 'Комуникация',
        analysis: communicationAnalysis,
      },
      physical: {
        score: physicalScore,
        label: 'Physical',
        labelBg: 'Физическа',
        analysis: physicalAnalysis,
      },
      longTerm: {
        score: longTermScore,
        label: 'Long-term',
        labelBg: 'Дългосрочна',
        analysis: longTermAnalysis,
      },
    },
    keyAspects,
    strengths,
    challenges,
    advice,
    generatedAt: new Date().toISOString(),
    language,
  };

  // Cache the report
  try {
    await redisClient.setEx(cacheKey, REPORT_CACHE_TTL, JSON.stringify(report));
    console.log(`[CompatibilityReport] Cached report for ${cacheKey}`);
  } catch (error) {
    console.warn('[CompatibilityReport] Cache write error:', error);
  }

  return report;
}

/**
 * Get cached compatibility report
 */
export async function getCachedReport(
  userId: string,
  partnerId: string,
  language: 'bg' | 'en'
): Promise<CompatibilityReport | null> {
  const cacheKey = generateReportCacheKey(userId, partnerId, language);
  
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('[CompatibilityReport] Cache read error:', error);
  }
  
  return null;
}

/**
 * Invalidate report cache
 */
export async function invalidateReportCache(
  userId: string,
  partnerId: string
): Promise<void> {
  // Invalidate both language versions
  const keys = [
    generateReportCacheKey(userId, partnerId, 'bg'),
    generateReportCacheKey(userId, partnerId, 'en'),
  ];
  
  try {
    await Promise.all(keys.map(key => redisClient.del(key)));
    console.log(`[CompatibilityReport] Invalidated cache for partner ${partnerId}`);
  } catch (error) {
    console.warn('[CompatibilityReport] Cache invalidation error:', error);
  }
}
