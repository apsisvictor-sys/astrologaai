"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var refreshTokens_exports = {};
__export(refreshTokens_exports, {
  createRefreshToken: () => createRefreshToken,
  revokeToken: () => revokeToken,
  revokeUserTokens: () => revokeUserTokens,
  validateAndRotate: () => validateAndRotate
});
module.exports = __toCommonJS(refreshTokens_exports);
var crypto = __toESM(require("crypto"));
var import_prisma = __toESM(require("./prisma"));
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1e3;
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
async function createRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(raw);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await import_prisma.default.refreshToken.create({
    data: { userId, tokenHash, familyId, expiresAt }
  });
  return raw;
}
async function validateAndRotate(raw) {
  const tokenHash = hashToken(raw);
  const record = await import_prisma.default.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, tier: true } } }
  });
  if (!record) {
    return null;
  }
  if (record.revokedAt) {
    return null;
  }
  if (record.usedAt) {
    console.warn(`[Auth] Refresh token reuse detected \u2014 revoking family ${record.familyId} for user ${record.userId}`);
    await import_prisma.default.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: /* @__PURE__ */ new Date() }
    });
    return null;
  }
  if (record.expiresAt < /* @__PURE__ */ new Date()) {
    return null;
  }
  const newRaw = crypto.randomBytes(48).toString("hex");
  const newHash = hashToken(newRaw);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await import_prisma.default.$transaction([
    import_prisma.default.refreshToken.update({
      where: { tokenHash },
      data: { usedAt: /* @__PURE__ */ new Date() }
    }),
    import_prisma.default.refreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: newHash,
        familyId: record.familyId,
        expiresAt: newExpiresAt
      }
    })
  ]);
  return {
    userId: record.userId,
    email: record.user.email,
    tier: record.user.tier,
    newToken: newRaw
  };
}
async function revokeToken(raw) {
  const tokenHash = hashToken(raw);
  await import_prisma.default.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: /* @__PURE__ */ new Date() }
  });
}
async function revokeUserTokens(userId) {
  await import_prisma.default.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: /* @__PURE__ */ new Date() }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createRefreshToken,
  revokeToken,
  revokeUserTokens,
  validateAndRotate
});
