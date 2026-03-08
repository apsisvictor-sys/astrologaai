/**
 * Geocoding Service
 * Location search and geocoding using OpenStreetMap Nominatim
 * With Redis caching for 24 hours
 */
interface GeocodingResult {
    name: string;
    displayName: string;
    latitude: number;
    longitude: number;
    timezone?: string;
    country: string;
    city: string;
}
/**
 * Search for locations by query string
 * Results are cached in Redis for 24 hours
 */
export declare function searchLocations(query: string, limit?: number): Promise<GeocodingResult[]>;
/**
 * Reverse geocode coordinates to get location info
 */
export declare function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null>;
/**
 * Get timezone for coordinates
 * Uses a simple approximation based on longitude
 * For production, use a proper timezone API like GeoNames or tzf
 */
export declare function getTimezoneFromCoordinates(lat: number, lon: number): string;
/**
 * Validate that coordinates are within valid ranges
 */
export declare function validateCoordinates(lat: number, lon: number): boolean;
export type { GeocodingResult };
//# sourceMappingURL=geocoding.d.ts.map