"use strict";
/**
 * Synastry Chart Service
 * US-19: Synastry Chart Generation
 *
 * Calculates relationship compatibility between two birth charts
 * Computes inter-planetary aspects and composite interpretations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSynastryChart = calculateSynastryChart;
exports.getCachedSynastry = getCachedSynastry;
exports.invalidateSynastryCache = invalidateSynastryCache;
const astrology_1 = require("./astrology");
// ============================================
// Constants
// ============================================
const SYNASTRY_CACHE_TTL = 86400; // 24 hours
// Aspect orbs for synastry (slightly wider than natal)
const ASPECT_ORBS = {
    conjunction: 8,
    opposition: 8,
    trine: 7,
    square: 7,
    sextile: 6,
    quincunx: 4,
};
// Aspect nature mapping
const ASPECT_NATURE = {
    conjunction: 'neutral', // Can go either way
    opposition: 'challenging',
    trine: 'harmonious',
    square: 'challenging',
    sextile: 'harmonious',
    quincunx: 'neutral',
};
// Aspect translations
const ASPECT_TRANSLATIONS = {
    conjunction: 'съвпад',
    opposition: 'опозиция',
    trine: 'тригон',
    square: 'квадрат',
    sextile: 'секстил',
    quincunx: 'квинкункс',
};
// Zodiac signs in order
const ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];
// Interpretation templates for key aspects
const ASPECT_INTERPRETATIONS = {
    'sun-sun': {
        conjunction: {
            en: 'Your core identities align powerfully. You understand each other naturally.',
            bg: 'Вашите основни идентичности се съчетават мощно. Разбирате се естествено.',
        },
        trine: {
            en: 'Harmonious self-expression. You support each other\'s individuality.',
            bg: 'Хармонично самоизразяване. Подкрепяте индивидуалността един на друг.',
        },
        square: {
            en: 'Ego clashes possible. You challenge each other to grow.',
            bg: 'Възможни сблъсъци на егото. Предизвиквате се да растете.',
        },
        opposition: {
            en: 'Complementary but opposing energies. Balance is key.',
            bg: 'Допълващи се, но противоположни енергии. Балансът е ключов.',
        },
    },
    'sun-moon': {
        conjunction: {
            en: 'Deep emotional connection. Your heart and ego align beautifully.',
            bg: 'Дълбока емоционална връзка. Сърцето и егото ви се съчетават прекрасно.',
        },
        trine: {
            en: 'Natural emotional understanding. You nurture each other\'s needs.',
            bg: 'Естествено емоционално разбиране. Грижите се за нуждите един на друг.',
        },
        sextile: {
            en: 'Supportive emotional bond. Easy flow of feeling and support.',
            bg: 'Подкрепяща емоционална връзка. Лесен поток от чувства и подкрепа.',
        },
        square: {
            en: 'Emotional friction that demands growth. Learning to understand different needs.',
            bg: 'Емоционално триене, което изисква растеж. Учене да разбирате различни нужди.',
        },
        opposition: {
            en: 'Polarity between ego and emotions. Learning to balance head and heart.',
            bg: 'Полярност между его и емоции. Учене да балансирате главата и сърцето.',
        },
    },
    'moon-moon': {
        conjunction: {
            en: 'Soulmate-level emotional connection. You feel each other deeply.',
            bg: 'Емоционална връзка на ниво родени души. Чувствате се дълбоко.',
        },
        trine: {
            en: 'Emotional harmony. You naturally understand each other\'s feelings.',
            bg: 'Емоционална хармония. Естествено разбирате чувствата един на друг.',
        },
        square: {
            en: 'Emotional differences require understanding. Growth through compromise.',
            bg: 'Емоционалните различия изискват разбиране. Растеж чрез компромис.',
        },
        opposition: {
            en: 'Complementary emotional needs. Balance through awareness.',
            bg: 'Допълващи се емоционални нужди. Баланс чрез осъзнатост.',
        },
    },
    'venus-venus': {
        conjunction: {
            en: 'Shared values and love language. Natural attraction and affection.',
            bg: 'Споделени ценности и език на любовта. Естествено привличане и обич.',
        },
        trine: {
            en: 'Harmonious love expression. Easy flow of affection.',
            bg: 'Хармонично изразяване на любовта. Лесен поток на обич.',
        },
        square: {
            en: 'Different love styles. Learning to appreciate each other\'s approach.',
            bg: 'Различни стилове на любов. Учене да цените подхода един на друг.',
        },
    },
    'venus-mars': {
        conjunction: {
            en: 'Intense romantic and sexual chemistry. Powerful attraction.',
            bg: 'Интензивна романтична и сексуална химия. Мощно привличане.',
        },
        trine: {
            en: 'Natural romantic harmony. Love and desire flow together.',
            bg: 'Естествена романтична хармония. Любовта и желанието текат заедно.',
        },
        square: {
            en: 'Tension between love and passion. Learning to balance romance and desire.',
            bg: 'Напрежение между любовта и страстта. Учене да балансирате романтика и желание.',
        },
        opposition: {
            en: 'Polarity of love and desire. Complementary energies.',
            bg: 'Полярност на любов и желание. Допълващи се енергии.',
        },
    },
    'mars-mars': {
        conjunction: {
            en: 'Shared drive and energy. Powerful action together.',
            bg: 'Споделен драйв и енергия. Мощно действие заедно.',
        },
        trine: {
            en: 'Coordinated action. You motivate each other effectively.',
            bg: 'Координирано действие. Мотивирате се ефективно.',
        },
        square: {
            en: 'Competitive tension. Channeling energy constructively.',
            bg: 'Конкурентно напрежение. Канализиране на енергията конструктивно.',
        },
    },
    'moon-venus': {
        conjunction: {
            en: 'Beautiful emotional and loving connection. Deep affection.',
            bg: 'Прекрасна емоционална и любяща връзка. Дълбока обич.',
        },
        trine: {
            en: 'Harmony between feelings and love. Natural nurturing.',
            bg: 'Хармония между чувствата и любовта. Естествена грижа.',
        },
        sextile: {
            en: 'Sweet emotional bond. Easy expression of affection.',
            bg: 'Сладка емоционална връзка. Лесно изразяване на обич.',
        },
    },
    'sun-venus': {
        conjunction: {
            en: 'Love illuminates your identity. Romantic connection to core self.',
            bg: 'Любовта озарява вашата идентичност. Романтична връзка с основното аз.',
        },
        trine: {
            en: 'Your ego and love nature support each other beautifully.',
            bg: 'Вашето его и любовна природа се подкрепят прекрасно.',
        },
        square: {
            en: 'Tension between self-expression and relationships. Growth through love.',
            bg: 'Напрежение между самоизразяването и връзките. Растеж чрез любов.',
        },
    },
    'sun-mars': {
        conjunction: {
            en: 'Powerful dynamic energy together. Strong motivation and drive.',
            bg: 'Мощна динамична енергия заедно. Силна мотивация и драйв.',
        },
        trine: {
            en: 'Your identities energize each other. Great teamwork.',
            bg: 'Вашите идентичности се енергизират взаимно. Страхотна работа в екип.',
        },
        square: {
            en: 'Ego conflicts possible. Learning to direct energy positively.',
            bg: 'Възможни его конфликти. Учене да насочвате енергията позитивно.',
        },
    },
};
// ============================================
// Helper Functions
// ============================================
function getSignIndex(sign) {
    return ZODIAC_SIGNS.indexOf(sign);
}
function getAbsoluteDegree(sign, degree) {
    const signIndex = getSignIndex(sign);
    if (signIndex === -1)
        return degree;
    return signIndex * 30 + degree;
}
function calculateAngle(degree1, degree2) {
    let diff = Math.abs(degree1 - degree2);
    if (diff > 180)
        diff = 360 - diff;
    return diff;
}
function determineAspect(angle) {
    const aspects = [
        { name: 'conjunction', angle: 0, orb: ASPECT_ORBS.conjunction },
        { name: 'opposition', angle: 180, orb: ASPECT_ORBS.opposition },
        { name: 'trine', angle: 120, orb: ASPECT_ORBS.trine },
        { name: 'square', angle: 90, orb: ASPECT_ORBS.square },
        { name: 'sextile', angle: 60, orb: ASPECT_ORBS.sextile },
        { name: 'quincunx', angle: 150, orb: ASPECT_ORBS.quincunx },
    ];
    for (const aspect of aspects) {
        const diff = Math.abs(angle - aspect.angle);
        if (diff <= aspect.orb) {
            return { aspect: aspect.name, orb: diff };
        }
    }
    return null;
}
function getInterpretation(userPlanet, partnerPlanet, aspect) {
    // Try both orderings
    const key1 = `${userPlanet}-${partnerPlanet}`;
    const key2 = `${partnerPlanet}-${userPlanet}`;
    if (ASPECT_INTERPRETATIONS[key1]?.[aspect]) {
        return ASPECT_INTERPRETATIONS[key1][aspect];
    }
    if (ASPECT_INTERPRETATIONS[key2]?.[aspect]) {
        return ASPECT_INTERPRETATIONS[key2][aspect];
    }
    // Default interpretation
    const nature = ASPECT_NATURE[aspect] || 'neutral';
    const defaults = {
        harmonious: {
            en: `${userPlanet} and ${partnerPlanet} create harmonious energy together.`,
            bg: `${userPlanet} и ${partnerPlanet} създават хармонична енергия заедно.`,
        },
        challenging: {
            en: `${userPlanet} and ${partnerPlanet} create dynamic tension that promotes growth.`,
            bg: `${userPlanet} и ${partnerPlanet} създават динамично напрежение, което насърчава растежа.`,
        },
        neutral: {
            en: `${userPlanet} and ${partnerPlanet} connect in a meaningful way.`,
            bg: `${userPlanet} и ${partnerPlanet} се свързват по смислен начин.`,
        },
    };
    return defaults[nature];
}
function generateCacheKey(userId, partnerId) {
    return `synastry:${userId}:${partnerId}`;
}
// ============================================
// Main Service Functions
// ============================================
/**
 * Calculate synastry chart between user and partner
 */
