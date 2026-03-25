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
var PasswordChangedEmail_exports = {};
__export(PasswordChangedEmail_exports, {
  PasswordChangedEmail: () => PasswordChangedEmail
});
module.exports = __toCommonJS(PasswordChangedEmail_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
var import_BaseEmailLayout = require("./BaseEmailLayout");
function PasswordChangedEmail({ language }) {
  const isBg = language === "bg";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_BaseEmailLayout.BaseEmailLayout, { preview: isBg ? "\u041F\u0430\u0440\u043E\u043B\u0430\u0442\u0430 \u0435 \u0441\u043C\u0435\u043D\u0435\u043D\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E" : "Your password has been changed", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#ffffff", fontSize: "26px", fontWeight: 700, margin: "0 0 16px", letterSpacing: "-0.5px" }, children: isBg ? "\u041F\u0430\u0440\u043E\u043B\u0430\u0442\u0430 \u0435 \u0441\u043C\u0435\u043D\u0435\u043D\u0430 \u2726" : "Password Changed \u2726" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#888888", fontSize: "16px", lineHeight: "1.6", margin: "0 0 16px" }, children: isBg ? "\u0412\u0430\u0448\u0430\u0442\u0430 \u043F\u0430\u0440\u043E\u043B\u0430 \u0431\u0435\u0448\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043C\u0435\u043D\u0435\u043D\u0430. \u0410\u043A\u043E \u043D\u0435 \u0441\u0442\u0435 \u0433\u043E \u043D\u0430\u043F\u0440\u0430\u0432\u0438\u043B\u0438 \u0432\u0438\u0435, \u0441\u0432\u044A\u0440\u0436\u0435\u0442\u0435 \u0441\u0435 \u0441 \u043D\u0430\u0441 \u043D\u0435\u0437\u0430\u0431\u0430\u0432\u043D\u043E." : "Your password has been successfully changed. If you did not do this, contact us immediately." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#555555", fontSize: "13px" }, children: isBg ? "\xA9 2026 AstroLogAI" : "If this was you, no action is needed." })
  ] }) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PasswordChangedEmail
});
