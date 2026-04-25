'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { Alert } from '@/lib/types';
import { ShieldAlert, AlertTriangle, CheckCircle2, Bell, XCircle } from 'lucide-react';

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
  resolved: { color: '#10b981', label: 'Resolved' },
  dismissed: { color: '#64748b', label: 'Dismissed' },
};

export default function AlertsPage() {
  const { data: alerts, error } = useSWR<Alert[]>('/alerts/', fetcher);
  const { data: stats } = useSWR<{ total: number; open: number; critical: number; high: number }>('/alerts/stats', fetcher);

  const openAlerts = alerts?.filter(a => a.status === 'open') || [];
  const criticalAlerts = alerts?.filter(a => a.severity === 'critical') || [];

  return (
    <div>
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldAlert size={32} color="#ef4444" />
        <h1>Alerts</h1>
      </div>
      <p className="page-subtitle" style={{ marginBottom: '24px' }}>
        Real alerts generated from threshold violations on field measurements and discovery scans.
      </p>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', borderTop: '3px solid var(--text-secondary)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Total</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats?.total ?? '—'}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderTop: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Open</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: stats?.open ? '#ef4444' : 'var(--status-online)' }}>{stats?.open ?? '—'}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderTop: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Critical</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: stats?.critical ? '#ef4444' : '#10b981' }}>{stats?.critical ?? '—'}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderTop: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>High</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: stats?.high ? '#f59e0b' : '#10b981' }}>{stats?.high ?? '—'}</div>
        </div>
      </div>

      {/* Alerts List */}
      {!alerts && !error && (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading alerts...</div>
      )}

      {alerts && alerts.length === 0 && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>No alerts</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Alerts are auto-generated when field measurements cross thresholds. Enter measurements with degraded values to test.
          </p>
        </div>
      )}

      {alerts && alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alerts.map(alert => {
            const sev = severityConfig[alert.severity] || severityConfig.info;
            const st = statusConfig[alert.status] || statusConfig.open;
            return (
              <div key={alert.id} className="card" style={{
                padding: '18px 20px',
                borderLeft: `4px solid ${sev.color}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                opacity: alert.status === 'resolved' || alert.status === 'dismissed' ? 0.6 : 1,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <AlertTriangle size={16} color={sev.color} />
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800,
                      backgroundColor: sev.bg, color: sev.color, letterSpacing: '0.5px',
                    }}>{sev.label}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                      backgroundColor: 'rgba(255,255,255,0.05)', color: st.color,
                    }}>{st.label}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{alert.title}</div>
                  {alert.description && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alert.description}</div>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {alert.source && <span>Source: {alert.source} · </span>}
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
