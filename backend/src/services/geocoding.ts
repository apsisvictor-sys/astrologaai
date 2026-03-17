/**
 * Geocoding Service
 * Location search: Google Places Autocomplete + Geocoding API
 * Timezone lookup: Google Time Zone API
 *
 * Cost strategy — stay within free tier:
 *   - Autocomplete results cached 24h per query
 *   - Place details cached 7 days per place_id
 *   - Timezone cached 30 days per location (~1km grid)
 *   - Max 5 results per search (not 10) to halve API calls
 *   - All lookups no-op if GOOGLE_MAPS_API_KEY is missing
 */

import { redisClient } from '../utils/redis';

interface GeocodingResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country: string;
  city: string;
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const CACHE_TTL_SEARCH   = 86400;     // 24 hours  — autocomplete results
const CACHE_TTL_PLACE    = 604800;    // 7 days    — place details by place_id
const CACHE_TTL_TIMEZONE = 2592000;   // 30 days   — timezone (never changes)

// ---------------------------------------------------------------------------
// Redis helpers
// ---------------------------------------------------------------------------

function isRedisAvailable(): boolean {
  return !!(redisClient && redisClient.isOpen);
}

async function redisGet(key: string): Promise<string | null> {
  if (!isRedisAvailable()) return null;
  return Promise.race([
    redisClient.get(key),
    new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
  ]);
}

function redisSet(key: string, ttl: number, value: string): void {
  if (!isRedisAvailable()) return;
  Promise.race([
    redisClient.setEx(key, ttl, value),
    new Promise<void>(resolve => setTimeout(resolve, 500)),
  ]).catch(() => {});
}

// ---------------------------------------------------------------------------
// Google Time Zone API
// ---------------------------------------------------------------------------

/**
 * Get IANA timezone for coordinates using Google Time Zone API.
 * Cached 30 days — timezones essentially never change.
 */
export async function getTimezoneFromCoordinates(lat: number, lon: number): Promise<string> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[Geocoding] GOOGLE_MAPS_API_KEY not set — defaulting to UTC');
    return 'UTC';
  }

  // Round to 2 decimal places (~1 km) to maximise cache hits
  const cacheKey = `geocoding:tz:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = await redisGet(cacheKey);
  if (cached) return cached;

  const timestamp = Math.floor(Date.now() / 1000);
  const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${timestamp}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.timeZoneId) {
      redisSet(cacheKey, CACHE_TTL_TIMEZONE, data.timeZoneId);
      return data.timeZoneId;
    }
    console.error('[Geocoding] Time Zone API error:', data.status, data.errorMessage);
    return 'UTC';
  } catch (err) {
    console.error('[Geocoding] Time Zone fetch error:', err);
    return 'UTC';
  }
}

// ---------------------------------------------------------------------------
// Google Geocoding API (place_id → lat/lon + address)
// ---------------------------------------------------------------------------

interface PlaceDetails {
  lat: number;
  lon: number;
  city: string;
  country: string;
  displayName: string;
}

async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const cacheKey = `geocoding:place:${placeId}`;
  const cached = await redisGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    const result = data.results[0];
    const loc = result.geometry?.location;
    if (!loc) return null;

    let city = '';
    let country = '';
    for (const component of (result.address_components || [])) {
      if (component.types.includes('locality')) city = component.long_name;
      if (component.types.includes('administrative_area_level_1') && !city) city = component.long_name;
      if (component.types.includes('country')) country = component.long_name;
    }

    const details: PlaceDetails = {
      lat: loc.lat,
      lon: loc.lng,
      city,
      country,
      displayName: result.formatted_address,
    };
    redisSet(cacheKey, CACHE_TTL_PLACE, JSON.stringify(details));
    return details;
  } catch (err) {
    console.error('[Geocoding] Place details fetch error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Google Places Autocomplete
// ---------------------------------------------------------------------------

/**
 * Search for city locations.
 * Uses Google Places Autocomplete (types=cities) + Geocoding for coordinates.
 * Entire result set cached 24h per query — repeated searches cost nothing.
 * Max 5 results regardless of limit param.
 */
export async function searchLocations(query: string, limit: number = 5): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) return [];

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[Geocoding] GOOGLE_MAPS_API_KEY not set — location search unavailable');
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

  // Step 1: Places Autocomplete — city suggestions only
  const params = new URLSearchParams({
    input: query,
    types: '(cities)',
    language: 'en',
    key: GOOGLE_MAPS_API_KEY,
  });

  let predictions: Array<{ place_id: string; description: string }> = [];
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
    const data = await res.json();
    if (data.status === 'OK') {
      predictions = (data.predictions || []).slice(0, cap);
    } else {
      console.error('[Geocoding] Autocomplete error:', data.status, data.error_message);
      return [];
    }
  } catch (err) {
    console.error('[Geocoding] Autocomplete fetch error:', err);
    return [];
  }

  // Step 2: Resolve lat/lon + timezone for each prediction
  // Each place_id and each timezone result is individually cached,
  // so popular cities hit Redis after the very first search.
  const results: GeocodingResult[] = [];
  for (const prediction of predictions) {
    const details = await getPlaceDetails(prediction.place_id);
    if (!details) continue;

    const timezone = await getTimezoneFromCoordinates(details.lat, details.lon);

    results.push({
      name: details.city || prediction.description.split(',')[0],
      displayName: prediction.description,
      latitude: details.lat,
      longitude: details.lon,
      country: details.country,
      city: details.city,
      timezone,
    });
  }

  // Cache the assembled search result for 24h
  redisSet(cacheKey, CACHE_TTL_SEARCH, JSON.stringify(results));

  return results;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export type { GeocodingResult };
