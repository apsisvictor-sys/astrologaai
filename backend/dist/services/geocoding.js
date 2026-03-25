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
var import_redis = require("../utils/redis");
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const CACHE_TTL_SEARCH = 86400;
const CACHE_TTL_PLACE = 604800;
const CACHE_TTL_TIMEZONE = 2592e3;
function isRedisAvailable() {
  return !!(import_redis.redisClient && import_redis.redisClient.isOpen);
}
async function redisGet(key) {
  if (!isRedisAvailable()) return null;
  return Promise.race([
    import_redis.redisClient.get(key),
    new Promise((resolve) => setTimeout(() => resolve(null), 500))
  ]);
}
function redisSet(key, ttl, value) {
  if (!isRedisAvailable()) return;
  Promise.race([
    import_redis.redisClient.setEx(key, ttl, value),
    new Promise((resolve) => setTimeout(resolve, 500))
  ]).catch(() => {
  });
}
async function getTimezoneFromCoordinates(lat, lon) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("[Geocoding] GOOGLE_MAPS_API_KEY not set \u2014 defaulting to UTC");
    return "UTC";
  }
  const cacheKey = `geocoding:tz:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = await redisGet(cacheKey);
  if (cached) return cached;
  const timestamp = Math.floor(Date.now() / 1e3);
  const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${timestamp}&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.timeZoneId) {
      redisSet(cacheKey, CACHE_TTL_TIMEZONE, data.timeZoneId);
      return data.timeZoneId;
    }
    console.error("[Geocoding] Time Zone API error:", data.status, data.errorMessage);
    return "UTC";
  } catch (err) {
    console.error("[Geocoding] Time Zone fetch error:", err);
    return "UTC";
  }
}
async function getPlaceDetails(placeId) {
  const cacheKey = `geocoding:place:${placeId}`;
  const cached = await redisGet(cacheKey);
  if (cached) return JSON.parse(cached);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) return null;
    const result = data.results[0];
    const loc = result.geometry?.location;
    if (!loc) return null;
    let city = "";
    let country = "";
    for (const component of result.address_components || []) {
      if (component.types.includes("locality")) city = component.long_name;
      if (component.types.includes("administrative_area_level_1") && !city) city = component.long_name;
      if (component.types.includes("country")) country = component.long_name;
    }
    const details = {
      lat: loc.lat,
      lon: loc.lng,
      city,
      country,
      displayName: result.formatted_address
    };
    redisSet(cacheKey, CACHE_TTL_PLACE, JSON.stringify(details));
    return details;
  } catch (err) {
    console.error("[Geocoding] Place details fetch error:", err);
    return null;
  }
}
async function searchLocations(query, limit = 5) {
  if (!query || query.length < 2) return [];
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("[Geocoding] GOOGLE_MAPS_API_KEY not set \u2014 location search unavailable");
    return [];
  }
  const cap = Math.min(limit, 5);
  const cacheKey = `geocoding:search:${query.toLowerCase().trim()}`;
  const cached = await redisGet(cacheKey);
  if (cached) {
    console.log(`[Geocoding] Cache hit: "${query}"`);
    return JSON.parse(cached);
  }
  console.log(`[Geocoding] Autocomplete: "${query}"`);
  const params = new URLSearchParams({
    input: query,
    types: "geocode",
    language: "en",
    key: GOOGLE_MAPS_API_KEY
  });
  let predictions = [];
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
    const data = await res.json();
    if (data.status === "OK") {
      predictions = (data.predictions || []).slice(0, cap);
    } else {
      console.error("[Geocoding] Autocomplete error:", data.status, data.error_message);
      return [];
    }
  } catch (err) {
    console.error("[Geocoding] Autocomplete fetch error:", err);
    return [];
  }
  const settled = await Promise.all(
    predictions.map(async (prediction) => {
      const details = await getPlaceDetails(prediction.place_id);
      if (!details) return null;
      const timezone = await getTimezoneFromCoordinates(details.lat, details.lon);
      return {
        name: details.city || prediction.description.split(",")[0],
        displayName: prediction.description,
        latitude: details.lat,
        longitude: details.lon,
        country: details.country,
        city: details.city,
        timezone
      };
    })
  );
  const results = settled.filter((r) => r !== null);
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
