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
var HoroscopeFreeEmail_exports = {};
__export(HoroscopeFreeEmail_exports, {
  HoroscopeFreeEmail: () => HoroscopeFreeEmail
});
module.exports = __toCommonJS(HoroscopeFreeEmail_exports);
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
function HoroscopeFreeEmail({
  firstName,
  sunSign,
  date,
  generalTheme,
  loveTeaser,
  careerTeaser,
  upgradeUrl,
  unsubscribeUrl
}) {
  const name = firstName || "there";
  const sunGlyph = sunSign ? ZODIAC_GLYPHS[sunSign] ?? "\u2726" : "\u2726";
  const signMeta = sunSign ? `${sunGlyph} ${sunSign}  \xB7  ${date}` : date;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_BaseEmailLayout.BaseEmailLayout,
    {
      preview: `\u2726 What do the stars say today, ${name}?`,
      unsubscribeUrl,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#888888", fontSize: "13px", letterSpacing: "0.5px", margin: "0 0 8px" }, children: signMeta }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 32px" }, children: "\u2726 What do the stars say today?" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "General Theme" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#cccccc", fontSize: "15px", lineHeight: "1.65", margin: 0 }, children: generalTheme }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "Love" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#cccccc", fontSize: "15px", lineHeight: "1.65", margin: "0 0 12px" }, children: loveTeaser }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockedSection, { upgradeUrl }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "Career" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#cccccc", fontSize: "15px", lineHeight: "1.65", margin: "0 0 12px" }, children: careerTeaser }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockedSection, { upgradeUrl }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "Lucky Numbers & Power Hours" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockedSection, { upgradeUrl, compact: true }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px" }, children: [
          "Hey ",
          name,
          " \u2014 upgrade to PRO to unlock your full daily reading, weekly forecast, and transit insights."
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: upgradeUrl, children: "Unlock Your Full Horoscope \u2726" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#555555", fontSize: "13px", margin: "16px 0 0" }, children: [
          "Your stars have more to say. ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Link, { href: upgradeUrl, style: { color: "#888888", textDecoration: "underline" }, children: "See PRO plans \u2192" })
        ] })
      ] })
    }
  );
}
function LockedSection({ upgradeUrl, compact = false }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { style: { backgroundColor: "#110018", padding: "14px 16px", borderRadius: "6px" }, children: [
    !compact && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#2d0042", fontSize: "14px", letterSpacing: "3px", margin: "0 0 4px", fontFamily: "monospace" }, children: "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#2d0042", fontSize: "14px", letterSpacing: "3px", margin: "0 0 10px", fontFamily: "monospace" }, children: "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588" })
    ] }),
    compact && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#2d0042", fontSize: "14px", letterSpacing: "3px", margin: "0 0 10px", fontFamily: "monospace" }, children: "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#7700aa", fontSize: "13px", margin: 0 }, children: [
      "\u{1F512} PRO only \u2014",
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Link, { href: upgradeUrl, style: { color: "#e41aff", textDecoration: "underline" }, children: "Unlock to read" })
    ] })
  ] });
}
const sectionLabel = {
  color: "#e41aff",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "1px",
  textTransform: "uppercase",
  margin: "0 0 8px"
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HoroscopeFreeEmail
});
