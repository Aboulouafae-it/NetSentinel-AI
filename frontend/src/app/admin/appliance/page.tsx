'use client';

import useSWR from 'swr';
import { HardDrive, RefreshCw, ServerCog, ShieldAlert } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import type { ApplianceHealth } from '@/lib/types';
import { EmptyState, ErrorState, KpiCard, LoadingSkeleton, SectionHeader, StatusBadge } from '@/components/ui';

function bytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function ApplianceStatusPage() {
  const { data, error, isLoading, mutate } = useSWR<ApplianceHealth>('/system/health', fetcher);
  const { data: version } = useSWR('/system/version', fetcher);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div className="page-title">
          <h1>Appliance Status</h1>
          <p className="page-subtitle">Production readiness, service health, backups, and local appliance resources.</p>
        </div>
        <button onClick={() => mutate()} style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-primary)', display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {isLoading && <LoadingSkeleton label="Loading appliance health..." />}
      {error && <ErrorState message="Unable to load appliance health." />}
      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
            <KpiCard label="Backend" value={<StatusBadge status={data.backend.status} />} sub={data.app.version} toneColor="#10b981" />
            <KpiCard label="Database" value={<StatusBadge status={data.database.status} />} sub="PostgreSQL" toneColor="#3b82f6" />
            <KpiCard label="Redis" value={<StatusBadge status={data.redis.status} />} sub="Queue/cache" toneColor="#f59e0b" />
            <KpiCard label="Edge Agents" value={`${data.edge_agents.healthy}/${data.edge_agents.total}`} sub={`${data.edge_agents.revoked} revoked`} toneColor="#8b5cf6" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <section className="card" style={{ padding: 20 }}>
              <SectionHeader title={<><ShieldAlert size={18} /> Production Configuration</>} />
              <div style={{ display: 'grid', gap: 10 }}>
                <div>Version: <strong>{version?.app_version || data.app.version}</strong></div>
                <div>Edition: <strong>{version?.edition || data.app.edition}</strong></div>
                <div>Build: <strong>{version?.build_date || data.app.build_date || 'local'}</strong></div>
                <div>Git: <strong>{version?.git_commit || 'unknown'}</strong></div>
                <div>DB revision: <strong>{version?.database_revision || 'unknown'}</strong></div>
                <div>Environment: <strong>{data.app.environment}</strong></div>
                <div>Debug: <strong>{data.app.debug ? 'enabled' : 'disabled'}</strong></div>
                <div>Production ready: <StatusBadge status={data.app.production_ready ? 'healthy' : 'warning'} /></div>
                {data.app.config_warnings.length ? data.app.config_warnings.map(item => <div key={item} style={{ color: '#f59e0b' }}>{item}</div>) : <EmptyState title="No production warnings" />}
              </div>
            </section>

            <section className="card" style={{ padding: 20 }}>
              <SectionHeader title={<><HardDrive size={18} /> Storage and Backup</>} />
              <div style={{ display: 'grid', gap: 10 }}>
                <div>Disk used: <strong>{bytes(data.disk.used_bytes)}</strong> / {bytes(data.disk.total_bytes)}</div>
                <div>Disk free: <strong>{bytes(data.disk.free_bytes)}</strong></div>
                <div>Backup status: <StatusBadge status={data.backup.status === 'available' ? 'healthy' : 'warning'} /></div>
                <div>Latest backup: {data.backup.latest || 'No backup metadata found'}</div>
              </div>
            </section>

            <section className="card" style={{ padding: 20 }}>
              <SectionHeader title={<><ServerCog size={18} /> Worker</>} />
              <div style={{ color: 'var(--text-secondary)' }}>{data.worker.detail || data.worker.status}</div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
