'use client';

import { Fragment, useCallback, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { PaginatedLogs, LogEntry } from '@/lib/types';
import styles from './page.module.css';
import { ActionButton, EmptyState, ErrorState, FilterBar, LiveIndicator, LoadingSkeleton, PageHeader, SeverityBadge } from '@/components/ui';
import { useLiveEvents } from '@/lib/useLiveEvents';

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [vendorProfile, setVendorProfile] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [srcIp, setSrcIp] = useState<string>('');
  const [dstIp, setDstIp] = useState<string>('');
  const [user, setUser] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  const size = 50;
  
  // Construct query params
  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });
  if (level) queryParams.append('level', level);
  if (source) queryParams.append('source', source);
  if (search) queryParams.append('q', search);
  if (vendorProfile) queryParams.append('vendor_profile', vendorProfile);
  if (category) queryParams.append('category', category);
  if (action) queryParams.append('action', action);
  if (srcIp) queryParams.append('src_ip', srcIp);
  if (dstIp) queryParams.append('dst_ip', dstIp);
  if (user) queryParams.append('user', user);

  const query = `/logs/?${queryParams.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<PaginatedLogs>(query, fetcher);
  const refresh = useCallback(() => mutate(), [mutate]);
  const live = useLiveEvents(refresh, ['syslog_ingested', 'activity_created']);

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString();
  };

  const getLevelClass = (lvl: string) => {
    return styles[`level_${lvl}`] || styles.level_info;
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="Centralized Logs"
        subtitle="Search and filter system logs, agent telemetry, Fortinet events, and network activity."
        actions={<LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />}
      />

      <FilterBar>
        <select 
          className={styles.filterSelect}
          value={level} 
          onChange={(e) => { setLevel(e.target.value); setPage(1); }}
        >
          <option value="">All Levels</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
        <select
          className={styles.filterSelect}
          value={vendorProfile}
          onChange={(e) => { setVendorProfile(e.target.value); setPage(1); }}
        >
          <option value="">All Profiles</option>
          <option value="fortinet">Fortinet</option>
        </select>
        <select
          className={styles.filterSelect}
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          {FORTINET_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
        </select>
        <select
          className={styles.filterSelect}
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
        >
          <option value="">All Actions</option>
          <option value="deny">Deny</option>
          <option value="accept">Accept</option>
          <option value="blocked">Blocked</option>
        </select>
        
        <input 
          type="text" 
          placeholder="Source IP or hostname..." 
          className={styles.filterInput}
          value={source}
          onChange={(e) => { setSource(e.target.value); setPage(1); }}
        />
        <input
          type="text"
          placeholder="Search message..."
          className={styles.filterInput}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <input
          type="text"
          placeholder="Source IP..."
          className={styles.filterInput}
          value={srcIp}
          onChange={(e) => { setSrcIp(e.target.value); setPage(1); }}
        />
        <input
          type="text"
          placeholder="Destination IP..."
          className={styles.filterInput}
          value={dstIp}
          onChange={(e) => { setDstIp(e.target.value); setPage(1); }}
        />
        <input
          type="text"
          placeholder="User..."
          className={styles.filterInput}
          value={user}
          onChange={(e) => { setUser(e.target.value); setPage(1); }}
        />
      </FilterBar>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Timestamp</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Level</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Profile</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Category</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Flow</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Action</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>User</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Message</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9}><LoadingSkeleton label="Loading logs..." /></td></tr>
              )}
              {error && (
                <tr><td colSpan={9}><ErrorState message="Error loading logs" /></td></tr>
              )}
              {data?.items.length === 0 && (
                <tr><td colSpan={9}><EmptyState title="No logs found" message="Syslog-ingested entries will appear here as agents forward events." /></td></tr>
              )}
              {data?.items.map((log: LogEntry) => {
                const meta = log.metadata_json || {};
                const normalized = meta.normalized || {};
                const parsed = normalized.parsed || {};
                const classification = normalized.classification || {};
                return (
                <Fragment key={log.id}>
                <tr className={styles.logRow}>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <SeverityBadge severity={log.level} />
                    </td>
                    <td style={{ padding: '16px', fontWeight: 700, fontSize: '0.82rem', color: meta.vendor_profile === 'fortinet' ? '#f59e0b' : 'var(--text-secondary)' }}>
                      {meta.vendor_profile || log.source}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {(meta.category || classification.category || '—').replaceAll('_', ' ')}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {parsed.srcip || meta.source_ip || '—'} → {parsed.dstip || '—'}
                      <div style={{ color: 'var(--text-muted)', marginTop: '3px' }}>{parsed.service || '—'}</div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.78rem', color: parsed.action === 'deny' ? '#ef4444' : 'var(--text-secondary)' }}>
                      {parsed.action || '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {parsed.user || '—'}
                    </td>
                    <td style={{ padding: '16px' }} className={styles.messageCell} title={log.message}>
                      {classification.summary || log.message}
                      {meta.alert_created && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>Alert created</div>}
                      {log.asset_id && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>Linked asset: {log.asset_id}</div>}
                      {meta.unlinked_source && <div style={{ color: '#f59e0b', fontSize: '0.75rem', marginTop: '4px' }}>Unlinked source</div>}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <ActionButton color="#64748b" onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}>
                        {expandedLogId === log.id ? 'Hide Raw' : 'Raw'}
                      </ActionButton>
                    </td>
                  </tr>
                  {expandedLogId === log.id && (
                    <tr>
                      <td colSpan={9} style={{ padding: '0 16px 16px' }}>
                        <pre style={{ margin: 0, padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.78rem' }}>{log.message}</pre>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {data && data.total > size && (
          <div className={styles.pagination}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Showing {(page - 1) * size + 1} to {Math.min(page * size, data.total)} of {data.total} logs
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={styles.pageButton}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <button 
                className={styles.pageButton}
                disabled={page * size >= data.total}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const FORTINET_CATEGORIES = [
  'firewall_blocked_traffic',
  'vpn_login_success',
  'vpn_login_failure',
  'admin_login_success',
  'admin_login_failure',
  'ips_attack_detected',
  'malware_detected',
  'web_filter_block',
  'interface_down',
  'interface_up',
  'ha_failover',
  'config_changed',
  'system_event',
  'unknown_fortinet_event',
];
