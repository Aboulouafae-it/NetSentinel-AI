'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { LiveState } from '@/lib/events';

const badgeBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 24,
  padding: '3px 8px',
  borderRadius: 5,
  fontSize: '0.7rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const tone: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.38)' },
  high: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.38)' },
  medium: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.38)' },
  low: { color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.38)' },
  info: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.38)' },
  healthy: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.38)' },
  online: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.38)' },
  open: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.38)' },
  degraded: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.38)' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.38)' },
  acknowledged: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.38)' },
  escalated: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.38)' },
  resolved: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.38)' },
  offline: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.38)' },
  revoked: { color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.38)' },
  unknown: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.24)' },
  partial: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.38)' },
  supported: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.38)' },
  placeholder: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.24)' },
  manual: { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.32)' },
};

function Badge({ value }: { value: string }) {
  const style = tone[value] || tone.unknown;
  return <span style={{ ...badgeBase, color: style.color, background: style.bg, border: `1px solid ${style.border}` }}>{value.replaceAll('_', ' ')}</span>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>{children}</div>;
}

export function PageShell({ children, maxWidth = 'none' }: { children: ReactNode; maxWidth?: number | string }) {
  return <div style={{ width: '100%', maxWidth, margin: maxWidth === 'none' ? 0 : '0 auto' }}>{children}</div>;
}

export function PageHeader({ title, subtitle, icon, actions }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 24 }}>
      <div style={{ minWidth: 0 }}>
        <div className="page-title" style={{ marginBottom: 0 }}>
          {icon}
          <h1 style={{ fontSize: '1.55rem', margin: 0 }}>{title}</h1>
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{actions}</div>}
    </div>
  );
}

export function ModuleHeader({ eyebrow, title, subtitle, icon, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 22 }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div style={{ color: 'var(--brand-cyan)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>{eyebrow}</div>}
        <div className="page-title" style={{ marginBottom: 0 }}>
          {icon}
          <h1 style={{ fontSize: '1.55rem', margin: 0 }}>{title}</h1>
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{actions}</div>}
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge value={severity || 'unknown'} />;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge value={status || 'unknown'} />;
}

export function HealthBadge({ status }: { status: string }) {
  return <Badge value={(status || 'unknown').toLowerCase()} />;
}

export function RiskBadge({ risk }: { risk: string | null | undefined }) {
  return <Badge value={risk || 'unknown'} />;
}

export function SourceConfidenceBadge({ confidence, source }: { confidence?: number | null; source?: string | null }) {
  const value = confidence == null ? 'unknown' : confidence >= 0.8 ? 'supported' : confidence >= 0.4 ? 'partial' : 'manual';
  return <span title={source || undefined}><Badge value={value} /> {confidence != null && <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{Math.round(confidence * 100)}%</span>}</span>;
}

export function KpiCard({ label, value, sub, toneColor = '#3b82f6' }: { label: string; value: ReactNode; sub?: ReactNode; toneColor?: string }) {
  return (
    <div className="card" style={{ padding: 18, borderTop: `3px solid ${toneColor}` }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: toneColor }}>{value}</div>
      {sub && <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{sub}</div>}
    </div>
  );
}

export function KpiGrid({ children, min = 180 }: { children: ReactNode; min?: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 14 }}>{children}</div>;
}

export function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return <div style={{ padding: 12, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6 }}>{label}</div><div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{value}</div></div>;
}

export function SectionHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}><h2 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>{title}</h2>{action}</div>;
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>{children}</div>;
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return <div style={{ padding: 28, color: 'var(--text-muted)', textAlign: 'center' }}><div style={{ color: 'var(--text-secondary)', fontWeight: 800, marginBottom: 6 }}>{title}</div>{message && <div style={{ fontSize: '0.88rem' }}>{message}</div>}</div>;
}

export function ErrorState({ message = 'Unable to load data.' }: { message?: string }) {
  return <div className="card" style={{ padding: 16, border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444' }}>{message}</div>;
}

export function LoadingSkeleton({ label = 'Loading...' }: { label?: string }) {
  return <div className="card" style={{ padding: 28, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}><Loader2 size={16} className="spin" />{label}</div>;
}

export function ActionButton({ children, onClick, disabled, color = '#3b82f6' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; color?: string }) {
  return <button onClick={onClick} disabled={disabled} style={{ padding: '9px 10px', backgroundColor: `${color}22`, border: `1px solid ${color}66`, color, borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</button>;
}

export function DataTable({ children }: { children: ReactNode }) {
  return <div className="card" style={{ padding: 0, overflow: 'hidden' }}>{children}</div>;
}

export function DetailsDrawer({ children }: { children: ReactNode }) {
  return <aside className="card" style={{ padding: 20, position: 'sticky', top: 18 }}>{children}</aside>;
}

export function AnalysisDrawer({ title, subtitle, children }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <aside className="card" style={{ padding: 20, position: 'sticky', top: 18 }}>
      {title && <h2 style={{ margin: '0 0 6px', fontSize: '1rem' }}>{title}</h2>}
      {subtitle && <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 14 }}>{subtitle}</div>}
      {children}
    </aside>
  );
}

export function ActivityFeedItem({ title, subtitle, severity = 'info' }: { title: ReactNode; subtitle?: ReactNode; severity?: string }) {
  const style = tone[severity] || tone.info;
  return <div style={{ padding: '9px 0', borderBottom: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '10px 1fr', gap: 10, fontSize: '0.86rem' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: style.color, marginTop: 5 }} /><div><div style={{ fontWeight: 700 }}>{title}</div>{subtitle && <div style={{ color: 'var(--text-secondary)' }}>{subtitle}</div>}</div></div>;
}

export function HealthScoreGauge({ score, label = 'Health Score' }: { score?: number | null; label?: string }) {
  const safeScore = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : null;
  const color = safeScore == null ? '#94a3b8' : safeScore >= 80 ? '#10b981' : safeScore >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800 }}>
        <span>{label}</span>
        <span style={{ color }}>{safeScore == null ? '—' : `${safeScore}/100`}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${safeScore ?? 0}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

export function LiveIndicator({ state, lastUpdated }: { state: LiveState; lastUpdated: Date | null }) {
  const live = state === 'live';
  const label = live ? 'Live' : state === 'reconnecting' ? 'Reconnecting' : state === 'connecting' ? 'Connecting' : 'Polling fallback';
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: live ? '#10b981' : '#f59e0b', fontSize: '0.78rem', fontWeight: 800 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: live ? '#10b981' : '#f59e0b' }} />{label}{lastUpdated && <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Updated {lastUpdated.toLocaleTimeString()}</span>}</div>;
}

export function LiveStatusPill({ label = 'Roadmap', state = 'planned' }: { label?: string; state?: 'live' | 'planned' | 'offline' | 'degraded' }) {
  const colors = {
    live: '#22C55E',
    planned: '#94A3B8',
    offline: '#DC2626',
    degraded: '#F59E0B',
  };
  const color = colors[state];
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color, border: `1px solid ${color}55`, background: `${color}18`, borderRadius: 999, padding: '5px 10px', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{label}</span>;
}
