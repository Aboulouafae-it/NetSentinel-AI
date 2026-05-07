'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { Activity, AlertTriangle, RefreshCw, Router, ShieldAlert, Wifi } from 'lucide-react';
import { fetcher } from '@/lib/api';
import type { DashboardActivity, DashboardSummary, DashboardSystemStatus, DashboardWirelessHealth, TopologySummary } from '@/lib/types';
import { useLiveEvents } from '@/lib/useLiveEvents';
import { ActivityFeedItem, ErrorState, KpiCard, LiveIndicator, LoadingSkeleton, MetricCard, SectionHeader } from '@/components/ui';

const card: React.CSSProperties = { padding: '18px' };

export default function OperationsDashboard() {
  const [range, setRange] = useState('24h');
  const summary = useSWR<DashboardSummary>('/dashboard/summary', fetcher);
  const wireless = useSWR<DashboardWirelessHealth>('/dashboard/wireless-health', fetcher);
  const activity = useSWR<DashboardActivity[]>('/dashboard/recent-activity', fetcher);
  const system = useSWR<DashboardSystemStatus>('/dashboard/system-status', fetcher);
  const topology = useSWR<TopologySummary>('/dashboard/topology-summary', fetcher);
  const refreshAll = useCallback(() => {
    summary.mutate();
    wireless.mutate();
    activity.mutate();
    system.mutate();
    topology.mutate();
  }, [activity, summary, system, topology, wireless]);
  const live = useLiveEvents(refreshAll);

  const loading = summary.isLoading || wireless.isLoading || activity.isLoading || system.isLoading;
  const error = summary.error || wireless.error || activity.error || system.error;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div className="page-title">
          <h1>Operations Dashboard</h1>
          <p className="page-subtitle" style={{ marginTop: '8px' }}>Organization-scoped operational health from assets, alerts, incidents, logs, discovery, and wireless readings.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          <select value={range} onChange={e => setRange(e.target.value)} style={controlStyle}>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
          <button onClick={refreshAll} style={buttonStyle}><RefreshCw size={16} /> Refresh</button>
        </div>
      </div>

      {error && <ErrorState message="Unable to load dashboard data." />}
      {loading && <LoadingSkeleton label="Loading operations data..." />}

      <SystemStrip system={system.data} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', margin: '18px 0' }}>
        <KpiCard label="Assets" value={summary.data?.assets.total ?? '—'} sub={`${summary.data?.assets.online ?? 0} online`} toneColor="var(--brand-primary)" />
        <KpiCard label="Open Alerts" value={summary.data?.alerts.open ?? '—'} sub={`${summary.data?.alerts.critical ?? 0} critical`} toneColor="#ef4444" />
        <KpiCard label="Active Incidents" value={summary.data?.incidents.active ?? '—'} sub="open or investigating" toneColor="#f59e0b" />
        <KpiCard label="Wireless Links" value={summary.data?.wireless_links.total ?? '—'} sub={`${wireless.data?.measurements ?? 0} field readings`} toneColor="#8b5cf6" />
        <KpiCard label="Radio Devices" value={summary.data?.radio_devices.total ?? '—'} sub={`${summary.data?.radio_devices.live_adapter_supported ?? 0} live adapters · ${summary.data?.radio_devices.missing_metrics ?? 0} missing metrics`} toneColor="#10b981" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '18px', marginBottom: '18px' }}>
        <section className="card" style={card}>
          <SectionHeader title={<><ShieldAlert size={18} /> Alert Severity Distribution</>} />
          <Distribution data={summary.data?.alerts} />
        </section>
        <section className="card" style={card}>
          <SectionHeader title={<><Wifi size={18} /> Wireless Diagnostics Summary</>} />
          {wireless.data?.measurements ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <MetricCard label="Avg RSSI" value={format(wireless.data.avg_rssi, 'dBm')} />
              <MetricCard label="Avg SNR" value={format(wireless.data.avg_snr, 'dB')} />
              <MetricCard label="Noise Floor" value={format(wireless.data.avg_noise_floor, 'dBm')} />
              <MetricCard label="Latency" value={format(wireless.data.avg_latency, 'ms')} />
              <MetricCard label="Packet Loss" value={format(wireless.data.avg_packet_loss, '%')} />
              <MetricCard label="Measurements" value={wireless.data.measurements} />
            </div>
          ) : <Empty text="No field measurements available yet." />}
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px' }}>
        <section className="card" style={card}>
          <SectionHeader title={<><AlertTriangle size={18} /> Recent Incidents</>} />
          <StatusRows data={summary.data?.incidents.by_status} />
        </section>
        <section className="card" style={card}>
          <SectionHeader title={<><Activity size={18} /> Recent Activity</>} />
          {activity.data?.length ? activity.data.slice(0, 8).map((item, index) => (
            <ActivityFeedItem key={`${item.type}-${index}`} title={`${item.event} · ${item.type}`} subtitle={item.title} />
          )) : <Empty text="No recent activity from alerts, incidents, logs, or measurements." />}
        </section>
        <section className="card" style={card}>
          <SectionHeader title={<><Router size={18} /> Topology MVP</>} />
          {topology.data?.sites.length ? topology.data.sites.slice(0, 6).map(site => (
            <div key={site.id} style={rowStyle}>
              <div style={{ fontWeight: 700 }}>{site.name}</div>
              <div style={{ color: site.has_active_alerts ? '#ef4444' : 'var(--text-secondary)' }}>{site.assets_count} assets {site.has_active_alerts ? '· active alert' : ''}</div>
            </div>
          )) : <Empty text="No sites available for topology summary." />}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: React.ReactNode; sub: string; color: string }) {
  return <div className="card" style={{ padding: '18px', borderTop: `3px solid ${color}` }}><div style={kpiLabel}>{label}</div><div style={{ fontSize: '2rem', fontWeight: 800, color }}>{value}</div><div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{sub}</div></div>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={{ padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}><div style={kpiLabel}>{label}</div><div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{value}</div></div>;
}

function Distribution({ data }: { data?: DashboardSummary['alerts'] }) {
  if (!data) return <Empty text="No alert data loaded." />;
  return <div>{(['critical', 'high', 'medium', 'low'] as const).map(key => <div key={key} style={rowStyle}><span style={{ textTransform: 'capitalize' }}>{key}</span><strong>{data[key]}</strong></div>)}</div>;
}

function StatusRows({ data }: { data?: Record<string, number> }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <Empty text="No incidents recorded." />;
  return <div>{entries.map(([key, value]) => <div key={key} style={rowStyle}><span>{key}</span><strong>{value}</strong></div>)}</div>;
}

function SystemStrip({ system }: { system?: DashboardSystemStatus }) {
  return <div className="card" style={{ padding: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>{Object.entries(system || {}).map(([key, value]) => <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: value.status.includes('planned') ? '#64748b' : '#10b981' }} />{key}: {value.status}</div>)}</div>;
}

function Empty({ text }: { text: string }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', padding: '12px 0' }}>{text}</div>;
}

function format(value: number | null | undefined, unit: string) {
  return value == null ? '—' : `${value} ${unit}`;
}

const controlStyle: React.CSSProperties = { padding: '9px 10px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-primary)' };
const buttonStyle: React.CSSProperties = { ...controlStyle, display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: 800 };
const kpiLabel: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' };
const sectionTitle: React.CSSProperties = { margin: '0 0 14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' };
const rowStyle: React.CSSProperties = { padding: '9px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.86rem' };
