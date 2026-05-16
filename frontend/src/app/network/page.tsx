'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import {
  Activity,
  AlertTriangle,
  Clock,
  Compass,
  Eye,
  Network,
  Radar,
  RefreshCw,
  Router,
  Search,
  Server,
  WifiOff,
} from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import type { Alert, Asset, DashboardSummary, DiscoveryScan, TopologySummary } from '@/lib/types';
import { useLiveEvents } from '@/lib/useLiveEvents';
import {
  ActionButton,
  AnalysisDrawer,
  EmptyState,
  ErrorState,
  HealthBadge,
  KpiCard,
  KpiGrid,
  LiveIndicator,
  LoadingSkeleton,
  MetricCard,
  ModuleHeader,
  PageShell,
  SectionHeader,
  SeverityBadge,
  StatusBadge,
} from '@/components/ui';

const inputStyle: React.CSSProperties = {
  padding: '9px 10px',
  backgroundColor: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 6,
  color: 'var(--text-primary)',
};

const panelStyle: React.CSSProperties = { padding: 18, minHeight: 220 };
const rowStyle: React.CSSProperties = {
  padding: '10px 0',
  borderBottom: '1px solid var(--border-subtle)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  fontSize: '0.86rem',
};

export default function NetworkOperationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pollingId, setPollingId] = useState<string | null>(null);
  const assets = useSWR<Asset[]>('/assets/?limit=200', fetcher);
  const alerts = useSWR<Alert[]>('/alerts/', fetcher);
  const scans = useSWR<DiscoveryScan[]>('/discovery/scans', fetcher);
  const summary = useSWR<DashboardSummary>('/dashboard/summary', fetcher);
  const topology = useSWR<TopologySummary>('/dashboard/topology-summary', fetcher);

  const refreshAll = useCallback(() => {
    assets.mutate();
    alerts.mutate();
    scans.mutate();
    summary.mutate();
    topology.mutate();
  }, [alerts, assets, scans, summary, topology]);
  const live = useLiveEvents(refreshAll, ['asset_polled', 'alert_created', 'alert_updated', 'activity_created']);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets.data || [];
    return (assets.data || []).filter(asset => [
      asset.hostname,
      asset.ip_address,
      asset.vendor,
      asset.os_info,
      asset.asset_type,
      asset.last_telemetry_source,
    ].filter(Boolean).some(value => String(value).toLowerCase().includes(q)));
  }, [assets.data, search]);

  const selected = filteredAssets.find(asset => asset.id === selectedId) || filteredAssets[0] || null;
  const assetAlerts = useMemo(() => (alerts.data || []).filter(alert => alert.asset_id), [alerts.data]);
  const activeNetworkAlerts = assetAlerts.filter(alert => ['open', 'acknowledged', 'escalated'].includes(alert.status));
  const recentlyPolled = (assets.data || []).filter(asset => asset.last_polled_at).sort(compareLastPolled).slice(0, 6);
  const pollErrors = (assets.data || []).filter(asset => asset.last_poll_error).slice(0, 6);
  const staleAssets = (assets.data || []).filter(asset => isStale(asset.last_seen)).slice(0, 6);
  const typeCounts = countBy(assets.data || [], asset => asset.asset_type);
  const vendorCounts = countBy((assets.data || []).filter(asset => asset.vendor), asset => asset.vendor || 'Unknown');
  const latestScan = scans.data?.[0] || null;
  const hasError = assets.error || alerts.error || scans.error || summary.error || topology.error;
  const isLoading = assets.isLoading || alerts.isLoading || scans.isLoading || summary.isLoading || topology.isLoading;

  const pollSelected = async () => {
    if (!selected) return;
    setPollingId(selected.id);
    try {
      await api.assets.poll(selected.id);
      mutate('/assets/?limit=200');
      mutate('/dashboard/summary');
      mutate('/dashboard/recent-activity');
    } finally {
      setPollingId(null);
    }
  };

  return (
    <PageShell>
      <ModuleHeader
        eyebrow="Network Operations"
        title="Network Operations Workspace"
        subtitle="Assets, discovery, topology summary, polling status, reachability, and network-related alerts from real MVP data sources."
        icon={<Network size={30} color="var(--brand-cyan)" />}
        actions={<>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          <ActionButton onClick={refreshAll}><RefreshCw size={16} /> Refresh</ActionButton>
        </>}
      />

      {hasError && (
        <div style={{ marginBottom: 16 }}>
          <ErrorState message="Unable to load one or more Network Operations sources. Check backend availability and organization data." />
        </div>
      )}
      {isLoading && <LoadingSkeleton label="Loading network operations data..." />}

      <KpiGrid min={170}>
        <KpiCard label="Total Assets" value={summary.data?.assets.total ?? assets.data?.length ?? '-'} sub="Inventory records" toneColor="var(--brand-primary)" />
        <KpiCard label="Online Assets" value={summary.data?.assets.online ?? countStatus(assets.data, 'online')} sub="Calculated from asset state" toneColor="var(--status-online)" />
        <KpiCard label="Offline Assets" value={summary.data?.assets.offline ?? countStatus(assets.data, 'offline')} sub="Needs reachability review" toneColor="var(--status-critical)" />
        <KpiCard label="At Risk / Degraded" value={summary.data?.assets.warning ?? countAtRisk(assets.data)} sub="Risk and warning indicators" toneColor="var(--status-warning)" />
        <KpiCard label="Network Alerts" value={activeNetworkAlerts.length} sub={`${countSeverity(activeNetworkAlerts, 'critical')} critical · ${countSeverity(activeNetworkAlerts, 'high')} high`} toneColor="var(--status-critical)" />
        <KpiCard label="Recently Polled" value={recentlyPolled.length} sub="Assets with poll history" toneColor="var(--brand-cyan)" />
      </KpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 18, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <AssetsOverviewPanel assets={assets.data || []} typeCounts={typeCounts} vendorCounts={vendorCounts} />
            <TopologyPanel topology={topology.data} summary={summary.data} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <PollingPanel recent={recentlyPolled} errors={pollErrors} stale={staleAssets} onSelect={setSelectedId} />
            <DiscoveryPanel scans={scans.data || []} latestScan={latestScan} />
          </div>

          <NetworkAlertsPanel alerts={activeNetworkAlerts} />

          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 18, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <SectionHeader title={<><Server size={18} /> Asset Inventory</>} action={<PanelLink href="/assets">Full Assets</PanelLink>} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={16} color="var(--text-muted)" />
                <input style={{ ...inputStyle, width: 260 }} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search hostname, IP, vendor..." />
              </div>
            </div>
            <AssetTable assets={filteredAssets} selectedId={selected?.id || null} onSelect={setSelectedId} />
          </section>
        </div>

        <DeviceDetailsDrawer selected={selected} polling={pollingId === selected?.id} onPoll={pollSelected} />
      </div>
    </PageShell>
  );
}

