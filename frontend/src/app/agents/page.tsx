'use client';

import { useCallback, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Activity, Plus, X } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import type { EdgeAgent } from '@/lib/types';
import { ActionButton, EmptyState, ErrorState, KpiCard, LiveIndicator, LoadingSkeleton, PageHeader, StatusBadge } from '@/components/ui';
import { useLiveEvents } from '@/lib/useLiveEvents';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', backgroundColor: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
  color: 'var(--text-primary)', fontSize: '0.9rem',
};

const statusColors: Record<string, string> = {
  healthy: '#10b981',
  degraded: '#f59e0b',
  offline: '#ef4444',
  unknown: '#94a3b8',
};

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useSWR<EdgeAgent[]>('/agents/', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', agent_uid: '', hostname: '', ip_address: '', version: '' });
  const [issuedToken, setIssuedToken] = useState<{ uid: string; token: string } | null>(null);
  const refresh = useCallback(() => {
    mutate('/agents/');
    mutate('/dashboard/system-status');
  }, []);
  const live = useLiveEvents(refresh, ['agent_heartbeat', 'activity_created']);

  const register = async () => {
    if (!form.name.trim()) return;
    const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value.trim()));
    const result = await api.agents.register(payload);
    setIssuedToken({ uid: result.agent_uid, token: result.token });
    setForm({ name: '', agent_uid: '', hostname: '', ip_address: '', version: '' });
    setShowForm(false);
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="Edge Agents"
        subtitle="Registered monitoring appliances, heartbeat health, ingestion status, and token controls."
        icon={<Activity size={30} color="var(--brand-primary)" />}
        actions={<>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          <ActionButton onClick={() => setShowForm(!showForm)} color={showForm ? '#ef4444' : 'var(--brand-primary)'}>
            {showForm ? <><X size={18}/> Cancel</> : <><Plus size={18}/> Register Agent</>}
          </ActionButton>
        </>}
      />

      {issuedToken && (
        <div className="card" style={{ padding: '16px', border: '1px solid rgba(245,158,11,0.35)', marginBottom: '18px' }}>
          <strong>Agent token issued once.</strong>
          <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            UID: {issuedToken.uid}<br />Token: {issuedToken.token}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ padding: '20px', marginBottom: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            <input style={inputStyle} placeholder="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <input style={inputStyle} placeholder="Agent UID optional" value={form.agent_uid} onChange={e => setForm(p => ({ ...p, agent_uid: e.target.value }))} />
            <input style={inputStyle} placeholder="Hostname" value={form.hostname} onChange={e => setForm(p => ({ ...p, hostname: e.target.value }))} />
            <input style={inputStyle} placeholder="IP address" value={form.ip_address} onChange={e => setForm(p => ({ ...p, ip_address: e.target.value }))} />
            <input style={inputStyle} placeholder="Version" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} />
          </div>
          <button onClick={register} style={{ ...buttonStyle('#10b981'), marginTop: '12px' }}>Register</button>
        </div>
      )}

      {isLoading && <LoadingSkeleton label="Loading agents..." />}
      {error && <ErrorState message="Unable to load agents." />}
      {agents && agents.length === 0 && <EmptyState title="No edge agents registered" message="Register an appliance agent to start heartbeats and authenticated ingestion." />}

      {agents && agents.length > 0 && (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
          <KpiCard label="Healthy" value={agents.filter(agent => agent.status === 'healthy' && !agent.revoked_at).length} toneColor="#10b981" />
          <KpiCard label="Degraded" value={agents.filter(agent => agent.status === 'degraded').length} toneColor="#f59e0b" />
          <KpiCard label="Offline" value={agents.filter(agent => agent.status === 'offline').length} toneColor="#ef4444" />
          <KpiCard label="Revoked" value={agents.filter(agent => agent.revoked_at).length} toneColor="#64748b" />
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
                {['Name', 'Status', 'UID', 'Host', 'Last Seen', 'Version', ''].map(header => <th key={header} style={{ padding: '14px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px', fontWeight: 800 }}>{agent.name}</td>
                  <td style={{ padding: '14px' }}><StatusBadge status={agent.revoked_at ? 'revoked' : agent.status} /></td>
                  <td style={{ padding: '14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{agent.agent_uid}</td>
                  <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>
                    {agent.hostname || agent.ip_address || '—'}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>
                      CPU {agent.health_metadata?.cpu ?? '—'} · Memory {agent.health_metadata?.memory ?? '—'} · Queue {agent.health_metadata?.queue_size ?? '—'}
                    </div>
                  </td>
                  <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{agent.last_seen ? new Date(agent.last_seen).toLocaleString() : '—'}</td>
                  <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{agent.version || '—'}</td>
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={!!agent.revoked_at} onClick={async () => { const result = await api.agents.rotateToken(agent.id); setIssuedToken({ uid: result.agent_uid, token: result.token }); refresh(); }} style={buttonStyle('#f59e0b')}>Rotate</button>
                      <button disabled={!!agent.revoked_at} onClick={async () => { await api.agents.revoke(agent.id); refresh(); }} style={buttonStyle('#ef4444')}>{agent.revoked_at ? 'Revoked' : 'Revoke'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function buttonStyle(color: string): React.CSSProperties {
  return {
    padding: '9px 12px',
    backgroundColor: `${color}22`,
    color,
    border: `1px solid ${color}66`,
    borderRadius: '8px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  };
}
