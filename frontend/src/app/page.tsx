'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Cloud,
  Database,
  HardDrive,
  Network,
  Radio,
  RefreshCw,
  Router,
  Server,
  ShieldAlert,
  Wifi,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import type {
  DashboardActivity,
  DashboardSummary,
  DashboardSystemStatus,
  DashboardWirelessHealth,
  TopologySummary,
} from '@/lib/types';
import { useLiveEvents } from '@/lib/useLiveEvents';
import {
  ActionButton,
  ActivityFeedItem,
  EmptyState,
  ErrorState,
  HealthBadge,
  KpiCard,
  KpiGrid,
  LiveIndicator,
  LiveStatusPill,
  LoadingSkeleton,
  MetricCard,
  ModuleHeader,
  PageShell,
  SectionHeader,
  SeverityBadge,
  StatusBadge,
} from '@/components/ui';

const panelStyle: React.CSSProperties = { padding: 18, minHeight: 220 };
const rowStyle: React.CSSProperties = {
  padding: '10px 0',
  borderBottom: '1px solid var(--border-subtle)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  fontSize: '0.86rem',
};
const controlStyle: React.CSSProperties = {
  padding: '9px 10px',
  backgroundColor: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 6,
  color: 'var(--text-primary)',
};

export default function ControlCenterDashboard() {
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
  const loading = summary.isLoading || wireless.isLoading || activity.isLoading || system.isLoading || topology.isLoading;
  const error = summary.error || wireless.error || activity.error || system.error || topology.error;
  const networkHealth = getNetworkHealth(summary.data);
  const wirelessHealth = getWirelessHealth(summary.data, wireless.data);
  const applianceHealth = getApplianceHealth(system.data, live.state);

  const highPriorityActivity = useMemo(
    () => (activity.data || []).filter(item => ['critical', 'high'].includes((item.severity || '').toLowerCase())).slice(0, 4),
    [activity.data],
  );

  return (
    <PageShell>
      <ModuleHeader
        eyebrow="Control Center"
        title="NetSentinel AI Operations Center"
        subtitle="Real organization-scoped network, wireless, security, incident, and appliance status from the current MVP APIs."
        icon={<Network size={30} color="var(--brand-cyan)" />}
        actions={<>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          <select value={range} onChange={event => setRange(event.target.value)} style={controlStyle} title="Dashboard range placeholder">
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
          <LiveStatusPill label="Range filter pending" state="planned" />
          <ActionButton onClick={refreshAll}><RefreshCw size={16} /> Refresh</ActionButton>
        </>}
      />

      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorState message="Unable to load one or more dashboard data sources. Check backend availability, authentication, and organization setup." />
          <div style={{ marginTop: 10 }}>
            <ActionButton onClick={refreshAll} color="var(--status-critical)"><RefreshCw size={16} /> Retry dashboard APIs</ActionButton>
          </div>
        </div>
      )}

      {loading && <DashboardSkeleton />}

      <KpiGrid min={170}>
        <KpiCard label="Network Health" value={networkHealth.label} sub={networkHealth.sub} toneColor={networkHealth.color} />
        <KpiCard label="Online Assets" value={summary.data?.assets.online ?? '-'} sub={assetSubtitle(summary.data)} toneColor="var(--brand-primary)" />
        <KpiCard label="Active Alerts" value={summary.data?.alerts.open ?? '-'} sub={`${summary.data?.alerts.critical ?? 0} critical · ${summary.data?.alerts.high ?? 0} high`} toneColor="var(--status-critical)" />
        <KpiCard label="Open Incidents" value={summary.data?.incidents.active ?? '-'} sub="Unresolved incident records" toneColor="var(--status-warning)" />
        <KpiCard label="Wireless Health" value={wirelessHealth.label} sub={wirelessHealth.sub} toneColor={wirelessHealth.color} />
        <KpiCard label="Agent / Appliance" value={applianceHealth.label} sub={applianceHealth.sub} toneColor={applianceHealth.color} />
      </KpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(360px, 0.85fr)', gap: 18, marginTop: 18 }}>
        <TopologyPanel topology={topology.data} summary={summary.data} />
        <WirelessPanel summary={summary.data} wireless={wireless.data} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginTop: 18 }}>
        <SecurityPanel summary={summary.data} />
        <IncidentsAlertsPanel summary={summary.data} activity={highPriorityActivity} />
        <SystemHealthPanel system={system.data} liveState={live.state} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.8fr)', gap: 18, marginTop: 18 }}>
        <RecentActivityPanel activity={activity.data} />
        <RoadmapPanels />
      </div>
    </PageShell>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
      <LoadingSkeleton label="Loading Control Center data..." />
      <KpiGrid min={170}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="card" style={{ height: 116, opacity: 0.72 }} />
        ))}
      </KpiGrid>
    </div>
  );
}

