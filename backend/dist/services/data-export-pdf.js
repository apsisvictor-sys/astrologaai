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
var data_export_pdf_exports = {};
__export(data_export_pdf_exports, {
  default: () => data_export_pdf_default,
  generateDataExportPDF: () => generateDataExportPDF
});
module.exports = __toCommonJS(data_export_pdf_exports);
async function generateDataExportPDF(_data) {
  throw new Error("PDF export is not available in this environment. Please use JSON format instead.");
}
var data_export_pdf_default = generateDataExportPDF;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateDataExportPDF
});
