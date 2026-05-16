'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  FileSearch,
  Lock,
  RefreshCw,
  ScrollText,
  Shield,
  ShieldAlert,
  Siren,
  Target,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import type { Alert, DashboardSummary, DetectionRule, Incident, IndicatorOfCompromise, LogEntry, PaginatedLogs } from '@/lib/types';
import { useLiveEvents } from '@/lib/useLiveEvents';
import {
  ActionButton,
  AnalysisDrawer,
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
  SeverityBadge,
  StatusBadge,
} from '@/components/ui';

type SelectedItem =
  | { kind: 'alert'; item: Alert }
  | { kind: 'incident'; item: Incident }
  | { kind: 'log'; item: LogEntry }
  | null;

const panelStyle: React.CSSProperties = { padding: 18, minHeight: 220 };
const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 0',
  borderBottom: '1px solid var(--border-subtle)',
  fontSize: '0.86rem',
};

export default function SecurityOperationsPage() {
  const alerts = useSWR<Alert[]>('/alerts/', fetcher);
  const incidents = useSWR<Incident[]>('/incidents/', fetcher);
  const logs = useSWR<PaginatedLogs>('/logs/?page=1&size=50', fetcher);
  const summary = useSWR<DashboardSummary>('/dashboard/summary', fetcher);
  const rules = useSWR<DetectionRule[]>('/security/rules', fetcher);
  const iocs = useSWR<IndicatorOfCompromise[]>('/security/iocs', fetcher);
  const [selected, setSelected] = useState<SelectedItem>(null);

  const refreshAll = useCallback(() => {
    alerts.mutate();
    incidents.mutate();
    logs.mutate();
    summary.mutate();
    rules.mutate();
    iocs.mutate();
    mutate('/dashboard/recent-activity');
  }, [alerts, incidents, iocs, logs, rules, summary]);

  const live = useLiveEvents(refreshAll, ['syslog_ingested', 'alert_created', 'alert_updated', 'incident_created', 'incident_updated', 'activity_created']);
  const activeAlerts = (alerts.data || []).filter(alert => ['open', 'acknowledged', 'escalated'].includes(alert.status));
  const openIncidents = (incidents.data || []).filter(incident => !['resolved', 'closed'].includes(incident.status));
  const loadedLogs = logs.data?.items || [];
  const logSummary = useMemo(() => classifyLoadedLogs(loadedLogs), [loadedLogs]);
  const lifecycle = countBy(alerts.data || [], alert => alert.status);
  const severity = countBy(alerts.data || [], alert => alert.severity);
  const hasError = alerts.error || incidents.error || logs.error || summary.error || rules.error || iocs.error;
  const isLoading = alerts.isLoading || incidents.isLoading || logs.isLoading || summary.isLoading || rules.isLoading || iocs.isLoading;
  const securityEvents = summary.data?.security_events;
  const vpnAdminFailures = (securityEvents?.vpn_failures || 0) + logSummary.adminFailures;
  const malwareIpsWeb = (securityEvents?.ips_malware || 0) + logSummary.webFilter;

  return (
    <PageShell>
      <ModuleHeader
        eyebrow="Security Operations"
        title="Security Operations Center"
        subtitle="Syslog, firewall events, alerts, incidents, evidence, and safe investigation workflow for the current MVP."
        icon={<ShieldAlert size={30} color="var(--status-critical)" />}
        actions={<>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          <LiveStatusPill label="MVP SOC foundation" state="planned" />
          <ActionButton onClick={refreshAll}><RefreshCw size={16} /> Refresh</ActionButton>
        </>}
      />

      {hasError && <div style={{ marginBottom: 16 }}><ErrorState message="Unable to load one or more security operations sources." /></div>}
      {isLoading && <LoadingSkeleton label="Loading Security Operations data..." />}

      <KpiGrid min={165}>
        <KpiCard label="Active Security Alerts" value={activeAlerts.length} sub="Open, acknowledged, escalated" toneColor="var(--status-critical)" />
        <KpiCard label="Critical / High" value={countSeverity(activeAlerts, 'critical') + countSeverity(activeAlerts, 'high')} sub={`${countSeverity(activeAlerts, 'critical')} critical · ${countSeverity(activeAlerts, 'high')} high`} toneColor="var(--status-warning)" />
        <KpiCard label="Open Incidents" value={openIncidents.length} sub="Unresolved security/ops incidents" toneColor="var(--brand-primary)" />
        <KpiCard label="Loaded Syslog Events" value={logs.data?.total ?? loadedLogs.length} sub="From current logs endpoint" toneColor="var(--brand-cyan)" />
        <KpiCard label="Fortinet Events" value={logSummary.fortinet} sub="Based on currently loaded events" toneColor="#f59e0b" />
        <KpiCard label="VPN/Admin Failures" value={vpnAdminFailures} sub="Dashboard + loaded log categories" toneColor="var(--status-warning)" />
        <KpiCard label="IPS/Malware/Web" value={malwareIpsWeb} sub="Detected categories when present" toneColor="var(--status-critical)" />
      </KpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: 18, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <ThreatOverviewPanel severity={severity} lifecycle={lifecycle} />
            <ClassificationPanel summary={logSummary} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 18 }}>
            <SyslogPanel logs={loadedLogs} onSelect={item => setSelected({ kind: 'log', item })} />
            <IncidentQueuePanel incidents={openIncidents} alerts={alerts.data || []} onSelect={item => setSelected({ kind: 'incident', item })} />
          </div>

          <AlertsPanel alerts={activeAlerts} onSelect={item => setSelected({ kind: 'alert', item })} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <RulesIocsPanel rules={rules.data || []} iocs={iocs.data || []} />
            <InvestigationPlaybookPanel />
          </div>
        </div>

        <EvidenceDrawer selected={selected} onClear={() => setSelected(null)} />
      </div>
    </PageShell>
  );
}

