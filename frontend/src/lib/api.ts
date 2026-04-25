// NetSentinel AI — API Client Layer

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Core fetch wrapper with standard headers
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  // In a real app, we'd inject the JWT token from localStorage/cookies here
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
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
  assets: {
    list: () => fetchApi<import('./types').Asset[]>('/assets/'),
    stats: () => fetchApi<import('./types').AssetStats>('/assets/stats'),
  },
  alerts: {
    list: () => fetchApi<import('./types').Alert[]>('/alerts/'),
    stats: () => fetchApi<import('./types').AlertStats>('/alerts/stats'),
  },
  incidents: {
    list: () => fetchApi<import('./types').Incident[]>('/incidents/'),
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
    maintenance: {
      list: (linkId: string) => fetchApi<import('./types').MaintenanceLog[]>(`/wireless/links/${linkId}/maintenance`),
    }
  },
  ai: {
    chat: (message: string) => fetchApi<{response: string, confidence: number}>('/ai-assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    }),
  }
};
