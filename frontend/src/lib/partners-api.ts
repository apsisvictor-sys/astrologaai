/**
 * Partners API Client
 * US-18: Add Partner - Frontend API client for partner management
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

// Types
export interface Partner {
  id: string;
  name: string;
  label: string | null;
  relationshipType: 'romantic' | 'friend' | 'family' | 'business' | 'other';
  birthData: {
    date: string;
    time: string | null;
    location: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    isUnknownTime?: boolean;
  };
  chartSummary?: {
    sunSign?: string;
    moonSign?: string;
    risingSign?: string;
  } | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerData {
  name: string;
  label?: string;
  relationshipType?: 'romantic' | 'friend' | 'family' | 'business' | 'other';
  birthDate: string;
  birthTime?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isUnknownTime?: boolean;
  notes?: string;
}

export interface UpdatePartnerData {
  name?: string;
  label?: string;
  relationshipType?: 'romantic' | 'friend' | 'family' | 'business' | 'other';
  birthDate?: string;
  birthTime?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isUnknownTime?: boolean;
  notes?: string;
}

// Helper to get auth token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('astrologaai_access_token');
}

// API Error class
export class PartnersAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PartnersAPIError';
  }
}

// API Methods
export const partnersApi = {
  /**
   * List all partners for the current user
   */
  async list(): Promise<Partner[]> {
    const token = getAuthToken();
    if (!token) throw new PartnersAPIError('Not authenticated', 'UNAUTHORIZED', 401);

    const response = await fetch(`${API_URL}/api/v1/partners`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new PartnersAPIError(
        data.error?.message || 'Failed to fetch partners',
        data.error?.code || 'API_ERROR',
        response.status,
        data.error
      );
    }

    return data.data.partners;
  },

  /**
   * Get a specific partner by ID
   */
  async get(id: string): Promise<Partner> {
    const token = getAuthToken();
    if (!token) throw new PartnersAPIError('Not authenticated', 'UNAUTHORIZED', 401);

    const response = await fetch(`${API_URL}/api/v1/partners/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new PartnersAPIError(
        data.error?.message || 'Failed to fetch partner',
        data.error?.code || 'API_ERROR',
        response.status,
        data.error
      );
    }

    return data.data.partner;
  },

  /**
   * Create a new partner
   */
  async create(partnerData: CreatePartnerData): Promise<Partner> {
    const token = getAuthToken();
    if (!token) throw new PartnersAPIError('Not authenticated', 'UNAUTHORIZED', 401);

    const response = await fetch(`${API_URL}/api/v1/partners`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(partnerData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new PartnersAPIError(
        data.error?.message || 'Failed to create partner',
        data.error?.code || 'API_ERROR',
        response.status,
        data.error
      );
    }

    return data.data.partner;
  },

  /**
   * Update an existing partner
   */
  async update(id: string, partnerData: UpdatePartnerData): Promise<Partner> {
    const token = getAuthToken();
    if (!token) throw new PartnersAPIError('Not authenticated', 'UNAUTHORIZED', 401);

    const response = await fetch(`${API_URL}/api/v1/partners/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(partnerData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new PartnersAPIError(
        data.error?.message || 'Failed to update partner',
        data.error?.code || 'API_ERROR',
        response.status,
        data.error
      );
    }

    return data.data.partner;
  },

  /**
   * Delete a partner
   */
  async delete(id: string): Promise<void> {
    const token = getAuthToken();
    if (!token) throw new PartnersAPIError('Not authenticated', 'UNAUTHORIZED', 401);

    const response = await fetch(`${API_URL}/api/v1/partners/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new PartnersAPIError(
        data.error?.message || 'Failed to delete partner',
        data.error?.code || 'API_ERROR',
        response.status,
        data.error
      );
    }
  },

  /**
   * US-19: Get synastry chart between user and partner
   */
  async getSynastry(partnerId: string, language: 'bg' | 'en' = 'bg'): Promise<SynastryResponse> {
    const token = getAuthToken();
    if (!token) throw new PartnersAPIError('Not authenticated', 'UNAUTHORIZED', 401);

    const response = await fetch(`${API_URL}/api/v1/partners/${partnerId}/synastry?language=${language}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new PartnersAPIError(
        data.error?.message || 'Failed to get synastry chart',
        data.error?.code || 'API_ERROR',
        response.status,
        data.error
      );
    }

    return data.data;
  },

  /**
   * US-20: Get detailed compatibility report
   */
  async getCompatibilityReport(partnerId: string, language: 'bg' | 'en' = 'bg'): Promise<CompatibilityReportResponse> {
    const token = getAuthToken();
    if (!token) throw new PartnersAPIError('Not authenticated', 'UNAUTHORIZED', 401);

    const response = await fetch(`${API_URL}/api/v1/partners/${partnerId}/report?language=${language}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new PartnersAPIError(
        data.error?.message || 'Failed to get compatibility report',
        data.error?.code || 'API_ERROR',
        response.status,
        data.error
      );
    }

    return data.data;
  },
};

// US-19: Synastry Types
export interface PlanetPosition {
  name: string;
  sign: string;
  signBg: string;
  degree: number;
  house: number;
  retrograde: boolean;
  symbol: string;
}

export interface InterPlanetaryAspect {
  userPlanet: string;
  userSign: string;
  userDegree: number;
  partnerPlanet: string;
  partnerSign: string;
  partnerDegree: number;
  aspect: string;
  aspectBg: string;
  orb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
  interpretation: {
    en: string;
    bg: string;
  };
}

export interface RelationshipStrength {
  title: { en: string; bg: string };
  description: { en: string; bg: string };
  planets: string[];
}

export interface RelationshipChallenge {
  title: { en: string; bg: string };
  description: { en: string; bg: string };
  planets: string[];
}

export interface SynastryChart {
  userChart: Record<string, PlanetPosition>;
  partnerChart: Record<string, PlanetPosition>;
  interAspects: InterPlanetaryAspect[];
  compatibilityScore: number;
  strengths: RelationshipStrength[];
  challenges: RelationshipChallenge[];
  summary: {
    en: string;
    bg: string;
  };
  calculatedAt: string;
}

export interface SynastryResponse {
  synastry: SynastryChart;
  partner: {
    id: string;
    name: string;
    label: string | null;
    relationshipType: string;
  };
  language: string;
  cached: boolean;
}

// US-20: Compatibility Report Types
export interface CategoryScore {
  score: number;
  label: string;
  labelBg: string;
  analysis: string;
}

export interface KeyAspect {
  userPlanet: string;
  partnerPlanet: string;
  aspect: string;
  aspectBg: string;
  description: string;
  nature: 'harmonious' | 'challenging' | 'neutral';
}

export interface CompatibilityReport {
  partnerId: string;
  partnerName: string;
  overallScore: number;
  categories: {
    emotional: CategoryScore;
    communication: CategoryScore;
    physical: CategoryScore;
    longTerm: CategoryScore;
  };
  keyAspects: KeyAspect[];
  strengths: string[];
  challenges: string[];
  advice: string;
  generatedAt: string;
  language: 'bg' | 'en';
}

export interface CompatibilityReportResponse {
  report: CompatibilityReport;
  partner: {
    id: string;
    name: string;
    label: string | null;
    relationshipType: string;
  };
  cached: boolean;
}
