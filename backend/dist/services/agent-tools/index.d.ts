export interface ToolContext {
    userId: string;
    userIp?: string;
}
export declare function createAstrologyTools(context: ToolContext): {
    get_natal_chart: import("ai").Tool<{
        [x: string]: unknown;
    } | undefined, Promise<{
        sun: any;
        moon: any;
        rising: any;
        mercury: any;
        venus: any;
        mars: any;
        jupiter: any;
        saturn: any;
        chiron: any;
        northNode: any;
        houses: any;
        aspects: any;
    }>>;
    get_transits: import("ai").Tool<{
        [x: string]: unknown;
    } | undefined, Promise<{
        skyPositions: import("../transits").TransitPosition[];
        aspectsToNatal: import("../transits").TransitAspect[];
    }>>;
    get_synastry: import("ai").Tool<{
        [x: string]: any;
    }, Promise<{
        subject_data: {
            subject1: unknown;
            subject2: unknown;
        };
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
    }>>;
    get_progressions: import("ai").Tool<{
        birthData: {
            year: number;
            day: number;
            hour: number;
            minute: number;
            month: number;
            latitude: number;
            longitude: number;
            timezone?: string | undefined;
        };
        targetDate: string;
    }, Promise<{
        subject_data: unknown;
        progressed_data: unknown;
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
        progression_type: string;
        target_date: string;
    }>>;
    get_solar_return: import("ai").Tool<{
        birthData: {
            year: number;
            day: number;
            hour: number;
            minute: number;
            month: number;
            latitude: number;
            longitude: number;
            timezone?: string | undefined;
        };
        year: number;
    }, Promise<{
        subject_data: unknown;
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
    }>>;
    get_relocation: import("ai").Tool<{
        birthData: {
            year: number;
            day: number;
            hour: number;
            minute: number;
            month: number;
            latitude: number;
            longitude: number;
            timezone?: string | undefined;
        };
        targetLocation: {
            latitude: number;
            longitude: number;
        };
    }, Promise<any>>;
    get_composite: import("ai").Tool<{
        partnerId: string;
    }, Promise<{
        subject_data: {
            subject1: unknown;
            subject2: unknown;
            composite_subject: unknown;
        };
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
    }>>;
    get_lunar_return: import("ai").Tool<{
        birthData: {
            year: number;
            day: number;
            hour: number;
            minute: number;
            month: number;
            latitude: number;
            longitude: number;
            timezone?: string | undefined;
        };
        year: number;
        month: number;
    }, Promise<{
        subject_data: unknown;
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
    }>>;
    get_solar_arc: import("ai").Tool<{
        birthData: {
            year: number;
            day: number;
            hour: number;
            minute: number;
            month: number;
            latitude: number;
            longitude: number;
            timezone?: string | undefined;
        };
        targetDate: string;
    }, Promise<{
        subject_data: unknown;
        directed_data: unknown;
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
        direction_type: string;
        arc_used: number;
        target_date: string;
    }>>;
};
export declare const astrologyTools: {
    get_natal_chart: import("ai").Tool<{
        [x: string]: unknown;
    } | undefined, Promise<{
        sun: any;
        moon: any;
        rising: any;
        mercury: any;
        venus: any;
        mars: any;
        jupiter: any;
        saturn: any;
        chiron: any;
        northNode: any;
        houses: any;
        aspects: any;
    }>>;
    get_transits: import("ai").Tool<{
        [x: string]: unknown;
    } | undefined, Promise<{
        skyPositions: import("../transits").TransitPosition[];
        aspectsToNatal: import("../transits").TransitAspect[];
    }>>;
    get_synastry: import("ai").Tool<{
        [x: string]: any;
    }, Promise<{
        subject_data: {
            subject1: unknown;
            subject2: unknown;
        };
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
    }>>;
    get_progressions: import("ai").Tool<{
        birthData: {
            year: number;
            day: number;
            hour: number;
            minute: number;
            month: number;
            latitude: number;
            longitude: number;
            timezone?: string | undefined;
        };
        targetDate: string;
    }, Promise<{
        subject_data: unknown;
        progressed_data: unknown;
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
        progression_type: string;
        target_date: string;
    }>>;
    get_solar_return: import("ai").Tool<{
        birthData: {
            year: number;
            day: number;
            hour: number;
            minute: number;
            month: number;
            latitude: number;
            longitude: number;
            timezone?: string | undefined;
        };
        year: number;
    }, Promise<{
        subject_data: unknown;
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
    }>>;
    get_relocation: import("ai").Tool<{
        birthData: {
            year: number;
            day: number;
            hour: number;
            minute: number;
            month: number;
            latitude: number;
            longitude: number;
            timezone?: string | undefined;
        };
        targetLocation: {
            latitude: number;
            longitude: number;
        };
    }, Promise<any>>;
    get_composite: import("ai").Tool<{
        partnerId: string;
    }, Promise<{
        subject_data: {
            subject1: unknown;
            subject2: unknown;
            composite_subject: unknown;
        };
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
    }>>;
    get_lunar_return: import("ai").Tool<{
        birthData: {
            year: number;
            day: number;
            hour: number;
            minute: number;
            month: number;
            latitude: number;
            longitude: number;
            timezone?: string | undefined;
        };
        year: number;
        month: number;
    }, Promise<{
        subject_data: unknown;
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
    }>>;
    get_solar_arc: import("ai").Tool<{
        birthData: {
            year: number;
            day: number;
            hour: number;
            minute: number;
            month: number;
            latitude: number;
            longitude: number;
            timezone?: string | undefined;
        };
        targetDate: string;
    }, Promise<{
        subject_data: unknown;
        directed_data: unknown;
        chart_data: {
            planetary_positions: {
                name: string;
                sign: string;
                degree: number;
                absolute_longitude: number;
                house?: number | null;
                is_retrograde: boolean;
                speed?: number | null;
            }[];
            house_cusps: {
                house: number;
                sign: string;
                degree: number;
                absolute_longitude: number;
                retrograde?: boolean | null;
            }[];
            aspects: {
                point1: string;
                point2: string;
                aspect_type: string;
                orb: number;
            }[];
            fixed_stars?: {
                [key: string]: unknown;
            } | null;
        };
        direction_type: string;
        arc_used: number;
        target_date: string;
    }>>;
};
//# sourceMappingURL=index.d.ts.map