'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { useSearchParams } from 'next/navigation';
import { api, fetcher } from '@/lib/api';
import type { Asset } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { Network, Plus, Search, Server } from 'lucide-react';
import { EmptyState, ErrorState, LiveIndicator, LoadingSkeleton } from '@/components/ui';
import { useLiveEvents } from '@/lib/useLiveEvents';

const inputStyle: React.CSSProperties = {
  padding: '9px 10px',
  backgroundColor: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
};

const riskColors: Record<string, string> = {
  normal: '#10b981',
  warning: '#f59e0b',
  at_risk: '#ef4444',
  offline: '#64748b',
  unknown: '#94a3b8',
};

function AssetsPageContent() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get('type') || '';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [assetType, setAssetType] = useState(typeFilter);
  const [vendor, setVendor] = useState('');
  const [risk, setRisk] = useState('');
  const [page, setPage] = useState(0);
  const [polling, setPolling] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (assetType) params.set('asset_type', assetType);
    if (vendor) params.set('vendor', vendor);
    if (risk) params.set('risk', risk);
    params.set('skip', String(page * 50));
    params.set('limit', '50');
    return `/assets/?${params.toString()}`;
  }, [assetType, page, risk, search, status, vendor]);

  const { data: assets, error, isLoading } = useSWR<Asset[]>(query, fetcher);
  const refresh = useCallback(() => {
    mutate(query);
    mutate('/dashboard/summary');
  }, [query]);
  const live = useLiveEvents(refresh, ['asset_polled', 'activity_created']);
  const selected = assets?.find(asset => asset.id === selectedId) || assets?.[0] || null;

  const title = typeFilter === 'server' ? 'Datacenter Infrastructure' : typeFilter === 'network' ? 'Network & Edge Devices' : 'Asset Inventory';
  const subtitle = 'Monitor asset status, risk, related alerts, and last seen state.';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {typeFilter === 'server' ? <Server size={32} color="var(--brand-secondary)" /> : <Network size={32} color="var(--status-warning)" />}
            <h1>{title}</h1>
          </div>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          <button style={{ ...inputStyle, display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 800, cursor: 'pointer' }} title="MVP manual asset creation remains available through the API.">
            <Plus size={16} /> Add Asset
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '14px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input style={{ ...inputStyle, width: '100%' }} placeholder="Search hostname, IP, vendor..." value={search} onChange={e => { setPage(0); setSearch(e.target.value); }} />
        </div>
        <select style={inputStyle} value={status} onChange={e => { setPage(0); setStatus(e.target.value); }}>
          <option value="">All statuses</option><option value="online">Online</option><option value="degraded">Warning</option><option value="offline">Offline</option><option value="unknown">Unknown</option>
        </select>
        <select style={inputStyle} value={assetType} onChange={e => { setPage(0); setAssetType(e.target.value); }}>
          <option value="">All types</option><option value="server">Server</option><option value="workstation">Workstation</option><option value="router">Router</option><option value="switch">Switch</option><option value="firewall">Firewall</option><option value="access_point">Access point</option><option value="other">Other</option>
        </select>
        <input style={inputStyle} placeholder="Vendor" value={vendor} onChange={e => { setPage(0); setVendor(e.target.value); }} />
        <select style={inputStyle} value={risk} onChange={e => { setPage(0); setRisk(e.target.value); }}>
          <option value="">All risk</option><option value="normal">Normal</option><option value="warning">Warning</option><option value="at_risk">At risk</option><option value="offline">Offline</option><option value="unknown">Unknown</option>
        </select>
      </div>

      {error && <ErrorState message="Unable to load assets." />}
      {isLoading && <LoadingSkeleton label="Loading assets..." />}

      {assets && assets.length === 0 && <EmptyState title="No assets match the current filters" message="Clear filters or add assets through discovery, telemetry, or the API." />}

      {assets && assets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '18px', alignItems: 'start' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
                  {['Hostname', 'IP', 'Type', 'Status', 'Risk', 'Vendor/OS', 'Last Seen'].map(header => (
                    <th key={header} style={{ padding: '14px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id} onClick={() => setSelectedId(asset.id)} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', backgroundColor: selected?.id === asset.id ? 'rgba(59,130,246,0.08)' : 'transparent' }}>
                    <td style={{ padding: '14px', fontWeight: 700, color: 'var(--brand-primary)' }}>{asset.hostname}</td>
                    <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>{asset.ip_address || '-'}</td>
                    <td style={{ padding: '14px', textTransform: 'capitalize' }}>{asset.asset_type.replace('_', ' ')}</td>
                    <td style={{ padding: '14px' }}><StatusBadge status={asset.status} type="asset" /></td>
                    <td style={{ padding: '14px' }}><RiskBadge value={asset.risk_level || 'unknown'} /></td>
                    <td style={{ padding: '14px', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>{asset.vendor || asset.os_info || '-'}</td>
                    <td style={{ padding: '14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{asset.last_seen ? new Date(asset.last_seen).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', color: 'var(--text-muted)' }}>
              <button style={inputStyle} disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Previous</button>
              <span>Page {page + 1}</span>
              <button style={inputStyle} disabled={assets.length < 50} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>

          <aside className="card" style={{ padding: '20px', position: 'sticky', top: '18px' }}>
            {selected ? (
              <>
                <h2 style={{ fontSize: '1.12rem', margin: '0 0 8px' }}>{selected.hostname}</h2>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '14px' }}>{selected.ip_address || 'No IP address'} · {selected.asset_type.replace('_', ' ')}</div>
                <Panel label="Status"><StatusBadge status={selected.status} type="asset" /></Panel>
                <Panel label="Risk"><RiskBadge value={selected.risk_level || 'unknown'} /></Panel>
        <Panel label="Related Alerts">{selected.related_alerts_count || 0} active alerts</Panel>
        <Panel label="Last Seen">{selected.last_seen ? new Date(selected.last_seen).toLocaleString() : 'No last_seen telemetry yet'}</Panel>
        <Panel label="Polling">
          <div>Status: {selected.last_poll_status || 'never polled'}</div>
          <div>Source: {selected.last_telemetry_source || '—'}</div>
          <div>Latency: {selected.last_poll_latency_ms != null ? `${selected.last_poll_latency_ms} ms` : '—'}</div>
          <div>Error: {selected.last_poll_error || '—'}</div>
          <button
            style={{ ...inputStyle, marginTop: '10px', cursor: polling ? 'not-allowed' : 'pointer', fontWeight: 800 }}
            disabled={polling}
            onClick={async () => {
              setPolling(true);
              try {
                await api.assets.poll(selected.id);
                mutate(query);
              } finally {
                setPolling(false);
              }
            }}
          >
            {polling ? 'Polling...' : 'Poll Now'}
          </button>
        </Panel>
                <Panel label="Risk Explanation">
                  {(selected.risk_reasons || ['No risk explanation available.']).map(reason => <div key={reason} style={{ marginBottom: '6px' }}>{reason}</div>)}
                </Panel>
                <Panel label="Recent Activity">
                  <span style={{ color: 'var(--text-muted)' }}>MVP: asset-specific activity will use audit events once normalized.</span>
                </Panel>
              </>
            ) : <div style={{ color: 'var(--text-muted)' }}>Select an asset for monitoring details.</div>}
          </aside>
        </div>
      )}
    </div>
  );
}

function RiskBadge({ value }: { value: string }) {
  const color = riskColors[value] || riskColors.unknown;
  return <span style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}55`, padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' }}>{value.replace('_', ' ')}</span>;
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return <section style={{ marginTop: '16px' }}><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>{label}</div><div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{children}</div></section>;
}

export default function AssetsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading assets...</div>}>
      <AssetsPageContent />
    </Suspense>
  );
}
