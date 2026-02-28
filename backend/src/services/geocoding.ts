/**
 * Geocoding Service
 * Location search and geocoding using OpenStreetMap Nominatim
 * With Redis caching for 24 hours
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
    // Check cache first
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
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
      'accept-language': 'bg,en',
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
      
      return {
        name: city || result.display_name.split(',')[0],
        displayName: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        country: result.address?.country || '',
        city,
      };
    });
    
    // Cache results
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(transformed));
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
    // Check cache first
    if (isRedisAvailable()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    const url = `${NOMINATIM_URL}/reverse?` + new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
      addressdetails: '1',
      'accept-language': 'bg,en',
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
    
    // Cache result
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(transformed));
    }
    
    return transformed;
  } catch (error) {
    console.error('[Geocoding] Reverse geocode error:', error);
    return null;
  }
}

/**
 * Get timezone for coordinates
 * Uses a simple approximation based on longitude
 * For production, use a proper timezone API like GeoNames or tzf
 */
export function getTimezoneFromCoordinates(lat: number, lon: number): string {
  // Simple timezone approximation based on longitude
  // For Bulgaria (lon ~23-28), this returns Europe/Sofia
  // For production, use a proper timezone lookup service
  
  // Special case for Bulgaria
  if (lat >= 41 && lat <= 44 && lon >= 22 && lon <= 29) {
    return 'Europe/Sofia';
  }
  
  // General approximation (each 15° = 1 hour)
  const offset = Math.round(lon / 15);
  const sign = offset >= 0 ? '+' : '';
  
  // Map to timezone string
  const timezoneMap: Record<string, string> = {
    '+0': 'Europe/London',
    '+1': 'Europe/Paris',
    '+2': 'Europe/Sofia',
    '+3': 'Europe/Moscow',
    '-5': 'America/New_York',
    '-8': 'America/Los_Angeles',
  };
  
  return timezoneMap[`${sign}${offset}`] || 'UTC';
}

/**
 * Validate that coordinates are within valid ranges
 */
export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export type { GeocodingResult };
