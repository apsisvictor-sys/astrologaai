/**
 * API Client Utilities
 * US-26: Auto-Detect User Language
 * US-37: API Rate-Limit Burst/Retry Behavior
 * 
 * Provides fetch wrappers that automatically include:
 * - Accept-Language header based on user preference
 * - Authorization header when authenticated
 * - Error handling
 * - Exponential backoff retry logic for 429 responses
 */

import { getApiBaseUrl } from './runtime-config';

// API base URL
const API_URL = getApiBaseUrl();

// Storage keys
const ACCESS_TOKEN_KEY = 'astrologaai_access_token';
const REFRESH_TOKEN_KEY = 'astrologaai_refresh_token';
const USER_KEY = 'astrologaai_user';

// US-37: Exponential backoff configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2, // Double each time
  retryableStatusCodes: [429, 503, 502, 504], // Rate limit and server errors
};

/**
 * US-37: Calculate delay with exponential backoff
 * Pattern: 1s, 2s, 4s, 8s, 16s, capped at 30s
 */
function calculateBackoffDelay(attempt: number, retryAfter?: number): number {
  // If server provided Retry-After header, use it
  if (retryAfter && retryAfter > 0) {
    return Math.min(retryAfter * 1000, RETRY_CONFIG.maxDelay);
  }
  
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, etc.
  const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * US-37: Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get the current user's language preference
 */
function getUserLanguage(): string {
  if (typeof window === 'undefined') return 'bg';
  
  try {
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.language || 'bg';
    }
  } catch {
    // Ignore errors
  }
  
  // Fall back to browser language
  const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
  if (browserLang === 'en') return 'en';
  
  return 'bg'; // Default to Bulgarian
}

/**
 * Get the current access token
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Attempt to refresh the access token using the stored refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newToken = data.data?.accessToken;
    if (newToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, newToken);
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * API request options
 */
export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipLanguage?: boolean;
  /** US-37: Override max retries for this request */
  maxRetries?: number;
  /** US-37: Skip retry logic entirely */
  skipRetry?: boolean;
}

/**
 * Make an authenticated API request with Accept-Language header
 * US-37: Includes exponential backoff retry logic for rate limits
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<{ data: T; success: boolean }> {
  const { 
    skipAuth = false, 
    skipLanguage = false, 
    skipRetry = false,
    maxRetries = RETRY_CONFIG.maxRetries,
    headers = {}, 
    ...fetchOptions 
  } = options;

  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Add Accept-Language header
  if (!skipLanguage) {
    requestHeaders['Accept-Language'] = getUserLanguage();
  }

  // Add Authorization header if authenticated
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // US-37: Retry loop with exponential backoff
  let lastError: ApiError | null = null;
  let tokenRefreshed = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers: requestHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 401: attempt token refresh once, then retry
        if (response.status === 401 && !skipAuth && !tokenRefreshed) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            requestHeaders['Authorization'] = `Bearer ${newToken}`;
            tokenRefreshed = true;
            attempt--; // don't count the refresh attempt against retry limit
            continue;
          }
        }

        // US-37: Check if we should retry
        const shouldRetry = !skipRetry &&
                           attempt < maxRetries && 
                           RETRY_CONFIG.retryableStatusCodes.includes(response.status);
        
        if (shouldRetry) {
          // Get Retry-After header or calculate backoff
          const retryAfter = response.headers.get('Retry-After');
          const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
          const delay = calculateBackoffDelay(attempt, retryAfterSeconds);
          
          console.log(`[API] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          
          await sleep(delay);
          continue;
        }
        
        throw new ApiError(
          data.error?.message || 'Request failed',
          response.status,
          data.error?.code || 'UNKNOWN_ERROR',
          data
        );
      }

      return data;
    } catch (error) {
      // If it's an ApiError and we should retry, continue
      if (error instanceof ApiError) {
        const shouldRetry = !skipRetry && 
                           attempt < maxRetries && 
                           RETRY_CONFIG.retryableStatusCodes.includes(error.status);
        
        if (shouldRetry) {
          const retryAfter = (error.data as { error?: { retryAfter?: number } })?.error?.retryAfter;
          const delay = calculateBackoffDelay(attempt, retryAfter);
          console.log(`[API] Request failed with ${error.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          lastError = error;
          continue;
        }
      }
      
      // Re-throw non-retryable errors
      throw error;
    }
  }
  
  // All retries exhausted
  throw lastError || new ApiError('Request failed after all retries', 0, 'RETRY_EXHAUSTED', null);
}

/**
 * GET request
 */
