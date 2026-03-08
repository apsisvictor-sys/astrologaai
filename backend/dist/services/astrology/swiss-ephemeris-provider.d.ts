/**
 * Swiss Ephemeris Fallback Provider
 * US-33: Astrology API Fallback Strategy
 *
 * Secondary provider using local calculations based on
 * simplified astronomical algorithms.
 *
 * This provides a robust fallback when the primary API is unavailable.
 * Uses Jean Meeus astronomical algorithms for approximate positions.
 */
import { BaseAstrologyProvider, AstrologyProviderType, type BirthDataInput, type NatalChart, type TransitData, type SynastryData, type ProgressionData, type SolarReturnData, type RelocationData, type CompositeData, type VenusReturnData, type LunarReturnData, type SolarArcData, type AstrologyCalculationOptions } from './astrology-provider.interface';
export declare class SwissEphemerisProvider extends BaseAstrologyProvider {
    readonly name = "swiss-ephemeris-fallback";
    readonly type = AstrologyProviderType.SECONDARY;
    readonly endpoint = "local";
    isAvailable(): boolean;
    calculateNatalChart(birthData: BirthDataInput, options?: AstrologyCalculationOptions): Promise<NatalChart>;
    getTransits(date: string, options?: {
        latitude?: number;
        longitude?: number;
    }): Promise<TransitData>;
    calculateSynastry(birthData1: BirthDataInput, birthData2: BirthDataInput): Promise<SynastryData>;
    getProgressions(birthData: BirthDataInput, targetDate: string, options?: AstrologyCalculationOptions): Promise<ProgressionData>;
    getSolarReturn(birthData: BirthDataInput, returnYear: number, options?: AstrologyCalculationOptions): Promise<SolarReturnData>;
    getRelocation(birthData: BirthDataInput, targetLocation: {
        latitude: number;
        longitude: number;
    }, options?: AstrologyCalculationOptions): Promise<RelocationData>;
    getCompositeChart(person1: BirthDataInput, person2: BirthDataInput, options?: AstrologyCalculationOptions): Promise<CompositeData>;
    getVenusReturn(birthData: BirthDataInput, returnYear: number, options?: AstrologyCalculationOptions): Promise<VenusReturnData>;
    getLunarReturn(birthData: BirthDataInput, year: number, month: number, options?: AstrologyCalculationOptions): Promise<LunarReturnData>;
    getSolarArcDirections(birthData: BirthDataInput, targetDate: string, options?: AstrologyCalculationOptions): Promise<SolarArcData>;
}
export declare function createSwissEphemerisProvider(): SwissEphemerisProvider;
export default SwissEphemerisProvider;
//# sourceMappingURL=swiss-ephemeris-provider.d.ts.map