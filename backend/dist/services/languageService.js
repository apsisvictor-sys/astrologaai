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
var languageService_exports = {};
__export(languageService_exports, {
  BULGARIAN_ASTROLOGICAL_TERMS: () => BULGARIAN_ASTROLOGICAL_TERMS,
  buildSystemPromptWithLanguage: () => buildSystemPromptWithLanguage,
  default: () => languageService_default,
  detectLanguage: () => detectLanguage,
  getLanguageDirective: () => getLanguageDirective,
  getLanguageDirectiveWithContext: () => getLanguageDirectiveWithContext,
  isValidLanguage: () => isValidLanguage,
  normalizeLanguage: () => normalizeLanguage,
  validateBulgarianAstrologicalTerms: () => validateBulgarianAstrologicalTerms
});
module.exports = __toCommonJS(languageService_exports);
var import_languageDetection = require("../middleware/languageDetection");
const BULGARIAN_ASTROLOGICAL_TERMS = {
  planets: {
    sun: "\u0421\u043B\u044A\u043D\u0446\u0435",
    moon: "\u041B\u0443\u043D\u0430",
    mercury: "\u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439",
    venus: "\u0412\u0435\u043D\u0435\u0440\u0430",
    mars: "\u041C\u0430\u0440\u0441",
    jupiter: "\u042E\u043F\u0438\u0442\u0435\u0440",
    saturn: "\u0421\u0430\u0442\u0443\u0440\u043D",
    uranus: "\u0423\u0440\u0430\u043D",
    neptune: "\u041D\u0435\u043F\u0442\u0443\u043D",
    pluto: "\u041F\u043B\u0443\u0442\u043E\u043D",
    northNode: "\u0421\u0435\u0432\u0435\u0440\u0435\u043D \u0432\u044A\u0437\u0435\u043B",
    southNode: "\u042E\u0436\u0435\u043D \u0432\u044A\u0437\u0435\u043B",
    chiron: "\u0425\u0438\u0440\u043E\u043D",
    rising: "\u0410\u0441\u0446\u0435\u043D\u0434\u0435\u043D\u0442"
  },
  signs: {
    aries: "\u041E\u0432\u0435\u043D",
    taurus: "\u0422\u0435\u043B\u0435\u0446",
    gemini: "\u0411\u043B\u0438\u0437\u043D\u0430\u0446\u0438",
    cancer: "\u0420\u0430\u043A",
    leo: "\u041B\u044A\u0432",
    virgo: "\u0414\u0435\u0432\u0430",
    libra: "\u0412\u0435\u0437\u043D\u0438",
    scorpio: "\u0421\u043A\u043E\u0440\u043F\u0438\u043E\u043D",
    sagittarius: "\u0421\u0442\u0440\u0435\u043B\u0435\u0446",
    capricorn: "\u041A\u043E\u0437\u0438\u0440\u043E\u0433",
    aquarius: "\u0412\u043E\u0434\u043E\u043B\u0435\u0439",
    pisces: "\u0420\u0438\u0431\u0438"
  },
  aspects: {
    conjunction: "\u0441\u044A\u0432\u043F\u0430\u0434",
    opposition: "\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044F",
    trine: "\u0442\u0440\u0438\u0433\u043E\u043D",
    square: "\u043A\u0432\u0430\u0434\u0440\u0430\u0442",
    sextile: "\u0441\u0435\u043A\u0441\u0442\u0438\u043B",
    quincunx: "\u043A\u0432\u0438\u043D\u043A\u0443\u043D\u043A\u0441"
  },
  houses: {
    singular: "\u0434\u043E\u043C",
    plural: "\u0434\u043E\u043C\u0430",
    ordinals: [
      "\u041F\u044A\u0440\u0432\u0438",
      "\u0412\u0442\u043E\u0440\u0438",
      "\u0422\u0440\u0435\u0442\u0438",
      "\u0427\u0435\u0442\u0432\u044A\u0440\u0442\u0438",
      "\u041F\u0435\u0442\u0438",
      "\u0428\u0435\u0441\u0442\u0438",
      "\u0421\u0435\u0434\u043C\u0438",
      "\u041E\u0441\u043C\u0438",
      "\u0414\u0435\u0432\u0435\u0442\u0438",
      "\u0414\u0435\u0441\u0435\u0442\u0438",
      "\u0415\u0434\u0438\u043D\u0430\u0434\u0435\u0441\u0435\u0442\u0438",
      "\u0414\u0432\u0430\u043D\u0430\u0434\u0435\u0441\u0435\u0442\u0438"
    ]
  },
  elements: {
    fire: "\u041E\u0433\u044A\u043D",
    earth: "\u0417\u0435\u043C\u044F",
    air: "\u0412\u044A\u0437\u0434\u0443\u0445",
    water: "\u0412\u043E\u0434\u0430"
  },
  modalities: {
    cardinal: "\u041A\u0430\u0440\u0434\u0438\u043D\u0430\u043B\u0435\u043D",
    fixed: "\u0424\u0438\u043A\u0441\u0438\u0440\u0430\u043D",
    mutable: "\u041C\u0443\u0442\u0430\u0431\u0435\u043B\u0435\u043D"
  },
  moonPhases: {
    newMoon: "\u041D\u043E\u0432\u043E\u043B\u0443\u043D\u0438\u0435",
    waxingCrescent: "\u041D\u0430\u0440\u0430\u0441\u0442\u0432\u0430\u0449 \u043F\u043E\u043B\u0443\u043C\u0435\u0441\u0435\u0446",
    firstQuarter: "\u041F\u044A\u0440\u0432\u0430 \u0447\u0435\u0442\u0432\u044A\u0440\u0442",
    waxingGibbous: "\u041D\u0430\u0440\u0430\u0441\u0442\u0432\u0430\u0449 \u0442\u0440\u0438\u044A\u0433\u044A\u043B\u043D\u0438\u043A",
    fullMoon: "\u041F\u044A\u043B\u043D\u043E\u043B\u0443\u043D\u0438\u0435",
    waningGibbous: "\u041D\u0430\u043C\u0430\u043B\u044F\u0432\u0430\u0449 \u0442\u0440\u0438\u044A\u0433\u044A\u043B\u043D\u0438\u043A",
    lastQuarter: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0430 \u0447\u0435\u0442\u0432\u044A\u0440\u0442",
    waningCrescent: "\u041D\u0430\u043C\u0430\u043B\u044F\u0432\u0430\u0449 \u043F\u043E\u043B\u0443\u043C\u0435\u0441\u0435\u0446"
  },
  transitTerms: {
    transit: "\u0442\u0440\u0430\u043D\u0437\u0438\u0442",
    retrograde: "\u0440\u0435\u0442\u0440\u043E\u0433\u0440\u0430\u0434\u0435\u043D",
    direct: "\u0434\u0438\u0440\u0435\u043A\u0442\u0435\u043D",
    orb: "\u043E\u0440\u0431",
    degree: "\u0433\u0440\u0430\u0434\u0443\u0441"
  }
};
const LANGUAGE_DIRECTIVES = {
  bg: `IMPORTANT: Always respond in Bulgarian (\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438). Use proper Bulgarian astrological terminology.

\u0411\u042A\u041B\u0413\u0410\u0420\u0421\u041A\u0418 \u0410\u0421\u0422\u0420\u041E\u041B\u041E\u0413\u0418\u0427\u041D\u0418 \u0422\u0415\u0420\u041C\u0418\u041D\u0418:
- \u041F\u043B\u0430\u043D\u0435\u0442\u0438: \u0421\u043B\u044A\u043D\u0446\u0435, \u041B\u0443\u043D\u0430, \u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439, \u0412\u0435\u043D\u0435\u0440\u0430, \u041C\u0430\u0440\u0441, \u042E\u043F\u0438\u0442\u0435\u0440, \u0421\u0430\u0442\u0443\u0440\u043D, \u0423\u0440\u0430\u043D, \u041D\u0435\u043F\u0442\u0443\u043D, \u041F\u043B\u0443\u0442\u043E\u043D
- \u0417\u043D\u0430\u0446\u0438: \u041E\u0432\u0435\u043D, \u0422\u0435\u043B\u0435\u0446, \u0411\u043B\u0438\u0437\u043D\u0430\u0446\u0438, \u0420\u0430\u043A, \u041B\u044A\u0432, \u0414\u0435\u0432\u0430, \u0412\u0435\u0437\u043D\u0438, \u0421\u043A\u043E\u0440\u043F\u0438\u043E\u043D, \u0421\u0442\u0440\u0435\u043B\u0435\u0446, \u041A\u043E\u0437\u0438\u0440\u043E\u0433, \u0412\u043E\u0434\u043E\u043B\u0435\u0439, \u0420\u0438\u0431\u0438
- \u0410\u0441\u043F\u0435\u043A\u0442\u0438: \u0441\u044A\u0432\u043F\u0430\u0434, \u0441\u0435\u043A\u0441\u0442\u0438\u043B, \u043A\u0432\u0430\u0434\u0440\u0430\u0442, \u0442\u0440\u0438\u0433\u043E\u043D, \u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044F
- \u0414\u043E\u043C\u043E\u0432\u0435: \u041F\u044A\u0440\u0432\u0438 \u0434\u043E \u0414\u0432\u0430\u043D\u0430\u0434\u0435\u0441\u0435\u0442\u0438 \u0434\u043E\u043C
- \u0415\u043B\u0435\u043C\u0435\u043D\u0442\u0438: \u041E\u0433\u044A\u043D, \u0417\u0435\u043C\u044F, \u0412\u044A\u0437\u0434\u0443\u0445, \u0412\u043E\u0434\u0430

\u0411\u044A\u0434\u0438 \u0442\u043E\u043F\u044A\u043B \u0438 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0435\u043D \u043D\u0430 \u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438. \u0418\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0439 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D \u0435\u0437\u0438\u043A, \u043D\u0435 \u043F\u0440\u0435\u0432\u0435\u0436\u0434\u0430\u0439 \u0431\u0443\u043A\u0432\u0430\u043B\u043D\u043E \u043E\u0442 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438.`,
  en: `Always respond in English with clear, natural language.`
};
function getLanguageDirective(language) {
  return LANGUAGE_DIRECTIVES[language] || LANGUAGE_DIRECTIVES[import_languageDetection.DEFAULT_LANGUAGE];
}
function getLanguageDirectiveWithContext(language, context) {
  const baseDirective = getLanguageDirective(language);
  if (language === "en") {
    return baseDirective;
  }
  const contextAdditions = {
    chat: "\n\n\u0412\u043A\u043B\u044E\u0447\u0432\u0430\u0439 \u0441\u043F\u0435\u0446\u0438\u0444\u0438\u0447\u043D\u0438 \u043F\u0440\u0435\u043F\u0440\u0430\u0442\u043A\u0438 \u043A\u044A\u043C \u043D\u0430\u0442\u0430\u043B\u043D\u0430\u0442\u0430 \u043A\u0430\u0440\u0442\u0430 \u043D\u0430 \u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u044F \u0432 \u043E\u0442\u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435 \u0441\u0438.",
    forecast: "\n\n\u0418\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0439 \u043D\u0430\u0441\u044A\u0440\u0447\u0438\u0442\u0435\u043B\u0435\u043D \u0438 \u043F\u0440\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0442\u043E\u043D \u0432 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0438\u0442\u0435.",
    compatibility: "\n\n\u0411\u044A\u0434\u0438 \u043E\u0431\u0435\u043A\u0442\u0438\u0432\u0435\u043D \u0438 \u0431\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u0430\u043D \u0432 \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u043D\u0430 \u0441\u044A\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u0442\u0430.",
    alert: "\n\n\u0411\u044A\u0434\u0438 \u044F\u0441\u0435\u043D \u0438 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u0438\u0432\u0435\u043D \u0432 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0434\u0438\u0442\u0435\u043B\u043D\u0438\u0442\u0435 \u0441\u044A\u043E\u0431\u0449\u0435\u043D\u0438\u044F.",
    tooltip: "\n\n\u041E\u0431\u044F\u0441\u043D\u044F\u0432\u0430\u0439 \u043A\u0440\u0430\u0442\u043A\u043E \u0438 \u044F\u0441\u043D\u043E \u0437\u0430 \u043F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u0438 \u0431\u0435\u0437 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u043D\u0438 \u043F\u043E\u0437\u043D\u0430\u043D\u0438\u044F."
  };
  return baseDirective + (contextAdditions[context] || "");
}
function detectLanguage(userPreference, acceptLanguageHeader) {
  if (userPreference && isValidLanguage(userPreference)) {
    return {
      language: userPreference,
      source: "user_preference"
    };
  }
  if (acceptLanguageHeader) {
    const detected = (0, import_languageDetection.detectLanguageFromHeader)(acceptLanguageHeader);
    return {
      language: detected,
      source: "header"
    };
  }
  return {
    language: import_languageDetection.DEFAULT_LANGUAGE,
    source: "default"
  };
}
function isValidLanguage(code) {
  return ["bg", "en"].includes(code);
}
function normalizeLanguage(code) {
  if (!code) return import_languageDetection.DEFAULT_LANGUAGE;
  const normalized = code.toLowerCase().split("-")[0];
  return isValidLanguage(normalized) ? normalized : import_languageDetection.DEFAULT_LANGUAGE;
}
function validateBulgarianAstrologicalTerms(content) {
  const issues = [];
  const planetMap = {
    sun: "\u0421\u043B\u044A\u043D\u0446\u0435",
    moon: "\u041B\u0443\u043D\u0430",
    mercury: "\u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439",
    venus: "\u0412\u0435\u043D\u0435\u0440\u0430",
    mars: "\u041C\u0430\u0440\u0441",
    jupiter: "\u042E\u043F\u0438\u0442\u0435\u0440",
    saturn: "\u0421\u0430\u0442\u0443\u0440\u043D",
    uranus: "\u0423\u0440\u0430\u043D",
    neptune: "\u041D\u0435\u043F\u0442\u0443\u043D",
    pluto: "\u041F\u043B\u0443\u0442\u043E\u043D"
  };
  for (const [english, bulgarian] of Object.entries(planetMap)) {
    const regex = new RegExp(`\\b${english}\\b`, "i");
    if (regex.test(content)) {
      issues.push(`English planet name "${english}" found - should use "${bulgarian}"`);
    }
  }
  const signMap = {
    aries: "\u041E\u0432\u0435\u043D",
    taurus: "\u0422\u0435\u043B\u0435\u0446",
    gemini: "\u0411\u043B\u0438\u0437\u043D\u0430\u0446\u0438",
    cancer: "\u0420\u0430\u043A",
    leo: "\u041B\u044A\u0432",
    virgo: "\u0414\u0435\u0432\u0430",
    libra: "\u0412\u0435\u0437\u043D\u0438",
    scorpio: "\u0421\u043A\u043E\u0440\u043F\u0438\u043E\u043D",
    sagittarius: "\u0421\u0442\u0440\u0435\u043B\u0435\u0446",
    capricorn: "\u041A\u043E\u0437\u0438\u0440\u043E\u0433",
    aquarius: "\u0412\u043E\u0434\u043E\u043B\u0435\u0439",
    pisces: "\u0420\u0438\u0431\u0438"
  };
  for (const [english, bulgarian] of Object.entries(signMap)) {
    const regex = new RegExp(`\\b${english}\\b`, "i");
    if (regex.test(content)) {
      issues.push(`English sign name "${english}" found - should use "${bulgarian}"`);
    }
  }
  return {
    isValid: issues.length === 0,
    issues
  };
}
function buildSystemPromptWithLanguage(basePrompt, language, context) {
  const directive = context ? getLanguageDirectiveWithContext(language, context) : getLanguageDirective(language);
  return `${basePrompt}

${directive}`;
}
var languageService_default = {
  getLanguageDirective,
  getLanguageDirectiveWithContext,
  detectLanguage,
  isValidLanguage,
  normalizeLanguage,
  validateBulgarianAstrologicalTerms,
  buildSystemPromptWithLanguage,
  BULGARIAN_ASTROLOGICAL_TERMS
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BULGARIAN_ASTROLOGICAL_TERMS,
  buildSystemPromptWithLanguage,
  detectLanguage,
  getLanguageDirective,
  getLanguageDirectiveWithContext,
  isValidLanguage,
  normalizeLanguage,
  validateBulgarianAstrologicalTerms
});
