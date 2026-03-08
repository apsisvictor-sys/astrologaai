/**
 * Data Export PDF Generator Service
 * US-32: Export User Data (GDPR Data Portability)
 *
 * Generates human-readable PDF reports of user data
 */
interface UserExportData {
    exportInfo: {
        exportedAt: string;
        format: string;
        version: string;
    };
    profile: {
        id: string;
        email: string;
        fullName: string | null;
        language: string;
        tier: string;
        emailVerified: boolean;
        avatarUrl: string | null;
        createdAt: string;
    };
    birthData: {
        date: string;
        time: string;
        place: string;
        latitude: number;
        longitude: number;
        timezone: string;
        isUnknownTime: boolean;
    } | null;
    birthProfiles: Array<{
        id: string;
        name: string;
        birthDate: string;
        birthTime: string | null;
        locationName: string;
        latitude: number;
        longitude: number;
        timezone: string;
        isUnknownTime: boolean;
        chart: {
            chartData: any;
            createdAt: string;
            history: Array<{
                archivedAt: string;
                reason: string;
                birthDate: string;
                locationName: string;
            }>;
        } | null;
    }>;
    birthChart: {
        chartData: any;
        createdAt: string;
        history: Array<{
            archivedAt: string;
            reason: string;
            birthDate: string;
            locationName: string;
        }>;
    } | null;
    chatHistory: Array<{
        id: string;
        title: string | null;
        summary: string | null;
        createdAt: string;
        messages: Array<{
            id: string;
            role: string;
            content: string;
            createdAt: string;
        }>;
    }>;
    forecasts: {
        daily?: any;
        weekly?: any;
    };
    partners: Array<{
        id: string;
        name: string;
        label: string | null;
        relationshipType: string;
        birthDate: string;
        birthTime: string | null;
        locationName: string;
        chartSummary: any;
        notes: string | null;
        createdAt: string;
    }>;
    subscription: {
        tier: string;
        status: string;
        currentPeriodStart: string | null;
        currentPeriodEnd: string | null;
    } | null;
    notificationPreferences: {
        dailyHoroscope: boolean;
        weeklyForecast: boolean;
        newReading: boolean;
        partnerUpdates: boolean;
        marketing: boolean;
        emailEnabled: boolean;
        pushEnabled: boolean;
    } | null;
}
/**
 * Generate a human-readable PDF document of user data
 */
export declare function generateDataExportPDF(data: UserExportData): Promise<Buffer>;
export default generateDataExportPDF;
//# sourceMappingURL=data-export-pdf.d.ts.map