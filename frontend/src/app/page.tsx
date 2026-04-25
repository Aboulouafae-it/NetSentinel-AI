'use client';

import useSWR from 'swr';
import { Server, Radio, Network, ShieldAlert, Activity, ArrowRight, ShieldCheck, Zap, Radar, Stethoscope, Router } from 'lucide-react';
import { fetcher } from '@/lib/api';
import Link from 'next/link';

interface MeasurementStats {
  total: number; operational: number; degraded: number; down: number;
  avg_rssi: number | null; avg_snr: number | null; avg_latency: number | null;
}

export default function UnifiedDashboard() {
  const { data: alertStats } = useSWR<{ total: number; open: number; critical: number; high: number }>('/alerts/stats', fetcher);
  const { data: measurementStats } = useSWR<MeasurementStats>('/field-measurements/stats', fetcher);
  const { data: radioDevices } = useSWR<any[]>('/radio-devices/', fetcher);

  const cardStyle = (borderColor: string): React.CSSProperties => ({
    padding: '28px', height: '100%', display: 'flex', flexDirection: 'column',
    borderTop: `4px solid ${borderColor}`,
    transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer',
  });

  return (
    <div>
      <div className="page-title" style={{ marginBottom: '32px' }}>
        <h1>NetSentinel AI — Operations Center</h1>
        <p className="page-subtitle" style={{ marginTop: '8px' }}>
          Unified wireless network observability & diagnostics platform.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '18px', borderTop: '3px solid var(--brand-primary)' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>Field Readings</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{measurementStats?.total ?? '—'}</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '3px solid var(--status-warning)' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>Radio Devices</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{radioDevices?.length ?? '—'}</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>Open Alerts</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: alertStats?.open ? '#ef4444' : '#10b981' }}>{alertStats?.open ?? '—'}</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '3px solid var(--brand-secondary)' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>Avg RSSI</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: measurementStats?.avg_rssi && measurementStats.avg_rssi < -70 ? '#f59e0b' : '#10b981' }}>
            {measurementStats?.avg_rssi != null ? `${measurementStats.avg_rssi}` : '—'}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> dBm</span>
          </div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>Avg Latency</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>
            {measurementStats?.avg_latency != null ? measurementStats.avg_latency : '—'}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> ms</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Discovery & RF Diagnostics */}
        <Link href="/discovery" style={{ textDecoration: 'none' }}>
          <div className="card" style={cardStyle('var(--brand-primary)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px' }}>
                <Radar size={24} color="var(--brand-primary)" />
              </div>
              <ArrowRight size={18} color="var(--text-secondary)" />
            </div>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>Discovery & RF Diagnostics</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', flex: 1, lineHeight: 1.5 }}>
              Real ICMP scanning, field measurements, and root cause analysis engine.
            </p>
            <div style={{ display: 'flex', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-online)' }}>Live</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scanning</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-secondary)' }}>RCA</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Engine</div>
              </div>
            </div>
          </div>
        </Link>

        {/* Radio Devices */}
        <Link href="/radio-devices" style={{ textDecoration: 'none' }}>
          <div className="card" style={cardStyle('var(--status-warning)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px' }}>
                <Router size={24} color="var(--status-warning)" />
              </div>
              <ArrowRight size={18} color="var(--text-secondary)" />
            </div>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>Radio Devices</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', flex: 1, lineHeight: 1.5 }}>
              Managed wireless radios with live ping & multi-vendor support.
            </p>
            <div style={{ display: 'flex', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{radioDevices?.length || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registered</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>ICMP</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ping Ready</div>
              </div>
            </div>
          </div>
        </Link>

        {/* Alerts */}
        <Link href="/alerts" style={{ textDecoration: 'none' }}>
          <div className="card" style={cardStyle('#ef4444')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px' }}>
                <ShieldAlert size={24} color="#ef4444" />
              </div>
              <ArrowRight size={18} color="var(--text-secondary)" />
            </div>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>Alerts & Thresholds</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', flex: 1, lineHeight: 1.5 }}>
              Real alerts from RF threshold violations. Auto-generated from measurements.
            </p>
            <div style={{ display: 'flex', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: alertStats?.critical ? '#ef4444' : '#10b981' }}>{alertStats?.critical || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Critical</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: alertStats?.high ? '#f59e0b' : '#10b981' }}>{alertStats?.high || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>High</div>
              </div>
            </div>
          </div>
        </Link>

        {/* Field Measurements */}
        <Link href="/field-measurements" style={{ textDecoration: 'none' }}>
          <div className="card" style={cardStyle('#8b5cf6')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px' }}>
                <Radio size={24} color="#8b5cf6" />
              </div>
              <ArrowRight size={18} color="var(--text-secondary)" />
            </div>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>Field Measurements</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', flex: 1, lineHeight: 1.5 }}>
              Real RF readings: RSSI, SNR, CCQ, noise floor — entered by technicians.
            </p>
            <div style={{ display: 'flex', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{measurementStats?.total || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Readings</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: measurementStats?.degraded ? '#f59e0b' : '#10b981' }}>{measurementStats?.degraded || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Degraded</div>
              </div>
            </div>
          </div>
        </Link>

        {/* Security */}
        <Link href="/security" style={{ textDecoration: 'none' }}>
          <div className="card" style={cardStyle('var(--status-critical)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px' }}>
                <ShieldCheck size={24} color="var(--status-critical)" />
              </div>
              <ArrowRight size={18} color="var(--text-secondary)" />
            </div>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>Security & Threat Engine</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', flex: 1, lineHeight: 1.5 }}>
              Detection rules, IOC tracking, and automated response playbooks.
            </p>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-critical)' }}>Active</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Threat Engine</div>
            </div>
          </div>
        </Link>

        {/* Incidents */}
        <Link href="/incidents" style={{ textDecoration: 'none' }}>
          <div className="card" style={cardStyle('var(--brand-secondary)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(59,130,246,0.1)', borderRadius: '10px' }}>
                <Activity size={24} color="var(--brand-secondary)" />
              </div>
              <ArrowRight size={18} color="var(--text-secondary)" />
            </div>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>Incidents & Workflows</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', flex: 1, lineHeight: 1.5 }}>
              Track investigations, group alerts, and manage resolution workflows.
            </p>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>Ready</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Incident Tracker</div>
            </div>
          </div>
        </Link>
      </div>

      {/* System Status */}
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} color="var(--brand-primary)" />
          System Status
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Discovery Engine', status: 'Operational', color: '#10b981' },
            { label: 'RCA Engine', status: 'Operational', color: '#10b981' },
            { label: 'Alert Threshold Engine', status: 'Operational', color: '#10b981' },
            { label: 'Database (PostgreSQL)', status: 'Connected', color: '#10b981' },
            { label: 'SNMP Adapter', status: 'Stage 2', color: '#64748b' },
          ].map(item => (
            <div key={item.label} style={{ padding: '14px', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: '0.75rem', color: item.color }}>{item.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
