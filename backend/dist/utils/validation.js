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
var validation_exports = {};
__export(validation_exports, {
  formatZodErrors: () => formatZodErrors,
  loginSchema: () => loginSchema,
  registerSchema: () => registerSchema
});
module.exports = __toCommonJS(validation_exports);
var import_zod = require("zod");
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const SUPPORTED_LANGUAGES = ["bg", "en"];
const registerSchema = import_zod.z.object({
  email: import_zod.z.string().min(1, "Email is required").max(255, "Email must be less than 255 characters").transform((email) => email.toLowerCase().trim()).pipe(import_zod.z.string().email("Invalid email format")),
  password: import_zod.z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be less than 128 characters").regex(
    passwordRegex,
    "Password must contain at least 1 uppercase letter and 1 number"
  ),
  fullName: import_zod.z.string().min(1, "Name must not be empty if provided").max(100, "Name must be less than 100 characters").transform((name) => name.trim()).optional(),
  // US-26: Language preference on registration
  language: import_zod.z.enum(SUPPORTED_LANGUAGES).optional(),
  referralSlug: import_zod.z.string().max(64).regex(/^[a-z0-9_-]+$/i).optional()
});
const loginSchema = import_zod.z.object({
  email: import_zod.z.string().transform((email) => email.toLowerCase().trim()).pipe(import_zod.z.string().email("Invalid email format")),
  password: import_zod.z.string().min(1, "Password is required")
});
function formatZodErrors(error) {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message
  }));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatZodErrors,
  loginSchema,
  registerSchema
});
