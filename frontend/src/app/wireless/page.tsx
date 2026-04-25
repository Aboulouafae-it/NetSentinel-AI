'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { WirelessLink } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { useRouter } from 'next/navigation';
import { RadioTower } from 'lucide-react';

export default function WirelessOverviewPage() {
  const { data: links, error } = useSWR<WirelessLink[]>('/wireless/links', fetcher);
  const router = useRouter();

  return (
    <div>
      <div className="page-title">
        <RadioTower size={32} color="var(--brand-primary)" />
        <h1>Wireless Link Intelligence</h1>
      </div>
      <p className="page-subtitle" style={{ marginBottom: '24px' }}>
        Monitor PTP/PTMP radio links, track RF metrics, and manage field diagnostics.
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Link Name</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Type</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Expected RSSI</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Max Capacity</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!links && !error && (
                <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading wireless links...</td></tr>
              )}
              {links?.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No wireless links configured.</td></tr>
              )}
              {links?.map((link) => (
                <tr 
                  key={link.id} 
                  onClick={() => router.push(`/wireless/links/${link.id}`)}
                  style={{ 
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '16px', fontWeight: 600, color: 'var(--brand-primary)' }}>{link.name}</td>
                  <td style={{ padding: '16px' }}>
                    <StatusBadge status={link.status} type="asset" />
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                    {link.link_type ? link.link_type.toUpperCase() : '-'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                    {link.expected_rssi_dbm ? `${link.expected_rssi_dbm} dBm` : '-'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--status-online)', fontWeight: 500 }}>
                    {link.theoretical_max_capacity_mbps ? `${link.theoretical_max_capacity_mbps} Mbps` : '-'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    →
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
