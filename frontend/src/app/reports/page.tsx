'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import {
  CheckCircle2,
  Cloud,
  DatabaseBackup,
  Download,
  FileJson,
  FileText,
  HardDrive,
  Lock,
  Network,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import type { ApplianceHealth, DashboardActivity, DashboardSummary, DashboardWirelessHealth } from '@/lib/types';
import { useLiveEvents } from '@/lib/useLiveEvents';
import {
  ActionButton,
  EmptyState,
  ErrorState,
  KpiCard,
  KpiGrid,
  LiveIndicator,
  LiveStatusPill,
  LoadingSkeleton,
  MetricCard,
  ModuleHeader,
  PageShell,
  SectionHeader,
  StatusBadge,
} from '@/components/ui';

type Availability = 'Available' | 'Partial' | 'Planned';

type ReportCardModel = {
  title: string;
  icon: LucideIcon;
  availability: Availability;
  sources: string[];
  exportStatus: string;
  nextAction: string;
  details: string[];
  href?: string;
};

const panelStyle: React.CSSProperties = { padding: 18 };
const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 0',
  borderBottom: '1px solid var(--border-subtle)',
  fontSize: '0.86rem',
};

export default function ReportsPage() {
  const summary = useSWR<DashboardSummary>('/dashboard/summary', fetcher);
  const wireless = useSWR<DashboardWirelessHealth>('/dashboard/wireless-health', fetcher);
  const activity = useSWR<DashboardActivity[]>('/dashboard/recent-activity?limit=30', fetcher);
  const health = useSWR<ApplianceHealth>('/system/health', fetcher);

  const refreshAll = useCallback(() => {
    summary.mutate();
    wireless.mutate();
    activity.mutate();
    health.mutate();
    mutate('/dashboard/recent-activity');
  }, [activity, health, summary, wireless]);

  const live = useLiveEvents(refreshAll, ['alert_created', 'alert_updated', 'incident_updated', 'field_measurement_created', 'syslog_ingested', 'asset_polled', 'activity_created']);
  const hasError = summary.error || wireless.error || activity.error || health.error;
  const isLoading = summary.isLoading || wireless.isLoading || activity.isLoading || health.isLoading;
  const activeAlerts = summary.data?.alerts.open ?? 0;
  const openIncidents = summary.data?.incidents.active ?? 0;
  const totalAssets = summary.data?.assets.total ?? 0;
  const measurements = wireless.data?.measurements ?? 0;
  const recentCount = activity.data?.length ?? 0;
  const backupStatus = health.data?.backup.status || 'not exposed';

  const reportCards = buildReportCards(summary.data, wireless.data, health.data);

  return (
    <PageShell>
      <ModuleHeader
        eyebrow="Reports and exports"
        title="Reports & Export Center"
        subtitle="Network, wireless, security, incident and appliance reporting with backup status, export planning, and safe sharing policy."
        icon={<FileText size={30} color="var(--brand-cyan)" />}
        actions={<>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          <LiveStatusPill label="Report foundation" state="planned" />
          <ActionButton onClick={refreshAll}><RefreshCw size={16} /> Refresh</ActionButton>
        </>}
      />

      {hasError && <div style={{ marginBottom: 16 }}><ErrorState message="Unable to load one or more report readiness sources." /></div>}
      {isLoading && <div style={{ marginBottom: 16 }}><LoadingSkeleton label="Loading report source status..." /></div>}

      <KpiGrid min={165}>
        <KpiCard label="Assets" value={totalAssets} sub="From dashboard summary" toneColor="var(--brand-cyan)" />
        <KpiCard label="Active Alerts" value={activeAlerts} sub={`${summary.data?.alerts.critical ?? 0} critical · ${summary.data?.alerts.high ?? 0} high`} toneColor="var(--status-critical)" />
        <KpiCard label="Open Incidents" value={openIncidents} sub="Unresolved incident records" toneColor="var(--brand-primary)" />
        <KpiCard label="Wireless Measurements" value={measurements} sub="Field/RF summary source" toneColor="var(--status-online)" />
        <KpiCard label="Recent Activity" value={recentCount} sub="Loaded activity entries" toneColor="var(--status-warning)" />
        <KpiCard label="Backup Status" value={<StatusBadge status={backupStatus === 'available' ? 'healthy' : 'warning'} />} sub={health.data?.backup.latest || 'UI integration planned'} toneColor="var(--text-muted)" />
      </KpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', gap: 18, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <section className="card" style={panelStyle}>
            <SectionHeader title={<><FileText size={18} /> Report Overview</>} />
            <p style={panelCopy}>Report cards show current readiness. Real operational counts come from existing dashboard and appliance health APIs; export generation is a foundation design until a report backend exists.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {reportCards.map(card => <ReportCard key={card.title} card={card} />)}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <ExportCenterPanel />
            <ReportGenerationPanel />
          </div>

          <SafeSharingPanel />
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <BackupRestorePanel health={health.data} />
          <ComplianceAuditPanel />
          <section className="card" style={panelStyle}>
            <SectionHeader title={<><CheckCircle2 size={18} /> Current Availability</>} />
            <DetailsLine label="Network report" value={<AvailabilityBadge availability={totalAssets > 0 ? 'Partial' : 'Planned'} />} />
            <DetailsLine label="Wireless report" value={<AvailabilityBadge availability={measurements > 0 ? 'Partial' : 'Planned'} />} />
            <DetailsLine label="Security report" value={<AvailabilityBadge availability={activeAlerts > 0 || (summary.data?.security_events ? true : false) ? 'Partial' : 'Planned'} />} />
            <DetailsLine label="Incident report" value={<AvailabilityBadge availability={openIncidents > 0 ? 'Partial' : 'Planned'} />} />
            <DetailsLine label="Export files" value="Generation backend planned" />
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function ReportCard({ card }: { card: ReportCardModel }) {
  const Icon = card.icon;
  return (
    <div style={{ padding: 14, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'rgba(0,0,0,0.16)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={18} color="var(--brand-cyan)" />
          <strong>{card.title}</strong>
        </div>
        <AvailabilityBadge availability={card.availability} />
      </div>
      <TinyHeading>Data sources</TinyHeading>
      <CompactList items={card.sources} />
      <TinyHeading>Report sections</TinyHeading>
      <CompactList items={card.details} />
      <DetailsLine label="Export status" value={card.exportStatus} />
      <DetailsLine label="Next action" value={card.nextAction} />
      {card.href && <PanelLink href={card.href}>Open source workspace</PanelLink>}
    </div>
  );
}

function ExportCenterPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Download size={18} /> Export Center Foundation</>} />
      <p style={panelCopy}>No downloadable report files are created in v3.10. Export formats below require a safe generation backend and redaction layer.</p>
      <RoadmapRows rows={[
        ['PDF', 'Future printable executive and technical report exports'],
        ['HTML', 'Future browser-previewable report bundle'],
        ['CSV', 'Future tabular exports for assets, alerts, incidents, measurements'],
        ['JSON', 'Future machine-readable support and integration exports'],
        ['Backup bundle', 'Future script-backed bundle status; no UI restore action'],
      ]} />
      <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.82rem' }}>Safety: exports must exclude secrets, `.env` files, database dumps, raw captures, and unredacted customer identifiers unless explicitly approved.</div>
    </section>
  );
}

function BackupRestorePanel({ health }: { health?: ApplianceHealth }) {
  const diskUsed = health ? bytes(health.disk.used_bytes) : 'Not available yet';
  const diskFree = health ? bytes(health.disk.free_bytes) : 'Not available yet';
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><DatabaseBackup size={18} /> Backup & Restore Status</>} action={<PanelLink href="/admin/appliance">Appliance</PanelLink>} />
      <DetailsLine label="Backup status" value={health ? <StatusBadge status={health.backup.status === 'available' ? 'healthy' : 'warning'} /> : 'Not available yet'} />
      <DetailsLine label="Latest backup" value={health?.backup.latest || 'No backup metadata found'} />
      <DetailsLine label="Disk used" value={diskUsed} />
      <DetailsLine label="Disk free" value={diskFree} />
      <TinyHeading>Script foundation</TinyHeading>
      <CompactList items={['scripts/backup.sh exists', 'scripts/restore.sh exists', 'Restore is operator-controlled and intentionally not exposed as a UI button', 'Backup status is exposed through /system/health when archives exist']} />
      <TinyHeading>Important paths</TinyHeading>
      <CompactList items={['/opt/netsentinel/backups', '/var/lib/netsentinel', '/var/log/netsentinel']} />
    </section>
  );
}

function ReportGenerationPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Workflow size={18} /> Report Generation Design</>} />
      <p style={panelCopy}>Design foundation — generation backend is not implemented yet.</p>
      <RoadmapRows rows={[
        ['1. Select report type', 'Network, wireless, security, incident, appliance, cloud future'],
        ['2. Select time range', 'Requires backend range filtering and retention policy'],
        ['3. Choose sections', 'Operator-selectable report sections'],
        ['4. Preview', 'Review measured facts, inference, and planned fields'],
        ['5. Redact', 'Remove secrets, customer identifiers, and sensitive metadata'],
        ['6. Export', 'PDF, HTML, CSV, or JSON future'],
        ['7. Schedule', 'Future only; no scheduled job added in v3.10'],
      ]} />
    </section>
  );
}

function SafeSharingPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Lock size={18} /> Safe Sharing Policy</>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {[
          ['Secrets', 'Remove tokens, passwords, credentials, API keys, cookies, authorization headers, and `.env` content.'],
          ['Network identity', 'Redact public/private IPs, hostnames, customer names, and site names when sharing externally.'],
          ['Device access', 'Redact SNMP communities, vendor credentials, agent tokens, and cloud account identifiers.'],
          ['Logs and evidence', 'Scrub raw logs, packet captures, database dumps, and incident notes before support sharing.'],
        ].map(([label, value]) => <MetricCard key={label} label={label} value={<span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{value}</span>} />)}
      </div>
    </section>
  );
}

function ComplianceAuditPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><ShieldCheck size={18} /> Compliance / Audit Future</>} />
      <EmptyState
        title="Compliance evidence is roadmap"
        message="Future reports should include audit trail references, generation metadata, redaction status, operator identity, and export history without claiming formal compliance certification."
      />
    </section>
  );
}

function buildReportCards(summary?: DashboardSummary, wireless?: DashboardWirelessHealth, health?: ApplianceHealth): ReportCardModel[] {
  const assets = summary?.assets.total ?? 0;
  const alerts = summary?.alerts.open ?? 0;
  const incidents = summary?.incidents.active ?? 0;
  const measurements = wireless?.measurements ?? 0;
  return [
    {
      title: 'Network Report',
      icon: Network,
      availability: assets > 0 ? 'Partial' : 'Planned',
      sources: ['/dashboard/summary', 'Network Operations workspace', 'Asset inventory'],
      exportStatus: 'PDF/HTML/CSV generation planned',
      nextAction: assets > 0 ? 'Add topology and polling history sections' : 'Add assets or run discovery/polling',
      details: ['Assets', 'Availability', 'Polling/reachability', 'Topology summary', 'Stale/offline assets'],
      href: '/network',
    },
    {
      title: 'Wireless Diagnostics Report',
      icon: Radio,
      availability: measurements > 0 ? 'Partial' : 'Planned',
      sources: ['/dashboard/wireless-health', 'Field measurements', 'Wireless Diagnostics workspace'],
      exportStatus: 'Report export planned',
      nextAction: measurements > 0 ? 'Add link history and export template' : 'Create field measurements',
      details: ['Links', 'RF measurements', 'Health scores', 'Missing RF fields', 'Recommended actions', 'Source confidence'],
      href: '/wireless',
    },
    {
      title: 'Security Operations Report',
      icon: ShieldAlert,
      availability: alerts > 0 || summary?.security_events ? 'Partial' : 'Planned',
      sources: ['/dashboard/summary', 'Security Operations workspace', 'Logs/alerts/incidents'],
      exportStatus: 'Security report generation planned',
      nextAction: 'Add searchable evidence export and redaction pipeline',
      details: ['Alerts', 'Syslog/security events', 'Fortinet categories', 'Incident linkage', 'Severity distribution'],
      href: '/security',
    },
    {
      title: 'Incident Report',
      icon: FileJson,
      availability: incidents > 0 ? 'Partial' : 'Planned',
      sources: ['/dashboard/summary', 'Incidents workspace', 'Alert lifecycle records'],
      exportStatus: 'Incident export planned',
      nextAction: incidents > 0 ? 'Add timeline preview and PDF template' : 'Create or link incidents from alerts',
      details: ['Open/resolved incidents', 'Timeline', 'Linked alerts', 'Notes/tasks', 'Ownership'],
      href: '/incidents',
    },
    {
      title: 'Cloud & Hybrid Report',
      icon: Cloud,
      availability: 'Planned',
      sources: ['Cloud & Hybrid foundation', 'Future provider connectors'],
      exportStatus: 'Future only; no cloud data imported',
      nextAction: 'Design credential vault and read-only connector model',
      details: ['Provider inventory future', 'VPN health future', 'Public exposure future', 'Hybrid topology future'],
      href: '/cloud-hybrid',
    },
    {
      title: 'Appliance Health Report',
      icon: HardDrive,
      availability: health ? 'Partial' : 'Planned',
      sources: ['/system/health', 'Appliance Status workspace', 'Backup scripts'],
      exportStatus: 'Appliance report generation planned',
      nextAction: health ? 'Add downloadable health report backend' : 'Load appliance health endpoint',
      details: ['Backend health', 'Database/Redis health', 'Agents', 'Disk/backup metadata', 'Configuration warnings'],
      href: '/admin/appliance',
    },
  ];
}

function AvailabilityBadge({ availability }: { availability: Availability }) {
  const color = availability === 'Available' ? 'var(--status-online)' : availability === 'Partial' ? 'var(--status-warning)' : 'var(--text-muted)';
  return <span style={{ color, border: `1px solid ${color}55`, background: `${color}18`, borderRadius: 999, padding: '4px 8px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>{availability}</span>;
}

function RoadmapRows({ rows }: { rows: Array<[string, string]> }) {
  return <div>{rows.map(([label, value]) => <DetailsLine key={label} label={label} value={value} />)}</div>;
}

function DetailsLine({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={rowStyle}><span style={{ color: 'var(--text-muted)' }}>{label}</span><span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>{value}</span></div>;
}

function CompactList({ items }: { items: string[] }) {
  return <div style={{ display: 'grid', gap: 6 }}>{items.map(item => <div key={item} style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{item}</div>)}</div>;
}

function TinyHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', margin: '12px 0 6px' }}>{children}</div>;
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ color: 'var(--brand-cyan)', fontWeight: 800, fontSize: '0.78rem' }}>{children}</Link>;
}

function bytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

const panelCopy: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.55, margin: '0 0 12px' };
