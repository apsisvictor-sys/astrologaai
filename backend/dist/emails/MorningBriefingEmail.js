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
var MorningBriefingEmail_exports = {};
__export(MorningBriefingEmail_exports, {
  MorningBriefingEmail: () => MorningBriefingEmail
});
module.exports = __toCommonJS(MorningBriefingEmail_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
var import_BaseEmailLayout = require("./BaseEmailLayout");
var import_EmailButton = require("./EmailButton");
var import_EmailDivider = require("./EmailDivider");
const MOON_PHASE_ICONS = {
  "New Moon": "\u{1F311}",
  "Waxing Crescent": "\u{1F312}",
  "First Quarter": "\u{1F313}",
  "Waxing Gibbous": "\u{1F314}",
  "Full Moon": "\u{1F315}",
  "Waning Gibbous": "\u{1F316}",
  "Last Quarter": "\u{1F317}",
  "Waning Crescent": "\u{1F318}"
};
const ENERGY_COLORS = {
  high: "#e41aff",
  medium: "#aa88cc",
  low: "#777799"
};
const ENERGY_LABELS = {
  high: { en: "High Energy", bg: "\u0412\u0438\u0441\u043E\u043A\u0430 \u0415\u043D\u0435\u0440\u0433\u0438\u044F" },
  medium: { en: "Moderate Energy", bg: "\u0423\u043C\u0435\u0440\u0435\u043D\u0430 \u0415\u043D\u0435\u0440\u0433\u0438\u044F" },
  low: { en: "Low Energy", bg: "\u041D\u0438\u0441\u043A\u0430 \u0415\u043D\u0435\u0440\u0433\u0438\u044F" }
};
function MorningBriefingEmail({
  tier,
  language,
  firstName,
  date,
  moonPhase,
  moonPhaseBg,
  moonSign,
  moonSignBg,
  moonIllumination,
  energy,
  transits,
  tip,
  tipBg,
  oracleInsight,
  forecastUrl,
  upgradeUrl,
  unsubscribeUrl
}) {
  const isBg = language === "bg";
  const name = firstName || (isBg ? "\u0442\u0430\u043C" : "there");
  const moonIcon = MOON_PHASE_ICONS[moonPhase] ?? "\u{1F319}";
  const energyColor = ENERGY_COLORS[energy] ?? "#aa88cc";
  const energyLabel = isBg ? ENERGY_LABELS[energy]?.bg ?? energy : ENERGY_LABELS[energy]?.en ?? energy;
  const phaseName = isBg ? moonPhaseBg || moonPhase : moonPhase;
  const signName = isBg ? moonSignBg || moonSign : moonSign;
  const moonMeta = [
    phaseName,
    signName && `\u0432 ${signName}`,
    moonIllumination != null && `${moonIllumination}%`
  ].filter(Boolean).join(" \xB7 ");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_BaseEmailLayout.BaseEmailLayout,
    {
      preview: isBg ? `${moonIcon} \u0422\u0432\u043E\u044F\u0442 \u0441\u0443\u0442\u0440\u0435\u0448\u0435\u043D \u0431\u0440\u0438\u0444\u0438\u043D\u0433 \u0437\u0430 ${date}` : `${moonIcon} Your morning briefing for ${date}`,
      unsubscribeUrl,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#888888", fontSize: "13px", letterSpacing: "0.5px", margin: "0 0 8px" }, children: date }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", margin: "0 0 8px" }, children: [
          moonIcon,
          " ",
          isBg ? "\u0414\u043E\u0431\u0440\u043E \u0443\u0442\u0440\u043E, " : "Good morning, ",
          name
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#aa88cc", fontSize: "14px", margin: "0 0 32px" }, children: isBg ? "\u0422\u0432\u043E\u044F\u0442 \u0441\u0443\u0442\u0440\u0435\u0448\u0435\u043D \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u043D \u0431\u0440\u0438\u0444\u0438\u043D\u0433" : "Your morning astrological briefing" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Section, { style: { backgroundColor: "#1a0025", borderRadius: "8px", padding: "16px 20px", marginBottom: "16px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Row, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Column, { style: { width: "48px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { fontSize: "32px", margin: 0, lineHeight: "48px" }, children: moonIcon }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Column, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#e41aff", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 2px" }, children: isBg ? "\u041B\u0443\u043D\u043D\u0430 \u0424\u0430\u0437\u0430" : "Moon Phase" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "16px", fontWeight: 600, margin: 0 }, children: moonMeta })
          ] })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { style: { backgroundColor: "#1a0025", borderRadius: "8px", padding: "16px 20px", marginBottom: "24px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#888888", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px" }, children: isBg ? "\u0414\u043D\u0435\u0432\u043D\u0430 \u0415\u043D\u0435\u0440\u0433\u0438\u044F" : "Daily Energy" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: energyColor, fontSize: "20px", fontWeight: 700, margin: 0 }, children: [
            "\u25C9 ",
            energyLabel
          ] })
        ] }),
        tier === "FREE" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ccbbdd", fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px" }, children: isBg ? "\u0417\u0432\u0435\u0437\u0434\u0438\u0442\u0435 \u0438\u043C\u0430\u0442 \u043F\u043E\u0441\u043B\u0430\u043D\u0438\u0435 \u0437\u0430 \u0442\u0435\u0431 \u0434\u043D\u0435\u0441. \u041D\u0430\u0434\u0433\u0440\u0430\u0434\u0438 \u0434\u043E PRO, \u0437\u0430 \u0434\u0430 \u0432\u0438\u0434\u0438\u0448 \u0441\u0432\u043E\u0438\u0442\u0435 \u0442\u0440\u0430\u043D\u0437\u0438\u0442\u0438, \u043F\u0440\u0435\u043F\u043E\u0440\u044A\u043A\u0438 \u0438 \u043B\u0438\u0447\u0435\u043D \u0445\u043E\u0440\u043E\u0441\u043A\u043E\u043F." : "The stars have a message for you today. Upgrade to PRO to see your transits, recommendations, and full personal horoscope." }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: upgradeUrl, children: isBg ? "\u0412\u0438\u0436 \u041F\u044A\u043B\u043D\u0438\u044F \u0411\u0440\u0438\u0444\u0438\u043D\u0433 \u2192 PRO" : "See Full Briefing \u2192 PRO" })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          transits && transits.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#e41aff", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }, children: isBg ? "\u041A\u043B\u044E\u0447\u043E\u0432\u0438 \u0422\u0440\u0430\u043D\u0437\u0438\u0442\u0438" : "Key Transits" }),
            transits.slice(0, 3).map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              import_components.Section,
              {
                style: { marginBottom: "8px", paddingLeft: "12px", borderLeft: `3px solid ${t.influence === "positive" ? "#44cc88" : t.influence === "challenging" ? "#cc4466" : "#888888"}` },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ffffff", fontSize: "14px", fontWeight: 600, margin: "0 0 2px" }, children: [
                    t.planet,
                    " ",
                    isBg ? "\u0432" : "in",
                    " ",
                    t.sign
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#aaaaaa", fontSize: "13px", margin: 0, lineHeight: "1.4" }, children: t.description })
                ]
              },
              i
            ))
          ] }),
          (tip || tipBg) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#e41aff", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }, children: isBg ? "\u041F\u0440\u0435\u043F\u043E\u0440\u044A\u043A\u0430 \u0437\u0430 \u0414\u0435\u043D\u044F" : "Today's Tip" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ccbbdd", fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px", fontStyle: "italic" }, children: [
              '"',
              isBg ? tipBg || tip : tip,
              '"'
            ] })
          ] }),
          tier === "PREMIUM" && oracleInsight && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { style: { backgroundColor: "#220033", borderRadius: "8px", padding: "16px 20px", marginBottom: "24px", borderLeft: "3px solid #e41aff" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#e41aff", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }, children: [
                "\u2726 ",
                isBg ? "\u041F\u043E\u0441\u043B\u0430\u043D\u0438\u0435 \u043E\u0442 \u041E\u0440\u0430\u043A\u0443\u043B\u0430" : "Oracle Insight"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ffffff", fontSize: "15px", lineHeight: "1.6", margin: 0, fontStyle: "italic" }, children: [
                '"',
                oracleInsight,
                '"'
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: forecastUrl, children: isBg ? "\u0412\u0438\u0436 \u041F\u044A\u043B\u043D\u043E\u0442\u043E \u0427\u0435\u0442\u0435\u043D\u0435 \u2192" : "See Full Reading \u2192" })
        ] })
      ] })
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MorningBriefingEmail
});
