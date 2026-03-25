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
var ReEngagementEmail_exports = {};
__export(ReEngagementEmail_exports, {
  ReEngagementEmail: () => ReEngagementEmail
});
module.exports = __toCommonJS(ReEngagementEmail_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
var import_BaseEmailLayout = require("./BaseEmailLayout");
var import_EmailButton = require("./EmailButton");
function ReEngagementEmail({ firstName, sunSign, chatUrl, unsubscribeUrl }) {
  const name = firstName || "there";
  const transit = sunSign ? `transits moving through ${sunSign} energy right now` : "significant transits active in your chart right now";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_BaseEmailLayout.BaseEmailLayout, { preview: "Your chart has something new to show you", unsubscribeUrl, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, margin: "0 0 16px", letterSpacing: "-0.5px" }, children: "Your chart has something new to show you" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#888888", fontSize: "16px", lineHeight: "1.6", margin: "0 0 24px" }, children: [
      "Hey ",
      name,
      " \u2014 the planets don't stand still, and neither does your chart. There are ",
      transit,
      ". The Oracle can walk you through exactly what they mean for you."
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#e41aff", fontSize: "17px", fontStyle: "italic", margin: "0 0 32px", lineHeight: "1.5" }, children: '"What transits are active in my chart this week, and how should I work with them?"' }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: chatUrl, children: "Ask the Oracle \u2726" })
  ] }) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ReEngagementEmail
});