function TopologyPanel({ topology, summary }: { topology?: TopologySummary; summary?: DashboardSummary }) {
  const hasSites = Boolean(topology?.sites.length);
  const hasLinks = Boolean(topology?.wireless_links.length);
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader
        title={<><Router size={18} /> Network Topology Summary</>}
        action={<PanelLink href="/assets">Open Assets</PanelLink>}
      />
      <p style={panelCopy}>
        Topology graph is planned. Current view uses real inventory summary from sites, assets, wireless links, and active alert flags.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, margin: '14px 0' }}>
        <MetricCard label="Sites" value={topology?.sites.length ?? '-'} />
        <MetricCard label="Assets" value={summary?.assets.total ?? '-'} />
        <MetricCard label="Wireless Links" value={topology?.wireless_links.length ?? summary?.wireless_links.total ?? '-'} />
      </div>
      {!hasSites && !hasLinks ? (
        <EmptyState title="No topology inventory yet" message="Add sites/assets or create wireless links to build the topology foundation." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <TinyHeading>Sites</TinyHeading>
            {topology?.sites.slice(0, 5).map(site => (
              <div key={site.id} style={rowStyle}>
                <span style={{ fontWeight: 800 }}>{site.name}</span>
                <span style={{ color: site.has_active_alerts ? 'var(--status-critical)' : 'var(--text-secondary)' }}>{site.assets_count} assets</span>
              </div>
            ))}
          </div>
          <div>
            <TinyHeading>Wireless Links</TinyHeading>
            {topology?.wireless_links.slice(0, 5).map(link => (
              <div key={link.id} style={rowStyle}>
                <span style={{ fontWeight: 800 }}>{link.name}</span>
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><StatusBadge status={link.status} />{link.has_active_alerts && <SeverityBadge severity="critical" />}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function WirelessPanel({ summary, wireless }: { summary?: DashboardSummary; wireless?: DashboardWirelessHealth }) {
  const hasMeasurements = Boolean(wireless?.measurements);
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader
        title={<><Wifi size={18} /> Wireless Diagnostics Summary</>}
        action={<PanelLink href="/field-measurements">Field Measurements</PanelLink>}
      />
      {hasMeasurements ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 14 }}>
            <MetricCard label="Measurements" value={wireless?.measurements ?? '-'} />
            <MetricCard label="Links" value={summary?.wireless_links.total ?? '-'} />
            <MetricCard label="Avg RSSI" value={format(wireless?.avg_rssi, 'dBm')} />
            <MetricCard label="Avg SNR" value={format(wireless?.avg_snr, 'dB')} />
            <MetricCard label="Noise Floor" value={format(wireless?.avg_noise_floor, 'dBm')} />
            <MetricCard label="Packet Loss" value={format(wireless?.avg_packet_loss, '%')} />
          </div>
          <HonestNote>Automatic RF metrics depend on supported adapters. Manual field readings remain the current reliable source when adapters are unavailable.</HonestNote>
        </>
      ) : (
        <EmptyState
          title="No field measurements recorded yet"
          message="Create a manual RF measurement to populate wireless health. Automatic RF metrics may be unavailable for unsupported adapters."
        />
      )}
    </section>
  );
}

function SecurityPanel({ summary }: { summary?: DashboardSummary }) {
  const security = summary?.security_events;
  const totalEvents = security
    ? security.fortinet_high_severity + security.vpn_failures + security.ips_malware + security.blocked_traffic
    : null;
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><ShieldAlert size={18} /> Security & Syslog</>} action={<PanelLink href="/security">Security</PanelLink>} />
      <p style={panelCopy}>Security monitoring foundation with alerts, detection rules, IOCs, logs, and syslog profile support where configured.</p>
      {security ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <MetricCard label="Security Events" value={totalEvents ?? '-'} />
          <MetricCard label="Fortinet High Severity" value={security.fortinet_high_severity} />
          <MetricCard label="VPN Failures" value={security.vpn_failures} />
          <MetricCard label="IPS / Malware" value={security.ips_malware} />
          <MetricCard label="Blocked Traffic" value={security.blocked_traffic} />
        </div>
      ) : (
        <EmptyState title="No security summary exposed yet" message="Configure syslog ingestion and security rules to populate this foundation panel." />
      )}
    </section>
  );
}