function ThreatOverviewPanel({ severity, lifecycle }: { severity: Array<[string, number]>; lifecycle: Array<[string, number]> }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Siren size={18} /> Threat / Alert Overview</>} action={<PanelLink href="/alerts">View Alerts</PanelLink>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
        {(['critical', 'high', 'medium', 'low', 'info'] as const).map(level => (
          <MetricCard key={level} label={level} value={getCount(severity, level)} />
        ))}
      </div>
      <TinyHeading>Alert lifecycle</TinyHeading>
      {(['open', 'acknowledged', 'escalated', 'resolved'] as const).map(status => (
        <div key={status} style={rowStyle}><StatusBadge status={status} /><strong>{getCount(lifecycle, status)}</strong></div>
      ))}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <PanelLink href="/incidents">View Incidents</PanelLink>
        <PanelLink href="/logs">View Logs</PanelLink>
      </div>
    </section>
  );
}

function ClassificationPanel({ summary }: { summary: SecurityLogSummary }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Target size={18} /> Event Classification</>} />
      <p style={panelCopy}>Summary based on currently loaded events. This is not a full SIEM aggregation.</p>
      {[
        ['Blocked traffic', summary.blockedTraffic],
        ['Auth failures', summary.authFailures],
        ['VPN events', summary.vpnEvents],
        ['Admin changes', summary.adminChanges],
        ['Malware / IPS', summary.ipsMalware],
        ['Web filter', summary.webFilter],
        ['Interface / HA', summary.interfaceHa],
        ['Unknown', summary.unknown],
      ].map(([label, value]) => (
        <div key={label} style={rowStyle}><span>{label}</span><strong>{value}</strong></div>
      ))}
    </section>
  );
}

