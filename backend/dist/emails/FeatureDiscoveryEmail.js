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
var FeatureDiscoveryEmail_exports = {};
__export(FeatureDiscoveryEmail_exports, {
  FeatureDiscoveryEmail: () => FeatureDiscoveryEmail
});
module.exports = __toCommonJS(FeatureDiscoveryEmail_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
var import_BaseEmailLayout = require("./BaseEmailLayout");
var import_EmailButton = require("./EmailButton");
var import_EmailDivider = require("./EmailDivider");
function FeatureDiscoveryEmail({ firstName, forecastUrl, partnersUrl, chartUrl, chatUrl, unsubscribeUrl }) {
  const name = firstName || "there";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_BaseEmailLayout.BaseEmailLayout, { preview: "Did you know the Oracle can...", unsubscribeUrl, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, margin: "0 0 16px", letterSpacing: "-0.5px" }, children: "Did you know the Oracle can..." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "16px", lineHeight: "1.6", margin: "0 0 28px" }, children: [
      "Hey ",
      name,
      ", most people only use AstroLogAI for chat \u2014 but there's a lot more waiting for you."
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#e41aff", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 8px" }, children: "Daily & Weekly Forecast" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#cccccc", fontSize: "15px", lineHeight: "1.5", margin: "0 0 20px" }, children: "Get personalised daily horoscopes and weekly forecasts calculated directly from your natal chart \u2014 not generic sun sign content." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#e41aff", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 8px" }, children: "Partner Synastry" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#cccccc", fontSize: "15px", lineHeight: "1.5", margin: "0 0 20px" }, children: "Add a partner's birth data and see exactly how your charts interact. The Oracle can explain every aspect." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#e41aff", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 8px" }, children: "Chart Explorer" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#cccccc", fontSize: "15px", lineHeight: "1.5", margin: "0 0 32px" }, children: "Dive deep into your natal chart \u2014 planets, houses, aspects, elements. Everything annotated and explained." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: chatUrl, children: "Explore the Oracle \u2726" })
  ] }) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FeatureDiscoveryEmail
});