async function calculateSynastryChart(userBirthData, partnerBirthData, userId, partnerId) {
    // Calculate both natal charts
    const [userChart, partnerChart] = await Promise.all([
        (0, astrology_1.calculateNatalChart)(userBirthData),
        (0, astrology_1.calculateNatalChart)(partnerBirthData),
    ]);
    // Get all planets for comparison
    const userPlanets = [
        { name: 'sun', data: userChart.sun },
        { name: 'moon', data: userChart.moon },
        { name: 'mercury', data: userChart.mercury },
        { name: 'venus', data: userChart.venus },
        { name: 'mars', data: userChart.mars },
        { name: 'jupiter', data: userChart.jupiter },
        { name: 'saturn', data: userChart.saturn },
        { name: 'uranus', data: userChart.uranus },
        { name: 'neptune', data: userChart.neptune },
        { name: 'pluto', data: userChart.pluto },
        { name: 'northNode', data: userChart.northNode },
        { name: 'southNode', data: userChart.southNode },
        { name: 'chiron', data: userChart.chiron },
    ].filter(p => p.data);
    const partnerPlanets = [
        { name: 'sun', data: partnerChart.sun },
        { name: 'moon', data: partnerChart.moon },
        { name: 'mercury', data: partnerChart.mercury },
        { name: 'venus', data: partnerChart.venus },
        { name: 'mars', data: partnerChart.mars },
        { name: 'jupiter', data: partnerChart.jupiter },
        { name: 'saturn', data: partnerChart.saturn },
        { name: 'uranus', data: partnerChart.uranus },
        { name: 'neptune', data: partnerChart.neptune },
        { name: 'pluto', data: partnerChart.pluto },
        { name: 'northNode', data: partnerChart.northNode },
        { name: 'southNode', data: partnerChart.southNode },
        { name: 'chiron', data: partnerChart.chiron },
    ].filter(p => p.data);
    // Calculate inter-planetary aspects
    const interAspects = [];
    for (const userPlanet of userPlanets) {
        for (const partnerPlanet of partnerPlanets) {
            const userDegree = getAbsoluteDegree(userPlanet.data.sign, userPlanet.data.degree);
            const partnerDegree = getAbsoluteDegree(partnerPlanet.data.sign, partnerPlanet.data.degree);
            const angle = calculateAngle(userDegree, partnerDegree);
            const aspectResult = determineAspect(angle);
            if (aspectResult) {
                const interpretation = getInterpretation(userPlanet.name, partnerPlanet.name, aspectResult.aspect);
                interAspects.push({
                    userPlanet: userPlanet.name,
                    userSign: userPlanet.data.sign,
                    userDegree: userPlanet.data.degree,
                    partnerPlanet: partnerPlanet.name,
                    partnerSign: partnerPlanet.data.sign,
                    partnerDegree: partnerPlanet.data.degree,
                    aspect: aspectResult.aspect,
                    aspectBg: ASPECT_TRANSLATIONS[aspectResult.aspect] || aspectResult.aspect,
                    orb: aspectResult.orb,
                    nature: ASPECT_NATURE[aspectResult.aspect] || 'neutral',
                    interpretation,
                });
            }
        }
    }
    // Sort aspects by orb (tightest first)
    interAspects.sort((a, b) => a.orb - b.orb);
    // Calculate compatibility score
    const compatibilityScore = calculateCompatibilityScore(interAspects);
    // Generate strengths and challenges
    const strengths = identifyStrengths(interAspects);
    const challenges = identifyChallenges(interAspects);
    // Generate summary
    const summary = generateSummary(userChart.sun.sign, userChart.moon.sign, partnerChart.sun.sign, partnerChart.moon.sign, compatibilityScore, interAspects);
    const synastryChart = {
        userChart: {
            sun: userChart.sun,
            moon: userChart.moon,
            rising: userChart.rising,
            mercury: userChart.mercury,
            venus: userChart.venus,
            mars: userChart.mars,
            jupiter: userChart.jupiter,
            saturn: userChart.saturn,
            uranus: userChart.uranus,
            neptune: userChart.neptune,
            pluto: userChart.pluto,
            northNode: userChart.northNode,
            southNode: userChart.southNode,
            chiron: userChart.chiron,
            houses: userChart.houses,
            aspects: userChart.aspects,
            elements: userChart.elements,
            modalities: userChart.modalities,
        },
        partnerChart: {
            sun: partnerChart.sun,
            moon: partnerChart.moon,
            rising: partnerChart.rising,
            mercury: partnerChart.mercury,
            venus: partnerChart.venus,
            mars: partnerChart.mars,
            jupiter: partnerChart.jupiter,
            saturn: partnerChart.saturn,
            uranus: partnerChart.uranus,
            neptune: partnerChart.neptune,
            pluto: partnerChart.pluto,
            northNode: partnerChart.northNode,
            southNode: partnerChart.southNode,
            chiron: partnerChart.chiron,
            houses: partnerChart.houses,
            aspects: partnerChart.aspects,
            elements: partnerChart.elements,
            modalities: partnerChart.modalities,
        },
        interAspects,
        compatibilityScore,
        strengths,
        challenges,
        summary,
        calculatedAt: new Date().toISOString(),
    };
    return synastryChart;
}
/**
 * Calculate overall compatibility score (0-100)
 */
