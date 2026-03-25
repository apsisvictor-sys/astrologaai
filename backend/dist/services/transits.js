"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var transits_exports = {};
__export(transits_exports, {
  calculateTransitsToNatal: () => calculateTransitsToNatal,
  computeTransitHouses: () => computeTransitHouses,
  getActiveTransitsForUser: () => getActiveTransitsForUser,
  warmDailyTransitsCache: () => warmDailyTransitsCache
});
module.exports = __toCommonJS(transits_exports);
var import_redis = require("../utils/redis");
const PLANET_BG = {
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
  chiron: "\u0425\u0438\u0440\u043E\u043D"
};
const SIGN_ABBREV_TO_FULL = {
  Ari: "Aries",
  Tau: "Taurus",
  Gem: "Gemini",
  Can: "Cancer",
  Leo: "Leo",
  Vir: "Virgo",
  Lib: "Libra",
  Sco: "Scorpio",
  Sag: "Sagittarius",
  Cap: "Capricorn",
  Aqu: "Aquarius",
  Pis: "Pisces"
};
const PLANET_SDK_TO_INTERNAL = {
  Sun: "sun",
  Moon: "moon",
  Mercury: "mercury",
  Venus: "venus",
  Mars: "mars",
  Jupiter: "jupiter",
  Saturn: "saturn",
  Uranus: "uranus",
  Neptune: "neptune",
  Pluto: "pluto",
  True_Node: "northNode"
};
const SIGN_BG = {
  Aries: "\u041E\u0432\u0435\u043D",
  Taurus: "\u0422\u0435\u043B\u0435\u0446",
  Gemini: "\u0411\u043B\u0438\u0437\u043D\u0430\u0446\u0438",
  Cancer: "\u0420\u0430\u043A",
  Leo: "\u041B\u044A\u0432",
  Virgo: "\u0414\u0435\u0432\u0430",
  Libra: "\u0412\u0435\u0437\u043D\u0438",
  Scorpio: "\u0421\u043A\u043E\u0440\u043F\u0438\u043E\u043D",
  Sagittarius: "\u0421\u0442\u0440\u0435\u043B\u0435\u0446",
  Capricorn: "\u041A\u043E\u0437\u0438\u0440\u043E\u0433",
  Aquarius: "\u0412\u043E\u0434\u043E\u043B\u0435\u0439",
  Pisces: "\u0420\u0438\u0431\u0438"
};
const ASPECT_BG = {
  conjunction: "\u0441\u044A\u0432\u043F\u0430\u0434",
  sextile: "\u0441\u0435\u043A\u0441\u0442\u0438\u043B",
  square: "\u043A\u0432\u0430\u0434\u0440\u0430\u0442",
  trine: "\u0442\u0440\u0438\u0433\u043E\u043D",
  opposition: "\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044F"
};
const ASPECT_INFLUENCE = {
  conjunction: "neutral",
  sextile: "positive",
  square: "challenging",
  trine: "positive",
  opposition: "challenging"
};
const ASPECT_ORBS = {
  conjunction: 10,
  sextile: 6,
  square: 8,
  trine: 8,
  opposition: 10
};
const ASPECT_ANGLES = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180
};
const MOON_PHASE_BG = {
  "New Moon": "\u041D\u043E\u0432\u043E\u043B\u0443\u043D\u0438\u0435",
  "Waxing Crescent": "\u041C\u043B\u0430\u0434 \u043C\u0435\u0441\u0435\u0446",
  "First Quarter": "\u041F\u044A\u0440\u0432\u0430 \u0447\u0435\u0442\u0432\u044A\u0440\u0442",
  "Waxing Gibbous": "\u0420\u0430\u0441\u0442\u044F\u0449\u0430 \u043B\u0443\u043D\u0430",
  "Full Moon": "\u041F\u044A\u043B\u043D\u043E\u043B\u0443\u043D\u0438\u0435",
  "Waning Gibbous": "\u041D\u0430\u043C\u0430\u043B\u044F\u0432\u0430\u0449\u0430 \u043B\u0443\u043D\u0430",
  "Last Quarter": "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0430 \u0447\u0435\u0442\u0432\u044A\u0440\u0442",
  "Waning Crescent": "\u0421\u0442\u0430\u0440 \u043C\u0435\u0441\u0435\u0446"
};
const ASPECT_DESCRIPTIONS = {
  "sun-conjunction": "\u0415\u043D\u0435\u0440\u0433\u0438\u0435\u043D \u043F\u0438\u043A, \u0444\u043E\u043A\u0443\u0441 \u0432\u044A\u0440\u0445\u0443 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442\u0442\u0430",
  "sun-sextile": "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u044F \u0438 \u0432\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0437\u0430 \u0440\u0430\u0441\u0442\u0435\u0436",
  "sun-square": "\u041D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435 \u0438 \u043F\u0440\u0435\u0434\u0438\u0437\u0432\u0438\u043A\u0430\u0442\u0435\u043B\u0441\u0442\u0432\u0430, \u0438\u0437\u0438\u0441\u043A\u0432\u0430\u0449\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
  "sun-trine": "\u041F\u043B\u0430\u0432\u0435\u043D \u043F\u043E\u0442\u043E\u043A \u043E\u0442 \u0435\u043D\u0435\u0440\u0433\u0438\u044F \u0438 \u043A\u0440\u0435\u0430\u0442\u0438\u0432\u043D\u043E\u0441\u0442",
  "sun-opposition": "\u041F\u043E\u043B\u044F\u0440\u043D\u043E\u0441\u0442, \u0431\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u0430\u043D\u0435 \u043D\u0430 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u043E\u043B\u043E\u0436\u043D\u0438 \u0441\u0438\u043B\u0438",
  "moon-conjunction": "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u0438\u043D\u0442\u0435\u043D\u0437\u0438\u0432\u043D\u043E\u0441\u0442, \u0432\u044A\u0442\u0440\u0435\u0448\u043D\u0438 \u0447\u0443\u0432\u0441\u0442\u0432\u0430",
  "moon-sextile": "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0430 \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u044F \u0438 \u0438\u043D\u0442\u0443\u0438\u0442\u0438\u0432\u043D\u043E\u0441\u0442",
  "moon-square": "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u043E \u043D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435, \u0432\u044A\u0442\u0440\u0435\u0448\u0435\u043D \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442",
  "moon-trine": "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u0435\u043D \u0431\u0430\u043B\u0430\u043D\u0441 \u0438 \u0432\u044A\u0442\u0440\u0435\u0448\u0435\u043D \u043C\u0438\u0440",
  "moon-opposition": "\u0415\u043C\u043E\u0446\u0438\u043E\u043D\u0430\u043B\u043D\u0438 \u043F\u043E\u043B\u044F\u0440\u043D\u043E\u0441\u0442\u0438, \u043D\u0443\u0436\u0434\u0430 \u043E\u0442 \u0431\u0430\u043B\u0430\u043D\u0441",
  "mercury-conjunction": "\u041C\u0435\u043D\u0442\u0430\u043B\u043D\u0430 \u044F\u0441\u043D\u043E\u0442\u0430 \u0438 \u043A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F",
  "mercury-sextile": "\u041B\u0435\u0441\u043D\u0430 \u043A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F \u0438 \u043D\u043E\u0432\u0438 \u0438\u0434\u0435\u0438",
  "mercury-square": "\u041C\u0435\u043D\u0442\u0430\u043B\u043D\u043E \u043D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435, \u043D\u0435\u0434\u043E\u0440\u0430\u0437\u0443\u043C\u0435\u043D\u0438\u044F",
  "mercury-trine": "\u041F\u043B\u0430\u0432\u043D\u0430 \u043A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u044F \u0438 \u0438\u043D\u0442\u0435\u043B\u0435\u043A\u0442\u0443\u0430\u043B\u0435\u043D \u0440\u0430\u0441\u0442\u0435\u0436",
  "mercury-opposition": "\u041F\u0440\u043E\u0442\u0438\u0432\u043E\u0440\u0435\u0447\u0438\u0432\u0438 \u043C\u0438\u0441\u043B\u0438, \u043D\u0443\u0436\u0434\u0430 \u043E\u0442 \u043E\u0431\u0435\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442",
  "venus-conjunction": "\u041B\u044E\u0431\u043E\u0432, \u043A\u0440\u0430\u0441\u043E\u0442\u0430, \u043F\u0440\u0438\u0432\u043B\u0435\u043A\u0430\u0442\u0435\u043B\u043D\u043E\u0441\u0442",
  "venus-sextile": "\u0425\u0430\u0440\u043C\u043E\u043D\u0438\u044F \u0432 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F\u0442\u0430, \u0442\u0432\u043E\u0440\u0447\u0435\u0441\u0442\u0432\u043E",
  "venus-square": "\u041D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435 \u0432 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F\u0442\u0430, \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438",
  "venus-trine": "\u0420\u043E\u043C\u0430\u043D\u0442\u0438\u043A\u0430, \u0443\u0434\u043E\u0432\u043E\u043B\u0441\u0442\u0432\u0438\u0435, \u0445\u0430\u0440\u043C\u043E\u043D\u0438\u044F",
  "venus-opposition": "\u0412\u0437\u0430\u0438\u043C\u043D\u0438 \u043A\u043E\u043C\u043F\u0440\u043E\u043C\u0438\u0441\u0438, \u0431\u0430\u043B\u0430\u043D\u0441\u0438\u0440\u0430\u043D\u0435 \u043D\u0430 \u043D\u0443\u0436\u0434\u0438",
  "mars-conjunction": "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435, \u0435\u043D\u0435\u0440\u0433\u0438\u044F, \u0443\u0432\u0435\u0440\u0435\u043D\u043E\u0441\u0442",
  "mars-sextile": "\u041F\u0440\u043E\u0434\u0443\u043A\u0442\u0438\u0432\u043D\u0430 \u0435\u043D\u0435\u0440\u0433\u0438\u044F, \u0438\u043D\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u0430",
  "mars-square": "\u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u0438, \u043D\u0435\u0442\u044A\u0440\u043F\u0435\u043D\u0438\u0435, \u043D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435",
  "mars-trine": "\u041F\u043B\u0430\u0432\u043D\u0430 \u0435\u043D\u0435\u0440\u0433\u0438\u044F, \u0443\u0432\u0435\u0440\u0435\u043D\u043E\u0441\u0442 \u0432 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F\u0442\u0430",
  "mars-opposition": "\u041F\u0440\u043E\u0442\u0438\u0432\u043E\u0441\u0442\u043E\u044F\u0449\u0438 \u0441\u0438\u043B\u0438, \u043D\u0443\u0436\u0434\u0430 \u043E\u0442 \u043A\u043E\u043D\u0442\u0440\u043E\u043B",
  "jupiter-conjunction": "\u0420\u0430\u0437\u0448\u0438\u0440\u0435\u043D\u0438\u0435, \u043A\u044A\u0441\u043C\u0435\u0442, \u0440\u0430\u0441\u0442\u0435\u0436",
  "jupiter-sextile": "\u0412\u044A\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438, \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u044A\u043C, \u0443\u0441\u043F\u0435\u0445",
  "jupiter-square": "\u041F\u0440\u0435\u043A\u0430\u043B\u0435\u043D\u043E \u0440\u0430\u0437\u0448\u0438\u0440\u044F\u0432\u0430\u043D\u0435, \u043D\u0443\u0436\u0434\u0430 \u043E\u0442 \u0443\u043C\u0435\u0440\u0435\u043D\u043E\u0441\u0442",
  "jupiter-trine": "\u0411\u043B\u0430\u0433\u043E\u0441\u043B\u043E\u0432\u0438\u0438, \u043A\u044A\u0441\u043C\u0435\u0442, \u0434\u0443\u0445\u043E\u0432\u0435\u043D \u0440\u0430\u0441\u0442\u0435\u0436",
  "jupiter-opposition": "\u041F\u0440\u0435\u043A\u043E\u043C\u0435\u0440\u043D\u043E\u0441\u0442, \u043D\u0443\u0436\u0434\u0430 \u043E\u0442 \u0431\u0430\u043B\u0430\u043D\u0441",
  "saturn-conjunction": "\u041E\u0442\u0433\u043E\u0432\u043E\u0440\u043D\u043E\u0441\u0442, \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F, \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0438\u0440\u0430\u043D\u0435",
  "saturn-sextile": "\u0414\u0438\u0441\u0446\u0438\u043F\u043B\u0438\u043D\u0430, \u0442\u044A\u0440\u043F\u0435\u043D\u0438\u0435, \u043F\u0440\u0430\u043A\u0442\u0438\u0447\u043D\u043E\u0441\u0442",
  "saturn-square": "\u041F\u0440\u0435\u043F\u044F\u0442\u0441\u0442\u0432\u0438\u044F, \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F, \u0438\u0437\u043F\u0438\u0442\u0430\u043D\u0438\u044F",
  "saturn-trine": "\u0421\u0442\u0430\u0431\u0438\u043B\u043D\u043E\u0441\u0442, \u043F\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F, \u0434\u044A\u043B\u0433\u043E\u0441\u0440\u043E\u0447\u0435\u043D \u0443\u0441\u043F\u0435\u0445",
  "saturn-opposition": "\u041E\u0442\u0433\u043E\u0432\u043E\u0440\u043D\u043E\u0441\u0442\u0438, \u043D\u0443\u0436\u0434\u0430 \u043E\u0442 \u0431\u0430\u043B\u0430\u043D\u0441",
  "uranus-conjunction": "\u0412\u043D\u0435\u0437\u0430\u043F\u043D\u0438 \u043F\u0440\u043E\u043C\u0435\u043D\u0438, \u043F\u0440\u043E\u0431\u0443\u0436\u0434\u0430\u043D\u0435, \u0441\u0432\u043E\u0431\u043E\u0434\u0430",
  "uranus-sextile": "\u0418\u043D\u0442\u0443\u0438\u0442\u0438\u0432\u043D\u0438 \u043F\u0440\u043E\u0431\u043B\u044F\u0441\u044A\u0446\u0438, \u0438\u043D\u043E\u0432\u0430\u0446\u0438\u0438",
  "uranus-square": "\u041D\u0435\u043E\u0447\u0430\u043A\u0432\u0430\u043D\u0438 \u043F\u0440\u043E\u043C\u0435\u043D\u0438, \u043D\u0430\u043F\u0440\u0435\u0436\u0435\u043D\u0438\u0435, \u0431\u0443\u043D\u0442",
  "uranus-trine": "\u0422\u0432\u043E\u0440\u0447\u0435\u0441\u043A\u0430 \u0441\u0432\u043E\u0431\u043E\u0434\u0430, \u043F\u0440\u043E\u0431\u043B\u044F\u0441\u044A\u0446\u0438, \u0438\u043D\u043E\u0432\u0430\u0446\u0438\u0438",
  "uranus-opposition": "\u0412\u043D\u0435\u0437\u0430\u043F\u043D\u0438 \u043E\u0431\u0440\u0430\u0442\u0438, \u043D\u0443\u0436\u0434\u0430 \u043E\u0442 \u0433\u044A\u0432\u043A\u0430\u0432\u043E\u0441\u0442",
  "neptune-conjunction": "\u0414\u0443\u0445\u043E\u0432\u043D\u043E\u0441\u0442, \u0438\u043B\u044E\u0437\u0438\u0438, \u0432\u044A\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435",
  "neptune-sextile": "\u0418\u043D\u0442\u0443\u0438\u0446\u0438\u044F, \u0442\u0432\u043E\u0440\u0447\u0435\u0441\u0442\u0432\u043E, \u0434\u0443\u0445\u043E\u0432\u043D\u043E\u0441\u0442",
  "neptune-square": "\u0417\u0430\u0431\u043B\u0443\u0434\u0438, \u043E\u0431\u044A\u0440\u043A\u0432\u0430\u043D\u0435, \u0435\u0441\u043A\u0430\u043F\u0438\u0437\u044A\u043C",
  "neptune-trine": "\u0412\u0434\u044A\u0445\u043D\u043E\u0432\u0435\u043D\u0438\u0435, \u0434\u0443\u0445\u043E\u0432\u0435\u043D \u0440\u0430\u0441\u0442\u0435\u0436, \u043A\u0440\u0435\u0430\u0442\u0438\u0432\u043D\u043E\u0441\u0442",
  "neptune-opposition": "\u0418\u043B\u044E\u0437\u0438\u0438, \u043D\u0443\u0436\u0434\u0430 \u043E\u0442 \u044F\u0441\u043D\u043E\u0442\u0430",
  "pluto-conjunction": "\u0422\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F, \u0432\u043B\u0430\u0441\u0442, \u0434\u044A\u043B\u0431\u043E\u043A\u0438 \u043F\u0440\u043E\u043C\u0435\u043D\u0438",
  "pluto-sextile": "\u041B\u0438\u0447\u043D\u0430 \u0442\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F, \u0441\u043A\u0440\u0438\u0442\u0430 \u0441\u0438\u043B\u0430",
  "pluto-square": "\u0412\u043B\u0430\u0441\u0442\u043E\u0432\u0438 \u0431\u043E\u0440\u0431\u0438, \u043F\u0440\u0438\u043D\u0443\u0434\u0438\u0442\u0435\u043B\u043D\u0438 \u043F\u0440\u043E\u043C\u0435\u043D\u0438",
  "pluto-trine": "\u0415\u043C\u043F\u0442\u0438\u0447\u043D\u0430 \u0442\u0440\u0430\u043D\u0441\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F, \u0440\u0435\u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F",
  "pluto-opposition": "\u041A\u0440\u0438\u0437\u0438, \u043D\u0443\u0436\u0434\u0430 \u043E\u0442 \u043E\u0441\u0432\u043E\u0431\u043E\u0436\u0434\u0430\u0432\u0430\u043D\u0435"
};
function calculateAspect(degree1, degree2) {
  let diff = Math.abs(degree1 - degree2);
  if (diff > 180) diff = 360 - diff;
  for (const [aspect, angle] of Object.entries(ASPECT_ANGLES)) {
    const orb = Math.abs(diff - angle);
    if (orb <= ASPECT_ORBS[aspect]) {
      return { aspect, orb };
    }
  }
  return null;
}
function deriveMoonPhaseFromPositions(skyPositions) {
  const SIGNS = [
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
  const PHASE_NAMES = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent"
  ];
  const sun = skyPositions.find((p) => p.planet === "sun");
  const moon = skyPositions.find((p) => p.planet === "moon");
  if (!sun || !moon) {
    throw new Error("[Transits] Cannot derive moon phase: Sun or Moon missing from sky positions");
  }
  const sunLon = SIGNS.indexOf(sun.sign) * 30 + sun.degree;
  const moonLon = SIGNS.indexOf(moon.sign) * 30 + moon.degree;
  const angle = (moonLon - sunLon + 360) % 360;
  const idx = Math.min(Math.floor(angle / 45), 7);
  const phaseName = PHASE_NAMES[idx];
  return {
    phase: phaseName,
    phaseBg: MOON_PHASE_BG[phaseName] || phaseName,
    illumination: Math.round((1 - Math.cos(angle * Math.PI / 180)) / 2 * 100),
    moonSign: moon.sign,
    moonSignBg: moon.signBg
  };
}
function calculateTransitsToNatal(transits, natalChart) {
  const aspects = [];
  const natalPlanets = {};
  const chartData = natalChart?.chartData ?? natalChart;
  if (chartData && typeof chartData === "object") {
    const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
    planets.forEach((planet) => {
      if (chartData[planet]) {
        natalPlanets[planet] = {
          sign: chartData[planet].sign,
          degree: chartData[planet].degree
        };
      }
    });
  }
  transits.forEach((transit) => {
    Object.entries(natalPlanets).forEach(([natalPlanet, natalPos]) => {
      const signs = [
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
      const transitAbsolute = signs.indexOf(transit.sign) * 30 + transit.degree;
      const natalAbsolute = signs.indexOf(natalPos.sign) * 30 + natalPos.degree;
      const aspectData = calculateAspect(transitAbsolute, natalAbsolute);
      if (aspectData) {
        const key = `${transit.planet}-${aspectData.aspect}`;
        const description = ASPECT_DESCRIPTIONS[key] || `${PLANET_BG[transit.planet]} ${ASPECT_BG[aspectData.aspect]} ${PLANET_BG[natalPlanet]}`;
        aspects.push({
          transitPlanet: transit.planet,
          transitPlanetBg: PLANET_BG[transit.planet] || transit.planet,
          natalPlanet,
          natalPlanetBg: PLANET_BG[natalPlanet] || natalPlanet,
          aspect: aspectData.aspect,
          aspectBg: ASPECT_BG[aspectData.aspect] || aspectData.aspect,
          orb: Math.round(aspectData.orb * 10) / 10,
          influence: ASPECT_INFLUENCE[aspectData.aspect],
          description
        });
      }
    });
  });
  return aspects.sort((a, b) => a.orb - b.orb);
}
async function warmDailyTransitsCache() {
  const today = /* @__PURE__ */ new Date();
  const dateStr = today.toISOString().split("T")[0];
  const cacheKey = `transits:global:${dateStr}`;
  const existing = await import_redis.redisClient.get(cacheKey);
  if (existing) {
    return { cached: true, date: dateStr };
  }
  const { AstrologyClient } = await import("@astro-api/astroapi-typescript");
  const client = new AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
  const [year, month, day] = dateStr.split("-").map(Number);
  const response = await client.data.getGlobalPositions({
    year,
    month,
    day,
    hour: 12,
    minute: 0,
    second: 0,
    options: {
      active_points: [
        "Sun",
        "Moon",
        "Mercury",
        "Venus",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
        "Pluto",
        "True_Node"
      ],
      zodiac_type: "Tropic"
    }
  });
  const skyPositions = response.positions.map((p) => {
    const internalName = PLANET_SDK_TO_INTERNAL[p.name] || p.name.toLowerCase();
    const fullSign = SIGN_ABBREV_TO_FULL[p.sign] || p.sign;
    return {
      planet: internalName,
      planetBg: PLANET_BG[internalName] || p.name,
      sign: fullSign,
      signBg: SIGN_BG[fullSign] || p.sign,
      degree: Math.round((p.degree ?? 0) * 10) / 10,
      retrograde: p.is_retrograde ?? false
    };
  });
  await import_redis.redisClient.setEx(cacheKey, 86400, JSON.stringify(skyPositions));
  return { cached: false, date: dateStr };
}
async function getActiveTransitsForUser(natalChart) {
  const today = /* @__PURE__ */ new Date();
  const dateStr = today.toISOString().split("T")[0];
  const cacheKey = `transits:global:${dateStr}`;
  let skyPositions;
  const cached = await import_redis.redisClient.get(cacheKey);
  if (cached) {
    skyPositions = JSON.parse(cached);
  } else {
    const { AstrologyClient } = await import("@astro-api/astroapi-typescript");
    const client = new AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
    const [year, month, day] = dateStr.split("-").map(Number);
    const response = await client.data.getGlobalPositions({
      year,
      month,
      day,
      hour: 12,
      minute: 0,
      second: 0,
      options: {
        active_points: [
          "Sun",
          "Moon",
          "Mercury",
          "Venus",
          "Mars",
          "Jupiter",
          "Saturn",
          "Uranus",
          "Neptune",
          "Pluto",
          "True_Node"
        ],
        zodiac_type: "Tropic"
      }
    });
    skyPositions = response.positions.map((p) => {
      const internalName = PLANET_SDK_TO_INTERNAL[p.name] || p.name.toLowerCase();
      const fullSign = SIGN_ABBREV_TO_FULL[p.sign] || p.sign;
      return {
        planet: internalName,
        planetBg: PLANET_BG[internalName] || p.name,
        sign: fullSign,
        signBg: SIGN_BG[fullSign] || p.sign,
        degree: Math.round((p.degree ?? 0) * 10) / 10,
        retrograde: p.is_retrograde ?? false
      };
    });
    await import_redis.redisClient.setEx(cacheKey, 86400, JSON.stringify(skyPositions));
  }
  const aspectsToNatal = calculateTransitsToNatal(skyPositions, natalChart);
  const moonPhase = deriveMoonPhaseFromPositions(skyPositions);
  return {
    skyPositions,
    aspectsToNatal,
    moonPhase,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
const SIGN_TO_LONGITUDE = {
  Aries: 0,
  Taurus: 30,
  Gemini: 60,
  Cancer: 90,
  Leo: 120,
  Virgo: 150,
  Libra: 180,
  Scorpio: 210,
  Sagittarius: 240,
  Capricorn: 270,
  Aquarius: 300,
  Pisces: 330
};
function signDegreeToLongitude(sign, degree) {
  return (SIGN_TO_LONGITUDE[sign] ?? 0) + degree;
}
function getHouseForLongitude(longitude, cuspLongitudes) {
  for (let i = 0; i < 12; i++) {
    const start = cuspLongitudes[i];
    const end = cuspLongitudes[(i + 1) % 12];
    if (end > start) {
      if (longitude >= start && longitude < end) return i + 1;
    } else {
      if (longitude >= start || longitude < end) return i + 1;
    }
  }
  return 1;
}
function computeTransitHouses(skyPositions, natalHouses) {
  const sortedCusps = [...natalHouses].sort((a, b) => a.number - b.number);
  const cuspLongitudes = sortedCusps.map((h) => signDegreeToLongitude(h.sign, h.degree));
  const result = {};
  for (const pos of skyPositions) {
    const lon = signDegreeToLongitude(pos.sign, pos.degree);
    result[pos.planet] = getHouseForLongitude(lon, cuspLongitudes);
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateTransitsToNatal,
  computeTransitHouses,
  getActiveTransitsForUser,
  warmDailyTransitsCache
});
