'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { PaginatedLogs, LogEntry } from '@/lib/types';
import styles from './page.module.css';
import { EmptyState, ErrorState, LiveIndicator, LoadingSkeleton, SeverityBadge } from '@/components/ui';
import { useLiveEvents } from '@/lib/useLiveEvents';

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  
  const size = 50;
  
  // Construct query params
  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });
  if (level) queryParams.append('level', level);
  if (source) queryParams.append('source', source);
  if (search) queryParams.append('q', search);

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
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <h1>Centralized Logs</h1>
        <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
      </div>
      <p className="page-subtitle">
        Search and filter system logs, agent telemetry, and network events.
      </p>

      <div className={styles.filters}>
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
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Timestamp</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Level</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Source</th>
                <th style={{ padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4}><LoadingSkeleton label="Loading logs..." /></td></tr>
              )}
              {error && (
                <tr><td colSpan={4}><ErrorState message="Error loading logs" /></td></tr>
              )}
              {data?.items.length === 0 && (
                <tr><td colSpan={4}><EmptyState title="No logs found" message="Syslog-ingested entries will appear here as agents forward events." /></td></tr>
              )}
              {data?.items.map((log: LogEntry) => (
                <tr key={log.id} className={styles.logRow}>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <SeverityBadge severity={log.level} />
                  </td>
                  <td style={{ padding: '16px', fontWeight: 500, fontSize: '0.85rem' }}>
                    {log.source}
                  </td>
                  <td style={{ padding: '16px' }} className={styles.messageCell} title={log.message}>
                    {log.message}
                    {log.asset_id && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>Linked asset: {log.asset_id}</div>}
                  </td>
                </tr>
              ))}
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
