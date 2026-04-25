'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/api';
import type { DiscoveryScan, DiscoveredHost } from '@/lib/types';
import { Radar, Wifi, WifiOff, Clock, ArrowRight, Loader2, Server, Download } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function DiscoveryPage() {
  const [subnet, setSubnet] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [latestScanId, setLatestScanId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  // Fetch scan history
  const { data: scans } = useSWR<DiscoveryScan[]>('/discovery/scans', fetcher);
  
  // Fetch hosts from latest scan
  const { data: latestHosts } = useSWR<DiscoveredHost[]>(
    '/discovery/hosts/latest', 
    fetcher,
    { refreshInterval: isScanning ? 2000 : 0 }
  );

  const handleScan = async () => {
    if (!subnet.trim()) return;
    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch(`${API_BASE}/discovery/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet: subnet.trim() }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || `Scan failed with status ${response.status}`);
      }

      const scan = await response.json();
      setLatestScanId(scan.id);
      
      // Refresh data
      mutate('/discovery/scans');
      mutate('/discovery/hosts/latest');
    } catch (err: any) {
      setScanError(err.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const reachableHosts = latestHosts?.filter(h => h.is_reachable) || [];
  const unreachableHosts = latestHosts?.filter(h => !h.is_reachable) || [];

  return (
    <div>
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Radar size={32} color="var(--brand-primary)" />
        <h1>Network Discovery</h1>
      </div>
      <p className="page-subtitle" style={{ marginBottom: '24px' }}>
        Perform real ICMP ping sweeps to discover live hosts on your network. All results are from actual network probes.
      </p>

      {/* Scan Input */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>Launch Subnet Scan</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
          <input
            type="text"
            placeholder="Enter subnet (e.g. 192.168.1.0/24)"
            value={subnet}
            onChange={(e) => setSubnet(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isScanning && handleScan()}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
              fontSize: '1rem',
            }}
          />
          <button
            onClick={handleScan}
            disabled={isScanning || !subnet.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: isScanning ? 'rgba(59,130,246,0.3)' : 'var(--brand-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: isScanning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {isScanning ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Scanning...
              </>
            ) : (
              <>
                <Radar size={18} />
                Scan Network
              </>
            )}
          </button>
        </div>
        {scanError && (
          <div style={{ 
            marginTop: '12px', padding: '12px', 
            backgroundColor: 'rgba(239, 68, 68, 0.15)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px', color: '#ef4444', fontSize: '0.9rem' 
          }}>
            {scanError}
          </div>
        )}
        <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          ⚠️ Only scan networks you own or have permission to scan. Max subnet: /20 (4096 hosts).
        </p>
      </div>

      {/* Stats Summary */}
      {latestHosts && latestHosts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '20px', borderTop: '3px solid var(--brand-primary)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Scanned</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{latestHosts.length}</div>
          </div>
          <div className="card" style={{ padding: '20px', borderTop: '3px solid var(--status-online)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Reachable</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-online)' }}>{reachableHosts.length}</div>
          </div>
          <div className="card" style={{ padding: '20px', borderTop: '3px solid var(--status-critical)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Unreachable</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-critical)' }}>{unreachableHosts.length}</div>
          </div>
          <div className="card" style={{ padding: '20px', borderTop: '3px solid var(--brand-secondary)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Avg Response</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--brand-secondary)' }}>
              {reachableHosts.length > 0 
                ? (reachableHosts.reduce((sum, h) => sum + (h.response_time_ms || 0), 0) / reachableHosts.length).toFixed(1) 
                : '--'
              }
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}> ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Import as Assets Button */}
      {reachableHosts.length > 0 && (
        <div className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(59,130,246,0.2)', background: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(24,24,27,0.6) 100%)' }}>
          <div>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="var(--brand-secondary)" /> Import to Assets
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Add {reachableHosts.length} reachable hosts as real assets in the inventory
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {importResult && (
              <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                ✓ {importResult.imported} imported, {importResult.skipped} skipped
              </span>
            )}
            <button
              disabled={importing}
              onClick={async () => {
                setImporting(true);
                try {
                  const res = await fetch(`${API_BASE}/discovery/import-as-assets`, { method: 'POST' });
                  if (res.ok) setImportResult(await res.json());
                } finally { setImporting(false); }
              }}
              style={{
                padding: '10px 20px', backgroundColor: 'var(--brand-secondary)',
                color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600,
                cursor: importing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {importing ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Importing...</> : <><Download size={16} /> Import</>}
            </button>
          </div>
        </div>
      )}

      {/* Discovered Hosts Table */}
      {latestHosts && latestHosts.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              Discovered Hosts — Real Ping Results
            </h3>
          </div>
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>IP Address</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Hostname (rDNS)</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Response Time</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {latestHosts.map((host) => (
                  <tr 
                    key={host.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      {host.is_reachable ? (
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          color: 'var(--status-online)', fontWeight: 600, fontSize: '0.85rem'
                        }}>
                          <Wifi size={16} /> UP
                        </span>
                      ) : (
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          color: 'var(--status-critical)', fontWeight: 600, fontSize: '0.85rem'
                        }}>
                          <WifiOff size={16} /> DOWN
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-primary)' }}>
                      {host.ip_address}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {host.hostname_resolved || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>
                      {host.response_time_ms != null ? (
                        <span style={{ color: host.response_time_ms < 10 ? 'var(--status-online)' : host.response_time_ms < 100 ? 'var(--status-warning)' : 'var(--status-critical)' }}>
                          {host.response_time_ms.toFixed(2)} ms
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {host.last_seen ? new Date(host.last_seen).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scan History */}
      {scans && scans.length > 0 && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>Scan History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scans.map((scan) => (
              <div 
                key={scan.id} 
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', 
                  backgroundColor: 'rgba(0,0,0,0.2)', 
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-primary)' }}>{scan.subnet}</span>
                  <span style={{ 
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                    backgroundColor: scan.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color: scan.status === 'completed' ? '#10b981' : '#f59e0b',
                  }}>
                    {scan.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <span>🟢 {scan.reachable_hosts}</span>
                  <span>🔴 {scan.unreachable_hosts}</span>
                  {scan.duration_seconds && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> {scan.duration_seconds}s
                    </span>
                  )}
                  <span>{new Date(scan.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading spinner animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
