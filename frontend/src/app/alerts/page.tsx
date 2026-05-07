'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, fetcher } from '@/lib/api';
import type { Alert } from '@/lib/types';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useLiveEvents } from '@/lib/useLiveEvents';
import { DataTable, DetailsDrawer, EmptyState, LiveIndicator, SeverityBadge, StatusBadge } from '@/components/ui';

const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'CRITICAL' },
  high: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'HIGH' },
  medium: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'MEDIUM' },
  low: { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'LOW' },
  info: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'INFO' },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  open: { color: '#ef4444', label: 'Open' },
  acknowledged: { color: '#f59e0b', label: 'Acknowledged' },
  escalated: { color: '#8b5cf6', label: 'Escalated' },
  resolved: { color: '#10b981', label: 'Resolved' },
  dismissed: { color: '#64748b', label: 'Dismissed' },
};

const selectStyle: React.CSSProperties = {
  padding: '9px 10px',
  backgroundColor: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
};

export default function AlertsPage() {
  const { data: alerts, error } = useSWR<Alert[]>('/alerts/', fetcher);
  const { data: stats } = useSWR<{ total: number; open: number; critical: number; high: number }>('/alerts/stats', fetcher);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [actionNote, setActionNote] = useState('');

  const filteredAlerts = useMemo(() => {
    return (alerts || []).filter(alert => {
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      return true;
    });
  }, [alerts, severityFilter, statusFilter]);

  const selected = filteredAlerts.find(alert => alert.id === selectedId) || filteredAlerts[0] || null;

  const refresh = useCallback(() => {
    mutate('/alerts/');
    mutate('/alerts/stats');
    mutate('/incidents/');
  }, []);
  const live = useLiveEvents(refresh, ['alert_created', 'alert_updated', 'activity_created']);

  const runAction = async (action: 'acknowledge' | 'escalate' | 'resolve' | 'incident') => {
    if (!selected) return;
    if (action === 'acknowledge') await api.alerts.acknowledge(selected.id, actionNote || undefined);
    if (action === 'escalate') await api.alerts.escalate(selected.id, actionNote || undefined);
    if (action === 'resolve') await api.alerts.resolve(selected.id, actionNote || undefined);
    if (action === 'incident') await api.alerts.createIncident(selected.id);
    setActionNote('');
    refresh();
  };

  const evidence = selected?.source_metadata?.evidence || selected?.source_metadata?.lifecycle_history || [];
  const recommended = selected?.source_metadata?.recommended_actions || selected?.source_metadata?.recommended_action || [];
  const recommendedActions = Array.isArray(recommended) ? recommended : [recommended].filter(Boolean);

  return (
    <div>
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldAlert size={32} color="#ef4444" />
          <h1>Alerts</h1>
        </div>
        <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
      </div>
      <p className="page-subtitle" style={{ marginBottom: '24px' }}>
        Triage, acknowledge, escalate, and resolve operational alerts.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '18px' }}>
        {([
          ['Total', stats?.total ?? '—', 'var(--text-secondary)'],
          ['Open', stats?.open ?? '—', '#ef4444'],
          ['Critical', stats?.critical ?? '—', '#ef4444'],
          ['High', stats?.high ?? '—', '#f59e0b'],
        ] as Array<[string, React.ReactNode, string]>).map(([label, value, color]) => (
          <div key={label} className="card" style={{ padding: '18px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.keys(statusConfig).map(status => <option key={status} value={status}>{statusConfig[status].label}</option>)}
        </select>
        <select style={selectStyle} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="all">All severities</option>
          {Object.keys(severityConfig).map(severity => <option key={severity} value={severity}>{severityConfig[severity].label}</option>)}
        </select>
      </div>

      {!alerts && !error && <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading alerts...</div>}

      {alerts && alerts.length === 0 && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>No alerts</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active alert records for this organization.</p>
        </div>
      )}

      {alerts && alerts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '18px', alignItems: 'start' }}>
          <DataTable>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
                  {['Severity', 'Status', 'Alert', 'Source', 'Seen', 'Incident'].map(header => (
                    <th key={header} style={{ padding: '12px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map(alert => {
                  const sev = severityConfig[alert.severity] || severityConfig.info;
                  const st = statusConfig[alert.status] || statusConfig.open;
                  return (
                    <tr
                      key={alert.id}
                      onClick={() => setSelectedId(alert.id)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        backgroundColor: selected?.id === alert.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px' }}><SeverityBadge severity={alert.severity} /></td>
                      <td style={{ padding: '12px' }}><StatusBadge status={alert.status} /></td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700 }}>{alert.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Occurrences: {alert.occurrence_count}</div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{alert.source || '—'}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(alert.last_seen || alert.created_at).toLocaleString()}</td>
                      <td style={{ padding: '12px', color: alert.incident_id ? '#10b981' : 'var(--text-muted)' }}>{alert.incident_id ? 'Linked' : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>

          <DetailsDrawer>
            {selected ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <AlertTriangle size={18} color={severityConfig[selected.severity]?.color} />
                  <span style={{ color: severityConfig[selected.severity]?.color, fontWeight: 800 }}>{selected.severity.toUpperCase()}</span>
                  <span style={{ color: statusConfig[selected.status]?.color, fontWeight: 700 }}>{statusConfig[selected.status]?.label}</span>
                </div>
                <h2 style={{ fontSize: '1.1rem', margin: '0 0 8px' }}>{selected.title}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.5 }}>{selected.description || 'No description provided.'}</p>

                <div style={{ marginTop: '18px' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '8px' }}>Evidence</div>
                  {evidence.length > 0 ? evidence.slice(-5).map((item: any, index: number) => (
                    <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {typeof item === 'string' ? item : item.message || item.event_type || JSON.stringify(item)}
                    </div>
                  )) : <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No structured evidence attached.</div>}
                </div>

                <div style={{ marginTop: '18px' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '8px' }}>Recommended Actions</div>
                  {recommendedActions.length > 0 ? recommendedActions.map((item: string, index: number) => (
                    <div key={index} style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '6px' }}>{item}</div>
                  )) : <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Review source metadata and decide next action.</div>}
                </div>

                <textarea
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  placeholder="Action note..."
                  style={{ ...selectStyle, width: '100%', minHeight: '74px', marginTop: '18px', resize: 'vertical' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                  <button onClick={() => runAction('acknowledge')} style={buttonStyle('#f59e0b')}>Acknowledge</button>
                  <button onClick={() => runAction('escalate')} style={buttonStyle('#8b5cf6')}>Escalate</button>
                  <button onClick={() => runAction('incident')} style={buttonStyle('#3b82f6')}>Create Incident</button>
                  <button onClick={() => runAction('resolve')} style={buttonStyle('#10b981')}>Resolve</button>
                </div>
              </>
            ) : <EmptyState title="Select an alert" message="Inspect evidence, timeline, and response actions." />}
          </DetailsDrawer>
        </div>
      )}
    </div>
  );
}

function buttonStyle(color: string): React.CSSProperties {
  return {
    padding: '9px 10px',
    backgroundColor: `${color}22`,
    border: `1px solid ${color}66`,
    color,
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 800,
  };
}