function AssetsOverviewPanel({ assets, typeCounts, vendorCounts }: { assets: Asset[]; typeCounts: Array<[string, number]>; vendorCounts: Array<[string, number]> }) {
  const statusCounts = countBy(assets, asset => asset.status);
  const riskCounts = countBy(assets, asset => asset.risk_level || 'unknown');
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Activity size={18} /> Assets Overview</>} action={<PanelLink href="/assets">Manage</PanelLink>} />
      {assets.length === 0 ? (
        <EmptyState title="Awaiting asset telemetry" message="Add assets through discovery, telemetry, or the API before NOC inventory summaries appear." />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <MiniDistribution title="Status" rows={statusCounts} />
          <MiniDistribution title="Risk" rows={riskCounts} />
          <MiniDistribution title="Asset Types" rows={typeCounts.slice(0, 5)} />
          <MiniDistribution title="Top Vendors" rows={vendorCounts.slice(0, 5)} empty="Vendor data not available yet." />
        </div>
      )}
    </section>
  );
}

function TopologyPanel({ topology, summary }: { topology?: TopologySummary; summary?: DashboardSummary }) {
  const sites = topology?.sites || [];
  const links = topology?.wireless_links || [];
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Compass size={18} /> Topology Summary</>} action={<PanelLink href="/assets">Inventory</PanelLink>} />
      <p style={panelCopy}>Topology graph is planned. This panel uses real inventory counts only and does not draw an inferred map.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        <MetricCard label="Sites" value={sites.length} />
        <MetricCard label="Assets" value={summary?.assets.total ?? '-'} />
        <MetricCard label="Links" value={links.length} />
      </div>
      {sites.length === 0 && links.length === 0 ? (
        <EmptyState title="No topology relationships yet" message="Create sites, assets, or wireless links to build topology context." />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {sites.slice(0, 4).map(site => (
            <div key={site.id} style={rowStyle}>
              <span style={{ fontWeight: 800 }}>{site.name}</span>
              <span style={{ color: site.has_active_alerts ? 'var(--status-critical)' : 'var(--text-secondary)' }}>{site.assets_count} assets</span>
            </div>
          ))}
          {links.slice(0, 3).map(link => (
            <div key={link.id} style={rowStyle}>
              <span style={{ fontWeight: 800 }}>{link.name}</span>
              <StatusBadge status={link.status} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PollingPanel({ recent, errors, stale, onSelect }: { recent: Asset[]; errors: Asset[]; stale: Asset[]; onSelect: (id: string) => void }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><RefreshCw size={18} /> Polling & Reachability</>} />
      {recent.length === 0 && errors.length === 0 && stale.length === 0 ? (
        <EmptyState title="No polling history yet" message="Select an asset and use Poll Now, or register an agent to provide telemetry." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <AssetList title="Recently checked" assets={recent} onSelect={onSelect} />
          <AssetList title="Poll errors" assets={errors} onSelect={onSelect} tone="critical" />
          <AssetList title="Stale last seen" assets={stale} onSelect={onSelect} tone="warning" />
        </div>
      )}
    </section>
  );
}

function DiscoveryPanel({ scans, latestScan }: { scans: DiscoveryScan[]; latestScan: DiscoveryScan | null }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Radar size={18} /> Discovery Status</>} action={<PanelLink href="/discovery">Discovery</PanelLink>} />
      {!latestScan ? (
        <EmptyState title="No discovery scan history" message="Run discovery manually from the Discovery page. NetSentinel AI will not start broad scans automatically." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <MetricCard label="Latest Subnet" value={<span style={{ fontFamily: 'monospace' }}>{latestScan.subnet}</span>} />
          <div style={rowStyle}><span>Status</span><StatusBadge status={latestScan.status} /></div>
          <div style={rowStyle}><span>Reachable Hosts</span><strong>{latestScan.reachable_hosts}</strong></div>
          <div style={rowStyle}><span>Unreachable Hosts</span><strong>{latestScan.unreachable_hosts}</strong></div>
          <div style={rowStyle}><span>Scan History</span><strong>{scans.length}</strong></div>
          {latestScan.error_message && <div style={{ color: 'var(--status-critical)', fontSize: '0.84rem' }}>{latestScan.error_message}</div>}
        </div>
      )}
    </section>
  );
}

function NetworkAlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><AlertTriangle size={18} /> Network Alerts</>} action={<PanelLink href="/alerts">Alerts</PanelLink>} />
      {alerts.length === 0 ? (
        <EmptyState title="No active asset-linked alerts" message="Network alerts appear here when real alert records are linked to assets." />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {alerts.slice(0, 8).map(alert => (
            <div key={alert.id} style={{ ...rowStyle, alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800 }}>{alert.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{alert.source || 'unknown source'} · {alert.last_seen ? new Date(alert.last_seen).toLocaleString() : new Date(alert.created_at).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <SeverityBadge severity={alert.severity} />
                <StatusBadge status={alert.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AssetTable({ assets, selectedId, onSelect }: { assets: Asset[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (assets.length === 0) {
    return <EmptyState title="No assets match current search" message="Clear the search or add assets through discovery, telemetry, or the API." />;
  }
  return (
    <div className="table-container">
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
            {['Device', 'IP', 'Type', 'Status', 'Risk', 'Polling', 'Last Seen'].map(header => (
              <th key={header} style={tableHeaderStyle}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.map(asset => (
            <tr key={asset.id} onClick={() => onSelect(asset.id)} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', backgroundColor: selectedId === asset.id ? 'rgba(14,165,233,0.09)' : 'transparent' }}>
              <td style={tableCellStyle}>
                <div style={{ fontWeight: 800, color: 'var(--brand-cyan)' }}>{asset.hostname}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{asset.vendor || asset.os_info || 'No vendor/OS metadata'}</div>
              </td>
              <td style={tableCellStyle}>{asset.ip_address || '-'}</td>
              <td style={{ ...tableCellStyle, textTransform: 'capitalize' }}>{asset.asset_type.replaceAll('_', ' ')}</td>
              <td style={tableCellStyle}><StatusBadge status={asset.status} /></td>
              <td style={tableCellStyle}><HealthBadge status={asset.risk_level || 'unknown'} /></td>
              <td style={tableCellStyle}>
                <div>{asset.last_poll_status || 'never polled'}</div>
                <div style={{ color: asset.last_poll_error ? 'var(--status-critical)' : 'var(--text-muted)', fontSize: '0.76rem' }}>{asset.last_poll_error || formatMs(asset.last_poll_latency_ms)}</div>
              </td>
              <td style={{ ...tableCellStyle, whiteSpace: 'nowrap' }}>{formatDate(asset.last_seen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeviceDetailsDrawer({ selected, polling, onPoll }: { selected: Asset | null; polling: boolean; onPoll: () => Promise<void> }) {
  return (
    <AnalysisDrawer title="Device Details" subtitle="Selected network asset, polling state, and safe actions.">
      {!selected ? (
        <EmptyState title="Select a device" message="Choose an asset to inspect reachability, risk, alerts, and polling metadata." />
      ) : (
        <>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.18rem' }}>{selected.hostname}</h2>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 14 }}>{selected.ip_address || 'No IP address'} · {selected.asset_type.replaceAll('_', ' ')}</div>
          <DetailsRow label="Status"><StatusBadge status={selected.status} /></DetailsRow>
          <DetailsRow label="Risk"><HealthBadge status={selected.risk_level || 'unknown'} /></DetailsRow>
          <DetailsRow label="Vendor">{selected.vendor || 'Not available yet'}</DetailsRow>
          <DetailsRow label="OS / Info">{selected.os_info || 'Not available yet'}</DetailsRow>
          <DetailsRow label="Last Seen">{formatDate(selected.last_seen)}</DetailsRow>
          <DetailsRow label="Related Alerts">{selected.related_alerts_count || 0}</DetailsRow>
          <DetailsRow label="Polling Status">{selected.last_poll_status || 'never polled'}</DetailsRow>
          <DetailsRow label="Polling Source">{selected.last_telemetry_source || 'Not available yet'}</DetailsRow>
          <DetailsRow label="Latency">{formatMs(selected.last_poll_latency_ms)}</DetailsRow>
          <DetailsRow label="Packet Loss">{selected.last_poll_packet_loss_percent != null ? `${selected.last_poll_packet_loss_percent}%` : 'Not available yet'}</DetailsRow>
          <DetailsRow label="Last Poll">{formatDate(selected.last_polled_at)}</DetailsRow>
          <DetailsRow label="Poll Error">{selected.last_poll_error || 'None recorded'}</DetailsRow>
          <DetailsRow label="Risk Notes">
            {(selected.risk_reasons || ['No structured risk explanation available.']).map(reason => <div key={reason}>{reason}</div>)}
          </DetailsRow>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
            <ActionButton onClick={onPoll} disabled={polling}>{polling ? <><RefreshCw size={16} className="spin" /> Polling</> : <><RefreshCw size={16} /> Poll Now</>}</ActionButton>
            <PanelButton href={`/alerts`}>View Alerts</PanelButton>
            <PanelButton href={`/logs`}>View Logs</PanelButton>
            <PanelButton href={selected.asset_type === 'access_point' ? '/radio-devices' : '/assets'}>Related Devices</PanelButton>
          </div>
        </>
      )}
    </AnalysisDrawer>
  );
}

function MiniDistribution({ title, rows, empty }: { title: string; rows: Array<[string, number]>; empty?: string }) {
  return (
    <div>
      <TinyHeading>{title}</TinyHeading>
      {rows.length ? rows.map(([name, count]) => (
        <div key={name} style={rowStyle}>
          <span style={{ textTransform: 'capitalize' }}>{name.replaceAll('_', ' ')}</span>
          <strong>{count}</strong>
        </div>
      )) : <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{empty || 'No data available yet.'}</div>}
    </div>
  );
}

function AssetList({ title, assets, onSelect, tone = 'info' }: { title: string; assets: Asset[]; onSelect: (id: string) => void; tone?: 'info' | 'warning' | 'critical' }) {
  if (assets.length === 0) return null;
  const color = tone === 'critical' ? 'var(--status-critical)' : tone === 'warning' ? 'var(--status-warning)' : 'var(--brand-cyan)';
  return (
    <div>
      <TinyHeading>{title}</TinyHeading>
      {assets.slice(0, 4).map(asset => (
        <button key={asset.id} onClick={() => onSelect(asset.id)} style={{ ...rowButtonStyle, borderLeft: `3px solid ${color}` }}>
          <span>
            <strong>{asset.hostname}</strong>
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{asset.ip_address || '-'}</span>
          </span>
          <span style={{ color }}>{asset.last_poll_error || asset.last_poll_status || formatDate(asset.last_polled_at || asset.last_seen)}</span>
        </button>
      ))}
    </div>
  );
}

function DetailsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 14 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>{children}</div>
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ color: 'var(--brand-cyan)', fontWeight: 800, fontSize: '0.78rem' }}>{children}</Link>;
}

function PanelButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ padding: '9px 10px', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-secondary)', fontWeight: 800, textAlign: 'center', fontSize: '0.82rem' }}>{children}</Link>;
}

function TinyHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>{children}</div>;
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function countStatus(assets: Asset[] | undefined, status: Asset['status']) {
  return (assets || []).filter(asset => asset.status === status).length;
}

function countAtRisk(assets: Asset[] | undefined) {
  return (assets || []).filter(asset => asset.status === 'degraded' || asset.risk_level === 'warning' || asset.risk_level === 'at_risk').length;
}

function countSeverity(alerts: Alert[], severity: Alert['severity']) {
  return alerts.filter(alert => alert.severity === severity).length;
}

function compareLastPolled(a: Asset, b: Asset) {
  return dateValue(b.last_polled_at) - dateValue(a.last_polled_at);
}

function isStale(value: string | null) {
  if (!value) return true;
  return Date.now() - dateValue(value) > 1000 * 60 * 60 * 24 * 7;
}

function dateValue(value: string | null) {
  if (!value) return 0;
  const date = new Date(value).getTime();
  return Number.isFinite(date) ? date : 0;
}

function formatDate(value: string | null) {
  if (!value) return 'Not available yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatMs(value: number | null) {
  return value == null ? 'Latency not available' : `${value} ms`;
}

const panelCopy: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '0.88rem',
  lineHeight: 1.55,
  margin: '0 0 12px',
};

const tableHeaderStyle: React.CSSProperties = {
  padding: 14,
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

const tableCellStyle: React.CSSProperties = {
  padding: 14,
  color: 'var(--text-secondary)',
  fontSize: '0.86rem',
};

const rowButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  alignItems: 'center',
  padding: '9px 10px',
  border: '1px solid var(--border-subtle)',
  borderRadius: 6,
  background: 'rgba(0,0,0,0.16)',
  color: 'var(--text-secondary)',
  textAlign: 'left',
};
