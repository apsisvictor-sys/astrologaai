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
var chart_regeneration_exports = {};
__export(chart_regeneration_exports, {
  default: () => chart_regeneration_default,
  regenerateChartNow: () => regenerateChartNow,
  startRegenerationProcessor: () => startRegenerationProcessor
});
module.exports = __toCommonJS(chart_regeneration_exports);
var import_prisma = require("../utils/prisma");
var import_redis = require("../utils/redis");
var import_astrology = require("./astrology");
const QUEUE_KEY = "chart_regeneration_queue";
async function processJob(job) {
  console.log(`[ChartRegen] Processing job ${job.jobId}`);
  try {
    job.status = "processing";
    await import_redis.redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
    const profile = await import_prisma.prisma.birthProfile.findUnique({
      where: { id: job.profileId }
    });
    if (!profile) {
      console.error(`[ChartRegen] Profile ${job.profileId} not found`);
      return false;
    }
    const existingChart = await import_prisma.prisma.birthChart.findFirst({
      where: { birthProfileId: job.profileId }
    });
    if (existingChart) {
      console.log(`[ChartRegen] Chart already exists for profile ${job.profileId}`);
      return true;
    }
    const birthDate = new Date(profile.birthDate);
    const birthTime = profile.birthTime || "12:00";
    const [hour, minute] = birthTime.split(":").map(Number);
    const birthDataInput = {
      year: birthDate.getFullYear(),
      month: birthDate.getMonth() + 1,
      day: birthDate.getDate(),
      hour: hour || 12,
      minute: minute || 0,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone
    };
    const chart = await (0, import_astrology.calculateNatalChart)(birthDataInput);
    const savedChart = await import_prisma.prisma.birthChart.create({
      data: {
        userId: job.userId,
        birthProfileId: job.profileId,
        chartData: chart
      }
    });
    console.log(`[ChartRegen] Created chart ${savedChart.id} for profile ${job.profileId}`);
    job.status = "complete";
    await import_redis.redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
    return true;
  } catch (error) {
    console.error(`[ChartRegen] Error processing job ${job.jobId}:`, error);
    job.status = "failed";
    await import_redis.redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
    return false;
  }
}
function startRegenerationProcessor() {
}
async function regenerateChartNow(profileId, userId) {
  const job = {
    jobId: `chart_regen:${profileId}:${Date.now()}`,
    profileId,
    userId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "pending"
  };
  await import_redis.redisClient.setEx(`job:${job.jobId}`, 3600, JSON.stringify(job));
  await processJob(job);
  return job.jobId;
}
var chart_regeneration_default = {
  startRegenerationProcessor,
  regenerateChartNow
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  regenerateChartNow,
  startRegenerationProcessor
});