function IncidentsAlertsPanel({ summary, activity }: { summary?: DashboardSummary; activity: DashboardActivity[] }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><AlertTriangle size={18} /> Incidents & Alerts</>} action={<PanelLink href="/alerts">Alerts</PanelLink>} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <MetricCard label="Open Alerts" value={summary?.alerts.open ?? '-'} />
        <MetricCard label="Open Incidents" value={summary?.incidents.active ?? '-'} />
        <MetricCard label="Critical Alerts" value={summary?.alerts.critical ?? '-'} />
        <MetricCard label="High Alerts" value={summary?.alerts.high ?? '-'} />
      </div>
      <TinyHeading>Recent high-priority activity</TinyHeading>
      {activity.length ? activity.map((item, index) => (
        <ActivityFeedItem
          key={`${item.type}-${item.event}-${index}`}
          title={`${item.event || 'activity'} · ${item.type}`}
          subtitle={item.title}
          severity={item.severity || 'info'}
        />
      )) : <EmptyState title="No critical or high activity" message="Alert and incident activity will appear here when real events are recorded." />}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <PanelLink href="/incidents">Open Incidents</PanelLink>
        <PanelLink href="/logs">Review Logs</PanelLink>
      </div>
    </section>
  );
}

function SystemHealthPanel({ system, liveState }: { system?: DashboardSystemStatus; liveState: string }) {
  const entries = Object.entries(system || {});
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><HardDrive size={18} /> Appliance / System Health</>} action={<PanelLink href="/admin/appliance">Appliance</PanelLink>} />
      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        <div style={rowStyle}><span>SSE live channel</span><LiveStatusPill label={liveState} state={liveState === 'live' ? 'live' : liveState === 'offline' ? 'offline' : 'degraded'} /></div>
        {entries.length ? entries.map(([name, value]) => (
          <div key={name} style={rowStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ServiceIcon name={name} />{labelize(name)}</span>
            <HealthBadge status={normalizeServiceStatus(value.status)} />
          </div>
        )) : (
          <EmptyState title="System status unavailable" message="The dashboard system-status endpoint did not return service details." />
        )}
      </div>
      <HonestNote>Unknown services are shown as unknown, not healthy. Disk and backup details require the appliance health endpoint in a later dashboard pass.</HonestNote>
    </section>
  );
}

function RecentActivityPanel({ activity }: { activity?: DashboardActivity[] }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Activity size={18} /> Recent Activity</>} action={<PanelLink href="/logs">Logs</PanelLink>} />
      {activity?.length ? activity.slice(0, 12).map((item, index) => (
        <ActivityFeedItem
          key={`${item.type}-${item.event}-${item.timestamp}-${index}`}
          title={<span>{item.event || 'activity'} · {item.type}</span>}
          subtitle={<span>{item.title}{item.timestamp ? ` · ${formatTimestamp(item.timestamp)}` : ''}</span>}
          severity={item.severity || eventSeverity(item.type, item.event)}
        />
      )) : (
        <EmptyState
          title="No recent activity yet"
          message="Activity appears after alerts, incidents, logs, field measurements, asset polling, or agent events are recorded."
        />
      )}
    </section>
  );
}

function RoadmapPanels() {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section className="card" style={{ ...panelStyle, minHeight: 0 }}>
        <SectionHeader title={<><Cloud size={18} /> Cloud & Hybrid</>} action={<PanelLink href="/cloud-hybrid">Roadmap</PanelLink>} />
        <LiveStatusPill label="Foundation" state="planned" />
        <p style={panelCopy}>No cloud credentials are configured. No data leaves the appliance by default. Future roadmap covers AWS, Azure, GCP, Cloudflare, VPN health, exposure checks, and hybrid topology.</p>
      </section>
      <section className="card" style={{ ...panelStyle, minHeight: 0 }}>
        <SectionHeader title={<><BrainCircuit size={18} /> AI Copilot</>} action={<PanelLink href="/ai-copilot">Roadmap</PanelLink>} />
        <LiveStatusPill label="Provider not configured" state="planned" />
        <p style={panelCopy}>AI Copilot is a privacy-first foundation area. No external AI provider is called by this dashboard. Future work will explain alerts, incidents, and wireless degradation with internal evidence and human approval boundaries.</p>
      </section>
    </div>
  );
}

