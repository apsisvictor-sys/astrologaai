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
var compatibility_exports = {};
__export(compatibility_exports, {
  calculateCompatibility: () => calculateCompatibility,
  getCachedCompatibility: () => getCachedCompatibility,
  invalidateCompatibilityCache: () => invalidateCompatibilityCache
});
module.exports = __toCommonJS(compatibility_exports);
var import_prisma = require("../utils/prisma");
var import_synastry = require("./synastry.service");
var import_astrology = require("./astrology");
const COMPATIBILITY_CACHE_TTL = 86400;
const ELEMENT_COMPATIBILITY = {
  fire: { fire: 90, earth: 40, air: 75, water: 35 },
  earth: { fire: 40, earth: 85, air: 45, water: 80 },
  air: { fire: 75, earth: 45, air: 85, water: 50 },
  water: { fire: 35, earth: 80, air: 50, water: 90 }
};
const SIGN_ELEMENTS = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",
  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",
  Gemini: "air",
  Libra: "air",
  Aquarius: "air",
  Cancer: "water",
  Scorpio: "water",
  Pisces: "water"
};
const PLANET_WEIGHTS = {
  love: { venus: 3, mars: 2.5, moon: 2, sun: 1.5, mercury: 0.5 },
  communication: { mercury: 3, sun: 1.5, moon: 1.5, mars: 1, venus: 1 },
  trust: { saturn: 3, moon: 2.5, sun: 2, pluto: 1.5, venus: 1 },
  adventure: { mars: 3, jupiter: 2.5, uranus: 2, sun: 1.5, mercury: 1 },
  values: { jupiter: 3, saturn: 2, venus: 2, sun: 1.5, moon: 1 }
};
const INTERPRETATIONS = {
  sunSign: {
    harmonious: {
      en: "Your sun signs create natural harmony. You understand each other's core identity and life purpose.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0441\u043B\u044A\u043D\u0447\u0435\u0432\u0438 \u0437\u043D\u0430\u0446\u0438 \u0441\u044A\u0437\u0434\u0430\u0432\u0430\u0442 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u0430 \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u044F. \u0420\u0430\u0437\u0431\u0438\u0440\u0430\u0442\u0435 \u043E\u0441\u043D\u043E\u0432\u043D\u0430\u0442\u0430 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442 \u0438 \u0436\u0438\u0437\u043D\u0435\u043D\u0430 \u0446\u0435\u043B \u0435\u0434\u0438\u043D \u043D\u0430 \u0434\u0440\u0443\u0433."
    },
    challenging: {
      en: "Your sun signs create dynamic tension. This brings growth opportunities through different approaches to life.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0441\u043B\u044A\u043D\u0447\u0435\u0432\u0438 \u0437\u043D\u0430\u0446\u0438 \u0441\u044A\u0437\u0434\u0430\u0432\u0430\u0442 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u043D\u043E \u043D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435. \u0422\u043E\u0432\u0430 \u043D\u043E\u0441\u0438 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436 \u0447\u0440\u0435\u0437 \u0440\u0430\u0437\u043B\u0438\u0447\u043D\u0438 \u043F\u043E\u0434\u0445\u043E\u0434\u0438 \u043A\u044A\u043C \u0436\u0438\u0432\u043E\u0442\u0430."
    },
    neutral: {
      en: "Your sun signs have a neutral connection. You can learn from each other's different perspectives.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0441\u043B\u044A\u043D\u0447\u0435\u0432\u0438 \u0437\u043D\u0430\u0446\u0438 \u0438\u043C\u0430\u0442 \u043D\u0435\u0443\u0442\u0440\u0430\u043B\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430. \u041C\u043E\u0436\u0435\u0442\u0435 \u0434\u0430 \u0441\u0435 \u0443\u0447\u0438\u0442\u0435 \u043E\u0442 \u0440\u0430\u0437\u043B\u0438\u0447\u043D\u0438\u0442\u0435 \u043F\u0435\u0440\u0441\u043F\u0435\u043A\u0442\u0438\u0432\u0438 \u0435\u0434\u0438\u043D \u043D\u0430 \u0434\u0440\u0443\u0433."
    }
  },
  moonSign: {
    harmonious: {
      en: "Your moon signs align beautifully. Emotional understanding and nurturing come naturally.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u043B\u0443\u043D\u043D\u0438 \u0437\u043D\u0430\u0446\u0438 \u0441\u0435 \u0441\u044A\u0447\u0435\u0442\u0430\u0432\u0430\u0442 \u043F\u0440\u0435\u043A\u0440\u0430\u0441\u043D\u043E. \u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u043E\u0442\u043E \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435 \u0438 \u0433\u0440\u0438\u0436\u0430\u0442\u0430 \u0438\u0434\u0432\u0430\u0442 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043E."
    },
    challenging: {
      en: "Your moon signs require emotional adaptation. Understanding each other's emotional needs takes conscious effort.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u043B\u0443\u043D\u043D\u0438 \u0437\u043D\u0430\u0446\u0438 \u0438\u0437\u0438\u0441\u043A\u0432\u0430\u0442 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0438\u044F. \u0420\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0438\u0442\u0435 \u043D\u0443\u0436\u0434\u0438 \u0435\u0434\u0438\u043D \u043D\u0430 \u0434\u0440\u0443\u0433 \u0438\u0437\u0438\u0441\u043A\u0432\u0430 \u0441\u044A\u0437\u043D\u0430\u0442\u0435\u043B\u043D\u0438 \u0443\u0441\u0438\u043B\u0438\u044F."
    },
    neutral: {
      en: "Your moon signs have complementary qualities. Emotional growth comes through honoring differences.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u043B\u0443\u043D\u043D\u0438 \u0437\u043D\u0430\u0446\u0438 \u0438\u043C\u0430\u0442 \u0434\u043E\u043F\u044A\u043B\u0432\u0430\u0449\u0438 \u0441\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430. \u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0438\u044F\u0442 \u0440\u0430\u0441\u0442\u0435\u0436 \u0438\u0434\u0432\u0430 \u0447\u0440\u0435\u0437 \u043F\u043E\u0447\u0438\u0442\u0430\u043D\u0435 \u043D\u0430 \u0440\u0430\u0437\u043B\u0438\u0447\u0438\u044F\u0442\u0430."
    }
  },
  risingSign: {
    harmonious: {
      en: "Your rising signs create instant rapport. First impressions and outward expressions align naturally.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0430\u0441\u0446\u0435\u043D\u0434\u0435\u043D\u0442\u0438 \u0441\u044A\u0437\u0434\u0430\u0432\u0430\u0442 \u043D\u0435\u0437\u0430\u0431\u0430\u0432\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430. \u041F\u044A\u0440\u0432\u0438\u0442\u0435 \u0432\u043F\u0435\u0447\u0430\u0442\u043B\u0435\u043D\u0438\u044F \u0438 \u0432\u044A\u043D\u0448\u043D\u0438\u0442\u0435 \u0438\u0437\u0440\u0430\u0437\u044F\u0432\u0430\u043D\u0438\u044F \u0441\u0435 \u0441\u044A\u0447\u0435\u0442\u0430\u0432\u0430\u0442 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043E."
    },
    challenging: {
      en: "Your rising signs present different social masks. This creates interesting dynamic in how you present as a couple.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0430\u0441\u0446\u0435\u043D\u0434\u0435\u043D\u0442\u0438 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u044F\u0442 \u0440\u0430\u0437\u043B\u0438\u0447\u043D\u0438 \u0441\u043E\u0446\u0438\u0430\u043B\u043D\u0438 \u043C\u0430\u0441\u043A\u0438. \u0422\u043E\u0432\u0430 \u0441\u044A\u0437\u0434\u0430\u0432\u0430 \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u0430 \u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0430 \u0432 \u0442\u043E\u0432\u0430 \u043A\u0430\u043A \u0441\u0435 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u044F\u0442\u0435 \u043A\u0430\u0442\u043E \u0434\u0432\u043E\u0439\u043A\u0430."
    },
    neutral: {
      en: "Your rising signs bring different social approaches. Balance is found through appreciating each other's style.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0430\u0441\u0446\u0435\u043D\u0434\u0435\u043D\u0442\u0438 \u043D\u043E\u0441\u044F\u0442 \u0440\u0430\u0437\u043B\u0438\u0447\u043D\u0438 \u0441\u043E\u0446\u0438\u0430\u043B\u043D\u0438 \u043F\u043E\u0434\u0445\u043E\u0434\u0438. \u0411\u0430\u043B\u0430\u043D\u0441\u044A\u0442 \u0441\u0435 \u043D\u0430\u043C\u0438\u0440\u0430 \u0447\u0440\u0435\u0437 \u043E\u0446\u0435\u043D\u044F\u0432\u0430\u043D\u0435 \u043D\u0430 \u0441\u0442\u0438\u043B\u0430 \u0435\u0434\u0438\u043D \u043D\u0430 \u0434\u0440\u0443\u0433."
    }
  },
  venus: {
    harmonious: {
      en: "Your Venus signs align for romantic harmony. Love languages and values around affection match beautifully.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0412\u0435\u043D\u0435\u0440\u0438 \u0441\u0435 \u0441\u044A\u0447\u0435\u0442\u0430\u0432\u0430\u0442 \u0437\u0430 \u0440\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u043D\u0430 \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u044F. \u041B\u044E\u0431\u043E\u0432\u043D\u0438\u0442\u0435 \u0435\u0437\u0438\u0446\u0438 \u0438 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u043E\u043A\u043E\u043B\u043E \u043E\u0431\u0438\u0447\u0442\u0430 \u0441\u044A\u0432\u043F\u0430\u0434\u0430\u0442 \u043F\u0440\u0435\u043A\u0440\u0430\u0441\u043D\u043E."
    },
    challenging: {
      en: "Your Venus signs approach love differently. This creates opportunity to expand your understanding of romance.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0412\u0435\u043D\u0435\u0440\u0438 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442 \u043A\u044A\u043C \u043B\u044E\u0431\u043E\u0432\u0442\u0430 \u043F\u043E \u0440\u0430\u0437\u043B\u0438\u0447\u0435\u043D \u043D\u0430\u0447\u0438\u043D. \u0422\u043E\u0432\u0430 \u0441\u044A\u0437\u0434\u0430\u0432\u0430 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442 \u0434\u0430 \u0440\u0430\u0437\u0448\u0438\u0440\u0438\u0442\u0435 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435\u0442\u043E \u0441\u0438 \u0437\u0430 \u0440\u043E\u043C\u0430\u043D\u0442\u0438\u043A\u0430."
    },
    neutral: {
      en: "Your Venus signs have complementary approaches to love. Different styles can enhance your romantic life.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0412\u0435\u043D\u0435\u0440\u0438 \u0438\u043C\u0430\u0442 \u0434\u043E\u043F\u044A\u043B\u0432\u0430\u0449\u0438 \u0441\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u0438 \u043A\u044A\u043C \u043B\u044E\u0431\u043E\u0432\u0442\u0430. \u0420\u0430\u0437\u043B\u0438\u0447\u043D\u0438\u0442\u0435 \u0441\u0442\u0438\u043B\u043E\u0432\u0435 \u043C\u043E\u0433\u0430\u0442 \u0434\u0430 \u043E\u0431\u043E\u0433\u0430\u0442\u044F\u0442 \u0440\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u043D\u0438\u044F \u0432\u0438 \u0436\u0438\u0432\u043E\u0442."
    }
  },
  mars: {
    harmonious: {
      en: "Your Mars signs create dynamic synergy. Action, passion, and drive align powerfully.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u041C\u0430\u0440\u0441\u0438 \u0441\u044A\u0437\u0434\u0430\u0432\u0430\u0442 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u043D\u0430 \u0441\u0438\u043D\u0435\u0440\u0433\u0438\u044F. \u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435\u0442\u043E, \u0441\u0442\u0440\u0430\u0441\u0442\u0442\u0430 \u0438 \u0434\u0440\u0430\u0439\u0432\u044A\u0442 \u0441\u0435 \u0441\u044A\u0447\u0435\u0442\u0430\u0432\u0430\u0442 \u043C\u043E\u0449\u043D\u043E."
    },
    challenging: {
      en: "Your Mars signs energize each other in different ways. Channeling this energy constructively brings excitement.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u041C\u0430\u0440\u0441\u0438 \u0441\u0435 \u0435\u043D\u0435\u0440\u0433\u0438\u0437\u0438\u0440\u0430\u0442 \u0432\u0437\u0430\u0438\u043C\u043D\u043E \u043F\u043E \u0440\u0430\u0437\u043B\u0438\u0447\u043D\u0438 \u043D\u0430\u0447\u0438\u043D\u0438. \u041A\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0442\u0430\u0437\u0438 \u0435\u043D\u0435\u0440\u0433\u0438\u044F \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0442\u0438\u0432\u043D\u043E \u043D\u043E\u0441\u0438 \u0432\u044A\u043B\u043D\u0435\u043D\u0438\u0435."
    },
    neutral: {
      en: "Your Mars signs bring complementary energies. Together you can accomplish more than separately.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u041C\u0430\u0440\u0441\u0438 \u043D\u043E\u0441\u044F\u0442 \u0434\u043E\u043F\u044A\u043B\u0432\u0430\u0449\u0438 \u0441\u0435 \u0435\u043D\u0435\u0440\u0433\u0438\u0438. \u0417\u0430\u0435\u0434\u043D\u043E \u043C\u043E\u0436\u0435\u0442\u0435 \u0434\u0430 \u043F\u043E\u0441\u0442\u0438\u0433\u043D\u0435\u0442\u0435 \u043F\u043E\u0432\u0435\u0447\u0435, \u043E\u0442\u043A\u043E\u043B\u043A\u043E\u0442\u043E \u043F\u043E\u043E\u0442\u0434\u0435\u043B\u043D\u043E."
    }
  }
};
const getCategoryDescription = (category, score) => {
  const descriptions = {
    love: {
      excellent: {
        en: "Exceptional romantic chemistry. Your hearts connect deeply and naturally.",
        bg: "\u0418\u0437\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u043B\u043D\u0430 \u0440\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u043D\u0430 \u0445\u0438\u043C\u0438\u044F. \u0421\u044A\u0440\u0446\u0430\u0442\u0430 \u0432\u0438 \u0441\u0435 \u0441\u0432\u044A\u0440\u0437\u0432\u0430\u0442 \u0434\u044A\u043B\u0431\u043E\u043A\u043E \u0438 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043E."
      },
      good: {
        en: "Strong romantic connection with natural affection and attraction.",
        bg: "\u0421\u0438\u043B\u043D\u0430 \u0440\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430 \u0441 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u0430 \u043E\u0431\u0438\u0447 \u0438 \u043F\u0440\u0438\u0432\u043B\u0438\u0447\u0430\u043D\u0435."
      },
      moderate: {
        en: "Romantic potential that grows with understanding and effort.",
        bg: "\u0420\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u0435\u043D \u043F\u043E\u0442\u0435\u043D\u0446\u0438\u0430\u043B, \u043A\u043E\u0439\u0442\u043E \u0440\u0430\u0441\u0442\u0435 \u0441 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435 \u0438 \u0443\u0441\u0438\u043B\u0438\u0435."
      },
      challenging: {
        en: "Romantic differences require patience and conscious effort to bridge.",
        bg: "\u0420\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u043D\u0438\u0442\u0435 \u0440\u0430\u0437\u043B\u0438\u0447\u0438\u044F \u0438\u0437\u0438\u0441\u043A\u0432\u0430\u0442 \u0442\u044A\u0440\u043F\u0435\u043D\u0438\u0435 \u0438 \u0441\u044A\u0437\u043D\u0430\u0442\u0435\u043B\u043D\u0438 \u0443\u0441\u0438\u043B\u0438\u044F \u0437\u0430 \u043F\u0440\u0435\u043E\u0434\u043E\u043B\u044F\u0432\u0430\u043D\u0435."
      }
    },
    communication: {
      excellent: {
        en: "Your minds connect effortlessly. Conversations flow naturally.",
        bg: "\u0423\u043C\u043E\u0432\u0435\u0442\u0435 \u0432\u0438 \u0441\u0435 \u0441\u0432\u044A\u0440\u0437\u0432\u0430\u0442 \u0431\u0435\u0437 \u0443\u0441\u0438\u043B\u0438\u0435. \u0420\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435 \u0442\u0435\u043A\u0430\u0442 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043E."
      },
      good: {
        en: "Good mental rapport with mutual understanding.",
        bg: "\u0414\u043E\u0431\u044A\u0440 \u043C\u0435\u043D\u0442\u0430\u043B\u0435\u043D \u0440\u0430\u043F\u043E\u0440\u0442 \u0441 \u0432\u0437\u0430\u0438\u043C\u043D\u043E \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435."
      },
      moderate: {
        en: "Communication requires some adaptation but improves over time.",
        bg: "\u041A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F\u0442\u0430 \u0438\u0437\u0438\u0441\u043A\u0432\u0430 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430 \u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0438\u044F, \u043D\u043E \u0441\u0435 \u043F\u043E\u0434\u043E\u0431\u0440\u044F\u0432\u0430 \u0441 \u0432\u0440\u0435\u043C\u0435\u0442\u043E."
      },
      challenging: {
        en: "Different communication styles need conscious bridging.",
        bg: "\u0420\u0430\u0437\u043B\u0438\u0447\u043D\u0438\u0442\u0435 \u0441\u0442\u0438\u043B\u043E\u0432\u0435 \u043D\u0430 \u043A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F \u0441\u0435 \u043D\u0443\u0436\u0434\u0430\u044F\u0442 \u043E\u0442 \u0441\u044A\u0437\u043D\u0430\u0442\u0435\u043B\u043D\u043E \u043F\u0440\u0435\u043E\u0434\u043E\u043B\u044F\u0432\u0430\u043D\u0435."
      }
    },
    trust: {
      excellent: {
        en: "Deep foundation of trust and emotional security.",
        bg: "\u0414\u044A\u043B\u0431\u043E\u043A\u0430 \u043E\u0441\u043D\u043E\u0432\u0430 \u043D\u0430 \u0434\u043E\u0432\u0435\u0440\u0438\u0435 \u0438 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u0441\u0438\u0433\u0443\u0440\u043D\u043E\u0441\u0442."
      },
      good: {
        en: "Strong trust building with reliable emotional support.",
        bg: "\u0421\u0438\u043B\u043D\u043E \u0438\u0437\u0433\u0440\u0430\u0436\u0434\u0430\u043D\u0435 \u043D\u0430 \u0434\u043E\u0432\u0435\u0440\u0438\u0435 \u0441 \u043D\u0430\u0434\u0435\u0436\u0434\u043D\u0430 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u043F\u043E\u0434\u043A\u0440\u0435\u043F\u0430."
      },
      moderate: {
        en: "Trust develops steadily through shared experiences.",
        bg: "\u0414\u043E\u0432\u0435\u0440\u0438\u0435\u0442\u043E \u0441\u0435 \u0440\u0430\u0437\u0432\u0438\u0432\u0430 \u0441\u0442\u0430\u0431\u0438\u043B\u043D\u043E \u0447\u0440\u0435\u0437 \u0441\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0438 \u043F\u0440\u0435\u0436\u0438\u0432\u044F\u0432\u0430\u043D\u0438\u044F."
      },
      challenging: {
        en: "Building trust requires patience and consistent effort.",
        bg: "\u0418\u0437\u0433\u0440\u0430\u0436\u0434\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0434\u043E\u0432\u0435\u0440\u0438\u0435 \u0438\u0437\u0438\u0441\u043A\u0432\u0430 \u0442\u044A\u0440\u043F\u0435\u043D\u0438\u0435 \u0438 \u043F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u043D\u0438 \u0443\u0441\u0438\u043B\u0438\u044F."
      }
    },
    adventure: {
      excellent: {
        en: "Perfect adventure partners with shared excitement for life.",
        bg: "\u041F\u0435\u0440\u0444\u0435\u043A\u0442\u043D\u0438 \u043F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0438 \u0437\u0430 \u043F\u0440\u0438\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0441 \u0441\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u043E \u0432\u044A\u043B\u043D\u0435\u043D\u0438\u0435 \u043E\u0442 \u0436\u0438\u0432\u043E\u0442\u0430."
      },
      good: {
        en: "Great companions for exploring life together.",
        bg: "\u0421\u0442\u0440\u0430\u0445\u043E\u0442\u043D\u0438 \u0441\u043F\u044A\u0442\u043D\u0438\u0446\u0438 \u0437\u0430 \u0438\u0437\u0441\u043B\u0435\u0434\u0432\u0430\u043D\u0435 \u043D\u0430 \u0436\u0438\u0432\u043E\u0442\u0430 \u0437\u0430\u0435\u0434\u043D\u043E."
      },
      moderate: {
        en: "Adventurous spirit that benefits from compromise.",
        bg: "\u041F\u0440\u0438\u043A\u043B\u044E\u0447\u0435\u043D\u0441\u043A\u0438 \u0434\u0443\u0445, \u043A\u043E\u0439\u0442\u043E \u0441\u0435 \u0432\u044A\u0437\u043F\u043E\u043B\u0437\u0432\u0430 \u043E\u0442 \u043A\u043E\u043C\u043F\u0440\u043E\u043C\u0438\u0441."
      },
      challenging: {
        en: "Different paces and styles of adventure require negotiation.",
        bg: "\u0420\u0430\u0437\u043B\u0438\u0447\u043D\u0438 \u0442\u0435\u043C\u043F\u043E\u0432\u0435 \u0438 \u0441\u0442\u0438\u043B\u043E\u0432\u0435 \u043D\u0430 \u043F\u0440\u0438\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0438\u0437\u0438\u0441\u043A\u0432\u0430\u0442 \u0434\u043E\u0433\u043E\u0432\u0430\u0440\u044F\u043D\u0435."
      }
    },
    values: {
      excellent: {
        en: "Deeply aligned values and life philosophy.",
        bg: "\u0414\u044A\u043B\u0431\u043E\u043A\u043E \u0441\u044A\u0432\u043F\u0430\u0434\u0430\u0449\u0438 \u0441\u0435 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0438 \u0436\u0438\u0437\u043D\u0435\u043D\u0430 \u0444\u0438\u043B\u043E\u0441\u043E\u0444\u0438\u044F."
      },
      good: {
        en: "Shared core values with complementary perspectives.",
        bg: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0438 \u043E\u0441\u043D\u043E\u0432\u043D\u0438 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0441 \u0434\u043E\u043F\u044A\u043B\u0432\u0430\u0449\u0438 \u0441\u0435 \u043F\u0435\u0440\u0441\u043F\u0435\u043A\u0442\u0438\u0432\u0438."
      },
      moderate: {
        en: "Values align in important areas with room for growth.",
        bg: "\u0426\u0435\u043D\u043D\u043E\u0441\u0442\u0438\u0442\u0435 \u0441\u0435 \u0441\u044A\u0432\u043F\u0430\u0434\u0430\u0442 \u0432 \u0432\u0430\u0436\u043D\u0438 \u043E\u0431\u043B\u0430\u0441\u0442\u0438 \u0441 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442 \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436."
      },
      challenging: {
        en: "Different value systems require understanding and respect.",
        bg: "\u0420\u0430\u0437\u043B\u0438\u0447\u043D\u0438 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u043D\u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u0438 \u0438\u0437\u0438\u0441\u043A\u0432\u0430\u0442 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435 \u0438 \u0443\u0432\u0430\u0436\u0435\u043D\u0438\u0435."
      }
    }
  };
  const level = score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "moderate" : "challenging";
  return descriptions[category]?.[level] || descriptions[category]?.moderate || {
    en: "Neutral compatibility in this area.",
    bg: "\u041D\u0435\u0443\u0442\u0440\u0430\u043B\u043D\u0430 \u0441\u044A\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442 \u0432 \u0442\u0430\u0437\u0438 \u043E\u0431\u043B\u0430\u0441\u0442."
  };
};
function getScoreLevel(score) {
  if (score >= 90) return "exceptional";
  if (score >= 70) return "high";
  if (score >= 50) return "moderate";
  if (score >= 30) return "challenging";
  return "difficult";
}
function getScoreCategoryLevel(score) {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "moderate";
  return "challenging";
}
function getDominantElement(elements) {
  return Object.entries(elements).sort(([, a], [, b]) => b - a)[0][0];
}
function getElementHarmony(element1, element2) {
  const score = ELEMENT_COMPATIBILITY[element1]?.[element2] || 50;
  if (score >= 75) return "harmonious";
  if (score >= 50) return "complementary";
  return "challenging";
}
function calculateCategoryScore(category, aspects) {
  const weights = PLANET_WEIGHTS[category];
  let totalScore = 0;
  let totalWeight = 0;
  const contributingAspects = [];
  for (const aspect of aspects) {
    const userWeight = weights[aspect.userPlanet] || 0;
    const partnerWeight = weights[aspect.partnerPlanet] || 0;
    const weight = Math.max(userWeight, partnerWeight);
    if (weight > 0 && aspect.orb < 6) {
      let aspectScore = 50;
      if (aspect.nature === "harmonious") aspectScore = 85;
      else if (aspect.nature === "challenging") aspectScore = 25;
      const orbFactor = 1 - aspect.orb / 10;
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
function getPlanetaryInterpretation(planet, nature) {
  const planetKey = planet;
  if (INTERPRETATIONS[planetKey]) {
    return INTERPRETATIONS[planetKey][nature];
  }
  return {
    en: `${planet} connects ${nature === "harmonious" ? "positively" : nature === "challenging" ? "dynamically" : "neutrally"} between your charts.`,
    bg: `${planet} \u0441\u0435 \u0441\u0432\u044A\u0440\u0437\u0432\u0430 ${nature === "harmonious" ? "\u043F\u043E\u0437\u0438\u0442\u0438\u0432\u043D\u043E" : nature === "challenging" ? "\u0434\u0438\u043D\u0430\u043C\u0438\u0447\u043D\u043E" : "\u043D\u0435\u0443\u0442\u0440\u0430\u043B\u043D\u043E"} \u043C\u0435\u0436\u0434\u0443 \u0432\u0430\u0448\u0438\u0442\u0435 \u043A\u0430\u0440\u0442\u0438.`
  };
}
function generateAdvice(score, categories, strengths, challenges) {
  const level = getScoreLevel(score);
  if (level === "exceptional") {
    return {
      en: "This is a rare and special connection. Nurture it with appreciation and conscious presence. Your natural harmony is a gift\u2014don't take it for granted.",
      bg: "\u0422\u043E\u0432\u0430 \u0435 \u0440\u044F\u0434\u043A\u0430 \u0438 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430. \u0413\u0440\u0438\u0436\u0435\u0442\u0435 \u0441\u0435 \u0437\u0430 \u043D\u0435\u044F \u0441 \u043F\u0440\u0438\u0437\u043D\u0430\u0442\u0435\u043B\u043D\u043E\u0441\u0442 \u0438 \u043E\u0441\u044A\u0437\u043D\u0430\u0442\u043E \u043F\u0440\u0438\u0441\u044A\u0441\u0442\u0432\u0438\u0435. \u0412\u0430\u0448\u0430\u0442\u0430 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u0430 \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u044F \u0435 \u0434\u0430\u0440\u2014\u043D\u0435 \u044F \u043F\u0440\u0438\u0435\u043C\u0430\u0439\u0442\u0435 \u0437\u0430 \u0434\u0430\u0434\u0435\u043D\u043E\u0441\u0442."
    };
  }
  if (level === "high") {
    return {
      en: "You have strong compatibility with natural flow. Focus on communication and shared values to deepen your bond. Your strengths outweigh the challenges.",
      bg: "\u0418\u043C\u0430\u0442\u0435 \u0441\u0438\u043B\u043D\u0430 \u0441\u044A\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442 \u0441 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D \u043F\u043E\u0442\u043E\u043A. \u0424\u043E\u043A\u0443\u0441\u0438\u0440\u0430\u0439\u0442\u0435 \u0441\u0435 \u0432\u044A\u0440\u0445\u0443 \u043A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F\u0442\u0430 \u0438 \u0441\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0438\u0442\u0435 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438, \u0437\u0430 \u0434\u0430 \u0437\u0430\u0434\u044A\u043B\u0431\u043E\u0447\u0438\u0442\u0435 \u0432\u0440\u044A\u0437\u043A\u0430\u0442\u0430 \u0441\u0438. \u0412\u0430\u0448\u0438\u0442\u0435 \u0441\u0438\u043B\u043D\u0438 \u0441\u0442\u0440\u0430\u043D\u0438 \u043D\u0430\u0434\u0432\u0438\u0448\u0430\u0432\u0430\u0442 \u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u0441\u0442\u0432\u0430\u0442\u0430."
    };
  }
  if (level === "moderate") {
    return {
      en: "Your relationship has both harmonious and challenging areas. Growth comes from understanding your differences and building on your natural strengths.",
      bg: "\u0412\u0430\u0448\u0430\u0442\u0430 \u0432\u0440\u044A\u0437\u043A\u0430 \u0438\u043C\u0430 \u043A\u0430\u043A\u0442\u043E \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u043D\u0438, \u0442\u0430\u043A\u0430 \u0438 \u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u043D\u0438 \u043E\u0431\u043B\u0430\u0441\u0442\u0438. \u0420\u0430\u0441\u0442\u0435\u0436\u044A\u0442 \u0438\u0434\u0432\u0430 \u043E\u0442 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435 \u043D\u0430 \u0440\u0430\u0437\u043B\u0438\u0447\u0438\u044F\u0442\u0430 \u0432\u0438 \u0438 \u0438\u0437\u0433\u0440\u0430\u0436\u0434\u0430\u043D\u0435 \u0432\u044A\u0440\u0445\u0443 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u0438\u0442\u0435 \u0432\u0438 \u0441\u0438\u043B\u043D\u0438 \u0441\u0442\u0440\u0430\u043D\u0438."
    };
  }
  return {
    en: "This connection requires conscious work but offers profound growth opportunities. Focus on understanding, patience, and celebrating the unique gifts you bring to each other.",
    bg: "\u0422\u0430\u0437\u0438 \u0432\u0440\u044A\u0437\u043A\u0430 \u0438\u0437\u0438\u0441\u043A\u0432\u0430 \u0441\u044A\u0437\u043D\u0430\u0442\u0435\u043B\u043D\u0430 \u0440\u0430\u0431\u043E\u0442\u0430, \u043D\u043E \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430 \u0434\u044A\u043B\u0431\u043E\u043A\u0438 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436. \u0424\u043E\u043A\u0443\u0441\u0438\u0440\u0430\u0439\u0442\u0435 \u0441\u0435 \u0432\u044A\u0440\u0445\u0443 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435\u0442\u043E, \u0442\u044A\u0440\u043F\u0435\u043D\u0438\u0435\u0442\u043E \u0438 \u043F\u0440\u0430\u0437\u043D\u0443\u0432\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0443\u043D\u0438\u043A\u0430\u043B\u043D\u0438\u0442\u0435 \u0434\u0430\u0440\u0431\u0438, \u043A\u043E\u0438\u0442\u043E \u043D\u043E\u0441\u0438\u0442\u0435 \u0435\u0434\u0438\u043D \u043D\u0430 \u0434\u0440\u0443\u0433."
  };
}
function generateCacheKey(userId, partnerId) {
  return `compatibility:${userId}:${partnerId}`;
}
async function calculateCompatibility(userId, partnerId) {
  const user = await import_prisma.prisma.user.findUnique({
    where: { id: userId },
    include: {
      birthChart: {
        include: {
          birthProfile: true,
          birthData: true
        }
      }
    }
  });
  if (!user || !user.birthChart) {
    throw new Error("User birth chart not found");
  }
  const partner = await import_prisma.prisma.partner.findFirst({
    where: { id: partnerId, userId }
  });
  if (!partner) {
    throw new Error("Partner not found");
  }
  const userBirthSource = user.birthChart.birthProfile || user.birthChart.birthData;
  if (!userBirthSource) {
    throw new Error("User birth data not found");
  }
  const isBirthProfile = "birthTime" in userBirthSource;
  const birthDate = isBirthProfile ? userBirthSource.birthDate : userBirthSource.date;
  const birthTime = isBirthProfile ? userBirthSource.birthTime : userBirthSource.time;
  const userBirthData = {
    year: birthDate.getFullYear(),
    month: birthDate.getMonth() + 1,
    day: birthDate.getDate(),
    hour: birthTime ? parseInt(birthTime.split(":")[0]) : 12,
    minute: birthTime ? parseInt(birthTime.split(":")[1]) : 0,
    latitude: userBirthSource.latitude,
    longitude: userBirthSource.longitude,
    timezone: userBirthSource.timezone
  };
  const partnerBirthData = {
    year: partner.birthDate.getFullYear(),
    month: partner.birthDate.getMonth() + 1,
    day: partner.birthDate.getDate(),
    hour: partner.birthTime ? parseInt(partner.birthTime.split(":")[0]) : 12,
    minute: partner.birthTime ? parseInt(partner.birthTime.split(":")[1]) : 0,
    latitude: partner.latitude,
    longitude: partner.longitude,
    timezone: partner.timezone
  };
  const synastryChart = await (0, import_synastry.calculateSynastryChart)(
    userBirthData,
    partnerBirthData,
    userId,
    partnerId
  );
  const userNatalChart = await (0, import_astrology.calculateNatalChart)(userBirthData);
  const partnerNatalChart = await (0, import_astrology.calculateNatalChart)(partnerBirthData);
  const analysis = buildCompatibilityAnalysis(
    partnerId,
    partner.name,
    synastryChart,
    userNatalChart,
    partnerNatalChart
  );
  return analysis;
}
function buildCompatibilityAnalysis(partnerId, partnerName, synastryChart, userChart, partnerChart) {
  const loveScore = calculateCategoryScore("love", synastryChart.interAspects);
  const communicationScore = calculateCategoryScore("communication", synastryChart.interAspects);
  const trustScore = calculateCategoryScore("trust", synastryChart.interAspects);
  const adventureScore = calculateCategoryScore("adventure", synastryChart.interAspects);
  const valuesScore = calculateCategoryScore("values", synastryChart.interAspects);
  const categories = {
    love: {
      score: loveScore.score,
      level: getScoreCategoryLevel(loveScore.score),
      description: getCategoryDescription("love", loveScore.score),
      contributingAspects: loveScore.contributingAspects
    },
    communication: {
      score: communicationScore.score,
      level: getScoreCategoryLevel(communicationScore.score),
      description: getCategoryDescription("communication", communicationScore.score),
      contributingAspects: communicationScore.contributingAspects
    },
    trust: {
      score: trustScore.score,
      level: getScoreCategoryLevel(trustScore.score),
      description: getCategoryDescription("trust", trustScore.score),
      contributingAspects: trustScore.contributingAspects
    },
    adventure: {
      score: adventureScore.score,
      level: getScoreCategoryLevel(adventureScore.score),
      description: getCategoryDescription("adventure", adventureScore.score),
      contributingAspects: adventureScore.contributingAspects
    },
    values: {
      score: valuesScore.score,
      level: getScoreCategoryLevel(valuesScore.score),
      description: getCategoryDescription("values", valuesScore.score),
      contributingAspects: valuesScore.contributingAspects
    }
  };
  const overallScore = Math.round(
    categories.love.score * 0.25 + categories.communication.score * 0.2 + categories.trust.score * 0.2 + categories.adventure.score * 0.15 + categories.values.score * 0.2
  );
  const userDominant = getDominantElement(userChart.elements);
  const partnerDominant = getDominantElement(partnerChart.elements);
  const elementCompatibility = {
    userElements: userChart.elements,
    partnerElements: partnerChart.elements,
    compatibility: {
      score: ELEMENT_COMPATIBILITY[userDominant]?.[partnerDominant] || 50,
      analysis: {
        en: `Your dominant element (${userDominant}) and ${partnerName}'s dominant element (${partnerDominant}) ${getElementHarmony(userDominant, partnerDominant) === "harmonious" ? "create natural harmony" : getElementHarmony(userDominant, partnerDominant) === "complementary" ? "complement each other well" : "create dynamic growth opportunities"}.`,
        bg: `\u0412\u0430\u0448\u0438\u044F\u0442 \u0434\u043E\u043C\u0438\u043D\u0438\u0440\u0430\u0449 \u0435\u043B\u0435\u043C\u0435\u043D\u0442 (${userDominant}) \u0438 \u0434\u043E\u043C\u0438\u043D\u0438\u0440\u0430\u0449\u0438\u044F\u0442 \u0435\u043B\u0435\u043C\u0435\u043D\u0442 \u043D\u0430 ${partnerName} (${partnerDominant}) ${getElementHarmony(userDominant, partnerDominant) === "harmonious" ? "\u0441\u044A\u0437\u0434\u0430\u0432\u0430\u0442 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u0430 \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u044F" : getElementHarmony(userDominant, partnerDominant) === "complementary" ? "\u0441\u0435 \u0434\u043E\u043F\u044A\u043B\u0432\u0430\u0442 \u0434\u043E\u0431\u0440\u0435" : "\u0441\u044A\u0437\u0434\u0430\u0432\u0430\u0442 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u043D\u0438 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436"}.`
      }
    },
    dominantElement: {
      user: userDominant,
      partner: partnerDominant,
      harmony: getElementHarmony(userDominant, partnerDominant)
    }
  };
  const planetaryAnalysis = {
    sun: analyzePlanetPair("sun", userChart.sun, partnerChart.sun, synastryChart.interAspects),
    moon: analyzePlanetPair("moon", userChart.moon, partnerChart.moon, synastryChart.interAspects),
    rising: analyzePlanetPair("rising", userChart.rising, partnerChart.rising, synastryChart.interAspects),
    venus: analyzePlanetPair("venus", userChart.venus, partnerChart.venus, synastryChart.interAspects),
    mars: analyzePlanetPair("mars", userChart.mars, partnerChart.mars, synastryChart.interAspects)
  };
  const keyAspects = synastryChart.interAspects.filter((a) => ["sun", "moon", "venus", "mars", "mercury", "rising"].includes(a.userPlanet) || ["sun", "moon", "venus", "mars", "mercury", "rising"].includes(a.partnerPlanet)).slice(0, 10).map((aspect) => ({
    aspect: aspect.aspect,
    aspectBg: aspect.aspectBg,
    userPlanet: aspect.userPlanet,
    partnerPlanet: aspect.partnerPlanet,
    orb: aspect.orb,
    nature: aspect.nature,
    interpretation: aspect.interpretation
  }));
  const strengths = synastryChart.strengths.map((s) => ({
    title: s.title,
    description: s.description,
    planets: s.planets
  }));
  const challenges = synastryChart.challenges.map((c) => ({
    title: c.title,
    description: c.description,
    planets: c.planets
  }));
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
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function analyzePlanetPair(planet, userPlanet, partnerPlanet, aspects) {
  const primaryAspects = aspects.filter((a) => a.userPlanet === planet).sort((a, b) => a.orb - b.orb);
  const secondaryAspects = aspects.filter((a) => a.partnerPlanet === planet).sort((a, b) => a.orb - b.orb);
  const aspect = primaryAspects[0] ?? secondaryAspects[0] ?? null;
  const userElement = SIGN_ELEMENTS[userPlanet.sign] || "fire";
  const partnerElement = SIGN_ELEMENTS[partnerPlanet.sign] || "fire";
  const baseCompatibility = ELEMENT_COMPATIBILITY[userElement]?.[partnerElement] || 50;
  let compatibility = baseCompatibility;
  let nature = "neutral";
  if (aspect) {
    if (aspect.nature === "harmonious") {
      compatibility = Math.min(95, baseCompatibility + 20);
      nature = "harmonious";
    } else if (aspect.nature === "challenging") {
      compatibility = Math.max(15, baseCompatibility - 20);
      nature = "challenging";
    }
  }
  return {
    user: { sign: userPlanet.sign, degree: userPlanet.degree },
    partner: { sign: partnerPlanet.sign, degree: partnerPlanet.degree },
    compatibility,
    nature,
    interpretation: getPlanetaryInterpretation(planet, nature)
  };
}
async function getCachedCompatibility(_userId, _partnerId) {
  return null;
}
async function invalidateCompatibilityCache(_userId, _partnerId) {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateCompatibility,
  getCachedCompatibility,
  invalidateCompatibilityCache
});
