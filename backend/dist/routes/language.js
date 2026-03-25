"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var language_exports = {};
__export(language_exports, {
  default: () => language_default
});
module.exports = __toCommonJS(language_exports);
var import_express = require("express");
var import_auth = require("../middleware/auth");
var import_userPreferencesController = require("../controllers/userPreferencesController");
const router = (0, import_express.Router)();
router.post("/detect", import_userPreferencesController.detectLanguage);
router.get("/preferences", import_auth.authMiddleware, import_userPreferencesController.getPreferences);
router.put("/preferences", import_auth.authMiddleware, import_userPreferencesController.updatePreferences);
router.get("/terms", async (req, res) => {
  const { language = "bg", category = "all" } = req.query;
  const terms = {
    bg: {
      planets: {
        sun: { name: "\u0421\u043B\u044A\u043D\u0446\u0435", symbol: "\u2609", keywords: ["\u0435\u0433\u043E", "\u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442", "\u0436\u0438\u0437\u043D\u0435\u043D\u043E\u0441\u0442"] },
        moon: { name: "\u041B\u0443\u043D\u0430", symbol: "\u263D", keywords: ["\u0435\u043C\u043E\u0446\u0438\u0438", "\u0438\u043D\u0441\u0442\u0438\u043D\u043A\u0442\u0438", "\u043F\u043E\u0434\u0441\u044A\u0437\u043D\u0430\u043D\u0438\u0435"] },
        mercury: { name: "\u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439", symbol: "\u263F", keywords: ["\u043A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F", "\u043C\u0438\u0441\u043B\u0435\u043D\u0435"] },
        venus: { name: "\u0412\u0435\u043D\u0435\u0440\u0430", symbol: "\u2640", keywords: ["\u043B\u044E\u0431\u043E\u0432", "\u043A\u0440\u0430\u0441\u043E\u0442\u0430", "\u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438"] },
        mars: { name: "\u041C\u0430\u0440\u0441", symbol: "\u2642", keywords: ["\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435", "\u0435\u043D\u0435\u0440\u0433\u0438\u044F", "\u0430\u043C\u0431\u0438\u0446\u0438\u044F"] },
        jupiter: { name: "\u042E\u043F\u0438\u0442\u0435\u0440", symbol: "\u2643", keywords: ["\u0440\u0430\u0437\u0448\u0438\u0440\u0435\u043D\u0438\u0435", "\u043A\u044A\u0441\u043C\u0435\u0442", "\u043C\u044A\u0434\u0440\u043E\u0441\u0442"] },
        saturn: { name: "\u0421\u0430\u0442\u0443\u0440\u043D", symbol: "\u2644", keywords: ["\u0434\u0438\u0441\u0446\u0438\u043F\u043B\u0438\u043D\u0430", "\u043A\u0430\u0440\u043C\u0430", "\u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430"] },
        uranus: { name: "\u0423\u0440\u0430\u043D", symbol: "\u2645", keywords: ["\u043F\u0440\u043E\u043C\u044F\u043D\u0430", "\u0438\u043D\u043E\u0432\u0430\u0446\u0438\u044F", "\u0441\u0432\u043E\u0431\u043E\u0434\u0430"] },
        neptune: { name: "\u041D\u0435\u043F\u0442\u0443\u043D", symbol: "\u2646", keywords: ["\u043C\u0435\u0447\u0442\u0438", "\u0438\u043B\u0443\u0437\u0438\u0438", "\u0438\u043D\u0442\u0443\u0438\u0446\u0438\u044F"] },
        pluto: { name: "\u041F\u043B\u0443\u0442\u043E\u043D", symbol: "\u2647", keywords: ["\u0442\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F", "\u0432\u043B\u0430\u0441\u0442\u044C", "\u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F"] }
      },
      signs: {
        aries: { name: "\u041E\u0432\u0435\u043D", element: "\u041E\u0433\u044A\u043D", modality: "\u041A\u0430\u0440\u0434\u0438\u043D\u0430\u043B\u0435\u043D" },
        taurus: { name: "\u0422\u0435\u043B\u0435\u0446", element: "\u0417\u0435\u043C\u044F", modality: "\u0424\u0438\u043A\u0441\u0438\u0440\u0430\u043D" },
        gemini: { name: "\u0411\u043B\u0438\u0437\u043D\u0430\u0446\u0438", element: "\u0412\u044A\u0437\u0434\u0443\u0445", modality: "\u041C\u0443\u0442\u0430\u0431\u0435\u043B\u0435\u043D" },
        cancer: { name: "\u0420\u0430\u043A", element: "\u0412\u043E\u0434\u0430", modality: "\u041A\u0430\u0440\u0434\u0438\u043D\u0430\u043B\u0435\u043D" },
        leo: { name: "\u041B\u044A\u0432", element: "\u041E\u0433\u044A\u043D", modality: "\u0424\u0438\u043A\u0441\u0438\u0440\u0430\u043D" },
        virgo: { name: "\u0414\u0435\u0432\u0430", element: "\u0417\u0435\u043C\u044F", modality: "\u041C\u0443\u0442\u0430\u0431\u0435\u043B\u0435\u043D" },
        libra: { name: "\u0412\u0435\u0437\u043D\u0438", element: "\u0412\u044A\u0437\u0434\u0443\u0445", modality: "\u041A\u0430\u0440\u0434\u0438\u043D\u0430\u043B\u0435\u043D" },
        scorpio: { name: "\u0421\u043A\u043E\u0440\u043F\u0438\u043E\u043D", element: "\u0412\u043E\u0434\u0430", modality: "\u0424\u0438\u043A\u0441\u0438\u0440\u0430\u043D" },
        sagittarius: { name: "\u0421\u0442\u0440\u0435\u043B\u0435\u0446", element: "\u041E\u0433\u044A\u043D", modality: "\u041C\u0443\u0442\u0430\u0431\u0435\u043B\u0435\u043D" },
        capricorn: { name: "\u041A\u043E\u0437\u0438\u0440\u043E\u0433", element: "\u0417\u0435\u043C\u044F", modality: "\u041A\u0430\u0440\u0434\u0438\u043D\u0430\u043B\u0435\u043D" },
        aquarius: { name: "\u0412\u043E\u0434\u043E\u043B\u0435\u0439", element: "\u0412\u044A\u0437\u0434\u0443\u0445", modality: "\u0424\u0438\u043A\u0441\u0438\u0440\u0430\u043D" },
        pisces: { name: "\u0420\u0438\u0431\u0438", element: "\u0412\u043E\u0434\u0430", modality: "\u041C\u0443\u0442\u0430\u0431\u0435\u043B\u0435\u043D" }
      },
      aspects: {
        conjunction: { name: "\u0421\u044A\u0432\u043F\u0430\u0434", angle: 0, nature: "\u041D\u0435\u0443\u0442\u0440\u0430\u043B\u0435\u043D" },
        sextile: { name: "\u0421\u0435\u043A\u0441\u0442\u0438\u043B", angle: 60, nature: "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u0435\u043D" },
        square: { name: "\u041A\u0432\u0430\u0434\u0440\u0430\u0442", angle: 90, nature: "\u041D\u0430\u043F\u0440\u0435\u0433\u043D\u0430\u0442" },
        trine: { name: "\u0422\u0440\u0438\u0433\u043E\u043D", angle: 120, nature: "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u0435\u043D" },
        opposition: { name: "\u041E\u043F\u043E\u0437\u0438\u0446\u0438\u044F", angle: 180, nature: "\u041D\u0430\u043F\u0440\u0435\u0433\u043D\u0430\u0442" }
      },
      houses: {
        "1": { name: "\u041F\u044A\u0440\u0432\u0438 \u0434\u043E\u043C", area: "\u0410\u0437", keywords: ["\u043B\u0438\u0447\u043D\u043E\u0441\u0442", "\u0432\u044A\u043D\u0448\u043D\u043E\u0441\u0442", "\u0442\u0435\u043C\u043F\u0435\u0440\u0430\u043C\u0435\u043D\u0442"] },
        "2": { name: "\u0412\u0442\u043E\u0440\u0438 \u0434\u043E\u043C", area: "\u0420\u0435\u0441\u0443\u0440\u0441\u0438", keywords: ["\u043F\u0430\u0440\u0438", "\u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438", "\u0441\u0438\u0433\u0443\u0440\u043D\u043E\u0441\u0442"] },
        "3": { name: "\u0422\u0440\u0435\u0442\u0438 \u0434\u043E\u043C", area: "\u041A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F", keywords: ["\u043C\u0438\u0441\u043B\u0435\u043D\u0435", "\u0431\u043B\u0438\u0437\u043A\u0438", "\u0443\u0447\u0435\u043D\u0435"] },
        "4": { name: "\u0427\u0435\u0442\u0432\u044A\u0440\u0442\u0438 \u0434\u043E\u043C", area: "\u0414\u043E\u043C", keywords: ["\u0441\u0435\u043C\u0435\u0439\u0441\u0442\u0432\u043E", "\u043A\u043E\u0440\u0435\u043D\u0438", "\u0432\u044A\u0442\u0440\u0435\u0448\u0435\u043D \u0441\u0432\u044F\u0442"] },
        "5": { name: "\u041F\u0435\u0442\u0438 \u0434\u043E\u043C", area: "\u0422\u0432\u043E\u0440\u0447\u0435\u0441\u0442\u0432\u043E", keywords: ["\u043B\u044E\u0431\u043E\u0432", "\u0434\u0435\u0446\u0430", "\u0445\u043E\u0431\u0438\u0442\u0430"] },
        "6": { name: "\u0428\u0435\u0441\u0442\u0438 \u0434\u043E\u043C", area: "\u0417\u0434\u0440\u0430\u0432\u0435", keywords: ["\u0440\u0430\u0431\u043E\u0442\u0430", "\u0440\u0443\u0442\u0438\u043D\u0438", "\u0437\u0434\u0440\u0430\u0432\u0435"] },
        "7": { name: "\u0421\u0435\u0434\u043C\u0438 \u0434\u043E\u043C", area: "\u041F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0441\u0442\u0432\u043E", keywords: ["\u0432\u0440\u044A\u0437\u043A\u0438", "\u0431\u0440\u0430\u043A", "\u0441\u044A\u0442\u0440\u0443\u0434\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u043E"] },
        "8": { name: "\u041E\u0441\u043C\u0438 \u0434\u043E\u043C", area: "\u0422\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F", keywords: ["\u0441\u043C\u044A\u0440\u0442", "\u043D\u0430\u0441\u043B\u0435\u0434\u0441\u0442\u0432\u043E", "\u0442\u0430\u0439\u043D\u0438"] },
        "9": { name: "\u0414\u0435\u0432\u0435\u0442\u0438 \u0434\u043E\u043C", area: "\u0424\u0438\u043B\u043E\u0441\u043E\u0444\u0438\u044F", keywords: ["\u043F\u044A\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044F", "\u0432\u0438\u0441\u0448\u0435 \u0443\u0447\u0435\u043D\u0435", "\u0432\u044F\u0440\u0430"] },
        "10": { name: "\u0414\u0435\u0441\u0435\u0442\u0438 \u0434\u043E\u043C", area: "\u041A\u0430\u0440\u0438\u0435\u0440\u0430", keywords: ["\u0440\u0435\u043F\u0443\u0442\u0430\u0446\u0438\u044F", "\u043F\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F", "\u043F\u0440\u0438\u0437\u0432\u0430\u043D\u0438\u0435"] },
        "11": { name: "\u0415\u0434\u0438\u043D\u0430\u0434\u0435\u0441\u0435\u0442\u0438 \u0434\u043E\u043C", area: "\u041E\u0431\u0449\u043D\u043E\u0441\u0442", keywords: ["\u043F\u0440\u0438\u044F\u0442\u0435\u043B\u0438", "\u0433\u0440\u0443\u043F\u0438", "\u0438\u0434\u0435\u0430\u043B\u0438"] },
        "12": { name: "\u0414\u0432\u0430\u043D\u0430\u0434\u0435\u0441\u0435\u0442\u0438 \u0434\u043E\u043C", area: "\u0414\u0443\u0445\u043E\u0432\u043D\u043E\u0441\u0442", keywords: ["\u043F\u043E\u0434\u0441\u044A\u0437\u043D\u0430\u043D\u0438\u0435", "\u043A\u0430\u0440\u043C\u0430", "\u0438\u0437\u043E\u043B\u0430\u0446\u0438\u044F"] }
      }
    },
    en: {
      planets: {
        sun: { name: "Sun", symbol: "\u2609", keywords: ["ego", "identity", "vitality"] },
        moon: { name: "Moon", symbol: "\u263D", keywords: ["emotions", "instincts", "subconscious"] },
        mercury: { name: "Mercury", symbol: "\u263F", keywords: ["communication", "thinking"] },
        venus: { name: "Venus", symbol: "\u2640", keywords: ["love", "beauty", "values"] },
        mars: { name: "Mars", symbol: "\u2642", keywords: ["action", "energy", "ambition"] },
        jupiter: { name: "Jupiter", symbol: "\u2643", keywords: ["expansion", "luck", "wisdom"] },
        saturn: { name: "Saturn", symbol: "\u2644", keywords: ["discipline", "karma", "structure"] },
        uranus: { name: "Uranus", symbol: "\u2645", keywords: ["change", "innovation", "freedom"] },
        neptune: { name: "Neptune", symbol: "\u2646", keywords: ["dreams", "illusions", "intuition"] },
        pluto: { name: "Pluto", symbol: "\u2647", keywords: ["transformation", "power", "regeneration"] }
      },
      signs: {
        aries: { name: "Aries", element: "Fire", modality: "Cardinal" },
        taurus: { name: "Taurus", element: "Earth", modality: "Fixed" },
        gemini: { name: "Gemini", element: "Air", modality: "Mutable" },
        cancer: { name: "Cancer", element: "Water", modality: "Cardinal" },
        leo: { name: "Leo", element: "Fire", modality: "Fixed" },
        virgo: { name: "Virgo", element: "Earth", modality: "Mutable" },
        libra: { name: "Libra", element: "Air", modality: "Cardinal" },
        scorpio: { name: "Scorpio", element: "Water", modality: "Fixed" },
        sagittarius: { name: "Sagittarius", element: "Fire", modality: "Mutable" },
        capricorn: { name: "Capricorn", element: "Earth", modality: "Cardinal" },
        aquarius: { name: "Aquarius", element: "Air", modality: "Fixed" },
        pisces: { name: "Pisces", element: "Water", modality: "Mutable" }
      },
      aspects: {
        conjunction: { name: "Conjunction", angle: 0, nature: "Neutral" },
        sextile: { name: "Sextile", angle: 60, nature: "Harmonious" },
        square: { name: "Square", angle: 90, nature: "Challenging" },
        trine: { name: "Trine", angle: 120, nature: "Harmonious" },
        opposition: { name: "Opposition", angle: 180, nature: "Challenging" }
      },
      houses: {
        "1": { name: "First House", area: "Self", keywords: ["personality", "appearance", "temperament"] },
        "2": { name: "Second House", area: "Resources", keywords: ["money", "values", "security"] },
        "3": { name: "Third House", area: "Communication", keywords: ["thinking", "siblings", "learning"] },
        "4": { name: "Fourth House", area: "Home", keywords: ["family", "roots", "inner world"] },
        "5": { name: "Fifth House", area: "Creativity", keywords: ["love", "children", "hobbies"] },
        "6": { name: "Sixth House", area: "Health", keywords: ["work", "routines", "health"] },
        "7": { name: "Seventh House", area: "Partnership", keywords: ["relationships", "marriage", "cooperation"] },
        "8": { name: "Eighth House", area: "Transformation", keywords: ["death", "inheritance", "secrets"] },
        "9": { name: "Ninth House", area: "Philosophy", keywords: ["travel", "higher learning", "faith"] },
        "10": { name: "Tenth House", area: "Career", keywords: ["reputation", "achievements", "calling"] },
        "11": { name: "Eleventh House", area: "Community", keywords: ["friends", "groups", "ideals"] },
        "12": { name: "Twelfth House", area: "Spirituality", keywords: ["subconscious", "karma", "isolation"] }
      }
    }
  };
  const lang = language === "en" ? "en" : "bg";
  const langTerms = terms[lang];
  let result;
  if (category === "all") {
    result = langTerms;
  } else {
    result = { [category]: langTerms[category] || {} };
  }
  res.status(200).json({
    success: true,
    data: {
      language: lang,
      terms: result
    }
  });
});
var language_default = router;
