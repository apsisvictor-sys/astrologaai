export interface CompositeBirthInput {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    latitude: number;
    longitude: number;
    timezone?: string;
}
export declare function calculateCompositeChart(userBirth: CompositeBirthInput, partnerBirth: CompositeBirthInput): Promise<any>;
