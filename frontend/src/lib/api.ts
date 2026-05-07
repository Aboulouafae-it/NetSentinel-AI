// NetSentinel AI — API Client Layer

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const ACCESS_TOKEN_KEY = 'netsentinel_access_token';
const REFRESH_TOKEN_KEY = 'netsentinel_refresh_token';

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Core fetch wrapper with standard headers
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = getAccessToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && endpoint !== '/auth/refresh') {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (refreshResponse.ok) {
        const tokens = await refreshResponse.json();
        storeTokens(tokens.access_token, tokens.refresh_token);
        response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });
      }
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401 && typeof window !== 'undefined') {
      clearTokens();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * SWR fetcher function
 */
export const fetcher = (url: string) => fetchApi<any>(url);

// --- API Service Methods ---

export const api = {
  auth: {
    login: (email: string, password: string) => fetchApi<{ access_token: string; refresh_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    me: () => fetchApi<import('./types').User>('/auth/me'),
  },
  setup: {
    status: () => fetchApi<import('./types').SetupStatus>('/setup/status'),
    firstRun: (payload: Record<string, any>) => fetchApi<{ access_token: string; refresh_token: string; token_type: string }>('/setup/first-run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  },
  system: {
    health: () => fetchApi<import('./types').ApplianceHealth>('/system/health'),
    version: () => fetchApi<import('./types').SystemVersion>('/system/version'),
  },
  assets: {
    list: (query = '') => fetchApi<import('./types').Asset[]>(`/assets/${query}`),
    stats: () => fetchApi<import('./types').AssetStats>('/assets/stats'),
    poll: (id: string) => fetchApi<any>(`/assets/${id}/poll`, { method: 'POST' }),
  },
  dashboard: {
    summary: () => fetchApi<import('./types').DashboardSummary>('/dashboard/summary'),
    wirelessHealth: () => fetchApi<import('./types').DashboardWirelessHealth>('/dashboard/wireless-health'),
    recentActivity: () => fetchApi<import('./types').DashboardActivity[]>('/dashboard/recent-activity'),
    systemStatus: () => fetchApi<import('./types').DashboardSystemStatus>('/dashboard/system-status'),
    topology: () => fetchApi<import('./types').TopologySummary>('/dashboard/topology-summary'),
  },
  agents: {
    list: () => fetchApi<import('./types').EdgeAgent[]>('/agents/'),
    register: (payload: Record<string, any>) => fetchApi<{ id: string; agent_uid: string; token: string }>('/agents/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    revoke: (id: string) => fetchApi<import('./types').EdgeAgent>(`/agents/${id}/revoke`, { method: 'POST' }),
    rotateToken: (id: string) => fetchApi<{ id: string; agent_uid: string; token: string }>(`/agents/${id}/rotate-token`, { method: 'POST' }),
  },
  alerts: {
    list: () => fetchApi<import('./types').Alert[]>('/alerts/'),
    stats: () => fetchApi<import('./types').AlertStats>('/alerts/stats'),
    createIncident: (id: string) => fetchApi<{ incident_id: string; created: boolean }>(`/alerts/${id}/incident`, {
      method: 'POST',
    }),
    acknowledge: (id: string, note?: string) => fetchApi<import('./types').Alert>(`/alerts/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
    escalate: (id: string, note?: string) => fetchApi<import('./types').Alert>(`/alerts/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
    resolve: (id: string, note?: string) => fetchApi<import('./types').Alert>(`/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
  },
  incidents: {
    list: () => fetchApi<import('./types').Incident[]>('/incidents/'),
    details: (id: string) => fetchApi<{ incident: import('./types').Incident; alerts: import('./types').Alert[] }>(`/incidents/${id}/details`),
    create: (payload: Record<string, any>) => fetchApi<import('./types').Incident>('/incidents/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    assign: (id: string, assigned_to: string) => fetchApi<import('./types').Incident>(`/incidents/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigned_to }),
    }),
    addNote: (id: string, note: string) => fetchApi<import('./types').Incident>(`/incidents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
    addTask: (id: string, title: string) => fetchApi<import('./types').Incident>(`/incidents/${id}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
    updateTask: (id: string, taskId: string, completed: boolean) => fetchApi<import('./types').Incident>(`/incidents/${id}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    }),
    linkAlert: (id: string, alertId: string) => fetchApi<import('./types').Incident>(`/incidents/${id}/alerts/${alertId}`, {
      method: 'POST',
    }),
    resolve: (id: string, resolution_notes: string) => fetchApi<import('./types').Incident>(`/incidents/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes }),
    }),
  },
  wireless: {
    links: {
      list: () => fetchApi<import('./types').WirelessLink[]>('/wireless/links'),
      get: (id: string) => fetchApi<import('./types').WirelessLink>(`/wireless/links/${id}`),
    },
    metrics: {
      list: (linkId: string) => fetchApi<import('./types').WirelessMetric[]>(`/wireless/links/${linkId}/metrics`),
    },
    diagnostics: {
      list: (linkId: string) => fetchApi<import('./types').FieldDiagnostic[]>(`/wireless/links/${linkId}/diagnostics`),
    },
    measurements: {
      list: (linkId: string) => fetchApi<import('./types').FieldMeasurement[]>(`/wireless/links/${linkId}/measurements`),
    },
    maintenance: {
      list: (linkId: string) => fetchApi<import('./types').MaintenanceLog[]>(`/wireless/links/${linkId}/maintenance`),
    }
  },
  radioDevices: {
    list: () => fetchApi<import('./types').RadioDevice[]>('/radio-devices/'),
    create: (payload: Record<string, any>) => fetchApi<import('./types').RadioDevice>('/radio-devices/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    poll: (id: string) => fetchApi<any>(`/radio-devices/${id}/poll`, { method: 'POST' }),
    pingAll: () => fetchApi<any[]>('/radio-devices/ping-all', { method: 'POST' }),
  },
  ai: {
    chat: (message: string) => fetchApi<{response: string, confidence: number}>('/ai-assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    }),
  }
};
