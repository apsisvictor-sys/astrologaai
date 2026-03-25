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
var index_exports = {};
__export(index_exports, {
  astrologyTools: () => astrologyTools,
  createAstrologyTools: () => createAstrologyTools
});
module.exports = __toCommonJS(index_exports);
var import_ai = require("ai");
var import_zod = require("zod");
var import_astroapi_typescript = require("@astro-api/astroapi-typescript");
var import_prisma = require("../../utils/prisma");
var import_geoip_lite = __toESM(require("geoip-lite"));
const CHART_OPTIONS = {
  house_system: "P",
  zodiac_type: "Tropic",
  active_points: [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "True_Node",
    "Chiron"
  ]
};
function getClient() {
  return new import_astroapi_typescript.AstrologyClient({ apiKey: process.env.ASTROLOGY_API_KEY });
}
function toSubject(b) {
  return {
    name: "subject",
    birth_data: {
      year: b.year,
      month: b.month,
      day: b.day,
      hour: b.hour,
      minute: b.minute,
      second: 0,
      latitude: b.latitude,
      longitude: b.longitude,
      timezone: b.timezone
    }
  };
}
function resolveIpLocation(ip) {
  if (!ip) return null;
  const cleanIp = ip.replace(/^::ffff:/, "");
  if (cleanIp === "127.0.0.1" || cleanIp === "::1" || cleanIp.startsWith("192.168.") || cleanIp.startsWith("10.")) return null;
  const geo = import_geoip_lite.default.lookup(cleanIp);
  if (!geo?.ll) return null;
  return { latitude: geo.ll[0], longitude: geo.ll[1], timezone: geo.timezone || "UTC" };
}
const birthDataSchema = import_zod.z.object({
  year: import_zod.z.number(),
  month: import_zod.z.number().min(1).max(12),
  day: import_zod.z.number().min(1).max(31),
  hour: import_zod.z.number().min(0).max(23),
  minute: import_zod.z.number().min(0).max(59),
  latitude: import_zod.z.number(),
  longitude: import_zod.z.number(),
  timezone: import_zod.z.string().optional()
});
const transitsSchema = import_zod.z.object({
  date: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date in YYYY-MM-DD format. Defaults to today if omitted.")
});
const synastrySchema = import_zod.z.object({
  partnerId: import_zod.z.string().describe("The ID of the stored partner to analyze compatibility with. List comes from system context.")
});
const progressionsSchema = import_zod.z.object({
  birthData: birthDataSchema.describe("User's birth data"),
  targetDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Target date for progression in YYYY-MM-DD format (usually today)")
});
const solarReturnSchema = import_zod.z.object({
  birthData: birthDataSchema.describe("User's birth data"),
  year: import_zod.z.number().describe("Target year for solar return (e.g., 2026)")
});
const relocationSchema = import_zod.z.object({
  birthData: birthDataSchema.describe("User's birth data"),
  targetLocation: import_zod.z.object({
    latitude: import_zod.z.number(),
    longitude: import_zod.z.number()
  }).describe("Coordinates of the target city/location")
});
const compositeSchema = import_zod.z.object({
  partnerId: import_zod.z.string().describe("The ID of the stored partner to compute the composite chart with.")
});
const lunarReturnSchema = import_zod.z.object({
  birthData: birthDataSchema.describe("User's birth data"),
  year: import_zod.z.number().describe("Target year (e.g., 2026)"),
  month: import_zod.z.number().min(1).max(12).describe("Target month (1-12)")
});
const solarArcSchema = import_zod.z.object({
  birthData: birthDataSchema.describe("User's birth data"),
  targetDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Target date in YYYY-MM-DD format")
});
function createAstrologyTools(context) {
  const { userId, userIp } = context;
  const calculateNatalChartTool = (0, import_ai.tool)({
    description: "Returns the user's natal chart data (planet positions, houses, aspects). Use for specific placements like Chiron, Midheaven, or any placement not visible in the pre-loaded context.",
    inputSchema: import_zod.z.object({}),
    execute: async () => {
      console.log(`[Agent Tool] get_natal_chart \u2014 reading from DB for userId ${userId}`);
      const record = await import_prisma.prisma.birthProfile.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { birthChart: true }
      });
      if (!record?.birthChart?.chartData) {
        throw new Error("Natal chart not found in database. The user may not have saved birth data yet.");
      }
      const chart = record.birthChart.chartData;
      return {
        sun: chart.sun,
        moon: chart.moon,
        rising: chart.rising,
        mercury: chart.mercury,
        venus: chart.venus,
        mars: chart.mars,
        jupiter: chart.jupiter,
        saturn: chart.saturn,
        chiron: chart.chiron,
        northNode: chart.northNode,
        houses: chart.houses,
        aspects: chart.aspects?.slice(0, 15)
      };
    }
  });
  const analyzeTransitsTool = (0, import_ai.tool)({
    description: "Returns today's planetary sky positions. Only call if the user asks about current transits beyond what is already in your context.",
    inputSchema: transitsSchema,
    execute: async () => {
      console.log(`[Agent Tool] get_transits`);
      const { getActiveTransitsForUser } = await import("../transits");
      const record = await import_prisma.prisma.birthProfile.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { birthChart: true }
      });
      if (!record?.birthChart?.chartData) {
        throw new Error("Natal chart not found. Cannot compute personal transits.");
      }
      const { skyPositions, aspectsToNatal } = await getActiveTransitsForUser(record.birthChart.chartData);
      return { skyPositions, aspectsToNatal: aspectsToNatal.slice(0, 10) };
    }
  });
  const calculateSynastryTool = (0, import_ai.tool)({
    description: "Compares the user's birth chart with a stored partner's chart. CALL THIS for relationship compatibility questions. If multiple partners are stored, first ask the user which one to analyze.",
    inputSchema: synastrySchema,
    execute: async (args) => {
      console.log(`[Agent Tool] get_synastry \u2014 partnerId ${args.partnerId}`);
      const [userProfile, partner] = await Promise.all([
        import_prisma.prisma.birthProfile.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
        import_prisma.prisma.partner.findFirst({ where: { id: args.partnerId, userId } })
      ]);
      if (!userProfile) throw new Error("User birth data not found in database.");
      if (!partner) throw new Error(`Partner with ID "${args.partnerId}" not found.`);
      const client = getClient();
      const [userHour, userMin] = (userProfile.birthTime || "12:00").split(":").map(Number);
      const [partHour, partMin] = (partner.birthTime || "12:00").split(":").map(Number);
      const userBirth = new Date(userProfile.birthDate);
      const partBirth = new Date(partner.birthDate);
      const result = await client.charts.getSynastryChart({
        subject1: toSubject({ year: userBirth.getFullYear(), month: userBirth.getMonth() + 1, day: userBirth.getDate(), hour: userHour, minute: userMin, latitude: userProfile.latitude, longitude: userProfile.longitude, timezone: userProfile.timezone }),
        subject2: toSubject({ year: partBirth.getFullYear(), month: partBirth.getMonth() + 1, day: partBirth.getDate(), hour: partHour, minute: partMin, latitude: partner.latitude, longitude: partner.longitude, timezone: partner.timezone }),
        options: CHART_OPTIONS
      });
      return result;
    }
  });
  const calculateProgressionsTool = (0, import_ai.tool)({
    description: "Calculates secondary progressions \u2014 slow inner psychological evolution (~1 day = 1 year of life). Use for questions about internal emotional shifts, identity changes, or feeling fundamentally different. Frame as inner growth themes, not external events.",
    inputSchema: progressionsSchema,
    execute: async (args) => {
      console.log(`[Agent Tool] get_progressions to ${args.targetDate}`);
      const client = getClient();
      return await client.charts.getProgressions({
        subject: toSubject(args.birthData),
        target_date: args.targetDate,
        progression_type: "secondary",
        options: CHART_OPTIONS
      });
    }
  });
  const calculateSolarReturnTool = (0, import_ai.tool)({
    description: "Calculates the Solar Return chart \u2014 the year-ahead theme from birthday to birthday. Use for 'what does my year ahead look like?' or annual forecasts.",
    inputSchema: solarReturnSchema,
    execute: async (args) => {
      console.log(`[Agent Tool] get_solar_return for ${args.year}`);
      const client = getClient();
      const currentLocation = resolveIpLocation(userIp);
      const returnLocation = currentLocation ? { year: args.year, month: 1, day: 1, hour: 12, minute: 0, ...currentLocation } : void 0;
      return await client.charts.getSolarReturnChart({
        subject: toSubject(args.birthData),
        return_year: args.year,
        return_location: returnLocation,
        options: CHART_OPTIONS
      });
    }
  });
  const calculateRelocationTool = (0, import_ai.tool)({
    description: "Calculates the relocated natal chart for a target city. Shows how house cusps and angular placements shift \u2014 use for 'Is Paris a good city for me?' or relocation questions. Returns text analysis only (no map).",
    inputSchema: relocationSchema,
    execute: async (args) => {
      console.log(`[Agent Tool] get_relocation to ${args.targetLocation.latitude},${args.targetLocation.longitude}`);
      const client = getClient();
      return await client.charts.generateRelocationChart({
        subject: toSubject(args.birthData),
        options: {
          target_location: {
            latitude: args.targetLocation.latitude,
            longitude: args.targetLocation.longitude
          },
          show_changes: true,
          highlight_angular_changes: true,
          include_aspect_changes: true,
          orb_tolerance: 2
        }
      });
    }
  });
  const calculateCompositeTool = (0, import_ai.tool)({
    description: "Calculates the Composite Chart \u2014 the relationship as its own entity. Use for 'what is the ultimate purpose of this relationship?' or destiny/compatibility questions.",
    inputSchema: compositeSchema,
    execute: async (args) => {
      console.log(`[Agent Tool] get_composite \u2014 partnerId ${args.partnerId}`);
      const [userProfile, partner] = await Promise.all([
        import_prisma.prisma.birthProfile.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
        import_prisma.prisma.partner.findFirst({ where: { id: args.partnerId, userId } })
      ]);
      if (!userProfile) throw new Error("User birth data not found in database.");
      if (!partner) throw new Error(`Partner with ID "${args.partnerId}" not found.`);
      const client = getClient();
      const [userHour, userMin] = (userProfile.birthTime || "12:00").split(":").map(Number);
      const [partHour, partMin] = (partner.birthTime || "12:00").split(":").map(Number);
      const userBirth = new Date(userProfile.birthDate);
      const partBirth = new Date(partner.birthDate);
      return await client.charts.getCompositeChart({
        subject1: toSubject({ year: userBirth.getFullYear(), month: userBirth.getMonth() + 1, day: userBirth.getDate(), hour: userHour, minute: userMin, latitude: userProfile.latitude, longitude: userProfile.longitude, timezone: userProfile.timezone }),
        subject2: toSubject({ year: partBirth.getFullYear(), month: partBirth.getMonth() + 1, day: partBirth.getDate(), hour: partHour, minute: partMin, latitude: partner.latitude, longitude: partner.longitude, timezone: partner.timezone }),
        options: CHART_OPTIONS
      });
    }
  });
  const calculateLunarReturnTool = (0, import_ai.tool)({
    description: "Calculates the Lunar Return chart for a specific month \u2014 the monthly emotional cycle. Use for 'what does this month hold for me?' questions.",
    inputSchema: lunarReturnSchema,
    execute: async (args) => {
      console.log(`[Agent Tool] get_lunar_return for ${args.year}-${String(args.month).padStart(2, "0")}`);
      const client = getClient();
      const currentLocation = resolveIpLocation(userIp);
      const returnLocation = currentLocation ? { year: args.year, month: args.month, day: 1, hour: 12, minute: 0, ...currentLocation } : void 0;
      return await client.charts.getLunarReturnChart({
        subject: toSubject(args.birthData),
        return_date: `${args.year}-${String(args.month).padStart(2, "0")}-01`,
        return_location: returnLocation,
        options: CHART_OPTIONS
      });
    }
  });
  const calculateSolarArcTool = (0, import_ai.tool)({
    description: "Calculates Solar Arc Directions for a target date. Each planet moves ~1\xB0 per year. Use for 'why is this life theme emerging now?' or major life chapter questions. Complements secondary progressions.",
    inputSchema: solarArcSchema,
    execute: async (args) => {
      console.log(`[Agent Tool] get_solar_arc to ${args.targetDate}`);
      const client = getClient();
      return await client.charts.getDirections({
        subject: toSubject(args.birthData),
        target_date: args.targetDate,
        direction_type: "solar_arc",
        options: CHART_OPTIONS
      });
    }
  });
  return {
    get_natal_chart: calculateNatalChartTool,
    get_transits: analyzeTransitsTool,
    get_synastry: calculateSynastryTool,
    get_progressions: calculateProgressionsTool,
    get_solar_return: calculateSolarReturnTool,
    get_relocation: calculateRelocationTool,
    get_composite: calculateCompositeTool,
    get_lunar_return: calculateLunarReturnTool,
    get_solar_arc: calculateSolarArcTool
  };
}
const astrologyTools = createAstrologyTools({ userId: "" });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  astrologyTools,
  createAstrologyTools
});
