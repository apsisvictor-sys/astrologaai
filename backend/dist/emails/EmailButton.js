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
var EmailButton_exports = {};
__export(EmailButton_exports, {
  EmailButton: () => EmailButton
});
module.exports = __toCommonJS(EmailButton_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
function EmailButton({ href, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_components.Button,
    {
      href,
      style: {
        display: "inline-block",
        padding: "14px 28px",
        backgroundColor: "#e41aff",
        color: "#ffffff",
        textDecoration: "none",
        borderRadius: "8px",
        fontWeight: 700,
        fontSize: "15px",
        fontFamily: "Inter, Arial, sans-serif",
        letterSpacing: "-0.2px"
      },
      children
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EmailButton
});
