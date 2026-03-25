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
var monthly_reset_exports = {};
__export(monthly_reset_exports, {
  archiveOldUsageRecords: () => archiveOldUsageRecords,
  initializeUserUsageRecord: () => initializeUserUsageRecord,
  isResetDay: () => isResetDay,
  resetMonthlyQueryCounters: () => resetMonthlyQueryCounters,
  runScheduledReset: () => runScheduledReset
});
module.exports = __toCommonJS(monthly_reset_exports);
var import_prisma = require("../utils/prisma");
var import_subscription_tiers = require("../config/subscription-tiers");
function getCurrentMonth() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function getPreviousMonth() {
  const now = /* @__PURE__ */ new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
}
function isResetDay() {
  const today = (/* @__PURE__ */ new Date()).getDate();
  const resetDay = (0, import_subscription_tiers.getMonthlyResetDay)();
  return today === resetDay;
}
async function resetMonthlyQueryCounters() {
  const startTime = Date.now();
  const errors = [];
  let usersProcessed = 0;
  try {
    console.log("[Monthly Reset] Starting monthly query counter reset...");
    const currentMonth = getCurrentMonth();
    const previousMonth = getPreviousMonth();
    const usersWithUsage = await import_prisma.prisma.usageRecord.findMany({
      where: {
        month: previousMonth,
        user: {
          tier: "FREE"
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            tier: true
          }
        }
      }
    });
    console.log(`[Monthly Reset] Found ${usersWithUsage.length} FREE tier users with usage in ${previousMonth}`);
    for (const record of usersWithUsage) {
      try {
        const existingRecord = await import_prisma.prisma.usageRecord.findUnique({
          where: {
            userId_month: {
              userId: record.userId,
              month: currentMonth
            }
          }
        });
        if (!existingRecord) {
          await import_prisma.prisma.usageRecord.create({
            data: {
              userId: record.userId,
              month: currentMonth,
              queryCount: 0
            }
          });
          usersProcessed++;
        }
        console.log(`[Monthly Reset] User ${record.user.email}: Reset from ${record.queryCount} queries in ${previousMonth}`);
      } catch (userError) {
        const errorMsg = `Failed to reset for user ${record.userId}: ${userError}`;
        console.error(`[Monthly Reset] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    const freeUsersWithoutRecord = await import_prisma.prisma.user.findMany({
      where: {
        tier: "FREE",
        NOT: {
          usageRecords: {
            some: {
              month: currentMonth
            }
          }
        }
      },
      select: {
        id: true,
        email: true
      }
    });
    console.log(`[Monthly Reset] Found ${freeUsersWithoutRecord.length} FREE tier users without current month record`);
    for (const user of freeUsersWithoutRecord) {
      try {
        await import_prisma.prisma.usageRecord.create({
          data: {
            userId: user.id,
            month: currentMonth,
            queryCount: 0
          }
        });
        usersProcessed++;
      } catch (userError) {
        if (!userError.code?.includes("P2002")) {
          const errorMsg = `Failed to create record for user ${user.id}: ${userError}`;
          console.error(`[Monthly Reset] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }
    const duration = Date.now() - startTime;
    console.log(`[Monthly Reset] Completed in ${duration}ms. Users processed: ${usersProcessed}`);
    return {
      success: true,
      usersProcessed,
      errors,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = `Monthly reset failed: ${error}`;
    console.error(`[Monthly Reset] ${errorMsg}`);
    errors.push(errorMsg);
    return {
      success: false,
      usersProcessed,
      errors,
      duration
    };
  }
}
async function archiveOldUsageRecords(monthsToKeep = 12) {
  const errors = [];
  let recordsDeleted = 0;
  try {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
    const cutoffMonth = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}`;
    console.log(`[Monthly Reset] Archiving usage records older than ${cutoffMonth}`);
    const result = await import_prisma.prisma.usageRecord.deleteMany({
      where: {
        month: {
          lt: cutoffMonth
        }
      }
    });
    recordsDeleted = result.count;
    console.log(`[Monthly Reset] Archived ${recordsDeleted} old usage records`);
    return {
      success: true,
      recordsDeleted,
      errors
    };
  } catch (error) {
    const errorMsg = `Failed to archive old records: ${error}`;
    console.error(`[Monthly Reset] ${errorMsg}`);
    errors.push(errorMsg);
    return {
      success: false,
      recordsDeleted,
      errors
    };
  }
}
async function initializeUserUsageRecord(userId) {
  const currentMonth = getCurrentMonth();
  try {
    await import_prisma.prisma.usageRecord.create({
      data: {
        userId,
        month: currentMonth,
        queryCount: 0
      }
    });
  } catch (error) {
    if (!error.code?.includes("P2002")) {
      console.error(`[Monthly Reset] Failed to initialize usage record for user ${userId}:`, error);
    }
  }
}
async function runScheduledReset() {
  if (isResetDay()) {
    console.log("[Monthly Reset] Today is reset day. Running monthly reset...");
    const result = await resetMonthlyQueryCounters();
    if (result.success) {
      console.log(`[Monthly Reset] Successfully reset ${result.usersProcessed} users in ${result.duration}ms`);
      if (result.errors.length > 0) {
        console.warn(`[Monthly Reset] Completed with ${result.errors.length} errors`);
      }
    } else {
      console.error(`[Monthly Reset] Reset failed with ${result.errors.length} errors`);
    }
    const archiveResult = await archiveOldUsageRecords(12);
    if (archiveResult.success && archiveResult.recordsDeleted > 0) {
      console.log(`[Monthly Reset] Archived ${archiveResult.recordsDeleted} old records`);
    }
  } else {
    console.log("[Monthly Reset] Not reset day. Skipping.");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  archiveOldUsageRecords,
  initializeUserUsageRecord,
  isResetDay,
  resetMonthlyQueryCounters,
  runScheduledReset
});
