"use strict";
/**
 * Geocoding Service
 * Location search and geocoding using OpenStreetMap Nominatim
 * With Redis caching for 24 hours
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchLocations = searchLocations;
exports.reverseGeocode = reverseGeocode;
exports.getTimezoneFromCoordinates = getTimezoneFromCoordinates;
exports.validateCoordinates = validateCoordinates;
const geo_tz_1 = require("geo-tz");
const redis_1 = require("../utils/redis");
const CACHE_TTL = 86400; // 24 hours in seconds
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const RATE_LIMIT_DELAY = 1000; // 1 second between requests (Nominatim requirement)
let lastRequestTime = 0;
/**
 * Check if Redis client is available and connected
 */
function isRedisAvailable() {
    return redis_1.redisClient && redis_1.redisClient.isOpen;
}
/**
 * Rate-limited fetch for Nominatim API
 */
async function rateLimitedFetch(url) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'AstroLogAI/1.0 (https://astrologaai.com)',
            'Accept': 'application/json',
        },
    });
    return response;
}
/**
 * Search for locations by query string
 * Results are cached in Redis for 24 hours
 */
async function searchLocations(query, limit = 10) {
    if (!query || query.length < 2) {
        return [];
    }
    const cacheKey = `geocoding:search:${query.toLowerCase()}:${limit}`;
    try {
        // Check cache first (with timeout to prevent hanging if Redis is in bad state)
        if (isRedisAvailable()) {
            const cached = await Promise.race([
                redis_1.redisClient.get(cacheKey),
                new Promise(resolve => setTimeout(() => resolve(null), 500)),
            ]);
            if (cached) {
                console.log(`[Geocoding] Cache hit for: ${query}`);
                return JSON.parse(cached);
            }
        }
        console.log(`[Geocoding] Searching for: ${query}`);
        // Search using Nominatim
        const url = `${NOMINATIM_URL}/search?` + new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: '1',
            limit: String(limit),
            'accept-language': 'en,bg',
        });
        const response = await rateLimitedFetch(url);
        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }
        const results = await response.json();
        // Transform results
        const transformed = results.map(result => {
            const city = result.address?.city ||
                result.address?.town ||
                result.address?.village ||
                result.address?.municipality ||
                '';
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            const timezone = geo_tz_1.find(lat, lon)[0] || 'UTC';
            return {
                name: city || result.display_name.split(',')[0],
                displayName: result.display_name,
                latitude: lat,
                longitude: lon,
                country: result.address?.country || '',
                city,
                timezone,
            };
        });
        // Cache results (fire-and-forget with timeout)
        if (isRedisAvailable()) {
            Promise.race([
                redis_1.redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(transformed)),
                new Promise(resolve => setTimeout(resolve, 500)),
            ]).catch(() => {});
        }
        return transformed;
    }
    catch (error) {
        console.error('[Geocoding] Search error:', error);
        return [];
    }
}
/**
 * Reverse geocode coordinates to get location info
 */
async function reverseGeocode(lat, lon) {
    const cacheKey = `geocoding:reverse:${lat.toFixed(4)}:${lon.toFixed(4)}`;
    try {
        // Check cache first (with timeout)
        if (isRedisAvailable()) {
            const cached = await Promise.race([
                redis_1.redisClient.get(cacheKey),
                new Promise(resolve => setTimeout(() => resolve(null), 500)),
            ]);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        const url = `${NOMINATIM_URL}/reverse?` + new URLSearchParams({
            lat: String(lat),
            lon: String(lon),
            format: 'json',
            addressdetails: '1',
            'accept-language': 'en,bg',
        });
        const response = await rateLimitedFetch(url);
        if (!response.ok) {
            throw new Error(`Nominatim reverse geocode error: ${response.status}`);
        }
        const result = await response.json();
        if (!result || result.error) {
            return null;
        }
        const city = result.address?.city ||
            result.address?.town ||
            result.address?.village ||
            result.address?.municipality ||
            '';
        const transformed = {
            name: city || result.display_name.split(',')[0],
            displayName: result.display_name,
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            country: result.address?.country || '',
            city,
        };
        // Cache result (fire-and-forget with timeout)
        if (isRedisAvailable()) {
            Promise.race([
                redis_1.redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(transformed)),
                new Promise(resolve => setTimeout(resolve, 500)),
            ]).catch(() => {});
        }
        return transformed;
    }
    catch (error) {
        console.error('[Geocoding] Reverse geocode error:', error);
        return null;
    }
}
/**
 * Get IANA timezone for coordinates using geo-tz
 */
function getTimezoneFromCoordinates(lat, lon) {
    return geo_tz_1.find(lat, lon)[0] || 'UTC';
}
/**
 * Validate that coordinates are within valid ranges
 */
function validateCoordinates(lat, lon) {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
//# sourceMappingURL=geocoding.js.map