function calculateCompatibilityScore(aspects) {
    if (aspects.length === 0)
        return 50;
    // Weight aspects by planet importance
    const personalPlanets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'rising'];
    let totalScore = 0;
    let totalWeight = 0;
    for (const aspect of aspects) {
        // Weight by planet importance
        const isUserPersonal = personalPlanets.includes(aspect.userPlanet);
        const isPartnerPersonal = personalPlanets.includes(aspect.partnerPlanet);
        let weight = 1;
        if (isUserPersonal && isPartnerPersonal) {
            weight = 3; // Personal to personal = most important
        }
        else if (isUserPersonal || isPartnerPersonal) {
            weight = 2; // Personal to outer = medium importance
        }
        // Reduce weight for wide orbs
        weight *= (1 - aspect.orb / 10);
        // Score based on aspect nature
        let score = 50;
        if (aspect.nature === 'harmonious') {
            score = 80;
        }
        else if (aspect.nature === 'challenging') {
            score = 30;
        }
        totalScore += score * weight;
        totalWeight += weight;
    }
    return Math.round(totalWeight > 0 ? totalScore / totalWeight : 50);
}
/**
 * Identify relationship strengths
 */
function identifyStrengths(aspects) {
    const strengths = [];
    // Find harmonious aspects between personal planets
    const harmonious = aspects.filter(a => a.nature === 'harmonious' && a.orb < 5);
    // Group by planet combinations
    const sunMoon = harmonious.find(a => (a.userPlanet === 'sun' && a.partnerPlanet === 'moon') ||
        (a.userPlanet === 'moon' && a.partnerPlanet === 'sun'));
    if (sunMoon) {
        strengths.push({
            title: {
                en: 'Emotional-Expressive Harmony',
                bg: 'Емоционално-експресивна хармония',
            },
            description: {
                en: 'Your emotional needs and self-expression align beautifully.',
                bg: 'Вашите емоционални нужди и самоизразяване се съчетават прекрасно.',
            },
            planets: [sunMoon.userPlanet, sunMoon.partnerPlanet],
        });
    }
    const venusMars = harmonious.find(a => (a.userPlanet === 'venus' && a.partnerPlanet === 'mars') ||
        (a.userPlanet === 'mars' && a.partnerPlanet === 'venus'));
    if (venusMars) {
        strengths.push({
            title: {
                en: 'Romantic Chemistry',
                bg: 'Романтична химия',
            },
            description: {
                en: 'Strong attraction and passion between you.',
                bg: 'Силно привличане и страст между вас.',
            },
            planets: [venusMars.userPlanet, venusMars.partnerPlanet],
        });
    }
    const moonMoon = harmonious.find(a => a.userPlanet === 'moon' && a.partnerPlanet === 'moon');
    if (moonMoon) {
        strengths.push({
            title: {
                en: 'Emotional Resonance',
                bg: 'Емоционален резонанс',
            },
            description: {
                en: 'Deep understanding of each other\'s emotional worlds.',
                bg: 'Дълбоко разбиране на емоционалните светове един на друг.',
            },
            planets: ['moon', 'moon'],
        });
    }
    // Add generic strengths based on harmonious aspects
    if (harmonious.length >= 5 && strengths.length < 3) {
        strengths.push({
            title: {
                en: 'Natural Flow',
                bg: 'Естествен поток',
            },
            description: {
                en: 'Multiple harmonious connections create ease in your relationship.',
                bg: 'Множество хармонични връзки създават лекота във вашата връзка.',
            },
            planets: harmonious.slice(0, 3).map(a => a.userPlanet),
        });
    }
    return strengths;
}
/**
 * Identify relationship challenges
 */