function SyslogPanel({ logs, onSelect }: { logs: LogEntry[]; onSelect: (log: LogEntry) => void }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><ScrollText size={18} /> Syslog & Fortinet Activity</>} action={<PanelLink href="/logs">Open Logs</PanelLink>} />
      {logs.length === 0 ? (
        <EmptyState title="No syslog events ingested yet" message="Configure an Edge Agent or authenticated syslog ingestion to populate firewall/security events." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {logs.slice(0, 8).map(log => {
            const meta = log.metadata_json || {};
            const normalized = meta.normalized || {};
            const parsed = normalized.parsed || {};
            const classification = normalized.classification || {};
            return (
              <button key={log.id} onClick={() => onSelect(log)} style={selectableRowStyle}>
                <div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                    <SeverityBadge severity={log.level} />
                    <strong>{meta.vendor_profile || log.source}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>{(meta.category || classification.category || 'unclassified').replaceAll('_', ' ')}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{classification.summary || log.message}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 4 }}>
                    {parsed.srcip || meta.source_ip || '-'} → {parsed.dstip || '-'} · {parsed.action || '-'} · {parsed.user || '-'} · {formatDate(log.timestamp)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function IncidentQueuePanel({ incidents, alerts, onSelect }: { incidents: Incident[]; alerts: Alert[]; onSelect: (incident: Incident) => void }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Activity size={18} /> Incident Queue</>} action={<PanelLink href="/incidents">Open Incidents</PanelLink>} />
      {incidents.length === 0 ? (
        <EmptyState title="No open incidents" message="Create incidents manually or promote real alerts from the Alerts workspace." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {incidents.slice(0, 7).map(incident => {
            const linked = alerts.filter(alert => alert.incident_id === incident.id).length;
            return (
              <button key={incident.id} onClick={() => onSelect(incident)} style={selectableRowStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{incident.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{incident.assigned_to || 'Unassigned'} · {linked} linked alerts · {formatDate(incident.updated_at)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AlertsPanel({ alerts, onSelect }: { alerts: Alert[]; onSelect: (alert: Alert) => void }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><ShieldAlert size={18} /> Active Alert Evidence</>} action={<PanelLink href="/alerts">Alert Lifecycle</PanelLink>} />
      {alerts.length === 0 ? (
        <EmptyState title="No active alerts" message="Security and operational alerts will appear here when rules, syslog, wireless diagnosis, or telemetry create real alert records." />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {alerts.slice(0, 10).map(alert => (
            <button key={alert.id} onClick={() => onSelect(alert)} style={selectableRowStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{alert.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{alert.source || 'unknown source'} · {alert.rule_name || 'no rule'} · {formatDate(alert.last_seen || alert.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <SeverityBadge severity={alert.severity} />
                  <StatusBadge status={alert.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function RulesIocsPanel({ rules, iocs }: { rules: DetectionRule[]; iocs: IndicatorOfCompromise[] }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Shield size={18} /> Rules & IOCs</>} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <MetricCard label="Rules" value={rules.length} />
        <MetricCard label="Active Rules" value={rules.filter(rule => rule.is_active).length} />
        <MetricCard label="IOCs" value={iocs.length} />
        <MetricCard label="High Confidence" value={iocs.filter(ioc => ioc.confidence >= 80).length} />
      </div>
      {rules.length === 0 && iocs.length === 0 ? (
        <EmptyState title="No rules or IOCs configured" message="Detection rules and indicators will appear here when configured through the security APIs." />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {rules.slice(0, 4).map(rule => <div key={rule.id} style={rowStyle}><span>{rule.name}</span><SeverityBadge severity={rule.severity} /></div>)}
          {iocs.slice(0, 4).map(ioc => <div key={ioc.id} style={rowStyle}><span style={{ fontFamily: 'monospace' }}>{ioc.value}</span><strong>{ioc.confidence}%</strong></div>)}
        </div>
      )}
    </section>
  );
}

function InvestigationPlaybookPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><FileSearch size={18} /> Investigation Playbook</>} />
      <div style={{ display: 'grid', gap: 8 }}>
        {PLAYBOOK_STEPS.map(step => <div key={step} style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{step}</div>)}
      </div>
      <div style={{ marginTop: 16, padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-base)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><BrainCircuit size={16} color="var(--brand-cyan)" /><strong>AI incident analysis future</strong></div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No provider configured. No external data leaves the appliance by default. Future summaries must cite internal evidence and require human review.</div>
      </div>
    </section>
  );
}

function EvidenceDrawer({ selected, onClear }: { selected: SelectedItem; onClear: () => void }) {
  return (
    <AnalysisDrawer title="Investigation Evidence" subtitle="Selected alert, incident, or log. Metadata is compact and scrubbed.">
      {!selected ? (
        <EmptyState title="Select an item" message="Choose a log, alert, or incident to review evidence, status, and next steps." />
      ) : (
        <>
          <button onClick={onClear} style={{ ...buttonStyle('#64748b'), marginBottom: 12 }}>Clear Selection</button>
          {selected.kind === 'alert' && <AlertEvidence alert={selected.item} />}
          {selected.kind === 'incident' && <IncidentEvidence incident={selected.item} />}
          {selected.kind === 'log' && <LogEvidence log={selected.item} />}
        </>
      )}
    </AnalysisDrawer>
  );
}

function AlertEvidence({ alert }: { alert: Alert }) {
  const evidence = arrayFrom(alert.source_metadata?.evidence || alert.source_metadata?.lifecycle_history);
  const recommended = arrayFrom(alert.source_metadata?.recommended_actions || alert.source_metadata?.recommended_action);
  return (
    <>
      <EvidenceHeader title={alert.title} severity={alert.severity} status={alert.status} />
      <DetailsLine label="Source" value={alert.source || 'Not available yet'} />
      <DetailsLine label="Rule" value={alert.rule_name || 'Not available yet'} />
      <DetailsLine label="Timestamp" value={formatDate(alert.last_seen || alert.created_at)} />
      <DetailsLine label="Incident" value={alert.incident_id ? 'Linked' : 'Not linked'} />
      <DrawerSection title="Evidence">{evidence.length ? evidence.slice(-6).map((item, index) => <EvidenceText key={index}>{renderEvidence(item)}</EvidenceText>) : <Muted>No structured evidence attached.</Muted>}</DrawerSection>
      <DrawerSection title="Recommended Next Steps">{recommended.length ? recommended.map((item, index) => <EvidenceText key={index}>{renderEvidence(item)}</EvidenceText>) : DEFAULT_NEXT_STEPS.map(step => <EvidenceText key={step}>{step}</EvidenceText>)}</DrawerSection>
      <DrawerSection title="Scrubbed Metadata"><ScrubbedMetadata metadata={alert.source_metadata} /></DrawerSection>
    </>
  );
}

function IncidentEvidence({ incident }: { incident: Incident }) {
  return (
    <>
      <EvidenceHeader title={incident.title} severity={incident.severity} status={incident.status} />
      <DetailsLine label="Owner" value={incident.assigned_to || 'Unassigned'} />
      <DetailsLine label="Updated" value={formatDate(incident.updated_at)} />
      <DetailsLine label="Resolution" value={incident.resolution_notes || 'Not resolved'} />
      <DrawerSection title="Timeline">{arrayFrom(incident.timeline_events).slice(-6).map((item, index) => <EvidenceText key={index}>{renderEvidence(item)}</EvidenceText>) || <Muted>No timeline entries.</Muted>}</DrawerSection>
      <DrawerSection title="Tasks">{(incident.tasks || []).length ? incident.tasks?.map(task => <EvidenceText key={task.id}>{task.completed ? '[done]' : '[open]'} {task.title}</EvidenceText>) : <Muted>No tasks recorded.</Muted>}</DrawerSection>
      <DrawerSection title="Safe Next Steps">{DEFAULT_NEXT_STEPS.map(step => <EvidenceText key={step}>{step}</EvidenceText>)}</DrawerSection>
    </>
  );
}

function LogEvidence({ log }: { log: LogEntry }) {
  const meta = log.metadata_json || {};
  const normalized = meta.normalized || {};
  const parsed = normalized.parsed || {};
  const classification = normalized.classification || {};
  return (
    <>
      <EvidenceHeader title={classification.summary || log.message} severity={log.level} status={meta.alert_created ? 'alert created' : 'logged'} />
      <DetailsLine label="Source" value={log.source} />
      <DetailsLine label="Profile" value={meta.vendor_profile || 'Not classified'} />
      <DetailsLine label="Category" value={meta.category || classification.category || 'Unknown'} />
      <DetailsLine label="Flow" value={`${parsed.srcip || meta.source_ip || '-'} -> ${parsed.dstip || '-'}`} />
      <DetailsLine label="Action/User" value={`${parsed.action || '-'} / ${parsed.user || '-'}`} />
      <DetailsLine label="Timestamp" value={formatDate(log.timestamp)} />
      <DrawerSection title="Raw Message"><EvidenceText>{log.message}</EvidenceText></DrawerSection>
      <DrawerSection title="Scrubbed Metadata"><ScrubbedMetadata metadata={meta} /></DrawerSection>
    </>
  );
}

function EvidenceHeader({ title, severity, status }: { title: string; severity: string; status: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}><SeverityBadge severity={severity} /><StatusBadge status={status} /></div>
      <h2 style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.3 }}>{title}</h2>
    </div>
  );
}

function DetailsLine({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={rowStyle}><span style={{ color: 'var(--text-muted)' }}>{label}</span><span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>{value}</span></div>;
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={{ marginTop: 16 }}><TinyHeading>{title}</TinyHeading>{children}</section>;
}

function ScrubbedMetadata({ metadata }: { metadata: Record<string, any> | null | undefined }) {
  if (!metadata || !Object.keys(metadata).length) return <Muted>No metadata available.</Muted>;
  const scrubbed = scrubMetadata(metadata);
  return <pre style={{ margin: 0, padding: 10, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.76rem', maxHeight: 280, overflow: 'auto' }}>{JSON.stringify(scrubbed, null, 2)}</pre>;
}

function classifyLoadedLogs(logs: LogEntry[]): SecurityLogSummary {
  const summary: SecurityLogSummary = { fortinet: 0, blockedTraffic: 0, authFailures: 0, vpnEvents: 0, adminFailures: 0, adminChanges: 0, ipsMalware: 0, webFilter: 0, interfaceHa: 0, unknown: 0 };
  for (const log of logs) {
    const meta = log.metadata_json || {};
    const normalized = meta.normalized || {};
    const parsed = normalized.parsed || {};
    const classification = normalized.classification || {};
    const category = String(meta.category || classification.category || '').toLowerCase();
    const action = String(parsed.action || '').toLowerCase();
    if (meta.vendor_profile === 'fortinet') summary.fortinet += 1;
    if (category.includes('blocked') || action === 'deny' || action === 'blocked') summary.blockedTraffic += 1;
    if (category.includes('login_failure') || category.includes('auth') && log.level !== 'info') summary.authFailures += 1;
    if (category.includes('vpn')) summary.vpnEvents += 1;
    if (category.includes('admin_login_failure')) summary.adminFailures += 1;
    if (category.includes('config_changed')) summary.adminChanges += 1;
    if (category.includes('ips') || category.includes('malware')) summary.ipsMalware += 1;
    if (category.includes('web_filter')) summary.webFilter += 1;
    if (category.includes('interface') || category.includes('ha_')) summary.interfaceHa += 1;
    if (!category || category.includes('unknown')) summary.unknown += 1;
  }
  return summary;
}

function scrubMetadata(value: any): any {
  if (Array.isArray(value)) return value.slice(0, 20).map(scrubMetadata);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).slice(0, 60).map(([key, item]) => {
    if (/token|secret|password|credential|authorization|api[_-]?key/i.test(key)) return [key, '[redacted]'];
    return [key, scrubMetadata(item)];
  }));
}

function countBy<T>(items: T[], keyFn: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function getCount(rows: Array<[string, number]>, key: string) {
  return rows.find(([name]) => name === key)?.[1] || 0;
}

function countSeverity(alerts: Alert[], severity: Alert['severity']) {
  return alerts.filter(alert => alert.severity === severity).length;
}

function arrayFrom(value: any): any[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function renderEvidence(item: any) {
  if (typeof item === 'string') return item;
  return item.message || item.event_type || item.summary || JSON.stringify(scrubMetadata(item));
}

function formatDate(value: string | null) {
  if (!value) return 'Not available yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ color: 'var(--brand-cyan)', fontWeight: 800, fontSize: '0.78rem' }}>{children}</Link>;
}

function TinyHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>{children}</div>;
}

function EvidenceText({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: 6 }}>{children}</div>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{children}</div>;
}

function buttonStyle(color: string): React.CSSProperties {
  return { padding: '8px 10px', backgroundColor: `${color}22`, border: `1px solid ${color}66`, color, borderRadius: 6, fontWeight: 800, cursor: 'pointer' };
}

type SecurityLogSummary = {
  fortinet: number;
  blockedTraffic: number;
  authFailures: number;
  vpnEvents: number;
  adminFailures: number;
  adminChanges: number;
  ipsMalware: number;
  webFilter: number;
  interfaceHa: number;
  unknown: number;
};

const panelCopy: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.55, margin: '0 0 12px' };
const selectableRowStyle: React.CSSProperties = { width: '100%', textAlign: 'left', padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'rgba(0,0,0,0.16)', color: 'var(--text-primary)', cursor: 'pointer' };

const DEFAULT_NEXT_STEPS = [
  'Verify the source and affected asset.',
  'Check related logs and alert history.',
  'Correlate with incidents before escalating.',
  'Confirm false positive or real issue.',
  'Add notes to the incident if investigation continues.',
];

const PLAYBOOK_STEPS = [
  '1. Verify source, timestamp, affected asset, and whether the event is organization-scoped.',
  '2. Check related logs before changing device or firewall policy.',
  '3. Correlate alerts and incidents to avoid duplicate response work.',
  '4. Confirm false positive or real issue with an operator note.',
  '5. Escalate if needed through the incident workflow.',
  '6. Apply firewall or device changes manually through approved admin workflow.',
];
