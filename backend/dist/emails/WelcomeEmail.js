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
var WelcomeEmail_exports = {};
__export(WelcomeEmail_exports, {
  WelcomeEmail: () => WelcomeEmail
});
module.exports = __toCommonJS(WelcomeEmail_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
var import_BaseEmailLayout = require("./BaseEmailLayout");
var import_EmailButton = require("./EmailButton");
var import_EmailDivider = require("./EmailDivider");
function WelcomeEmail({ firstName, sunSign, moonSign, risingSign, chatUrl, unsubscribeUrl }) {
  const name = firstName || "Cosmic Traveller";
  const hasSigns = sunSign && moonSign;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_BaseEmailLayout.BaseEmailLayout, { preview: "Your cosmic blueprint is ready \u2726", unsubscribeUrl, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, margin: "0 0 16px", letterSpacing: "-0.5px" }, children: "Your cosmic blueprint is ready \u2726" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "16px", lineHeight: "1.6", margin: "0 0 24px" }, children: [
      "Welcome, ",
      name,
      ". The stars were aligned in a very specific way the moment you arrived in this world \u2014 and your chart captures that moment forever."
    ] }),
    hasSigns && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#e41aff", fontSize: "13px", fontWeight: 700, margin: "0 0 12px", letterSpacing: "1px", textTransform: "uppercase" }, children: "Your Big 3" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ffffff", fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }, children: [
        "\u2609 Sun \u2014 ",
        sunSign
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ffffff", fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }, children: [
        "\u263D Moon \u2014 ",
        moonSign
      ] }),
      risingSign && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ffffff", fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }, children: [
        "\u2191 Rising \u2014 ",
        risingSign
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#888888", fontSize: "16px", lineHeight: "1.6", margin: "0 0 32px" }, children: "The Oracle is ready to answer your first question. Ask anything \u2014 your chart, your relationships, what the stars say about your path ahead." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: chatUrl, children: "Begin your Oracle session \u2726" })
  ] }) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WelcomeEmail
});
