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
var birthChart_exports = {};
__export(birthChart_exports, {
  default: () => birthChart_default
});
module.exports = __toCommonJS(birthChart_exports);
var import_express = require("express");
var import_auth = require("../middleware/auth");
var import_rateLimiter = require("../middleware/rateLimiter");
var import_natalChartController = require("../controllers/natalChartController");
var import_chartAnalysisController = require("../controllers/chartAnalysisController");
var import_pdfController = require("../controllers/pdfController");
var import_aspectController = require("../controllers/aspectController");
var import_timeSensitivityController = require("../controllers/timeSensitivityController");
const router = (0, import_express.Router)();
router.get("/shared/:token", import_natalChartController.getSharedNatalChart);
router.use(import_auth.authMiddleware);
router.post("/", (0, import_rateLimiter.rateLimiter)(10, 60), import_natalChartController.generateNatalChart);
router.post("/share", (0, import_rateLimiter.rateLimiter)(20, 60), import_natalChartController.shareNatalChart);
router.get("/:profileId", import_natalChartController.getNatalChart);
router.get("/:profileId/analysis", import_chartAnalysisController.getChartAnalysis);
router.get("/:profileId/analysis/planet/:planetName", import_chartAnalysisController.getPlanetAnalysis);
router.get("/:profileId/analysis/house/:houseNumber", import_chartAnalysisController.getHouseAnalysis);
router.get("/:profileId/aspects", import_aspectController.getAspects);
router.get("/:profileId/aspects/matrix", import_aspectController.getAspectMatrix);
router.get("/:profileId/aspects/:planet1/:planet2", import_aspectController.getSpecificAspect);
router.get("/:profileId/pdf/status", import_pdfController.getPDFStatus);
router.get("/:profileId/pdf", (0, import_rateLimiter.rateLimiter)(10, 60), import_pdfController.generateChartPDF);
router.post("/:profileId/pdf", (0, import_rateLimiter.rateLimiter)(10, 60), import_pdfController.generateChartPDF);
router.post("/:profileId/pdf/email", (0, import_rateLimiter.rateLimiter)(5, 60), import_pdfController.emailChartPDF);
router.delete("/:profileId", import_natalChartController.deleteNatalChart);
router.post("/recalculate/:profileId", (0, import_rateLimiter.rateLimiter)(5, 60), import_natalChartController.recalculateNatalChart);
router.get("/:profileId/time-sensitivity/summary", (0, import_rateLimiter.rateLimiter)(30, 60), import_timeSensitivityController.getTimeSensitivitySummary);
router.get("/:profileId/time-sensitivity", (0, import_rateLimiter.rateLimiter)(10, 60), import_timeSensitivityController.getTimeSensitivity);
var birthChart_default = router;