export async function apiGet<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<{ data: T; success: boolean }> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  body: unknown,
  options: ApiRequestOptions = {}
): Promise<{ data: T; success: boolean }> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  body: unknown,
  options: ApiRequestOptions = {}
): Promise<{ data: T; success: boolean }> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<{ data: T; success: boolean }> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  status: number;
  code: string;
  data: unknown;

  constructor(message: string, status: number, code: string, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/**
 * Detect language from server
 */
export async function detectLanguageFromServer(): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/v1/language/detect`, {
      method: 'POST',
      headers: {
        'Accept-Language': navigator.language || 'bg',
      },
    });
    
    const data = await response.json();
    return data.data?.detectedLanguage || 'bg';
  } catch {
    return 'bg';
  }
}

/**
 * User Preferences API
 */
export const userPreferencesApi = {
  /**
   * Get user preferences
   */
  async get() {
    return apiGet<{ preferences: { language: string; notifications: Record<string, boolean> } }>('/api/v1/user/preferences');
  },

  /**
   * Update user preferences
   */
  async update(preferences: { language?: string; notifications?: Record<string, boolean> }) {
    return apiPut<{ preferences: { language: string; notifications: Record<string, boolean> }; message: string }>(
      '/api/v1/user/preferences',
      preferences
    );
  },

  /**
   * Update language preference
   */
  async setLanguage(language: string) {
    return this.update({ language });
  },
};

/**
 * Notification Preferences API
 * US-29: Notification Preferences
 */
export const notificationPreferencesApi = {
  /**
   * Get notification preferences
   */
  async get() {
    return apiGet<{ notifications: { 
      email: boolean; 
      push: boolean; 
      daily: boolean; 
      weekly: boolean; 
      transitAlerts: boolean; 
      promotions: boolean; 
    } }>('/api/v1/user/notifications');
  },

  /**
   * Update notification preferences
   */
  async update(notifications: { 
    email?: boolean; 
    push?: boolean; 
    daily?: boolean; 
    weekly?: boolean; 
    transitAlerts?: boolean; 
    promotions?: boolean; 
  }) {
    return apiPut<{ notifications: Record<string, boolean>; message: string }>(
      '/api/v1/user/notifications',
      notifications
    );
  },

  /**
   * Unsubscribe from emails (GDPR-compliant)
   */
  async unsubscribe(token: string, type: 'all' | 'promotions' | 'daily' | 'weekly' | 'transitAlerts' = 'promotions') {
    return apiPost<{ message: string; preferences: Record<string, boolean> }>(
      '/api/v1/user/notifications/unsubscribe',
      { token, type },
      { skipAuth: true }
    );
  },
};

export default {
  request: apiRequest,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  userPreferences: userPreferencesApi,
  notifications: notificationPreferencesApi,
};

/**
 * Export Data API (US-32)
 * GDPR Data Portability
 */
export const exportDataApi = {
  /**
   * Request a data export (async)
   */
  async request(format: 'json' | 'pdf' = 'json') {
    return apiPost<{ 
      exportId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      format: 'json' | 'pdf';
      estimatedTime: string;
      createdAt: string;
    }>('/api/v1/user/export', { format });
  },

  /**
   * Get export status
   */
  async getStatus(exportId: string) {
    return apiGet<{
      exportId: string;
      format: 'json' | 'pdf';
      status: 'pending' | 'processing' | 'completed' | 'failed';
      createdAt: string;
      completedAt?: string;
      downloadUrl?: string;
      expiresAt: string;
      error?: string;
    }>(`/api/v1/user/export/${exportId}`);
  },

  /**
   * List recent exports
   */
  async list() {
    return apiGet<{
      exports: Array<{
        exportId: string;
        format: 'json' | 'pdf';
        status: 'pending' | 'processing' | 'completed' | 'failed';
        createdAt: string;
        completedAt?: string;
        expiresAt: string;
      }>;
      maxExports: number;
    }>('/api/v1/user/export/list');
  },

  /**
   * Download export (returns blob URL)
   */
  async download(exportId: string, format: 'json' | 'pdf'): Promise<string> {
    const token = getAccessToken();
    const response = await fetch(`${API_URL}/api/v1/user/export/${exportId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error?.message || 'Download failed',
        response.status,
        data.error?.code || 'DOWNLOAD_ERROR',
        data
      );
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },
};

/**
 * User Profile API (US-28)
 */
export const userProfileApi = {
  /**
   * Get user profile
   */
  async get() {
    return apiGet<{
      user: {
        id: string;
        email: string;
        fullName: string | null;
        tier: string;
        language: string;
        avatarUrl: string | null;
        emailVerified: boolean;
        pendingEmail: string | null;
        createdAt: string;
        lastActive: string;
      };
      subscription: {
        tier: string;
        status: string;
        currentPeriodEnd: string | null;
      } | null;
    }>('/api/v1/user/profile');
  },

  /**
   * Update user profile (name, email)
   */
  async update(profile: { fullName?: string; email?: string; avatarUrl?: string }) {
    return apiPut<{
      user: {
        id: string;
        email: string;
        fullName: string | null;
        tier: string;
        language: string;
        avatarUrl: string | null;
        emailVerified: boolean;
        pendingEmail: string | null;
        updatedAt: string;
      };
      message: string;
    }>('/api/v1/user/profile', profile);
  },

  /**
   * Upload avatar
   */
  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = getAccessToken();
    const response = await fetch(`${API_URL}/api/v1/user/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || 'Upload failed',
        response.status,
        data.error?.code || 'UPLOAD_ERROR',
        data
      );
    }

    return data;
  },

  /**
   * Delete avatar
   */
  async deleteAvatar() {
    return apiDelete<{ message: string }>('/api/v1/user/avatar');
  },

  /**
   * Send email verification
   */
  async verifyEmail(email: string) {
    return apiPost<{ message: string }>('/api/v1/user/verify-email', { email });
  },

  /**
   * Confirm email change
   */
  async confirmEmail(token: string, userId: string) {
    return apiPost<{ message: string }>('/api/v1/user/confirm-email', { token, userId });
  },

  /**
   * Cancel pending email change
   */
  async cancelEmailChange() {
    return apiPost<{ message: string }>('/api/v1/user/cancel-email-change', {});
  },
};
