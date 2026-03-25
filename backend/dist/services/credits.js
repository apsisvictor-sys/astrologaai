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
var credits_exports = {};
__export(credits_exports, {
  deductCredits: () => deductCredits,
  refundCredits: () => refundCredits
});
module.exports = __toCommonJS(credits_exports);
var import_prisma = require("../utils/prisma");
async function deductCredits(userId, amount, description, relatedEntityType, relatedEntityId) {
  return import_prisma.prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id, balance FROM user_credits WHERE user_id = ${userId} FOR UPDATE
    `;
    if (rows.length === 0) {
      const err = new Error("Credits record not found for user");
      err.code = "CREDITS_NOT_FOUND";
      throw err;
    }
    const { balance } = rows[0];
    if (balance < amount) {
      const err = new Error("Insufficient credits");
      err.code = "INSUFFICIENT_CREDITS";
      err.required = amount;
      err.available = balance;
      throw err;
    }
    const newBalance = balance - amount;
    await tx.userCredits.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
        totalSpent: { increment: amount }
      }
    });
    await tx.creditTransaction.create({
      data: {
        userId,
        type: "spend",
        amount: -amount,
        balanceAfter: newBalance,
        description,
        relatedEntityType: relatedEntityType ?? null,
        relatedEntityId: relatedEntityId ?? null
      }
    });
    return { newBalance };
  });
}
async function refundCredits(userId, amount, description, relatedEntityType, relatedEntityId) {
  return import_prisma.prisma.$transaction(async (tx) => {
    const updated = await tx.userCredits.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        totalSpent: { decrement: amount }
      },
      select: { balance: true }
    });
    await tx.creditTransaction.create({
      data: {
        userId,
        type: "refund",
        amount,
        balanceAfter: updated.balance,
        description,
        relatedEntityType: relatedEntityType ?? null,
        relatedEntityId: relatedEntityId ?? null
      }
    });
    return { newBalance: updated.balance };
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deductCredits,
  refundCredits
});
