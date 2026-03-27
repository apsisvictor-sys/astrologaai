/**
 * Geocoding Service
 * Location search: OpenStreetMap Nominatim (free, no API key)
 * Timezone lookup: geo-tz (local database, no API call)
 *
 * Cache strategy:
 *   - Search results cached 24h per query
 *   - Timezone cached 30 days per ~1km grid cell
 *
 * Nominatim usage rules:
 *   - Max 1 req/sec — enforced via lastRequestAt gate
 *   - User-Agent: AstroLogAI/1.0 (contact@pixelautomate.com)
 */

import { find as geoTzFind } from 'geo-tz';
import { redisClient } from '../utils/redis';

export interface GeocodingResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country: string;
  city: string;
}

const CACHE_TTL_SEARCH   = 86400;    // 24 hours  — search results
const CACHE_TTL_TIMEZONE = 2592000;  // 30 days   — timezone (never changes)

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const NOMINATIM_UA   = 'AstroLogAI/1.0 (contact@pixelautomate.com)';

// ---------------------------------------------------------------------------
// Rate limiter — Nominatim allows max 1 req/sec
// ---------------------------------------------------------------------------

let lastRequestAt = 0;

async function nominatimFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = 1000 - (now - lastRequestAt);
  if (wait > 0) {
    await new Promise(resolve => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
  return fetch(url, {
    headers: { 'User-Agent': NOMINATIM_UA, 'Accept-Language': 'en' },
  });
}

// ---------------------------------------------------------------------------
// Redis helpers
// ---------------------------------------------------------------------------

async function redisGet(key: string): Promise<string | null> {
  return Promise.race([
    redisClient.get(key),
    new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
  ]);
}

function redisSet(key: string, ttl: number, value: string): void {
  Promise.race([
    redisClient.setEx(key, ttl, value),
    new Promise<void>(resolve => setTimeout(resolve, 500)),
  ]).catch(() => {});
}

// ---------------------------------------------------------------------------
// Timezone — geo-tz (local lookup, no API)
// ---------------------------------------------------------------------------

/**
 * Get IANA timezone for coordinates using the geo-tz local database.
 * Cached 30 days — timezones essentially never change.
 */
export async function getTimezoneFromCoordinates(lat: number, lon: number): Promise<string> {
  const cacheKey = `geocoding:tz:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = await redisGet(cacheKey);
  if (cached) return cached;

  try {
    const zones = geoTzFind(lat, lon);
    const tz = zones[0] ?? 'UTC';
    redisSet(cacheKey, CACHE_TTL_TIMEZONE, tz);
    return tz;
  } catch (err) {
    console.error('[Geocoding] geo-tz lookup error:', err);
    return 'UTC';
  }
}

// ---------------------------------------------------------------------------
// Nominatim search
// ---------------------------------------------------------------------------

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

function extractCity(address: NominatimResult['address']): string {
  return (
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    address.state ??
    ''
  );
}

/**
 * Search for city locations using OpenStreetMap Nominatim.
 * Results cached 24h per query.
 * Max 5 results regardless of limit param.
 */
export async function searchLocations(query: string, limit: number = 5): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) return [];

  const cap = Math.min(limit, 5);
  const cacheKey = `geocoding:search:${query.toLowerCase().trim()}`;

  const cached = await redisGet(cacheKey);
  if (cached) {
    console.log(`[Geocoding] Cache hit: "${query}"`);
    return JSON.parse(cached);
  }

  console.log(`[Geocoding] Nominatim search: "${query}"`);

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: String(cap),
    addressdetails: '1',
    featuretype: 'city',
    'accept-language': 'en',
  });

  let hits: NominatimResult[] = [];
  try {
    const res = await nominatimFetch(`${NOMINATIM_BASE}/search?${params}`);
    if (!res.ok) {
      console.error('[Geocoding] Nominatim HTTP error:', res.status);
      return [];
    }
    hits = await res.json();
  } catch (err) {
    console.error('[Geocoding] Nominatim fetch error:', err);
    return [];
  }

  if (!hits.length) return [];

  const results: GeocodingResult[] = await Promise.all(
    hits.map(async (hit) => {
      const lat = parseFloat(hit.lat);
      const lon = parseFloat(hit.lon);
      const city = extractCity(hit.address);
      const country = hit.address.country ?? '';
      const timezone = await getTimezoneFromCoordinates(lat, lon);
      return {
        name: city || hit.display_name.split(',')[0],
        displayName: hit.display_name,
        latitude: lat,
        longitude: lon,
        country,
        city,
        timezone,
      };
    })
  );

  redisSet(cacheKey, CACHE_TTL_SEARCH, JSON.stringify(results));
  return results;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
