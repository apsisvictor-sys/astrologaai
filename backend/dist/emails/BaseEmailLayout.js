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
var BaseEmailLayout_exports = {};
__export(BaseEmailLayout_exports, {
  BaseEmailLayout: () => BaseEmailLayout
});
module.exports = __toCommonJS(BaseEmailLayout_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_components = require("@react-email/components");
function BaseEmailLayout({ children, unsubscribeUrl, preview }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Html, { lang: "en", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Head, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_components.Font,
        {
          fontFamily: "Inter",
          fallbackFontFamily: "Arial",
          webFont: { url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2", format: "woff2" },
          fontWeight: 400,
          fontStyle: "normal"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_components.Font,
        {
          fontFamily: "Inter",
          fallbackFontFamily: "Arial",
          webFont: { url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2", format: "woff2" },
          fontWeight: 700,
          fontStyle: "normal"
        }
      ),
      preview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meta", { name: "x-apple-disable-message-reformatting" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Body, { style: { backgroundColor: "#0D0010", margin: 0, padding: 0, fontFamily: "Inter, Arial, sans-serif" }, children: [
      preview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { display: "none", maxHeight: 0, overflow: "hidden", color: "#0D0010", fontSize: "1px" }, children: preview }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Container, { style: { maxWidth: "600px", margin: "0 auto", padding: "40px 24px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Section, { style: { marginBottom: "32px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#e41aff", fontSize: "20px", fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }, children: "\u2726 AstroLogAI" }) }),
        children,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Hr, { style: { borderColor: "#2a0035", margin: "40px 0 24px" } }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Section, { children: [
          unsubscribeUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_components.Text, { style: { color: "#555555", fontSize: "12px", margin: "0 0 8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Link, { href: unsubscribeUrl, style: { color: "#888888", textDecoration: "underline" }, children: "Unsubscribe" }),
            " ",
            "from email notifications."
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_components.Text, { style: { color: "#444444", fontSize: "12px", margin: 0 }, children: "\xA9 2026 AstroLogAI. All rights reserved." })
        ] })
      ] })
    ] })
  ] });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BaseEmailLayout
});
