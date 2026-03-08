/**
 * Astrology-API.io Provider
 * US-33: Astrology API Fallback Strategy
 *
 * Primary provider using astrology-api.io
 * Swiss Ephemeris precision with built-in geocoding
 */
import { BaseAstrologyProvider, AstrologyProviderType, type BirthDataInput, type NatalChart, type TransitData, type SynastryData, type AstrologyCalculationOptions, type ProgressionData, type SolarReturnData, type RelocationData, type CompositeData, type VenusReturnData, type LunarReturnData, type SolarArcData } from './astrology-provider.interface';
export declare class AstrologyAPIProvider extends BaseAstrologyProvider {
    readonly name = "astrology-api.io";
    readonly type = AstrologyProviderType.PRIMARY;
    readonly endpoint: string;
    isAvailable(): boolean;
    /**
     * Make API request with error handling
     */
    private makeRequest;
    calculateNatalChart(birthData: BirthDataInput, options?: AstrologyCalculationOptions): Promise<NatalChart>;
    getTransits(date: string, options?: {
        latitude?: number;
        longitude?: number;
    }): Promise<TransitData>;
    /**
     * Calculate relationship synastry between two people
     * US-24: Relationship Dynamics Engine
     */
    calculateSynastry(person1: BirthDataInput, person2: BirthDataInput): Promise<SynastryData>;
    getProgressions(birthData: BirthDataInput, targetDate: string, options?: AstrologyCalculationOptions): Promise<ProgressionData>;
    getSolarReturn(birthData: BirthDataInput, year: number, options?: AstrologyCalculationOptions): Promise<SolarReturnData>;
    getRelocation(birthData: BirthDataInput, targetLocation: {
        latitude: number;
        longitude: number;
    }, options?: AstrologyCalculationOptions): Promise<RelocationData>;
    getCompositeChart(person1: BirthDataInput, person2: BirthDataInput, options?: AstrologyCalculationOptions): Promise<CompositeData>;
    getVenusReturn(birthData: BirthDataInput, year: number, options?: AstrologyCalculationOptions): Promise<VenusReturnData>;
    getLunarReturn(birthData: BirthDataInput, year: number, month: number, options?: AstrologyCalculationOptions): Promise<LunarReturnData>;
    getSolarArcDirections(birthData: BirthDataInput, targetDate: string, options?: AstrologyCalculationOptions): Promise<SolarArcData>;
    private transformPlanetsArray;
}
export declare function createAstrologyAPIProvider(): AstrologyAPIProvider;
export default AstrologyAPIProvider;
//# sourceMappingURL=astrology-api-provider.d.ts.map