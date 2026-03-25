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
var VerificationEmail_exports = {};
__export(VerificationEmail_exports, {
  VerificationEmail: () => VerificationEmail
});
module.exports = __toCommonJS(VerificationEmail_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
var import_BaseEmailLayout = require("./BaseEmailLayout");
var import_EmailButton = require("./EmailButton");
function VerificationEmail({ verifyUrl, language }) {
  const isBg = language === "bg";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_BaseEmailLayout.BaseEmailLayout, { preview: isBg ? "\u041F\u043E\u0442\u0432\u044A\u0440\u0434\u0438 \u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441\u0430 \u0441\u0438 \u2726" : "Confirm your email address \u2726", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, margin: "0 0 16px", letterSpacing: "-0.5px" }, children: isBg ? "\u0414\u043E\u0431\u0440\u0435 \u0434\u043E\u0448\u043B\u0438 \u0432 AstroLogAI \u2726" : "Welcome to AstroLogAI \u2726" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#888888", fontSize: "16px", lineHeight: "1.6", margin: "0 0 32px" }, children: isBg ? "\u041F\u043E\u0442\u0432\u044A\u0440\u0434\u0438 \u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441\u0430 \u0441\u0438, \u0437\u0430 \u0434\u0430 \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0448 \u043F\u044A\u043B\u043D\u0438\u044F \u0434\u043E\u0441\u0442\u044A\u043F \u0434\u043E \u0441\u0432\u043E\u044F \u0445\u043E\u0440\u043E\u0441\u043A\u043E\u043F \u0438 \u043A\u043E\u0441\u043C\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0440\u043E\u0437\u0440\u0435\u043D\u0438\u044F." : "Confirm your email address to unlock full access to your horoscope and cosmic insights." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_EmailButton.EmailButton, { href: verifyUrl, children: isBg ? "\u041F\u043E\u0442\u0432\u044A\u0440\u0434\u0438 \u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441\u0430 \u2726" : "Verify my email \u2726" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#555555", fontSize: "13px", margin: "28px 0 0" }, children: isBg ? "\u0422\u0430\u0437\u0438 \u0432\u0440\u044A\u0437\u043A\u0430 \u0438\u0437\u0442\u0438\u0447\u0430 \u0441\u043B\u0435\u0434 24 \u0447\u0430\u0441\u0430. \u0410\u043A\u043E \u043D\u0435 \u0441\u0438 \u0441\u044A\u0437\u0434\u0430\u0432\u0430\u043B \u0430\u043A\u0430\u0443\u043D\u0442, \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u0430\u0439 \u0442\u043E\u0437\u0438 \u0438\u043C\u0435\u0439\u043B." : "This link expires in 24 hours. If you didn't create an account, you can safely ignore this email." })
  ] }) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VerificationEmail
});
