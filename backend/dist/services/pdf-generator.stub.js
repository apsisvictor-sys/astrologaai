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
var pdf_generator_stub_exports = {};
__export(pdf_generator_stub_exports, {
  default: () => pdf_generator_stub_default,
  generateNatalChartPDF: () => generateNatalChartPDF,
  getPDFHeaders: () => getPDFHeaders
});
module.exports = __toCommonJS(pdf_generator_stub_exports);
async function generateNatalChartPDF(data) {
  throw new Error("PDF generation requires pdfkit and canvas dependencies. Please install them to enable this feature.");
}
function getPDFHeaders(filename, preview = false) {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": preview ? "inline" : `attachment; filename="${filename}"`
  };
}
var pdf_generator_stub_default = {
  generateNatalChartPDF,
  getPDFHeaders
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateNatalChartPDF,
  getPDFHeaders
});
