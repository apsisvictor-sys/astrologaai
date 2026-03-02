/**
 * Compatibility API Client
 * US-20: Compatibility Analysis - Frontend API client
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';

// Types
export interface CompatibilityAnalysis {
  partnerId: string;
  partnerName: string;
  overallScore: number;
  scoreLevel: 'exceptional' | 'high' | 'moderate' | 'challenging' | 'difficult';
  categories: CategoryScores;
  elementCompatibility: ElementCompatibility;
  planetaryAnalysis: PlanetaryAnalysis;
  keyAspects: KeyAspect[];
  strengths: RelationshipInsight[];
  challenges: RelationshipInsight[];
  advice: {
    en: string;
    bg: string;
  };
  calculatedAt: string;
  cachedAt?: string;
}

export interface CategoryScores {
  love: CategoryScore;
  communication: CategoryScore;
  trust: CategoryScore;
  adventure: CategoryScore;
  values: CategoryScore;
}

export interface CategoryScore {
  score: number;
  level: 'excellent' | 'good' | 'moderate' | 'challenging';
  description: {
    en: string;
    bg: string;
  };
  contributingAspects: string[];
}

export interface ElementCompatibility {
  userElements: { fire: number; earth: number; air: number; water: number };
  partnerElements: { fire: number; earth: number; air: number; water: number };
  compatibility: {
    score: number;
    analysis: {
      en: string;
      bg: string;
    };
  };
  dominantElement: {
    user: string;
    partner: string;
    harmony: 'harmonious' | 'complementary' | 'challenging';
  };
}

export interface PlanetaryAnalysis {
  sun: PlanetaryComparison;
  moon: PlanetaryComparison;
  rising: PlanetaryComparison;
  venus: PlanetaryComparison;
  mars: PlanetaryComparison;
}

export interface PlanetaryComparison {
  user: { sign: string; degree: number };
  partner: { sign: string; degree: number };
  compatibility: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
  interpretation: {
    en: string;
    bg: string;
  };
}

export interface KeyAspect {
  aspect: string;
  aspectBg: string;
  userPlanet: string;
  partnerPlanet: string;
  orb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
  interpretation: {
    en: string;
    bg: string;
  };
}

export interface RelationshipInsight {
  title: {
    en: string;
    bg: string;
  };
  description: {
    en: string;
    bg: string;
  };
  planets: string[];
}

// API Error class
export class CompatibilityAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'CompatibilityAPIError';
  }
}

// Helper to get auth token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('astrologaai_access_token');
}

// API Methods
export const compatibilityApi = {
  /**
   * Get compatibility analysis for a partner
   */
  async get(partnerId: string): Promise<CompatibilityAnalysis> {
    const token = getAuthToken();
    if (!token) throw new CompatibilityAPIError('Not authenticated', 'UNAUTHORIZED', 401);

    const response = await fetch(`${API_URL}/api/v1/compatibility/${partnerId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new CompatibilityAPIError(
        data.error?.message || 'Failed to fetch compatibility',
        data.error?.code || 'API_ERROR',
        response.status,
        data.error
      );
    }

    return data.data.compatibility;
  },

  /**
   * Invalidate cached compatibility
   */
  async invalidateCache(partnerId: string): Promise<void> {
    const token = getAuthToken();
    if (!token) throw new CompatibilityAPIError('Not authenticated', 'UNAUTHORIZED', 401);

    const response = await fetch(`${API_URL}/api/v1/compatibility/${partnerId}/cache`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new CompatibilityAPIError(
        data.error?.message || 'Failed to invalidate cache',
        data.error?.code || 'API_ERROR',
        response.status,
        data.error
      );
    }
  },
};
