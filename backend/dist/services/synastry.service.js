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
var synastry_service_exports = {};
__export(synastry_service_exports, {
  calculateSynastryChart: () => calculateSynastryChart,
  getCachedSynastry: () => getCachedSynastry,
  invalidateSynastryCache: () => invalidateSynastryCache
});
module.exports = __toCommonJS(synastry_service_exports);
var import_astrology = require("./astrology");
const SYNASTRY_CACHE_TTL = 86400;
const ASPECT_ORBS = {
  conjunction: 8,
  opposition: 8,
  trine: 7,
  square: 7,
  sextile: 6,
  quincunx: 4
};
const ASPECT_NATURE = {
  conjunction: "neutral",
  // Can go either way
  opposition: "challenging",
  trine: "harmonious",
  square: "challenging",
  sextile: "harmonious",
  quincunx: "neutral"
};
const ASPECT_TRANSLATIONS = {
  conjunction: "\u0441\u044A\u0432\u043F\u0430\u0434",
  opposition: "\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044F",
  trine: "\u0442\u0440\u0438\u0433\u043E\u043D",
  square: "\u043A\u0432\u0430\u0434\u0440\u0430\u0442",
  sextile: "\u0441\u0435\u043A\u0441\u0442\u0438\u043B",
  quincunx: "\u043A\u0432\u0438\u043D\u043A\u0443\u043D\u043A\u0441"
};
const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];
const ASPECT_INTERPRETATIONS = {
  "sun-sun": {
    conjunction: {
      en: "Your core identities align powerfully. You understand each other naturally.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u043E\u0441\u043D\u043E\u0432\u043D\u0438 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442\u0438 \u0441\u0435 \u0441\u044A\u0447\u0435\u0442\u0430\u0432\u0430\u0442 \u043C\u043E\u0449\u043D\u043E. \u0420\u0430\u0437\u0431\u0438\u0440\u0430\u0442\u0435 \u0441\u0435 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043E."
    },
    trine: {
      en: "Harmonious self-expression. You support each other's individuality.",
      bg: "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u043D\u043E \u0441\u0430\u043C\u043E\u0438\u0437\u0440\u0430\u0437\u044F\u0432\u0430\u043D\u0435. \u041F\u043E\u0434\u043A\u0440\u0435\u043F\u044F\u0442\u0435 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u043D\u043E\u0441\u0442\u0442\u0430 \u0435\u0434\u0438\u043D \u043D\u0430 \u0434\u0440\u0443\u0433."
    },
    square: {
      en: "Ego clashes possible. You challenge each other to grow.",
      bg: "\u0412\u044A\u0437\u043C\u043E\u0436\u043D\u0438 \u0441\u0431\u043B\u044A\u0441\u044A\u0446\u0438 \u043D\u0430 \u0435\u0433\u043E\u0442\u043E. \u041F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0432\u0430\u0442\u0435 \u0441\u0435 \u0434\u0430 \u0440\u0430\u0441\u0442\u0435\u0442\u0435."
    },
    opposition: {
      en: "Complementary but opposing energies. Balance is key.",
      bg: "\u0414\u043E\u043F\u044A\u043B\u0432\u0430\u0449\u0438 \u0441\u0435, \u043D\u043E \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u043E\u043B\u043E\u0436\u043D\u0438 \u0435\u043D\u0435\u0440\u0433\u0438\u0438. \u0411\u0430\u043B\u0430\u043D\u0441\u044A\u0442 \u0435 \u043A\u043B\u044E\u0447\u043E\u0432."
    }
  },
  "sun-moon": {
    conjunction: {
      en: "Deep emotional connection. Your heart and ego align beautifully.",
      bg: "\u0414\u044A\u043B\u0431\u043E\u043A\u0430 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430. \u0421\u044A\u0440\u0446\u0435\u0442\u043E \u0438 \u0435\u0433\u043E\u0442\u043E \u0432\u0438 \u0441\u0435 \u0441\u044A\u0447\u0435\u0442\u0430\u0432\u0430\u0442 \u043F\u0440\u0435\u043A\u0440\u0430\u0441\u043D\u043E."
    },
    trine: {
      en: "Natural emotional understanding. You nurture each other's needs.",
      bg: "\u0415\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043E \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u043E \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435. \u0413\u0440\u0438\u0436\u0438\u0442\u0435 \u0441\u0435 \u0437\u0430 \u043D\u0443\u0436\u0434\u0438\u0442\u0435 \u0435\u0434\u0438\u043D \u043D\u0430 \u0434\u0440\u0443\u0433."
    },
    sextile: {
      en: "Supportive emotional bond. Easy flow of feeling and support.",
      bg: "\u041F\u043E\u0434\u043A\u0440\u0435\u043F\u044F\u0449\u0430 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430. \u041B\u0435\u0441\u0435\u043D \u043F\u043E\u0442\u043E\u043A \u043E\u0442 \u0447\u0443\u0432\u0441\u0442\u0432\u0430 \u0438 \u043F\u043E\u0434\u043A\u0440\u0435\u043F\u0430."
    },
    square: {
      en: "Emotional friction that demands growth. Learning to understand different needs.",
      bg: "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u043E \u0442\u0440\u0438\u0435\u043D\u0435, \u043A\u043E\u0435\u0442\u043E \u0438\u0437\u0438\u0441\u043A\u0432\u0430 \u0440\u0430\u0441\u0442\u0435\u0436. \u0423\u0447\u0435\u043D\u0435 \u0434\u0430 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u0442\u0435 \u0440\u0430\u0437\u043B\u0438\u0447\u043D\u0438 \u043D\u0443\u0436\u0434\u0438."
    },
    opposition: {
      en: "Polarity between ego and emotions. Learning to balance head and heart.",
      bg: "\u041F\u043E\u043B\u044F\u0440\u043D\u043E\u0441\u0442 \u043C\u0435\u0436\u0434\u0443 \u0435\u0433\u043E \u0438 \u0435\u043C\u043E\u0446\u0438\u0438. \u0423\u0447\u0435\u043D\u0435 \u0434\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u0430\u0442\u0435 \u0433\u043B\u0430\u0432\u0430\u0442\u0430 \u0438 \u0441\u044A\u0440\u0446\u0435\u0442\u043E."
    }
  },
  "moon-moon": {
    conjunction: {
      en: "Soulmate-level emotional connection. You feel each other deeply.",
      bg: "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430 \u043D\u0430 \u043D\u0438\u0432\u043E \u0440\u043E\u0434\u0435\u043D\u0438 \u0434\u0443\u0448\u0438. \u0427\u0443\u0432\u0441\u0442\u0432\u0430\u0442\u0435 \u0441\u0435 \u0434\u044A\u043B\u0431\u043E\u043A\u043E."
    },
    trine: {
      en: "Emotional harmony. You naturally understand each other's feelings.",
      bg: "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u044F. \u0415\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043E \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u0442\u0435 \u0447\u0443\u0432\u0441\u0442\u0432\u0430\u0442\u0430 \u0435\u0434\u0438\u043D \u043D\u0430 \u0434\u0440\u0443\u0433."
    },
    square: {
      en: "Emotional differences require understanding. Growth through compromise.",
      bg: "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0438\u0442\u0435 \u0440\u0430\u0437\u043B\u0438\u0447\u0438\u044F \u0438\u0437\u0438\u0441\u043A\u0432\u0430\u0442 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435. \u0420\u0430\u0441\u0442\u0435\u0436 \u0447\u0440\u0435\u0437 \u043A\u043E\u043C\u043F\u0440\u043E\u043C\u0438\u0441."
    },
    opposition: {
      en: "Complementary emotional needs. Balance through awareness.",
      bg: "\u0414\u043E\u043F\u044A\u043B\u0432\u0430\u0449\u0438 \u0441\u0435 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0438 \u043D\u0443\u0436\u0434\u0438. \u0411\u0430\u043B\u0430\u043D\u0441 \u0447\u0440\u0435\u0437 \u043E\u0441\u044A\u0437\u043D\u0430\u0442\u043E\u0441\u0442."
    }
  },
  "venus-venus": {
    conjunction: {
      en: "Shared values and love language. Natural attraction and affection.",
      bg: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D\u0438 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0438 \u0435\u0437\u0438\u043A \u043D\u0430 \u043B\u044E\u0431\u043E\u0432\u0442\u0430. \u0415\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043E \u043F\u0440\u0438\u0432\u043B\u0438\u0447\u0430\u043D\u0435 \u0438 \u043E\u0431\u0438\u0447."
    },
    trine: {
      en: "Harmonious love expression. Easy flow of affection.",
      bg: "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u043D\u043E \u0438\u0437\u0440\u0430\u0437\u044F\u0432\u0430\u043D\u0435 \u043D\u0430 \u043B\u044E\u0431\u043E\u0432\u0442\u0430. \u041B\u0435\u0441\u0435\u043D \u043F\u043E\u0442\u043E\u043A \u043D\u0430 \u043E\u0431\u0438\u0447."
    },
    square: {
      en: "Different love styles. Learning to appreciate each other's approach.",
      bg: "\u0420\u0430\u0437\u043B\u0438\u0447\u043D\u0438 \u0441\u0442\u0438\u043B\u043E\u0432\u0435 \u043D\u0430 \u043B\u044E\u0431\u043E\u0432. \u0423\u0447\u0435\u043D\u0435 \u0434\u0430 \u0446\u0435\u043D\u0438\u0442\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u0430 \u0435\u0434\u0438\u043D \u043D\u0430 \u0434\u0440\u0443\u0433."
    }
  },
  "venus-mars": {
    conjunction: {
      en: "Intense romantic and sexual chemistry. Powerful attraction.",
      bg: "\u0418\u043D\u0442\u0435\u043D\u0437\u0438\u0432\u043D\u0430 \u0440\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u043D\u0430 \u0438 \u0441\u0435\u043A\u0441\u0443\u0430\u043B\u043D\u0430 \u0445\u0438\u043C\u0438\u044F. \u041C\u043E\u0449\u043D\u043E \u043F\u0440\u0438\u0432\u043B\u0438\u0447\u0430\u043D\u0435."
    },
    trine: {
      en: "Natural romantic harmony. Love and desire flow together.",
      bg: "\u0415\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u0430 \u0440\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u043D\u0430 \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u044F. \u041B\u044E\u0431\u043E\u0432\u0442\u0430 \u0438 \u0436\u0435\u043B\u0430\u043D\u0438\u0435\u0442\u043E \u0442\u0435\u043A\u0430\u0442 \u0437\u0430\u0435\u0434\u043D\u043E."
    },
    square: {
      en: "Tension between love and passion. Learning to balance romance and desire.",
      bg: "\u041D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435 \u043C\u0435\u0436\u0434\u0443 \u043B\u044E\u0431\u043E\u0432\u0442\u0430 \u0438 \u0441\u0442\u0440\u0430\u0441\u0442\u0442\u0430. \u0423\u0447\u0435\u043D\u0435 \u0434\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u0430\u0442\u0435 \u0440\u043E\u043C\u0430\u043D\u0442\u0438\u043A\u0430 \u0438 \u0436\u0435\u043B\u0430\u043D\u0438\u0435."
    },
    opposition: {
      en: "Polarity of love and desire. Complementary energies.",
      bg: "\u041F\u043E\u043B\u044F\u0440\u043D\u043E\u0441\u0442 \u043D\u0430 \u043B\u044E\u0431\u043E\u0432 \u0438 \u0436\u0435\u043B\u0430\u043D\u0438\u0435. \u0414\u043E\u043F\u044A\u043B\u0432\u0430\u0449\u0438 \u0441\u0435 \u0435\u043D\u0435\u0440\u0433\u0438\u0438."
    }
  },
  "mars-mars": {
    conjunction: {
      en: "Shared drive and energy. Powerful action together.",
      bg: "\u0421\u043F\u043E\u0434\u0435\u043B\u0435\u043D \u0434\u0440\u0430\u0439\u0432 \u0438 \u0435\u043D\u0435\u0440\u0433\u0438\u044F. \u041C\u043E\u0449\u043D\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0437\u0430\u0435\u0434\u043D\u043E."
    },
    trine: {
      en: "Coordinated action. You motivate each other effectively.",
      bg: "\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0438\u0440\u0430\u043D\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435. \u041C\u043E\u0442\u0438\u0432\u0438\u0440\u0430\u0442\u0435 \u0441\u0435 \u0435\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u043E."
    },
    square: {
      en: "Competitive tension. Channeling energy constructively.",
      bg: "\u041A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442\u043D\u043E \u043D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435. \u041A\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0430\u043D\u0435 \u043D\u0430 \u0435\u043D\u0435\u0440\u0433\u0438\u044F\u0442\u0430 \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0442\u0438\u0432\u043D\u043E."
    }
  },
  "moon-venus": {
    conjunction: {
      en: "Beautiful emotional and loving connection. Deep affection.",
      bg: "\u041F\u0440\u0435\u043A\u0440\u0430\u0441\u043D\u0430 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u0438 \u043B\u044E\u0431\u044F\u0449\u0430 \u0432\u0440\u044A\u0437\u043A\u0430. \u0414\u044A\u043B\u0431\u043E\u043A\u0430 \u043E\u0431\u0438\u0447."
    },
    trine: {
      en: "Harmony between feelings and love. Natural nurturing.",
      bg: "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u044F \u043C\u0435\u0436\u0434\u0443 \u0447\u0443\u0432\u0441\u0442\u0432\u0430\u0442\u0430 \u0438 \u043B\u044E\u0431\u043E\u0432\u0442\u0430. \u0415\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u0430 \u0433\u0440\u0438\u0436\u0430."
    },
    sextile: {
      en: "Sweet emotional bond. Easy expression of affection.",
      bg: "\u0421\u043B\u0430\u0434\u043A\u0430 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430. \u041B\u0435\u0441\u043D\u043E \u0438\u0437\u0440\u0430\u0437\u044F\u0432\u0430\u043D\u0435 \u043D\u0430 \u043E\u0431\u0438\u0447."
    }
  },
  "sun-venus": {
    conjunction: {
      en: "Love illuminates your identity. Romantic connection to core self.",
      bg: "\u041B\u044E\u0431\u043E\u0432\u0442\u0430 \u043E\u0437\u0430\u0440\u044F\u0432\u0430 \u0432\u0430\u0448\u0430\u0442\u0430 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442. \u0420\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430 \u0441 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0442\u043E \u0430\u0437."
    },
    trine: {
      en: "Your ego and love nature support each other beautifully.",
      bg: "\u0412\u0430\u0448\u0435\u0442\u043E \u0435\u0433\u043E \u0438 \u043B\u044E\u0431\u043E\u0432\u043D\u0430 \u043F\u0440\u0438\u0440\u043E\u0434\u0430 \u0441\u0435 \u043F\u043E\u0434\u043A\u0440\u0435\u043F\u044F\u0442 \u043F\u0440\u0435\u043A\u0440\u0430\u0441\u043D\u043E."
    },
    square: {
      en: "Tension between self-expression and relationships. Growth through love.",
      bg: "\u041D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435 \u043C\u0435\u0436\u0434\u0443 \u0441\u0430\u043C\u043E\u0438\u0437\u0440\u0430\u0437\u044F\u0432\u0430\u043D\u0435\u0442\u043E \u0438 \u0432\u0440\u044A\u0437\u043A\u0438\u0442\u0435. \u0420\u0430\u0441\u0442\u0435\u0436 \u0447\u0440\u0435\u0437 \u043B\u044E\u0431\u043E\u0432."
    }
  },
  "sun-mars": {
    conjunction: {
      en: "Powerful dynamic energy together. Strong motivation and drive.",
      bg: "\u041C\u043E\u0449\u043D\u0430 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u043D\u0430 \u0435\u043D\u0435\u0440\u0433\u0438\u044F \u0437\u0430\u0435\u0434\u043D\u043E. \u0421\u0438\u043B\u043D\u0430 \u043C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u044F \u0438 \u0434\u0440\u0430\u0439\u0432."
    },
    trine: {
      en: "Your identities energize each other. Great teamwork.",
      bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442\u0438 \u0441\u0435 \u0435\u043D\u0435\u0440\u0433\u0438\u0437\u0438\u0440\u0430\u0442 \u0432\u0437\u0430\u0438\u043C\u043D\u043E. \u0421\u0442\u0440\u0430\u0445\u043E\u0442\u043D\u0430 \u0440\u0430\u0431\u043E\u0442\u0430 \u0432 \u0435\u043A\u0438\u043F."
    },
    square: {
      en: "Ego conflicts possible. Learning to direct energy positively.",
      bg: "\u0412\u044A\u0437\u043C\u043E\u0436\u043D\u0438 \u0435\u0433\u043E \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u0438. \u0423\u0447\u0435\u043D\u0435 \u0434\u0430 \u043D\u0430\u0441\u043E\u0447\u0432\u0430\u0442\u0435 \u0435\u043D\u0435\u0440\u0433\u0438\u044F\u0442\u0430 \u043F\u043E\u0437\u0438\u0442\u0438\u0432\u043D\u043E."
    }
  }
};
function getSignIndex(sign) {
  return ZODIAC_SIGNS.indexOf(sign);
}
function getAbsoluteDegree(sign, degree) {
  const signIndex = getSignIndex(sign);
  if (signIndex === -1) return degree;
  return signIndex * 30 + degree;
}
function calculateAngle(degree1, degree2) {
  let diff = Math.abs(degree1 - degree2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}
function determineAspect(angle) {
  const aspects = [
    { name: "conjunction", angle: 0, orb: ASPECT_ORBS.conjunction },
    { name: "opposition", angle: 180, orb: ASPECT_ORBS.opposition },
    { name: "trine", angle: 120, orb: ASPECT_ORBS.trine },
    { name: "square", angle: 90, orb: ASPECT_ORBS.square },
    { name: "sextile", angle: 60, orb: ASPECT_ORBS.sextile },
    { name: "quincunx", angle: 150, orb: ASPECT_ORBS.quincunx }
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
  const key1 = `${userPlanet}-${partnerPlanet}`;
  const key2 = `${partnerPlanet}-${userPlanet}`;
  if (ASPECT_INTERPRETATIONS[key1]?.[aspect]) {
    return ASPECT_INTERPRETATIONS[key1][aspect];
  }
  if (ASPECT_INTERPRETATIONS[key2]?.[aspect]) {
    return ASPECT_INTERPRETATIONS[key2][aspect];
  }
  const nature = ASPECT_NATURE[aspect] || "neutral";
  const defaults = {
    harmonious: {
      en: `${userPlanet} and ${partnerPlanet} create harmonious energy together.`,
      bg: `${userPlanet} \u0438 ${partnerPlanet} \u0441\u044A\u0437\u0434\u0430\u0432\u0430\u0442 \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u043D\u0430 \u0435\u043D\u0435\u0440\u0433\u0438\u044F \u0437\u0430\u0435\u0434\u043D\u043E.`
    },
    challenging: {
      en: `${userPlanet} and ${partnerPlanet} create dynamic tension that promotes growth.`,
      bg: `${userPlanet} \u0438 ${partnerPlanet} \u0441\u044A\u0437\u0434\u0430\u0432\u0430\u0442 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u043D\u043E \u043D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435, \u043A\u043E\u0435\u0442\u043E \u043D\u0430\u0441\u044A\u0440\u0447\u0430\u0432\u0430 \u0440\u0430\u0441\u0442\u0435\u0436\u0430.`
    },
    neutral: {
      en: `${userPlanet} and ${partnerPlanet} connect in a meaningful way.`,
      bg: `${userPlanet} \u0438 ${partnerPlanet} \u0441\u0435 \u0441\u0432\u044A\u0440\u0437\u0432\u0430\u0442 \u043F\u043E \u0441\u043C\u0438\u0441\u043B\u0435\u043D \u043D\u0430\u0447\u0438\u043D.`
    }
  };
  return defaults[nature];
}
function generateCacheKey(userId, partnerId) {
  return `synastry:${userId}:${partnerId}`;
}
async function calculateSynastryChart(userBirthData, partnerBirthData, userId, partnerId) {
  const [userChart, partnerChart] = await Promise.all([
    (0, import_astrology.calculateNatalChart)(userBirthData),
    (0, import_astrology.calculateNatalChart)(partnerBirthData)
  ]);
  const userPlanets = [
    { name: "sun", data: userChart.sun },
    { name: "moon", data: userChart.moon },
    { name: "mercury", data: userChart.mercury },
    { name: "venus", data: userChart.venus },
    { name: "mars", data: userChart.mars },
    { name: "jupiter", data: userChart.jupiter },
    { name: "saturn", data: userChart.saturn },
    { name: "uranus", data: userChart.uranus },
    { name: "neptune", data: userChart.neptune },
    { name: "pluto", data: userChart.pluto },
    { name: "northNode", data: userChart.northNode },
    { name: "southNode", data: userChart.southNode },
    { name: "chiron", data: userChart.chiron }
  ].filter((p) => p.data);
  const partnerPlanets = [
    { name: "sun", data: partnerChart.sun },
    { name: "moon", data: partnerChart.moon },
    { name: "mercury", data: partnerChart.mercury },
    { name: "venus", data: partnerChart.venus },
    { name: "mars", data: partnerChart.mars },
    { name: "jupiter", data: partnerChart.jupiter },
    { name: "saturn", data: partnerChart.saturn },
    { name: "uranus", data: partnerChart.uranus },
    { name: "neptune", data: partnerChart.neptune },
    { name: "pluto", data: partnerChart.pluto },
    { name: "northNode", data: partnerChart.northNode },
    { name: "southNode", data: partnerChart.southNode },
    { name: "chiron", data: partnerChart.chiron }
  ].filter((p) => p.data);
  const interAspects = [];
  for (const userPlanet of userPlanets) {
    for (const partnerPlanet of partnerPlanets) {
      const userDegree = getAbsoluteDegree(userPlanet.data.sign, userPlanet.data.degree);
      const partnerDegree = getAbsoluteDegree(partnerPlanet.data.sign, partnerPlanet.data.degree);
      const angle = calculateAngle(userDegree, partnerDegree);
      const aspectResult = determineAspect(angle);
      if (aspectResult) {
        const interpretation = getInterpretation(
          userPlanet.name,
          partnerPlanet.name,
          aspectResult.aspect
        );
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
          nature: ASPECT_NATURE[aspectResult.aspect] || "neutral",
          interpretation
        });
      }
    }
  }
  interAspects.sort((a, b) => a.orb - b.orb);
  const compatibilityScore = calculateCompatibilityScore(interAspects);
  const strengths = identifyStrengths(interAspects);
  const challenges = identifyChallenges(interAspects);
  const summary = generateSummary(
    userChart.sun.sign,
    userChart.moon.sign,
    partnerChart.sun.sign,
    partnerChart.moon.sign,
    compatibilityScore,
    interAspects
  );
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
      modalities: userChart.modalities
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
      modalities: partnerChart.modalities
    },
    interAspects,
    compatibilityScore,
    strengths,
    challenges,
    summary,
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return synastryChart;
}
function calculateCompatibilityScore(aspects) {
  if (aspects.length === 0) return 50;
  const personalPlanets = ["sun", "moon", "mercury", "venus", "mars", "rising"];
  let totalScore = 0;
  let totalWeight = 0;
  for (const aspect of aspects) {
    const isUserPersonal = personalPlanets.includes(aspect.userPlanet);
    const isPartnerPersonal = personalPlanets.includes(aspect.partnerPlanet);
    let weight = 1;
    if (isUserPersonal && isPartnerPersonal) {
      weight = 3;
    } else if (isUserPersonal || isPartnerPersonal) {
      weight = 2;
    }
    weight *= 1 - aspect.orb / 10;
    let score = 50;
    if (aspect.nature === "harmonious") {
      score = 80;
    } else if (aspect.nature === "challenging") {
      score = 30;
    }
    totalScore += score * weight;
    totalWeight += weight;
  }
  return Math.round(totalWeight > 0 ? totalScore / totalWeight : 50);
}
function identifyStrengths(aspects) {
  const strengths = [];
  const harmonious = aspects.filter(
    (a) => a.nature === "harmonious" && a.orb < 5
  );
  const sunMoon = harmonious.find(
    (a) => a.userPlanet === "sun" && a.partnerPlanet === "moon" || a.userPlanet === "moon" && a.partnerPlanet === "sun"
  );
  if (sunMoon) {
    strengths.push({
      title: {
        en: "Emotional-Expressive Harmony",
        bg: "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u043E-\u0435\u043A\u0441\u043F\u0440\u0435\u0441\u0438\u0432\u043D\u0430 \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u044F"
      },
      description: {
        en: "Your emotional needs and self-expression align beautifully.",
        bg: "\u0412\u0430\u0448\u0438\u0442\u0435 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0438 \u043D\u0443\u0436\u0434\u0438 \u0438 \u0441\u0430\u043C\u043E\u0438\u0437\u0440\u0430\u0437\u044F\u0432\u0430\u043D\u0435 \u0441\u0435 \u0441\u044A\u0447\u0435\u0442\u0430\u0432\u0430\u0442 \u043F\u0440\u0435\u043A\u0440\u0430\u0441\u043D\u043E."
      },
      planets: [sunMoon.userPlanet, sunMoon.partnerPlanet]
    });
  }
  const venusMars = harmonious.find(
    (a) => a.userPlanet === "venus" && a.partnerPlanet === "mars" || a.userPlanet === "mars" && a.partnerPlanet === "venus"
  );
  if (venusMars) {
    strengths.push({
      title: {
        en: "Romantic Chemistry",
        bg: "\u0420\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u043D\u0430 \u0445\u0438\u043C\u0438\u044F"
      },
      description: {
        en: "Strong attraction and passion between you.",
        bg: "\u0421\u0438\u043B\u043D\u043E \u043F\u0440\u0438\u0432\u043B\u0438\u0447\u0430\u043D\u0435 \u0438 \u0441\u0442\u0440\u0430\u0441\u0442 \u043C\u0435\u0436\u0434\u0443 \u0432\u0430\u0441."
      },
      planets: [venusMars.userPlanet, venusMars.partnerPlanet]
    });
  }
  const moonMoon = harmonious.find(
    (a) => a.userPlanet === "moon" && a.partnerPlanet === "moon"
  );
  if (moonMoon) {
    strengths.push({
      title: {
        en: "Emotional Resonance",
        bg: "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u0435\u043D \u0440\u0435\u0437\u043E\u043D\u0430\u043D\u0441"
      },
      description: {
        en: "Deep understanding of each other's emotional worlds.",
        bg: "\u0414\u044A\u043B\u0431\u043E\u043A\u043E \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435 \u043D\u0430 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0438\u0442\u0435 \u0441\u0432\u0435\u0442\u043E\u0432\u0435 \u0435\u0434\u0438\u043D \u043D\u0430 \u0434\u0440\u0443\u0433."
      },
      planets: ["moon", "moon"]
    });
  }
  if (harmonious.length >= 5 && strengths.length < 3) {
    strengths.push({
      title: {
        en: "Natural Flow",
        bg: "\u0415\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D \u043F\u043E\u0442\u043E\u043A"
      },
      description: {
        en: "Multiple harmonious connections create ease in your relationship.",
        bg: "\u041C\u043D\u043E\u0436\u0435\u0441\u0442\u0432\u043E \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u043D\u0438 \u0432\u0440\u044A\u0437\u043A\u0438 \u0441\u044A\u0437\u0434\u0430\u0432\u0430\u0442 \u043B\u0435\u043A\u043E\u0442\u0430 \u0432\u044A\u0432 \u0432\u0430\u0448\u0430\u0442\u0430 \u0432\u0440\u044A\u0437\u043A\u0430."
      },
      planets: harmonious.slice(0, 3).map((a) => a.userPlanet)
    });
  }
  return strengths;
}
function identifyChallenges(aspects) {
  const challenges = [];
  const difficult = aspects.filter(
    (a) => a.nature === "challenging" && a.orb < 5
  );
  const sunSaturn = difficult.find(
    (a) => a.userPlanet === "sun" && a.partnerPlanet === "saturn" || a.userPlanet === "saturn" && a.partnerPlanet === "sun"
  );
  if (sunSaturn) {
    challenges.push({
      title: {
        en: "Responsibility vs Freedom",
        bg: "\u041E\u0442\u0433\u043E\u0432\u043E\u0440\u043D\u043E\u0441\u0442 \u0441\u0440\u0435\u0449\u0443 \u0441\u0432\u043E\u0431\u043E\u0434\u0430"
      },
      description: {
        en: "Balancing commitment with individual expression requires work.",
        bg: "\u0411\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0430\u043D\u0433\u0430\u0436\u0438\u043C\u0435\u043D\u0442 \u0441 \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u043D\u043E \u0438\u0437\u0440\u0430\u0437\u044F\u0432\u0430\u043D\u0435 \u0438\u0437\u0438\u0441\u043A\u0432\u0430 \u0440\u0430\u0431\u043E\u0442\u0430."
      },
      planets: [sunSaturn.userPlanet, sunSaturn.partnerPlanet]
    });
  }
  const moonSaturn = difficult.find(
    (a) => a.userPlanet === "moon" && a.partnerPlanet === "saturn" || a.userPlanet === "saturn" && a.partnerPlanet === "moon"
  );
  if (moonSaturn) {
    challenges.push({
      title: {
        en: "Emotional Walls",
        bg: "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0438 \u0441\u0442\u0435\u043D\u0438"
      },
      description: {
        en: "Learning to be vulnerable and emotionally open with each other.",
        bg: "\u0423\u0447\u0435\u043D\u0435 \u0434\u0430 \u0431\u044A\u0434\u0435\u0442\u0435 \u0443\u044F\u0437\u0432\u0438\u043C\u0438 \u0438 \u0435\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u043E \u043E\u0442\u0432\u043E\u0440\u0435\u043D\u0438 \u0435\u0434\u0438\u043D \u0441 \u0434\u0440\u0443\u0433."
      },
      planets: [moonSaturn.userPlanet, moonSaturn.partnerPlanet]
    });
  }
  const marsSaturn = difficult.find(
    (a) => a.userPlanet === "mars" && a.partnerPlanet === "saturn" || a.userPlanet === "saturn" && a.partnerPlanet === "mars"
  );
  if (marsSaturn) {
    challenges.push({
      title: {
        en: "Action vs Caution",
        bg: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0441\u0440\u0435\u0449\u0443 \u043F\u0440\u0435\u0434\u043F\u0430\u0437\u043B\u0438\u0432\u043E\u0441\u0442"
      },
      description: {
        en: "Finding balance between impulse and restraint.",
        bg: "\u041D\u0430\u043C\u0438\u0440\u0430\u043D\u0435 \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441 \u043C\u0435\u0436\u0434\u0443 \u0438\u043C\u043F\u0443\u043B\u0441\u0430 \u0438 \u0432\u044A\u0437\u0434\u044A\u0440\u0436\u0430\u043D\u0438\u0435\u0442\u043E."
      },
      planets: [marsSaturn.userPlanet, marsSaturn.partnerPlanet]
    });
  }
  if (difficult.length >= 3 && challenges.length < 2) {
    challenges.push({
      title: {
        en: "Growth Through Tension",
        bg: "\u0420\u0430\u0441\u0442\u0435\u0436 \u0447\u0440\u0435\u0437 \u043D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435"
      },
      description: {
        en: "Challenging aspects push you both to grow and evolve.",
        bg: "\u041F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u043D\u0438\u0442\u0435 \u0430\u0441\u043F\u0435\u043A\u0442\u0438 \u0432\u0438 \u043F\u043E\u0434\u0442\u0438\u043A\u0432\u0430\u0442 \u0438 \u0434\u0432\u0430\u043C\u0430\u0442\u0430 \u0434\u0430 \u0440\u0430\u0441\u0442\u0435\u0442\u0435 \u0438 \u0435\u0432\u043E\u043B\u044E\u0438\u0440\u0430\u0442\u0435."
      },
      planets: difficult.slice(0, 3).map((a) => a.userPlanet)
    });
  }
  return challenges;
}
function generateSummary(userSun, userMoon, partnerSun, partnerMoon, score, aspects) {
  const harmoniousCount = aspects.filter((a) => a.nature === "harmonious").length;
  const challengingCount = aspects.filter((a) => a.nature === "challenging").length;
  let compatibility = "moderate";
  if (score >= 70) compatibility = "high";
  else if (score < 40) compatibility = "challenging";
  const summaries = {
    high: {
      en: `Your ${userSun} Sun and ${userMoon} Moon connect beautifully with your partner's ${partnerSun} Sun and ${partnerMoon} Moon. With ${harmoniousCount} harmonious aspects between your charts, you have a natural flow and understanding. This is a relationship with strong potential for lasting connection.`,
      bg: `\u0412\u0430\u0448\u0435\u0442\u043E ${userSun} \u0421\u043B\u044A\u043D\u0446\u0435 \u0438 ${userMoon} \u041B\u0443\u043D\u0430 \u0441\u0435 \u0441\u0432\u044A\u0440\u0437\u0432\u0430\u0442 \u043F\u0440\u0435\u043A\u0440\u0430\u0441\u043D\u043E \u0441\u044A\u0441 ${partnerSun} \u0421\u043B\u044A\u043D\u0446\u0435 \u0438 ${partnerMoon} \u041B\u0443\u043D\u0430 \u043D\u0430 \u043F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0430 \u0432\u0438. \u0421 ${harmoniousCount} \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u043D\u0438 \u0430\u0441\u043F\u0435\u043A\u0442\u0438 \u043C\u0435\u0436\u0434\u0443 \u0432\u0430\u0448\u0438\u0442\u0435 \u043A\u0430\u0440\u0442\u0438, \u0438\u043C\u0430\u0442\u0435 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D \u043F\u043E\u0442\u043E\u043A \u0438 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u043D\u0435. \u0422\u043E\u0432\u0430 \u0435 \u0432\u0440\u044A\u0437\u043A\u0430 \u0441 \u0433\u043E\u043B\u044F\u043C \u043F\u043E\u0442\u0435\u043D\u0446\u0438\u0430\u043B \u0437\u0430 \u0442\u0440\u0430\u0439\u043D\u0430 \u0432\u0440\u044A\u0437\u043A\u0430.`
    },
    moderate: {
      en: `Your ${userSun} Sun and ${userMoon} Moon interact with your partner's ${partnerSun} Sun and ${partnerMoon} Moon in interesting ways. With a mix of ${harmoniousCount} harmonious and ${challengingCount} challenging aspects, your relationship has both ease and areas for growth. This creates a dynamic partnership with learning opportunities.`,
      bg: `\u0412\u0430\u0448\u0435\u0442\u043E ${userSun} \u0421\u043B\u044A\u043D\u0446\u0435 \u0438 ${userMoon} \u041B\u0443\u043D\u0430 \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0430\u0442 \u0441\u044A\u0441 ${partnerSun} \u0421\u043B\u044A\u043D\u0446\u0435 \u0438 ${partnerMoon} \u041B\u0443\u043D\u0430 \u043D\u0430 \u043F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0430 \u0432\u0438 \u043F\u043E \u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043D\u0438 \u043D\u0430\u0447\u0438\u043D\u0438. \u0421 \u043A\u043E\u043C\u0431\u0438\u043D\u0430\u0446\u0438\u044F \u043E\u0442 ${harmoniousCount} \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u0447\u043D\u0438 \u0438 ${challengingCount} \u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u043D\u0438 \u0430\u0441\u043F\u0435\u043A\u0442\u0438, \u0432\u0430\u0448\u0430\u0442\u0430 \u0432\u0440\u044A\u0437\u043A\u0430 \u0438\u043C\u0430 \u043A\u0430\u043A\u0442\u043E \u043B\u0435\u043A\u043E\u0442\u0430, \u0442\u0430\u043A\u0430 \u0438 \u043E\u0431\u043B\u0430\u0441\u0442\u0438 \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436. \u0422\u043E\u0432\u0430 \u0441\u044A\u0437\u0434\u0430\u0432\u0430 \u0434\u0438\u043D\u0430\u043C\u0438\u0447\u043D\u043E \u043F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0441\u0442\u0432\u043E \u0441 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u0443\u0447\u0435\u043D\u0435.`
    },
    challenging: {
      en: `Your ${userSun} Sun and ${userMoon} Moon engage with your partner's ${partnerSun} Sun and ${partnerMoon} Moon through ${challengingCount} challenging aspects. While this creates friction, it also brings tremendous growth potential. This relationship requires work but can lead to profound transformation for both partners.`,
      bg: `\u0412\u0430\u0448\u0435\u0442\u043E ${userSun} \u0421\u043B\u044A\u043D\u0446\u0435 \u0438 ${userMoon} \u041B\u0443\u043D\u0430 \u0441\u0435 \u0430\u043D\u0433\u0430\u0436\u0438\u0440\u0430\u0442 \u0441\u044A\u0441 ${partnerSun} \u0421\u043B\u044A\u043D\u0446\u0435 \u0438 ${partnerMoon} \u041B\u0443\u043D\u0430 \u043D\u0430 \u043F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0430 \u0432\u0438 \u0447\u0440\u0435\u0437 ${challengingCount} \u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u043D\u0438 \u0430\u0441\u043F\u0435\u043A\u0442\u0438. \u0412\u044A\u043F\u0440\u0435\u043A\u0438 \u0447\u0435 \u0442\u043E\u0432\u0430 \u0441\u044A\u0437\u0434\u0430\u0432\u0430 \u0442\u0440\u0438\u0435\u043D\u0435, \u0442\u043E \u0441\u044A\u0449\u043E \u0442\u0430\u043A\u0430 \u043D\u043E\u0441\u0438 \u043E\u0433\u0440\u043E\u043C\u0435\u043D \u043F\u043E\u0442\u0435\u043D\u0446\u0438\u0430\u043B \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436. \u0422\u0430\u0437\u0438 \u0432\u0440\u044A\u0437\u043A\u0430 \u0438\u0437\u0438\u0441\u043A\u0432\u0430 \u0440\u0430\u0431\u043E\u0442\u0430, \u043D\u043E \u043C\u043E\u0436\u0435 \u0434\u0430 \u0434\u043E\u0432\u0435\u0434\u0435 \u0434\u043E \u0434\u044A\u043B\u0431\u043E\u043A\u0430 \u0442\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u0438 \u0437\u0430 \u0434\u0432\u0430\u043C\u0430\u0442\u0430 \u043F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0438.`
    }
  };
  return summaries[compatibility];
}
async function getCachedSynastry(_userId, _partnerId) {
  return null;
}
async function invalidateSynastryCache(_userId, _partnerId) {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateSynastryChart,
  getCachedSynastry,
  invalidateSynastryCache
});
