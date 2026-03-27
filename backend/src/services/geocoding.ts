/**
 * Geocoding Service
 * Location search: Photon by Komoot (OSM data, cloud-friendly, no API key)
 * Timezone lookup: geo-tz (local database, no API call)
 *
 * Cache strategy:
 *   - Search results cached 24h per query
 *   - Timezone cached 30 days per ~1km grid cell
 *
 * Photon usage:
 *   - https://photon.komoot.io — free, OSM-backed, works from cloud IPs
 *   - No rate limit enforcement (unlike Nominatim which blocks cloud infra)
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

const PHOTON_BASE = 'https://photon.komoot.io';

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
// Photon (Komoot) search
// ---------------------------------------------------------------------------

interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lon, lat]
    type: 'Point';
  };
  properties: {
    name?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    osm_key?: string;
    osm_value?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

function extractCityFromPhoton(props: PhotonFeature['properties']): string {
  return (
    props.city ??
    props.town ??
    props.village ??
    props.county ??
    props.state ??
    props.name ??
    ''
  );
}

function buildDisplayName(props: PhotonFeature['properties']): string {
  const parts: string[] = [];
  if (props.name) parts.push(props.name);
  if (props.state && props.state !== props.name) parts.push(props.state);
  if (props.country) parts.push(props.country);
  return parts.join(', ');
}

/**
 * Search for city locations using Photon (Komoot OSM geocoder).
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

  console.log(`[Geocoding] Photon search: "${query}"`);

  const params = new URLSearchParams({
    q: query,
    limit: String(cap),
    lang: 'en',
  });

  let data: PhotonResponse = { features: [] };
  try {
    const res = await fetch(`${PHOTON_BASE}/api/?${params}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      console.error('[Geocoding] Photon HTTP error:', res.status);
      return [];
    }
    data = await res.json();
  } catch (err) {
    console.error('[Geocoding] Photon fetch error:', err);
    return [];
  }

  if (!data.features?.length) return [];

  const results: GeocodingResult[] = await Promise.all(
    data.features.map(async (feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const props = feature.properties;
      const city = extractCityFromPhoton(props);
      const country = props.country ?? '';
      const timezone = await getTimezoneFromCoordinates(lat, lon);
      return {
        name: props.name || city,
        displayName: buildDisplayName(props),
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
