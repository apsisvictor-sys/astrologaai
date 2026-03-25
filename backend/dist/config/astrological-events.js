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
var astrological_events_exports = {};
__export(astrological_events_exports, {
  ASTROLOGICAL_EVENTS: () => ASTROLOGICAL_EVENTS,
  getCurrentEvents: () => getCurrentEvents
});
module.exports = __toCommonJS(astrological_events_exports);
const ASTROLOGICAL_EVENTS = [
  // 2026 Mercury Retrogrades (astronomically accurate)
  {
    id: "mercury-rx-2026-jan",
    type: "retrograde",
    planet: "Mercury",
    glyph: "\u263F",
    startDate: "2026-01-20",
    endDate: "2026-02-11",
    sign: "Aquarius",
    message: {
      en: "\u263F Mercury Retrograde in Aquarius \u2014 review communications, technology, and plans until Feb 11.",
      bg: "\u263F \u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439 \u0440\u0435\u0442\u0440\u043E\u0433\u0440\u0430\u0434\u043D\u043E \u0432 \u0412\u043E\u0434\u043E\u043B\u0435\u0439 \u2014 \u043F\u0440\u0435\u0440\u0430\u0437\u0433\u043B\u0435\u0434\u0430\u0439\u0442\u0435 \u043A\u043E\u043C\u0443\u043D\u0438\u043A\u0430\u0446\u0438\u0438\u0442\u0435, \u0442\u0435\u0445\u043D\u043E\u043B\u043E\u0433\u0438\u0438\u0442\u0435 \u0438 \u043F\u043B\u0430\u043D\u043E\u0432\u0435\u0442\u0435 \u0434\u043E 11 \u0444\u0435\u0432\u0440\u0443\u0430\u0440\u0438."
    },
    oraclePrompt: "Mercury is retrograde in Aquarius. What should I be careful about and how can I use this retrograde energy wisely?"
  },
  {
    id: "mercury-rx-2026-may",
    type: "retrograde",
    planet: "Mercury",
    glyph: "\u263F",
    startDate: "2026-05-10",
    endDate: "2026-06-03",
    sign: "Gemini",
    message: {
      en: "\u263F Mercury Retrograde in Gemini \u2014 slow down on contracts, travel plans, and key conversations until Jun 3.",
      bg: "\u263F \u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439 \u0440\u0435\u0442\u0440\u043E\u0433\u0440\u0430\u0434\u043D\u043E \u0432 \u0411\u043B\u0438\u0437\u043D\u0430\u0446\u0438 \u2014 \u0437\u0430\u0431\u0430\u0432\u0435\u0442\u0435 \u0442\u0435\u043C\u043F\u043E\u0442\u043E \u0441 \u0434\u043E\u0433\u043E\u0432\u043E\u0440\u0438, \u043F\u044A\u0442\u0443\u0432\u0430\u043D\u0438\u044F \u0438 \u0432\u0430\u0436\u043D\u0438 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0438 \u0434\u043E 3 \u044E\u043D\u0438."
    },
    oraclePrompt: "Mercury is retrograde in Gemini. What should I watch for and how can I work with this energy?"
  },
  {
    id: "mercury-rx-2026-sep",
    type: "retrograde",
    planet: "Mercury",
    glyph: "\u263F",
    startDate: "2026-09-11",
    endDate: "2026-10-02",
    sign: "Libra",
    message: {
      en: "\u263F Mercury Retrograde in Libra \u2014 relationships and decisions need extra care until Oct 2.",
      bg: "\u263F \u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439 \u0440\u0435\u0442\u0440\u043E\u0433\u0440\u0430\u0434\u043D\u043E \u0432 \u0412\u0435\u0437\u043D\u0438 \u2014 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u044F\u0442\u0430 \u0438 \u0440\u0435\u0448\u0435\u043D\u0438\u044F\u0442\u0430 \u0438\u0437\u0438\u0441\u043A\u0432\u0430\u0442 \u043F\u043E\u0432\u0435\u0447\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u0434\u043E 2 \u043E\u043A\u0442\u043E\u043C\u0432\u0440\u0438."
    },
    oraclePrompt: "Mercury is retrograde in Libra. How does this affect my relationships and what decisions should I postpone?"
  },
  // 2026 Eclipses
  {
    id: "eclipse-solar-2026-feb",
    type: "eclipse",
    subtype: "solar",
    startDate: "2026-02-17",
    endDate: "2026-02-17",
    sign: "Pisces",
    message: {
      en: "\u{1F311} Solar Eclipse in Pisces \u2014 powerful new beginnings in themes of spirituality and surrender.",
      bg: "\u{1F311} \u0421\u043B\u044A\u043D\u0447\u0435\u0432\u043E \u0437\u0430\u0442\u044A\u043C\u043D\u0435\u043D\u0438\u0435 \u0432 \u0420\u0438\u0431\u0438 \u2014 \u043C\u043E\u0449\u043D\u0438 \u043D\u043E\u0432\u0438 \u043D\u0430\u0447\u0430\u043B\u0430 \u0432 \u0442\u0435\u043C\u0438\u0442\u0435 \u043D\u0430 \u0434\u0443\u0445\u043E\u0432\u043D\u043E\u0441\u0442\u0442\u0430 \u0438 \u0441\u0435\u0431\u0435\u043F\u0440\u0435\u0434\u0430\u0432\u0430\u043D\u0435\u0442\u043E."
    },
    oraclePrompt: "There is a Solar Eclipse in Pisces today. What new beginning is this eclipse activating in my chart?"
  },
  {
    id: "eclipse-lunar-2026-mar",
    type: "eclipse",
    subtype: "lunar",
    startDate: "2026-03-03",
    endDate: "2026-03-03",
    sign: "Virgo",
    message: {
      en: "\u{1F315} Full Moon Lunar Eclipse in Virgo \u2014 release what no longer serves your daily life and health.",
      bg: "\u{1F315} \u041F\u044A\u043B\u043D\u043E\u043B\u0443\u043D\u043D\u043E \u043B\u0443\u043D\u043D\u043E \u0437\u0430\u0442\u044A\u043C\u043D\u0435\u043D\u0438\u0435 \u0432 \u0414\u0435\u0432\u0430 \u2014 \u043E\u0441\u0432\u043E\u0431\u043E\u0434\u0435\u0442\u0435 \u0441\u0435 \u043E\u0442 \u0442\u043E\u0432\u0430, \u043A\u043E\u0435\u0442\u043E \u0432\u0435\u0447\u0435 \u043D\u0435 \u0441\u043B\u0443\u0436\u0438 \u043D\u0430 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u0438\u0435\u0442\u043E \u0438 \u0437\u0434\u0440\u0430\u0432\u0435\u0442\u043E \u0432\u0438."
    },
    oraclePrompt: "There is a Lunar Eclipse in Virgo today. What am I being called to release, and what does this eclipse mean for my chart?"
  },
  {
    id: "eclipse-solar-2026-aug",
    type: "eclipse",
    subtype: "solar",
    startDate: "2026-08-12",
    endDate: "2026-08-12",
    sign: "Leo",
    message: {
      en: "\u{1F311} Solar Eclipse in Leo \u2014 bold new beginnings in creativity, self-expression, and leadership.",
      bg: "\u{1F311} \u0421\u043B\u044A\u043D\u0447\u0435\u0432\u043E \u0437\u0430\u0442\u044A\u043C\u043D\u0435\u043D\u0438\u0435 \u0432 \u041B\u044A\u0432 \u2014 \u0441\u043C\u0435\u043B\u0438 \u043D\u043E\u0432\u0438 \u043D\u0430\u0447\u0430\u043B\u0430 \u0432 \u0442\u0432\u043E\u0440\u0447\u0435\u0441\u0442\u0432\u043E\u0442\u043E, \u0441\u0435\u0431\u0435\u0438\u0437\u0440\u0430\u0437\u044F\u0432\u0430\u043D\u0435\u0442\u043E \u0438 \u043B\u0438\u0434\u0435\u0440\u0441\u0442\u0432\u043E\u0442\u043E."
    },
    oraclePrompt: "There is a Solar Eclipse in Leo today. What new chapter is opening for me, and how can I step into it fully?"
  },
  // 2027 Mercury Retrogrades
  {
    id: "mercury-rx-2027-jan",
    type: "retrograde",
    planet: "Mercury",
    glyph: "\u263F",
    startDate: "2027-01-07",
    endDate: "2027-01-27",
    sign: "Capricorn",
    message: {
      en: "\u263F Mercury Retrograde in Capricorn \u2014 review career decisions and long-term plans until Jan 27.",
      bg: "\u263F \u041C\u0435\u0440\u043A\u0443\u0440\u0438\u0439 \u0440\u0435\u0442\u0440\u043E\u0433\u0440\u0430\u0434\u043D\u043E \u0432 \u041A\u043E\u0437\u0438\u0440\u043E\u0433 \u2014 \u043F\u0440\u0435\u0440\u0430\u0437\u0433\u043B\u0435\u0434\u0430\u0439\u0442\u0435 \u043A\u0430\u0440\u0438\u0435\u0440\u043D\u0438\u0442\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0438 \u0434\u044A\u043B\u0433\u043E\u0441\u0440\u043E\u0447\u043D\u0438\u0442\u0435 \u043F\u043B\u0430\u043D\u043E\u0432\u0435 \u0434\u043E 27 \u044F\u043D\u0443\u0430\u0440\u0438."
    },
    oraclePrompt: "Mercury is retrograde in Capricorn. What career or long-term plans need revisiting right now?"
  }
];
function getCurrentEvents(now = /* @__PURE__ */ new Date()) {
  const today = now.toISOString().split("T")[0];
  return ASTROLOGICAL_EVENTS.filter((e) => e.startDate <= today && e.endDate >= today);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ASTROLOGICAL_EVENTS,
  getCurrentEvents
});
