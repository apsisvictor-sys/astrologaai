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
var languageDetection_exports = {};
__export(languageDetection_exports, {
  DEFAULT_LANGUAGE: () => DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES: () => SUPPORTED_LANGUAGES,
  default: () => languageDetection_default,
  detectLanguageFromHeader: () => detectLanguageFromHeader,
  getDetectedLanguage: () => getDetectedLanguage,
  languageDetectionMiddleware: () => languageDetectionMiddleware
});
module.exports = __toCommonJS(languageDetection_exports);
const SUPPORTED_LANGUAGES = ["bg", "en"];
const DEFAULT_LANGUAGE = "en";
function detectLanguageFromHeader(acceptLanguage) {
  if (!acceptLanguage) {
    return DEFAULT_LANGUAGE;
  }
  const languages = acceptLanguage.split(",").map((lang) => {
    const [code, qualityStr] = lang.trim().split(";");
    const quality = qualityStr ? parseFloat(qualityStr.replace("q=", "")) : 1;
    return {
      code: code?.toLowerCase().split("-")[0] || "",
      // Get language code without region
      quality
    };
  });
  languages.sort((a, b) => b.quality - a.quality);
  for (const lang of languages) {
    if (SUPPORTED_LANGUAGES.includes(lang.code)) {
      return lang.code;
    }
  }
  return DEFAULT_LANGUAGE;
}
function languageDetectionMiddleware(req, res, next) {
  if (req.user?.language && SUPPORTED_LANGUAGES.includes(req.user.language)) {
    req.detectedLanguage = req.user.language;
    next();
    return;
  }
  const acceptLanguage = req.headers["accept-language"];
  req.detectedLanguage = detectLanguageFromHeader(acceptLanguage);
  next();
}
function getDetectedLanguage(req) {
  return req.detectedLanguage || DEFAULT_LANGUAGE;
}
var languageDetection_default = languageDetectionMiddleware;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  detectLanguageFromHeader,
  getDetectedLanguage,
  languageDetectionMiddleware
});
