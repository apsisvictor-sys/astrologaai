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
var streakService_exports = {};
__export(streakService_exports, {
  checkTrialExpiry: () => checkTrialExpiry,
  getStreakInfo: () => getStreakInfo,
  revertExpiredTrials: () => revertExpiredTrials,
  updateStreak: () => updateStreak
});
module.exports = __toCommonJS(streakService_exports);
var import_client = require("@prisma/client");
const prisma = new import_client.PrismaClient();
const MILESTONE_DAYS = [7, 14, 21, 30, 60, 100];
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isYesterday(date, today) {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return isSameDay(date, yesterday);
}
async function updateStreak(userId) {
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  let streak = await prisma.userStreak.findUnique({ where: { userId } });
  if (!streak) {
    streak = await prisma.userStreak.create({
      data: { userId, currentStreak: 0, longestStreak: 0 }
    });
  }
  const last = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
  if (last && isSameDay(last, today)) {
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      milestoneReached: null
    };
  }
  let newStreak;
  if (!last || isYesterday(last, today)) {
    newStreak = streak.currentStreak + 1;
  } else {
    newStreak = 1;
  }
  const newLongest = Math.max(streak.longestStreak, newStreak);
  const milestoneReached = MILESTONE_DAYS.includes(newStreak) ? newStreak : null;
  await prisma.userStreak.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: today
    }
  });
  if (milestoneReached && milestoneReached % 7 === 0) {
    await grantProTrial(userId, 48);
  }
  return { currentStreak: newStreak, longestStreak: newLongest, milestoneReached };
}
async function grantProTrial(userId, hours) {
  const expiresAt = new Date(Date.now() + hours * 3600 * 1e3);
  await prisma.userStreak.update({
    where: { userId },
    data: { trialTier: "PRO", trialExpiresAt: expiresAt }
  });
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || sub.tier === "FREE") {
    if (sub) {
      await prisma.subscription.update({
        where: { userId },
        data: { tier: "PRO" }
      });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { tier: "PRO" }
    });
  }
}
async function checkTrialExpiry(userId) {
  const streak = await prisma.userStreak.findUnique({ where: { userId } });
  if (!streak?.trialTier || !streak?.trialExpiresAt) return;
  if (new Date(streak.trialExpiresAt) > /* @__PURE__ */ new Date()) return;
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const hasPaidSub = sub?.stripeSubscriptionId && sub.status === "ACTIVE";
  if (!hasPaidSub) {
    await prisma.user.update({ where: { id: userId }, data: { tier: "FREE" } });
    if (sub) {
      await prisma.subscription.update({ where: { userId }, data: { tier: "FREE" } });
    }
  }
  await prisma.userStreak.update({
    where: { userId },
    data: { trialTier: null, trialExpiresAt: null }
  });
}
async function revertExpiredTrials() {
  const expired = await prisma.userStreak.findMany({
    where: {
      trialTier: { not: null },
      trialExpiresAt: { lt: /* @__PURE__ */ new Date() }
    },
    select: { userId: true }
  });
  for (const { userId } of expired) {
    await checkTrialExpiry(userId);
  }
  return expired.length;
}
async function getStreakInfo(userId) {
  const streak = await prisma.userStreak.findUnique({ where: { userId } });
  return {
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkTrialExpiry,
  getStreakInfo,
  revertExpiredTrials,
  updateStreak
});
