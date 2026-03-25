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
var chat_exports = {};
__export(chat_exports, {
  default: () => chat_default
});
module.exports = __toCommonJS(chat_exports);
var import_express = require("express");
var import_auth = require("../middleware/auth");
var import_queryLimit = require("../middleware/queryLimit");
var import_chatController = require("../controllers/chatController");
const router = (0, import_express.Router)();
router.get("/share/:token", import_chatController.getSharedSession);
router.use(import_auth.authMiddleware);
router.post("/message", import_queryLimit.queryLimitMiddleware, import_chatController.sendMessage);
router.post("/sessions", import_queryLimit.queryLimitMiddleware, import_chatController.createSession);
router.post("/new", import_queryLimit.queryLimitMiddleware, import_chatController.startNewConversation);
router.get("/sessions", import_chatController.listSessions);
router.delete("/sessions", import_chatController.clearAllSessions);
router.get("/sessions/:id", import_chatController.getSession);
router.patch("/sessions/:id", import_chatController.updateSession);
router.delete("/sessions/:id", import_chatController.deleteSession);
router.post("/sessions/:id/import", import_chatController.importGuestMessages);
router.post("/sessions/:id/share", import_chatController.shareSession);
router.delete("/sessions/:id/share", import_chatController.unshareSession);
router.post("/sessions/:id/rate", import_chatController.rateSession);
router.get("/usage", import_chatController.getUsage);
var chat_default = router;
