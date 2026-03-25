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
var composite_service_exports = {};
__export(composite_service_exports, {
  calculateCompositeChart: () => calculateCompositeChart
});
module.exports = __toCommonJS(composite_service_exports);
var import_astroapi_typescript = require("@astro-api/astroapi-typescript");
const CHART_OPTIONS = {
  house_system: "P",
  zodiac_type: "Tropic",
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
    "True_Node",
    "Chiron"
  ]
};
function getClient() {
  return new import_astroapi_typescript.AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
}
function toSubject(b) {
  return {
    name: "subject",
    birth_data: {
      year: b.year,
      month: b.month,
      day: b.day,
      hour: b.hour,
      minute: b.minute,
      second: 0,
      latitude: b.latitude,
      longitude: b.longitude,
      timezone: b.timezone
    }
  };
}
async function calculateCompositeChart(userBirth, partnerBirth) {
  const client = getClient();
  return await client.charts.getCompositeChart({
    subject1: toSubject(userBirth),
    subject2: toSubject(partnerBirth),
    options: CHART_OPTIONS
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateCompositeChart
});
