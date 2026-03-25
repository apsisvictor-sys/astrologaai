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
var UpgradeOfferEmail_exports = {};
__export(UpgradeOfferEmail_exports, {
  UpgradeOfferEmail: () => UpgradeOfferEmail
});
module.exports = __toCommonJS(UpgradeOfferEmail_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
var import_BaseEmailLayout = require("./BaseEmailLayout");
var import_EmailButton = require("./EmailButton");
var import_EmailDivider = require("./EmailDivider");
function UpgradeOfferEmail({ firstName, sunSign, moonSign, promoCode, pricingUrl, unsubscribeUrl }) {
  const name = firstName || "there";
  const signs = [sunSign, moonSign].filter(Boolean).join(" and ");
  const signsText = signs ? `your ${signs} energy` : "your cosmic energy";
  const promoUrl = promoCode ? `${pricingUrl}?promo=${promoCode}` : pricingUrl;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_BaseEmailLayout.BaseEmailLayout, { preview: "A month of cosmic exploration \u2014 a gift for you", unsubscribeUrl, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, margin: "0 0 16px", letterSpacing: "-0.5px" }, children: "A month of cosmic exploration \u2726" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "16px", lineHeight: "1.6", margin: "0 0 24px" }, children: [
      "Hey ",
      name,
      " \u2014 it's been a month since you started exploring ",
      signsText,
      " through AstroLogAI. You've uncovered a lot. Imagine what's possible with unlimited access."
    ] }),
    promoCode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#e41aff", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 8px" }, children: "A gift for you" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ffffff", fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }, children: [
        "Use code: ",
        promoCode
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#888888", fontSize: "14px", margin: "0 0 28px" }, children: "Applied automatically when you click below." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_EmailButton.EmailButton, { href: promoUrl, children: [
      "Upgrade to PRO \u2726",
      promoCode ? ` \u2014 use ${promoCode}` : ""
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#555555", fontSize: "13px", margin: "20px 0 0" }, children: "PRO is \u20AC9.99/month. Cancel anytime." })
  ] }) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  UpgradeOfferEmail
});
