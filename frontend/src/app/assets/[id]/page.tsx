'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { Asset, Alert } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { Server, Activity, ShieldAlert, Cpu, HardDrive, TerminalSquare, AlertTriangle } from 'lucide-react';
import AlertsTable from '@/components/AlertsTable';

export default function AssetDashboard() {
  const params = useParams();
  const assetId = params.id as string;

  const { data: asset, error: assetError } = useSWR<Asset>(`/assets/${assetId}`, fetcher);
  const { data: alerts, error: alertsError } = useSWR<Alert[]>(`/alerts/?asset_id=${assetId}`, fetcher);

  if (!asset && !assetError) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading asset details...</div>;
  if (assetError) return <div style={{ padding: '40px', color: 'var(--status-critical)' }}>Failed to load asset details.</div>;
  if (!asset) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <Server size={32} color={asset.status === 'online' ? 'var(--status-online)' : 'var(--status-critical)'} />
            <h1 style={{ margin: 0, fontSize: '2rem' }}>{asset.hostname}</h1>
            <StatusBadge status={asset.status} type="asset" />
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>
            {asset.ip_address} • {asset.vendor || asset.os_info || 'Unknown OS'} • {asset.mac_address || 'No MAC'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ padding: '8px 16px', background: 'var(--bg-surface-hover)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <TerminalSquare size={16} /> Remote Shell
          </button>
        </div>
      </div>

      {/* Telemetry Mock (In a real scenario, this would come from the TSDB) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
                <Cpu size={32} color="var(--brand-secondary)" />
            </div>
            <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>CPU Load</div>
                <div style={{ fontSize: '2rem', fontWeight: 600 }}>24%</div>
            </div>
        </div>
        
        <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
                <Activity size={32} color="var(--brand-primary)" />
            </div>
            <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Memory</div>
                <div style={{ fontSize: '2rem', fontWeight: 600 }}>16 / 64 GB</div>
            </div>
        </div>

        <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
                <HardDrive size={32} color="var(--status-warning)" />
            </div>
            <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Disk I/O</div>
                <div style={{ fontSize: '2rem', fontWeight: 600 }}>450 MB/s</div>
            </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Active Alerts */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface-hover)' }}>
                <ShieldAlert size={20} color="var(--status-critical)" />
                <h3 style={{ margin: 0 }}>Active Alerts</h3>
            </div>
            {alerts && alerts.length > 0 ? (
                <AlertsTable alerts={alerts} limit={10} />
            ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={32} color="var(--brand-primary)" />
                    No active alerts for this asset.
                </div>
            )}
          </div>

          {/* Asset Metadata */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>Asset Properties</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Asset Type</div>
                    <div style={{ textTransform: 'capitalize', fontWeight: 500 }}>{asset.asset_type.replace('_', ' ')}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Vendor</div>
                    <div style={{ fontWeight: 500 }}>{asset.vendor || 'Unknown'}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Firmware / OS</div>
                    <div style={{ fontWeight: 500 }}>{asset.os_info || 'Unknown'}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Site ID</div>
                    <div style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{asset.site_id}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Asset ID</div>
                    <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{asset.id}</div>
                </div>
            </div>
          </div>
      </div>
    </div>
  );
}