function identifyChallenges(aspects) {
    const challenges = [];
    // Find challenging aspects
    const difficult = aspects.filter(a => a.nature === 'challenging' && a.orb < 5);
    const sunSaturn = difficult.find(a => (a.userPlanet === 'sun' && a.partnerPlanet === 'saturn') ||
        (a.userPlanet === 'saturn' && a.partnerPlanet === 'sun'));
    if (sunSaturn) {
        challenges.push({
            title: {
                en: 'Responsibility vs Freedom',
                bg: 'Отговорност срещу свобода',
            },
            description: {
                en: 'Balancing commitment with individual expression requires work.',
                bg: 'Балансирането на ангажимент с индивидуално изразяване изисква работа.',
            },
            planets: [sunSaturn.userPlanet, sunSaturn.partnerPlanet],
        });
    }
    const moonSaturn = difficult.find(a => (a.userPlanet === 'moon' && a.partnerPlanet === 'saturn') ||
        (a.userPlanet === 'saturn' && a.partnerPlanet === 'moon'));
    if (moonSaturn) {
        challenges.push({
            title: {
                en: 'Emotional Walls',
                bg: 'Емоционални стени',
            },
            description: {
                en: 'Learning to be vulnerable and emotionally open with each other.',
                bg: 'Учене да бъдете уязвими и емоционално отворени един с друг.',
            },
            planets: [moonSaturn.userPlanet, moonSaturn.partnerPlanet],
        });
    }
    const marsSaturn = difficult.find(a => (a.userPlanet === 'mars' && a.partnerPlanet === 'saturn') ||
        (a.userPlanet === 'saturn' && a.partnerPlanet === 'mars'));
    if (marsSaturn) {
        challenges.push({
            title: {
                en: 'Action vs Caution',
                bg: 'Действие срещу предпазливост',
            },
            description: {
                en: 'Finding balance between impulse and restraint.',
                bg: 'Намиране на баланс между импулса и въздържанието.',
            },
            planets: [marsSaturn.userPlanet, marsSaturn.partnerPlanet],
        });
    }
    // Add generic challenges
    if (difficult.length >= 3 && challenges.length < 2) {
        challenges.push({
            title: {
                en: 'Growth Through Tension',
                bg: 'Растеж чрез напрежение',
            },
            description: {
                en: 'Challenging aspects push you both to grow and evolve.',
                bg: 'Предизвикателните аспекти ви подтикват и двамата да растете и еволюирате.',
            },
            planets: difficult.slice(0, 3).map(a => a.userPlanet),
        });
    }
    return challenges;
}
/**
 * Generate relationship summary
 */
