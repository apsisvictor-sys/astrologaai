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
var compatibility_exports = {};
__export(compatibility_exports, {
  default: () => compatibility_default
});
module.exports = __toCommonJS(compatibility_exports);
var import_express = require("express");
var import_auth = require("../middleware/auth");
var import_compatibilityController = require("../controllers/compatibilityController");
const router = (0, import_express.Router)();
router.use(import_auth.authMiddleware);
router.get("/:partnerId", import_compatibilityController.getCompatibilityAnalysis);
router.delete("/:partnerId/cache", import_compatibilityController.invalidateCompatibilityCache);
var compatibility_default = router;
