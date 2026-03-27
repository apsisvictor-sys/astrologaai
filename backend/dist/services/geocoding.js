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
var geocoding_exports = {};
__export(geocoding_exports, {
  getTimezoneFromCoordinates: () => getTimezoneFromCoordinates,
  searchLocations: () => searchLocations,
  validateCoordinates: () => validateCoordinates
});
module.exports = __toCommonJS(geocoding_exports);
var import_geo_tz = require("geo-tz");
var import_redis = require("../utils/redis");
const CACHE_TTL_SEARCH = 86400;
const CACHE_TTL_TIMEZONE = 2592e3;
const PHOTON_BASE = "https://photon.komoot.io";
async function redisGet(key) {
  return Promise.race([
    import_redis.redisClient.get(key),
    new Promise((resolve) => setTimeout(() => resolve(null), 500))
  ]);
}
function redisSet(key, ttl, value) {
  Promise.race([
    import_redis.redisClient.setEx(key, ttl, value),
    new Promise((resolve) => setTimeout(resolve, 500))
  ]).catch(() => {
  });
}
async function getTimezoneFromCoordinates(lat, lon) {
  const cacheKey = `geocoding:tz:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = await redisGet(cacheKey);
  if (cached) return cached;
  try {
    const zones = (0, import_geo_tz.find)(lat, lon);
    const tz = zones[0] ?? "UTC";
    redisSet(cacheKey, CACHE_TTL_TIMEZONE, tz);
    return tz;
  } catch (err) {
    console.error("[Geocoding] geo-tz lookup error:", err);
    return "UTC";
  }
}
function extractCityFromPhoton(props) {
  return props.city ?? props.town ?? props.village ?? props.county ?? props.state ?? props.name ?? "";
}
function buildDisplayName(props) {
  const parts = [];
  if (props.name) parts.push(props.name);
  if (props.state && props.state !== props.name) parts.push(props.state);
  if (props.country) parts.push(props.country);
  return parts.join(", ");
}
async function searchLocations(query, limit = 5) {
  if (!query || query.length < 2) return [];
  const cap = Math.min(limit, 5);
  const cacheKey = `geocoding:search:${query.toLowerCase().trim()}`;
  const cached = await redisGet(cacheKey);
  if (cached) {
    console.log(`[Geocoding] Cache hit: "${query}"`);
    return JSON.parse(cached);
  }
  console.log(`[Geocoding] Photon search: "${query}"`);
  const params = new URLSearchParams({
    q: query,
    limit: String(cap),
    lang: "en"
  });
  let data = { features: [] };
  try {
    const res = await fetch(`${PHOTON_BASE}/api/?${params}`, {
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) {
      console.error("[Geocoding] Photon HTTP error:", res.status);
      return [];
    }
    data = await res.json();
  } catch (err) {
    console.error("[Geocoding] Photon fetch error:", err);
    return [];
  }
  if (!data.features?.length) return [];
  const results = await Promise.all(
    data.features.map(async (feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const props = feature.properties;
      const city = extractCityFromPhoton(props);
      const country = props.country ?? "";
      const timezone = await getTimezoneFromCoordinates(lat, lon);
      return {
        name: props.name || city,
        displayName: buildDisplayName(props),
        latitude: lat,
        longitude: lon,
        country,
        city,
        timezone
      };
    })
  );
  redisSet(cacheKey, CACHE_TTL_SEARCH, JSON.stringify(results));
  return results;
}
function validateCoordinates(lat, lon) {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getTimezoneFromCoordinates,
  searchLocations,
  validateCoordinates
});
