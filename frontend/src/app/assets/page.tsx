'use client';

import useSWR from 'swr';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api';
import type { Asset } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { Server, Network } from 'lucide-react';

export default function AssetsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeFilter = searchParams.get('type');
  
  // In a real app, the filter should be passed to the API. 
  // For now, we filter client-side for immediate feedback.
  const { data: allAssets, error } = useSWR<Asset[]>('/assets/', fetcher);
  
  let assets = allAssets;
  let title = "Asset Inventory";
  let subtitle = "Manage and monitor all discovered network devices and servers.";
  
  if (typeFilter === 'server') {
      assets = allAssets?.filter(a => a.asset_type === 'server' || a.asset_type === 'workstation');
      title = "Datacenter Infrastructure";
      subtitle = "Manage core compute nodes and hypervisors.";
  } else if (typeFilter === 'network') {
      assets = allAssets?.filter(a => ['router', 'switch', 'firewall', 'access_point'].includes(a.asset_type));
      title = "Network & Edge Devices";
      subtitle = "Manage switches, firewalls, and edge routing topology.";
  }

  return (
    <div>
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {typeFilter === 'server' && <Server size={32} color="var(--brand-secondary)" />}
        {typeFilter === 'network' && <Network size={32} color="var(--status-warning)" />}
        <h1>{title}</h1>
      </div>
      <p className="page-subtitle" style={{ marginBottom: '24px' }}>
        {subtitle}
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Hostname</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>IP Address</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Type</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Vendor/OS</th>
              </tr>
            </thead>
            <tbody>
              {!assets && !error && (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading assets...</td></tr>
              )}
              {assets?.map((asset) => (
                <tr 
                  key={asset.id} 
                  onClick={() => router.push(`/assets/${asset.id}`)}
                  style={{ 
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '16px', fontWeight: 500, color: 'var(--brand-primary)' }}>{asset.hostname}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{asset.ip_address || '-'}</td>
                  <td style={{ padding: '16px', textTransform: 'capitalize' }}>{asset.asset_type.replace('_', ' ')}</td>
                  <td style={{ padding: '16px' }}>
                    <StatusBadge status={asset.status} type="asset" />
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {asset.vendor || asset.os_info || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
