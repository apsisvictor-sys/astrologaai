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
var SolarReturnBirthdayEmail_exports = {};
__export(SolarReturnBirthdayEmail_exports, {
  SolarReturnBirthdayEmail: () => SolarReturnBirthdayEmail
});
module.exports = __toCommonJS(SolarReturnBirthdayEmail_exports);
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
function SolarReturnBirthdayEmail({
  firstName,
  sunSign,
  isPremium,
  solarReturnUrl,
  unsubscribeUrl
}) {
  const name = firstName || "there";
  const sunGlyph = sunSign ? ZODIAC_GLYPHS[sunSign] ?? "\u2726" : "\u2726";
  if (isPremium) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_BaseEmailLayout.BaseEmailLayout,
      {
        preview: `${sunGlyph} Happy Birthday! Your Solar Return chart is ready`,
        unsubscribeUrl,
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
          sunSign && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "13px", letterSpacing: "0.5px", margin: "0 0 8px" }, children: [
            sunGlyph,
            " ",
            sunSign,
            "  \xB7  Solar Return ",
            (/* @__PURE__ */ new Date()).getFullYear() + 1
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 8px" }, children: [
            sunGlyph,
            " Your Solar Return is Ready"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "14px", margin: "0 0 32px" }, children: [
            "Happy Birthday, ",
            name,
            " \u2014 the Sun returns to its birth position, marking the start of your personal new year."
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "Your Year Ahead" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: bodyText, children: "Your Solar Return chart captures the exact moment the Sun crosses the degree it occupied at your birth. It reveals the themes, opportunities, and challenges that will define the next 12 months of your life." }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "What's in your reading" }),
          [
            "\u2726 Solar Return ascendant & house emphasis",
            "\u2726 Key planetary themes for the year",
            "\u2726 Annual forecast narrative",
            "\u2726 Overlay with your natal chart"
          ].map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#cccccc", fontSize: "15px", lineHeight: "1.65", margin: i === 0 ? 0 : "6px 0 0" }, children: item }, i)),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: solarReturnUrl, children: "View Your Solar Return \u2726" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#555555", fontSize: "13px", margin: "16px 0 0" }, children: [
            "Your chart is waiting at",
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Link, { href: solarReturnUrl, style: { color: "#888888", textDecoration: "underline" }, children: "astrologa.bg/solar-return" })
          ] })
        ] })
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_BaseEmailLayout.BaseEmailLayout,
    {
      preview: `${sunGlyph} The stars have a message for your year ahead`,
      unsubscribeUrl,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
        sunSign && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "13px", letterSpacing: "0.5px", margin: "0 0 8px" }, children: [
          sunGlyph,
          " ",
          sunSign,
          "  \xB7  Your Birthday"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 8px" }, children: "\u2726 Your Year Ahead is Waiting" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "14px", margin: "0 0 32px" }, children: [
          "Happy Birthday, ",
          name,
          "! Your Solar Return chart is calculated \u2014 unlock it to see what this year holds."
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "Your Solar Return Reading" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: bodyText, children: "Every year on your birthday the Sun returns to its exact birth position, creating a unique chart that maps the 12 months ahead. This year's chart is ready \u2014 but it's a PREMIUM feature." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { style: { backgroundColor: "#110018", padding: "20px 16px", borderRadius: "6px", marginTop: "20px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#2d0042", fontSize: "14px", letterSpacing: "3px", margin: "0 0 4px", fontFamily: "monospace" }, children: "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#2d0042", fontSize: "14px", letterSpacing: "3px", margin: "0 0 4px", fontFamily: "monospace" }, children: "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#2d0042", fontSize: "14px", letterSpacing: "3px", margin: "0 0 12px", fontFamily: "monospace" }, children: "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#7700aa", fontSize: "13px", margin: 0 }, children: [
            "\u{1F512} PREMIUM only \u2014",
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Link, { href: solarReturnUrl, style: { color: "#e41aff", textDecoration: "underline" }, children: "Unlock your year ahead" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: sectionLabel, children: "What's inside" }),
        [
          "\u2726 Solar Return ascendant & house emphasis",
          "\u2726 Key planetary themes for your year",
          "\u2726 Annual forecast narrative",
          "\u2726 Overlay with your natal chart"
        ].map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#555555", fontSize: "15px", lineHeight: "1.65", margin: i === 0 ? 0 : "6px 0 0" }, children: item }, i)),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px" }, children: [
          "Hey ",
          name,
          " \u2014 upgrade to PREMIUM to unlock your Solar Return reading plus the full astrology suite."
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: solarReturnUrl, children: "Unlock Your Year Ahead \u2726" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#555555", fontSize: "13px", margin: "16px 0 0" }, children: [
          "One chart. One year. All yours.",
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Link, { href: solarReturnUrl, style: { color: "#888888", textDecoration: "underline" }, children: "See PREMIUM plans \u2192" })
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
  SolarReturnBirthdayEmail
});
