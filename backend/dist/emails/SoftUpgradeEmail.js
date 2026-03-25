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
var SoftUpgradeEmail_exports = {};
__export(SoftUpgradeEmail_exports, {
  SoftUpgradeEmail: () => SoftUpgradeEmail
});
module.exports = __toCommonJS(SoftUpgradeEmail_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
var import_BaseEmailLayout = require("./BaseEmailLayout");
var import_EmailButton = require("./EmailButton");
var import_EmailDivider = require("./EmailDivider");
function SoftUpgradeEmail({ firstName, sunSign, pricingUrl, chatUrl, unsubscribeUrl }) {
  const name = firstName || "there";
  const signText = sunSign ? `${sunSign}` : "your sign's";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_BaseEmailLayout.BaseEmailLayout, { preview: `You're exploring ${signText} energy deeply`, unsubscribeUrl, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, margin: "0 0 16px", letterSpacing: "-0.5px" }, children: [
      "You're exploring ",
      signText,
      " energy deeply \u2726"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "16px", lineHeight: "1.6", margin: "0 0 24px" }, children: [
      "Hey ",
      name,
      " \u2014 you've been on a real cosmic journey over the past two weeks. PRO users unlock unlimited Oracle sessions, the full weekly forecast, and partner synastry charts."
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailDivider.EmailDivider, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#cccccc", fontSize: "15px", lineHeight: "1.5", margin: "0 0 8px" }, children: "\u2726 Unlimited Oracle sessions \u2014 no daily cap" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#cccccc", fontSize: "15px", lineHeight: "1.5", margin: "0 0 8px" }, children: "\u2726 Full daily + weekly forecast" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#cccccc", fontSize: "15px", lineHeight: "1.5", margin: "0 0 32px" }, children: "\u2726 Partner synastry charts" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: pricingUrl, children: "See PRO plans \u2726" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#555555", fontSize: "13px", margin: "20px 0 0" }, children: [
      "Or ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: chatUrl, style: { color: "#888888" }, children: "keep exploring" }),
      " your free daily reading."
    ] })
  ] }) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SoftUpgradeEmail
});
