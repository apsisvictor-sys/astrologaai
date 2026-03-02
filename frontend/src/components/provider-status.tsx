/**
 * Provider Status Component
 * US-34: LLM Provider Fallback Strategy
 * 
 * Displays health status of all LLM providers with real-time updates.
 * Design: Cosmic Dark theme with stellar purple accents.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
interface ProviderHealth {
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs: number;
  lastCheck: string;
  errorCount: number;
  successCount: number;
  lastError?: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
  isAvailable: boolean;
}

interface ProviderStatusData {
  overallStatus: string;
  activeProvider: string;
  totalProviders: number;
  healthyProviders: number;
  providers: ProviderHealth[];
  lastSwitch?: {
    timestamp: string;
    from: string;
    to: string;
    reason: string;
  };
  cacheTTL: number;
}

interface ProviderStatusResponse {
  success: boolean;
  data: ProviderStatusData;
}

// Status colors matching design spec
const statusColors = {
  healthy: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/30',
  },
  degraded: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    border: 'border-amber-500/30',
  },
  unhealthy: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    dot: 'bg-red-400',
    border: 'border-red-500/30',
  },
  unknown: {
    bg: 'bg-zinc-500/20',
    text: 'text-zinc-400',
    dot: 'bg-zinc-400',
    border: 'border-zinc-500/30',
  },
};

// Provider type display names
const providerNames: Record<string, string> = {
  glm: 'GLM-4',
  openai: 'OpenAI GPT-4',
  minimax: 'MiniMax',
};

export function ProviderStatusBadge() {
  const [status, setStatus] = useState<ProviderStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/v1/providers/status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch provider status');
      }
      
      const data: ProviderStatusResponse = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        setError(null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50">
        <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
        <span className="text-xs text-zinc-400">Checking providers...</span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <span className="text-xs text-red-400">Status unavailable</span>
      </div>
    );
  }

  const overallColor = status.overallStatus === 'operational' 
    ? statusColors.healthy 
    : statusColors.degraded;

  return (
    <div className="relative">
      {/* Compact Badge */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full 
          ${overallColor.bg} ${overallColor.border} border
          hover:opacity-80 transition-opacity cursor-pointer
        `}
      >
        <div className={`w-2 h-2 rounded-full ${overallColor.dot} ${status.healthyProviders > 0 ? 'animate-pulse' : ''}`} />
        <span className={`text-xs font-medium ${overallColor.text}`}>
          {status.activeProvider.toUpperCase()} • {status.healthyProviders}/{status.totalProviders} healthy
        </span>
        <svg 
          className={`w-3 h-3 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Panel */}
      {expanded && (
        <div className="absolute top-full right-0 mt-2 w-80 rounded-xl bg-[#12121A] border border-zinc-700/50 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-700/50 bg-gradient-to-r from-[#7C3AED]/20 to-[#EC4899]/20">
            <h3 className="text-sm font-semibold text-white">LLM Provider Status</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Active: <span className="text-violet-400 font-medium">{status.activeProvider.toUpperCase()}</span>
            </p>
          </div>

          {/* Provider List */}
          <div className="p-3 space-y-2">
            {status.providers.map((provider) => {
              const colors = statusColors[provider.status];
              return (
                <div 
                  key={provider.name}
                  className={`
                    p-3 rounded-lg ${colors.bg} ${colors.border} border
                    ${provider.name === status.activeProvider ? 'ring-1 ring-violet-500/50' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      <span className="text-sm font-medium text-white">
                        {providerNames[provider.name] || provider.name}
                      </span>
                      {provider.name === status.activeProvider && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-500/30 text-violet-300 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${colors.text}`}>
                      {provider.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <div>
                      <span className="text-zinc-500">Latency:</span>{' '}
                      <span className="text-zinc-300">{provider.latencyMs}ms</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Requests:</span>{' '}
                      <span className="text-zinc-300">{provider.totalRequests}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Success:</span>{' '}
                      <span className="text-emerald-400">{provider.successfulRequests}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Failed:</span>{' '}
                      <span className="text-red-400">{provider.failedRequests}</span>
                    </div>
                  </div>

                  {provider.lastError && (
                    <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-400 truncate">{provider.lastError}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Last Switch */}
          {status.lastSwitch && (
            <div className="px-4 py-2 border-t border-zinc-700/50 bg-zinc-800/30">
              <p className="text-xs text-zinc-500">
                Last switch: <span className="text-zinc-400">{status.lastSwitch.from} → {status.lastSwitch.to}</span>
              </p>
              <p className="text-xs text-zinc-500 truncate">{status.lastSwitch.reason}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-700/50 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Updates every 30s • Cache: {status.cacheTTL}s
            </span>
            <button 
              onClick={fetchStatus}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Admin-only full status dashboard
export function ProviderStatusDashboard() {
  const [status, setStatus] = useState<ProviderStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideProvider, setOverrideProvider] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/v1/providers/status`);
      const data: ProviderStatusResponse = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleOverride = async () => {
    if (!overrideProvider) return;
    
    setIsOverriding(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';
      await fetch(`${apiUrl}/api/v1/llm/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: overrideProvider, reason: overrideReason }),
      });
      await fetchStatus();
      setOverrideProvider('');
      setOverrideReason('');
    } catch (err) {
      console.error('Override failed:', err);
    } finally {
      setIsOverriding(false);
    }
  };

  const handleClearOverride = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://astrologaai-backend-production.up.railway.app';
      await fetch(`${apiUrl}/api/v1/llm/override`, { method: 'DELETE' });
      await fetchStatus();
    } catch (err) {
      console.error('Clear override failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-[#12121A] border border-zinc-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-800 rounded w-1/4" />
          <div className="h-20 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30">
        <p className="text-red-400">Failed to load provider status</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">LLM Provider Status</h2>
          <p className="text-sm text-zinc-400">
            Monitor and manage LLM provider health
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#7C3AED] to-[#EC4899] rounded-lg hover:opacity-90 transition-opacity"
        >
          Refresh
        </button>
      </div>

      {/* Overall Status Card */}
      <div className="p-6 rounded-xl bg-[#12121A] border border-zinc-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-zinc-400">Overall Status</span>
            <h3 className={`text-2xl font-bold ${
              status.overallStatus === 'operational' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {status.overallStatus.toUpperCase()}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-sm text-zinc-400">Active Provider</span>
            <p className="text-lg font-semibold text-violet-400">{status.activeProvider.toUpperCase()}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-zinc-800/50">
            <span className="text-xs text-zinc-500">Total Providers</span>
            <p className="text-xl font-semibold text-white">{status.totalProviders}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10">
            <span className="text-xs text-emerald-400">Healthy</span>
            <p className="text-xl font-semibold text-emerald-400">{status.healthyProviders}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10">
            <span className="text-xs text-red-400">Unhealthy</span>
            <p className="text-xl font-semibold text-red-400">
              {status.totalProviders - status.healthyProviders}
            </p>
          </div>
        </div>
      </div>

      {/* Provider Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {status.providers.map((provider) => {
          const colors = statusColors[provider.status];
          return (
            <div 
              key={provider.name}
              className={`
                p-4 rounded-xl bg-[#12121A] border
                ${provider.name === status.activeProvider 
                  ? 'border-violet-500/50 ring-1 ring-violet-500/30' 
                  : 'border-zinc-700/50'}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                  <h4 className="font-medium text-white">
                    {providerNames[provider.name] || provider.name}
                  </h4>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors.bg} ${colors.text}`}>
                  {provider.status.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Latency</span>
                  <span className="text-zinc-300">{provider.averageLatencyMs}ms avg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Requests</span>
                  <span className="text-zinc-300">{provider.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Success Rate</span>
                  <span className="text-emerald-400">
                    {provider.totalRequests > 0 
                      ? Math.round((provider.successfulRequests / provider.totalRequests) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>

              {provider.name === status.activeProvider && (
                <div className="mt-3 pt-3 border-t border-zinc-700/50">
                  <span className="text-xs text-violet-400 font-medium">● Currently Active</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual Override */}
      <div className="p-6 rounded-xl bg-[#12121A] border border-zinc-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Manual Override</h3>
        <div className="flex gap-4">
          <select
            value={overrideProvider}
            onChange={(e) => setOverrideProvider(e.target.value)}
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
          >
            <option value="">Select provider...</option>
            {status.providers.map((p) => (
              <option key={p.name} value={p.name}>
                {providerNames[p.name] || p.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={handleOverride}
            disabled={!overrideProvider || isOverriding}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isOverriding ? 'Overriding...' : 'Override'}
          </button>
          <button
            onClick={handleClearOverride}
            className="px-6 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
          >
            Clear Override
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProviderStatusBadge;