function getNetworkHealth(summary?: DashboardSummary) {
  if (!summary) return { label: '-', sub: 'Awaiting dashboard summary', color: 'var(--text-muted)' };
  if (summary.assets.total === 0) return { label: 'Awaiting data', sub: 'No assets in inventory', color: 'var(--text-muted)' };
  if (summary.alerts.critical > 0 || summary.assets.offline > 0) return { label: 'Critical', sub: `${summary.assets.offline} offline · ${summary.alerts.critical} critical alerts`, color: 'var(--status-critical)' };
  if (summary.alerts.high > 0 || summary.assets.warning > 0) return { label: 'Degraded', sub: `${summary.assets.warning} warning assets · ${summary.alerts.high} high alerts`, color: 'var(--status-warning)' };
  return { label: 'Stable', sub: `${summary.assets.online}/${summary.assets.total} assets online`, color: 'var(--status-online)' };
}

function getWirelessHealth(summary?: DashboardSummary, wireless?: DashboardWirelessHealth) {
  if (!summary && !wireless) return { label: '-', sub: 'Awaiting wireless summary', color: 'var(--text-muted)' };
  if (!wireless?.measurements) return { label: 'Awaiting data', sub: `${summary?.wireless_links.total ?? 0} links · manual RF measurement required`, color: 'var(--text-muted)' };
  const loss = wireless.avg_packet_loss ?? 0;
  const snr = wireless.avg_snr ?? 99;
  if (loss > 5 || snr < 15) return { label: 'Poor', sub: `${wireless.measurements} measurements · review RF health`, color: 'var(--status-critical)' };
  if (loss > 1 || snr < 25) return { label: 'Degraded', sub: `${wireless.measurements} measurements · watch RF trends`, color: 'var(--status-warning)' };
  return { label: 'Measured', sub: `${wireless.measurements} field readings available`, color: 'var(--status-online)' };
}

function getApplianceHealth(system?: DashboardSystemStatus, liveState?: string) {
  if (!system) return { label: '-', sub: 'Awaiting system status', color: 'var(--text-muted)' };
  const statuses = Object.values(system).map(item => item.status.toLowerCase());
  if (liveState === 'offline' || statuses.some(status => status.includes('offline') || status.includes('error') || status.includes('failed'))) {
    return { label: 'Attention', sub: 'One or more services need review', color: 'var(--status-warning)' };
  }
  return { label: 'Operational', sub: `${Object.keys(system).length} service checks returned`, color: 'var(--status-online)' };
}

function assetSubtitle(summary?: DashboardSummary) {
  if (!summary) return 'Awaiting data';
  if (summary.assets.total === 0) return 'No assets discovered yet';
  return `${summary.assets.total} total · ${summary.assets.offline} offline`;
}

function normalizeServiceStatus(status: string) {
  const lower = status.toLowerCase();
  if (lower.includes('operational') || lower.includes('connected') || lower.includes('enabled') || lower.includes('supported') || lower.includes('healthy')) return 'online';
  if (lower.includes('planned') || lower.includes('unknown')) return 'unknown';
  if (lower.includes('0/') || lower.includes('offline') || lower.includes('failed') || lower.includes('error')) return 'degraded';
  return 'unknown';
}

function ServiceIcon({ name }: { name: string }) {
  if (name.includes('database')) return <Database size={14} color="var(--brand-cyan)" />;
  if (name.includes('agent')) return <Radio size={14} color="var(--status-online)" />;
  if (name.includes('api') || name.includes('auth')) return <Server size={14} color="var(--brand-primary)" />;
  return <HardDrive size={14} color="var(--text-muted)" />;
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ color: 'var(--brand-cyan)', fontWeight: 800, fontSize: '0.78rem' }}>{children}</Link>;
}

function TinyHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>{children}</div>;
}

function HonestNote({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>{children}</div>;
}

function format(value: number | null | undefined, unit: string) {
  return value == null ? '-' : `${value} ${unit}`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function labelize(value: string) {
  return value.replaceAll('_', ' ');
}

function eventSeverity(type: string, event: string) {
  const combined = `${type} ${event}`.toLowerCase();
  if (combined.includes('critical') || combined.includes('error')) return 'critical';
  if (combined.includes('warning') || combined.includes('failed')) return 'warning';
  return 'info';
}

const panelCopy: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '0.88rem',
  lineHeight: 1.55,
  margin: '0 0 12px',
};
