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
var locations_exports = {};
__export(locations_exports, {
  default: () => locations_default
});
module.exports = __toCommonJS(locations_exports);
var import_express = require("express");
var import_rateLimiter = require("../middleware/rateLimiter");
var import_birthDataController = require("../controllers/birthDataController");
const router = (0, import_express.Router)();
router.get("/search", (0, import_rateLimiter.rateLimiter)(20, 60), import_birthDataController.searchLocationsHandler);
var locations_default = router;
