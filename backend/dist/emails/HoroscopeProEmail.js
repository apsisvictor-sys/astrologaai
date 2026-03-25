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
var HoroscopeProEmail_exports = {};
__export(HoroscopeProEmail_exports, {
  HoroscopeProEmail: () => HoroscopeProEmail
});
module.exports = __toCommonJS(HoroscopeProEmail_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
var import_BaseEmailLayout = require("./BaseEmailLayout");
var import_EmailButton = require("./EmailButton");
var import_EmailDivider = require("./EmailDivider");
const ZODIAC_GLYPHS = {
  Aries: "\u2648",
  Taurus: "\u2649",
  Gemini: "\u264A",
  Cancer: "\u264B",
  Leo: "\u264C",
  Virgo: "\u264D",
  Libra: "\u264E",
  Scorpio: "\u264F",
  Sagittarius: "\u2650",
  Capricorn: "\u2651",
  Aquarius: "\u2652",
  Pisces: "\u2653"
};
function HoroscopeProEmail({
  firstName,
  sunSign,
  moonSign,
  date,
  generalTheme,
  love,
  career,
  luckyNumbers,
  powerHours,
  forecastUrl,
  unsubscribeUrl
}) {
  const name = firstName || "there";
  const sunGlyph = sunSign ? ZODIAC_GLYPHS[sunSign] ?? "\u2726" : "\u2726";
  const moonGlyph = moonSign ? ZODIAC_GLYPHS[moonSign] ?? "" : "";
  const signMeta = [
    sunSign && `${sunGlyph} ${sunSign}`,
    moonSign && `\u263D ${moonGlyph} ${moonSign}`
  ].filter(Boolean).join("  \xB7  ");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_BaseEmailLayout.BaseEmailLayout,
    {
      preview: `${sunGlyph} Your horoscope for ${date}`,
      unsubscribeUrl,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#888888", fontSize: "13px", letterSpacing: "0.5px", margin: "0 0 8px" }, children: signMeta ? `${signMeta}  \xB7  ${date}` : date }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 32px" }, children: [
          sunGlyph,
          " Your horoscope for today"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "General Theme" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: bodyText, children: generalTheme }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "Love" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: bodyText, children: love }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "Career" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: bodyText, children: career }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Row, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Column, { style: { width: "50%", verticalAlign: "top", paddingRight: "16px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "Lucky Numbers" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "22px", fontWeight: 700, letterSpacing: "3px", margin: 0 }, children: luckyNumbers.join(" \xB7 ") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Column, { style: { width: "50%", verticalAlign: "top", paddingLeft: "16px", borderLeft: "1px solid #2a0035" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "Power Hours" }),
            powerHours.map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "15px", lineHeight: "1.5", margin: i === 0 ? 0 : "4px 0 0" }, children: h }, i))
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: forecastUrl, children: "See Full Forecast \u2726" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#555555", fontSize: "13px", margin: "16px 0 0" }, children: [
          "Hey ",
          name,
          " \u2014 your full weekly forecast and transit calendar are waiting."
        ] })
      ] })
    }
  );
}
const sectionLabel = {
  color: "#e41aff",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "1px",
  textTransform: "uppercase",
  margin: "0 0 8px"
};
const bodyText = {
  color: "#cccccc",
  fontSize: "15px",
  lineHeight: "1.65",
  margin: 0
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HoroscopeProEmail
});
