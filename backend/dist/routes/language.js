"use strict";
/**
 * Language Routes
 * Handles language preferences and translation
 *
 * US-26: Auto-Detect User Language
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const userPreferencesController_1 = require("../controllers/userPreferencesController");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/language/detect
 * @desc    Detect language from Accept-Language header (public)
 * @access  Public
 */
router.post('/detect', userPreferencesController_1.detectLanguage);
/**
 * @route   GET /api/v1/language/preferences
 * @desc    Get user's language preferences
 * @access  Public (with optional auth)
 */
router.get('/preferences', auth_1.authMiddleware, userPreferencesController_1.getPreferences);
/**
 * @route   PUT /api/v1/language/preferences
 * @desc    Update user's language preferences
 * @access  Private
 */
router.put('/preferences', auth_1.authMiddleware, userPreferencesController_1.updatePreferences);
/**
 * @route   GET /api/v1/language/terms
 * @desc    Get astrological term translations
 * @access  Public
 */
router.get('/terms', async (req, res) => {
    const { language = 'bg', category = 'all' } = req.query;
    // Astrological terms translations
    const terms = {
        bg: {
            planets: {
                sun: { name: 'Слънце', symbol: '☉', keywords: ['его', 'идентичност', 'жизненост'] },
                moon: { name: 'Луна', symbol: '☽', keywords: ['емоции', 'инстинкти', 'подсъзнание'] },
                mercury: { name: 'Меркурий', symbol: '☿', keywords: ['комуникация', 'мислене'] },
                venus: { name: 'Венера', symbol: '♀', keywords: ['любов', 'красота', 'ценности'] },
                mars: { name: 'Марс', symbol: '♂', keywords: ['действие', 'енергия', 'амбиция'] },
                jupiter: { name: 'Юпитер', symbol: '♃', keywords: ['разширение', 'късмет', 'мъдрост'] },
                saturn: { name: 'Сатурн', symbol: '♄', keywords: ['дисциплина', 'карма', 'структура'] },
                uranus: { name: 'Уран', symbol: '♅', keywords: ['промяна', 'иновация', 'свобода'] },
                neptune: { name: 'Нептун', symbol: '♆', keywords: ['мечти', 'илузии', 'интуиция'] },
                pluto: { name: 'Плутон', symbol: '♇', keywords: ['трансформация', 'власть', 'регенерация'] },
            },
            signs: {
                aries: { name: 'Овен', element: 'Огън', modality: 'Кардинален' },
                taurus: { name: 'Телец', element: 'Земя', modality: 'Фиксиран' },
                gemini: { name: 'Близнаци', element: 'Въздух', modality: 'Мутабелен' },
                cancer: { name: 'Рак', element: 'Вода', modality: 'Кардинален' },
                leo: { name: 'Лъв', element: 'Огън', modality: 'Фиксиран' },
                virgo: { name: 'Дева', element: 'Земя', modality: 'Мутабелен' },
                libra: { name: 'Везни', element: 'Въздух', modality: 'Кардинален' },
                scorpio: { name: 'Скорпион', element: 'Вода', modality: 'Фиксиран' },
                sagittarius: { name: 'Стрелец', element: 'Огън', modality: 'Мутабелен' },
                capricorn: { name: 'Козирог', element: 'Земя', modality: 'Кардинален' },
                aquarius: { name: 'Водолей', element: 'Въздух', modality: 'Фиксиран' },
                pisces: { name: 'Риби', element: 'Вода', modality: 'Мутабелен' },
            },
            aspects: {
                conjunction: { name: 'Съвпад', angle: 0, nature: 'Неутрален' },
                sextile: { name: 'Секстил', angle: 60, nature: 'Хармоничен' },
                square: { name: 'Квадрат', angle: 90, nature: 'Напрегнат' },
                trine: { name: 'Тригон', angle: 120, nature: 'Хармоничен' },
                opposition: { name: 'Опозиция', angle: 180, nature: 'Напрегнат' },
            },
            houses: {
                '1': { name: 'Първи дом', area: 'Аз', keywords: ['личност', 'външност', 'темперамент'] },
                '2': { name: 'Втори дом', area: 'Ресурси', keywords: ['пари', 'ценности', 'сигурност'] },
                '3': { name: 'Трети дом', area: 'Комуникация', keywords: ['мислене', 'близки', 'учене'] },
                '4': { name: 'Четвърти дом', area: 'Дом', keywords: ['семейство', 'корени', 'вътрешен свят'] },
                '5': { name: 'Пети дом', area: 'Творчество', keywords: ['любов', 'деца', 'хобита'] },
                '6': { name: 'Шести дом', area: 'Здраве', keywords: ['работа', 'рутини', 'здраве'] },
                '7': { name: 'Седми дом', area: 'Партньорство', keywords: ['връзки', 'брак', 'сътрудничество'] },
                '8': { name: 'Осми дом', area: 'Трансформация', keywords: ['смърт', 'наследство', 'тайни'] },
                '9': { name: 'Девети дом', area: 'Философия', keywords: ['пътешествия', 'висше учене', 'вяра'] },
                '10': { name: 'Десети дом', area: 'Кариера', keywords: ['репутация', 'постижения', 'призвание'] },
                '11': { name: 'Единадесети дом', area: 'Общност', keywords: ['приятели', 'групи', 'идеали'] },
                '12': { name: 'Дванадесети дом', area: 'Духовност', keywords: ['подсъзнание', 'карма', 'изолация'] },
            },
        },
        en: {
            planets: {
                sun: { name: 'Sun', symbol: '☉', keywords: ['ego', 'identity', 'vitality'] },
                moon: { name: 'Moon', symbol: '☽', keywords: ['emotions', 'instincts', 'subconscious'] },
                mercury: { name: 'Mercury', symbol: '☿', keywords: ['communication', 'thinking'] },
                venus: { name: 'Venus', symbol: '♀', keywords: ['love', 'beauty', 'values'] },
                mars: { name: 'Mars', symbol: '♂', keywords: ['action', 'energy', 'ambition'] },
                jupiter: { name: 'Jupiter', symbol: '♃', keywords: ['expansion', 'luck', 'wisdom'] },
                saturn: { name: 'Saturn', symbol: '♄', keywords: ['discipline', 'karma', 'structure'] },
                uranus: { name: 'Uranus', symbol: '♅', keywords: ['change', 'innovation', 'freedom'] },
                neptune: { name: 'Neptune', symbol: '♆', keywords: ['dreams', 'illusions', 'intuition'] },
                pluto: { name: 'Pluto', symbol: '♇', keywords: ['transformation', 'power', 'regeneration'] },
            },
            signs: {
                aries: { name: 'Aries', element: 'Fire', modality: 'Cardinal' },
                taurus: { name: 'Taurus', element: 'Earth', modality: 'Fixed' },
                gemini: { name: 'Gemini', element: 'Air', modality: 'Mutable' },
                cancer: { name: 'Cancer', element: 'Water', modality: 'Cardinal' },
                leo: { name: 'Leo', element: 'Fire', modality: 'Fixed' },
                virgo: { name: 'Virgo', element: 'Earth', modality: 'Mutable' },
                libra: { name: 'Libra', element: 'Air', modality: 'Cardinal' },
                scorpio: { name: 'Scorpio', element: 'Water', modality: 'Fixed' },
                sagittarius: { name: 'Sagittarius', element: 'Fire', modality: 'Mutable' },
                capricorn: { name: 'Capricorn', element: 'Earth', modality: 'Cardinal' },
                aquarius: { name: 'Aquarius', element: 'Air', modality: 'Fixed' },
                pisces: { name: 'Pisces', element: 'Water', modality: 'Mutable' },
            },
            aspects: {
                conjunction: { name: 'Conjunction', angle: 0, nature: 'Neutral' },
                sextile: { name: 'Sextile', angle: 60, nature: 'Harmonious' },
                square: { name: 'Square', angle: 90, nature: 'Challenging' },
                trine: { name: 'Trine', angle: 120, nature: 'Harmonious' },
                opposition: { name: 'Opposition', angle: 180, nature: 'Challenging' },
            },
            houses: {
                '1': { name: 'First House', area: 'Self', keywords: ['personality', 'appearance', 'temperament'] },
                '2': { name: 'Second House', area: 'Resources', keywords: ['money', 'values', 'security'] },
                '3': { name: 'Third House', area: 'Communication', keywords: ['thinking', 'siblings', 'learning'] },
                '4': { name: 'Fourth House', area: 'Home', keywords: ['family', 'roots', 'inner world'] },
                '5': { name: 'Fifth House', area: 'Creativity', keywords: ['love', 'children', 'hobbies'] },
                '6': { name: 'Sixth House', area: 'Health', keywords: ['work', 'routines', 'health'] },
                '7': { name: 'Seventh House', area: 'Partnership', keywords: ['relationships', 'marriage', 'cooperation'] },
                '8': { name: 'Eighth House', area: 'Transformation', keywords: ['death', 'inheritance', 'secrets'] },
                '9': { name: 'Ninth House', area: 'Philosophy', keywords: ['travel', 'higher learning', 'faith'] },
                '10': { name: 'Tenth House', area: 'Career', keywords: ['reputation', 'achievements', 'calling'] },
                '11': { name: 'Eleventh House', area: 'Community', keywords: ['friends', 'groups', 'ideals'] },
                '12': { name: 'Twelfth House', area: 'Spirituality', keywords: ['subconscious', 'karma', 'isolation'] },
            },
        },
    };
    const lang = language === 'en' ? 'en' : 'bg';
    const langTerms = terms[lang];
    let result;
    if (category === 'all') {
        result = langTerms;
    }
    else {
        result = { [category]: langTerms[category] || {} };
    }
    res.status(200).json({
        success: true,
        data: {
            language: lang,
            terms: result,
        },
    });
});
exports.default = router;
//# sourceMappingURL=language.js.map