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
var partners_exports = {};
__export(partners_exports, {
  default: () => partners_default
});
module.exports = __toCommonJS(partners_exports);
var import_express = require("express");
var import_auth = require("../middleware/auth");
var import_partnerController = require("../controllers/partnerController");
const router = (0, import_express.Router)();
router.use(import_auth.authMiddleware);
router.get("/", import_partnerController.listPartners);
router.post("/", import_partnerController.createPartner);
router.get("/:id", import_partnerController.getPartner);
router.get("/:id/synastry", import_partnerController.getSynastry);
router.get("/:id/report", import_partnerController.getCompatibilityReport);
router.get("/:id/composite", import_partnerController.getCompositeChart);
router.put("/:id", import_partnerController.updatePartner);
router.delete("/:id", import_partnerController.deletePartner);
var partners_default = router;
