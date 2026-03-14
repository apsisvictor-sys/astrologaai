/**
 * Geocoding Service
 * Location search and geocoding using OpenStreetMap Nominatim
 * With Redis caching for 24 hours
 */

import { find as findTimezone } from 'geo-tz';
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

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  error?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

const CACHE_TTL = 86400; // 24 hours in seconds
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const RATE_LIMIT_DELAY = 1000; // 1 second between requests (Nominatim requirement)

let lastRequestTime = 0;

/**
 * Check if Redis client is available and connected
 */
function isRedisAvailable(): boolean {
  return redisClient && redisClient.isOpen;
}

/**
 * Rate-limited fetch for Nominatim API
 */
async function rateLimitedFetch(url: string): Promise<Response> {
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
export async function searchLocations(query: string, limit: number = 10): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) {
    return [];
  }
  
  const cacheKey = `geocoding:search:${query.toLowerCase()}:${limit}`;
  
  try {
    // Check cache first (with timeout to prevent hanging if Redis is in bad state)
    if (isRedisAvailable()) {
      const cached = await Promise.race([
        redisClient.get(cacheKey),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
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
    
    const results: NominatimResult[] = await response.json();
    
    // Transform results
    const transformed: GeocodingResult[] = results.map(result => {
      const city = result.address?.city ||
                   result.address?.town ||
                   result.address?.village ||
                   result.address?.municipality ||
                   '';
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      const timezone = findTimezone(lat, lon)[0] || 'UTC';

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
    
    // Cache results (fire-and-forget with timeout — don't block response)
    if (isRedisAvailable()) {
      Promise.race([
        redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(transformed)),
        new Promise<void>(resolve => setTimeout(resolve, 500)),
      ]).catch(() => {});
    }

    return transformed;
  } catch (error) {
    console.error('[Geocoding] Search error:', error);
    return [];
  }
}

/**
 * Reverse geocode coordinates to get location info
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
  const cacheKey = `geocoding:reverse:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  
  try {
    // Check cache first (with timeout)
    if (isRedisAvailable()) {
      const cached = await Promise.race([
        redisClient.get(cacheKey),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
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
    
    const result: NominatimResult = await response.json();
    
    if (!result || result.error) {
      return null;
    }
    
    const city = result.address?.city || 
                 result.address?.town || 
                 result.address?.village || 
                 result.address?.municipality || 
                 '';
    
    const transformed: GeocodingResult = {
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
        redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(transformed)),
        new Promise<void>(resolve => setTimeout(resolve, 500)),
      ]).catch(() => {});
    }

    return transformed;
  } catch (error) {
    console.error('[Geocoding] Reverse geocode error:', error);
    return null;
  }
}

/**
 * Get IANA timezone for coordinates using geo-tz
 */
export function getTimezoneFromCoordinates(lat: number, lon: number): string {
  return findTimezone(lat, lon)[0] || 'UTC';
}

/**
 * Validate that coordinates are within valid ranges
 */
export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export type { GeocodingResult };