function generateSummary(userSun, userMoon, partnerSun, partnerMoon, score, aspects) {
    const harmoniousCount = aspects.filter(a => a.nature === 'harmonious').length;
    const challengingCount = aspects.filter(a => a.nature === 'challenging').length;
    let compatibility = 'moderate';
    if (score >= 70)
        compatibility = 'high';
    else if (score < 40)
        compatibility = 'challenging';
    const summaries = {
        high: {
            en: `Your ${userSun} Sun and ${userMoon} Moon connect beautifully with your partner's ${partnerSun} Sun and ${partnerMoon} Moon. With ${harmoniousCount} harmonious aspects between your charts, you have a natural flow and understanding. This is a relationship with strong potential for lasting connection.`,
            bg: `Вашето ${userSun} Слънце и ${userMoon} Луна се свързват прекрасно със ${partnerSun} Слънце и ${partnerMoon} Луна на партньора ви. С ${harmoniousCount} хармонични аспекти между вашите карти, имате естествен поток и разбиране. Това е връзка с голям потенциал за трайна връзка.`,
        },
        moderate: {
            en: `Your ${userSun} Sun and ${userMoon} Moon interact with your partner's ${partnerSun} Sun and ${partnerMoon} Moon in interesting ways. With a mix of ${harmoniousCount} harmonious and ${challengingCount} challenging aspects, your relationship has both ease and areas for growth. This creates a dynamic partnership with learning opportunities.`,
            bg: `Вашето ${userSun} Слънце и ${userMoon} Луна взаимодействат със ${partnerSun} Слънце и ${partnerMoon} Луна на партньора ви по интересни начини. С комбинация от ${harmoniousCount} хармонични и ${challengingCount} предизвикателни аспекти, вашата връзка има както лекота, така и области за растеж. Това създава динамично партньорство с възможности за учене.`,
        },
        challenging: {
            en: `Your ${userSun} Sun and ${userMoon} Moon engage with your partner's ${partnerSun} Sun and ${partnerMoon} Moon through ${challengingCount} challenging aspects. While this creates friction, it also brings tremendous growth potential. This relationship requires work but can lead to profound transformation for both partners.`,
            bg: `Вашето ${userSun} Слънце и ${userMoon} Луна се ангажират със ${partnerSun} Слънце и ${partnerMoon} Луна на партньора ви чрез ${challengingCount} предизвикателни аспекти. Въпреки че това създава триене, то също така носи огромен потенциал за растеж. Тази връзка изисква работа, но може да доведе до дълбока трансформация и за двамата партньори.`,
        },
    };
    return summaries[compatibility];
}
/**
 * Get cached synastry chart
 */
/** Redis cache removed */
async function getCachedSynastry(_userId, _partnerId) {
    return null;
}
/** Redis cache removed — no-op */
async function invalidateSynastryCache(_userId, _partnerId) { }
//# sourceMappingURL=synastry.service.js.map