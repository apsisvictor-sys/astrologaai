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
var prisma_vector_exports = {};
__export(prisma_vector_exports, {
  getPrismaVector: () => getPrismaVector
});
module.exports = __toCommonJS(prisma_vector_exports);
var import_client = require("@prisma/client");
let _vectorClient = null;
function getPrismaVector() {
  if (_vectorClient) return _vectorClient;
  const url = process.env.DATABASE_VECTOR_URL;
  if (!url) {
    throw new Error(
      "[VectorDB] DATABASE_VECTOR_URL is not set \u2014 vector memory unavailable. Blocked on PIX-165 (postgres-vector Railway service provisioning)."
    );
  }
  _vectorClient = new import_client.PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
  return _vectorClient;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getPrismaVector
});
