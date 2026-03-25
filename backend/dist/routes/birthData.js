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
var birthData_exports = {};
__export(birthData_exports, {
  default: () => birthData_default
});
module.exports = __toCommonJS(birthData_exports);
var import_express = require("express");
var import_auth = require("../middleware/auth");
var import_rateLimiter = require("../middleware/rateLimiter");
var import_birthDataController = require("../controllers/birthDataController");
const router = (0, import_express.Router)();
router.use(import_auth.authMiddleware);
router.get("/", import_birthDataController.listBirthProfiles);
router.get("/:id", import_birthDataController.getBirthProfile);
router.post("/", (0, import_rateLimiter.rateLimiter)(10, 60), import_birthDataController.createBirthProfile);
router.put("/:id", import_birthDataController.updateBirthProfile);
router.delete("/:id", import_birthDataController.deleteBirthProfile);
router.get("/:id/regeneration-status", import_birthDataController.getRegenerationStatus);
router.get("/:id/history", import_birthDataController.getChartHistory);
router.get("/:id/history/:historyId", import_birthDataController.getHistoricalChart);
var birthData_default = router;
