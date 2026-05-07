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
};

function Badge({ value }: { value: string }) {
  const style = tone[value] || tone.unknown;
  return <span style={{ ...badgeBase, color: style.color, background: style.bg, border: `1px solid ${style.border}` }}>{value.replace('_', ' ')}</span>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge value={severity || 'unknown'} />;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge value={status || 'unknown'} />;
}

export function RiskBadge({ risk }: { risk: string | null | undefined }) {
  return <Badge value={risk || 'unknown'} />;
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

export function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return <div style={{ padding: 12, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6 }}>{label}</div><div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{value}</div></div>;
}

export function SectionHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}><h2 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>{title}</h2>{action}</div>;
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
  return <button onClick={onClick} disabled={disabled} style={{ padding: '9px 10px', backgroundColor: `${color}22`, border: `1px solid ${color}66`, color, borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 800 }}>{children}</button>;
}

export function DataTable({ children }: { children: ReactNode }) {
  return <div className="card" style={{ padding: 0, overflow: 'hidden' }}>{children}</div>;
}

export function DetailsDrawer({ children }: { children: ReactNode }) {
  return <aside className="card" style={{ padding: 20, position: 'sticky', top: 18 }}>{children}</aside>;
}

export function ActivityFeedItem({ title, subtitle, severity = 'info' }: { title: ReactNode; subtitle?: ReactNode; severity?: string }) {
  const style = tone[severity] || tone.info;
  return <div style={{ padding: '9px 0', borderBottom: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '10px 1fr', gap: 10, fontSize: '0.86rem' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: style.color, marginTop: 5 }} /><div><div style={{ fontWeight: 700 }}>{title}</div>{subtitle && <div style={{ color: 'var(--text-secondary)' }}>{subtitle}</div>}</div></div>;
}

export function LiveIndicator({ state, lastUpdated }: { state: LiveState; lastUpdated: Date | null }) {
  const live = state === 'live';
  const label = live ? 'Live' : state === 'reconnecting' ? 'Reconnecting' : state === 'connecting' ? 'Connecting' : 'Polling fallback';
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: live ? '#10b981' : '#f59e0b', fontSize: '0.78rem', fontWeight: 800 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: live ? '#10b981' : '#f59e0b' }} />{label}{lastUpdated && <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Updated {lastUpdated.toLocaleTimeString()}</span>}</div>;
}
