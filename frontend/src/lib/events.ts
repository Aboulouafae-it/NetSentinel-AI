import { getAccessToken } from './api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type LiveState = 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface StreamEventPayload {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  message: string;
  severity: string;
  actor_type: string;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function createEventSource() {
  const token = getAccessToken();
  if (!token || typeof window === 'undefined') return null;
  return new EventSource(`${API_BASE}/events/stream?token=${encodeURIComponent(token)}`);
}
