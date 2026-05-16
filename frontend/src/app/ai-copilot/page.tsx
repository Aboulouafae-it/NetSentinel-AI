'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Cloud,
  FileText,
  HardDrive,
  Lock,
  Network,
  Radio,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  TerminalSquare,
  Wifi,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import type { Alert, ApplianceHealth, Asset, FieldMeasurement, Incident, LogEntry, PaginatedLogs, RadioDevice } from '@/lib/types';
import { useLiveEvents } from '@/lib/useLiveEvents';
import {
  ActionButton,
  EmptyState,
  ErrorState,
  HealthScoreGauge,
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

type SourceStatus = 'available' | 'partial' | 'future';

type DataSourceRow = {
  name: string;
  status: SourceStatus;
  detail: string;
  risk: 'Low' | 'Medium' | 'High';
  approval: string;
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

export default function AiCopilotPage() {
  const alerts = useSWR<Alert[]>('/alerts/', fetcher);
  const incidents = useSWR<Incident[]>('/incidents/', fetcher);
  const logs = useSWR<PaginatedLogs>('/logs/?page=1&size=30', fetcher);
  const measurements = useSWR<FieldMeasurement[]>('/field-measurements/', fetcher);
  const radios = useSWR<RadioDevice[]>('/radio-devices/', fetcher);
  const assets = useSWR<Asset[]>('/assets/?limit=100', fetcher);
  const health = useSWR<ApplianceHealth>('/system/health', fetcher);

  const refreshAll = useCallback(() => {
    alerts.mutate();
    incidents.mutate();
    logs.mutate();
    measurements.mutate();
    radios.mutate();
    assets.mutate();
    health.mutate();
    mutate('/dashboard/recent-activity');
  }, [alerts, assets, health, incidents, logs, measurements, radios]);

  const live = useLiveEvents(refreshAll, ['alert_created', 'alert_updated', 'incident_updated', 'field_measurement_created', 'syslog_ingested', 'asset_polled']);
  const activeAlerts = (alerts.data || []).filter(alert => ['open', 'acknowledged', 'escalated'].includes(alert.status));
  const openIncidents = (incidents.data || []).filter(incident => !['resolved', 'closed'].includes(incident.status));
  const loadedLogs = logs.data?.items || [];
  const sourceRows = useMemo(
    () => buildDataSources({
      alerts: alerts.data,
      incidents: incidents.data,
      logs: logs.data,
      measurements: measurements.data,
      radios: radios.data,
      assets: assets.data,
      health: health.data,
    }),
    [alerts.data, assets.data, health.data, incidents.data, logs.data, measurements.data, radios.data],
  );
  const localSummary = useMemo(() => buildLocalSummary({
    alerts: alerts.data || [],
    incidents: incidents.data || [],
    logs: loadedLogs,
    measurements: measurements.data || [],
    assets: assets.data || [],
  }), [alerts.data, assets.data, incidents.data, loadedLogs, measurements.data]);

  const hasError = alerts.error || incidents.error || logs.error || measurements.error || radios.error || assets.error || health.error;
  const isLoading = alerts.isLoading || incidents.isLoading || logs.isLoading || measurements.isLoading || radios.isLoading || assets.isLoading || health.isLoading;
  const radioMetrics = (radios.data || []).filter(radio => radio.latest_wireless_metrics && Object.keys(radio.latest_wireless_metrics).length > 0).length;
  const polledAssets = (assets.data || []).filter(asset => asset.last_polled_at || asset.last_poll_status).length;

  return (
    <PageShell>
      <ModuleHeader
        eyebrow="Privacy-first workspace"
        title="AI Copilot"
        subtitle="Privacy-first troubleshooting for network, wireless, security, and hybrid operations. This phase uses local context visibility and deterministic summaries only."
        icon={<BrainCircuit size={30} color="var(--brand-cyan)" />}
        actions={<>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          <LiveStatusPill label="Provider not configured" state="offline" />
          <LiveStatusPill label="External calls disabled" state="planned" />
          <ActionButton onClick={refreshAll}><RefreshCw size={16} /> Refresh</ActionButton>
        </>}
      />

      {hasError && <div style={{ marginBottom: 16 }}><ErrorState message="Unable to load one or more local Copilot context sources." /></div>}
      {isLoading && <div style={{ marginBottom: 16 }}><LoadingSkeleton label="Loading local Copilot context..." /></div>}

      <KpiGrid min={170}>
        <KpiCard label="Privacy Mode" value="Local only" sub="No external transmission by default" toneColor="var(--brand-cyan)" />
        <KpiCard label="Provider Status" value="Disabled" sub="No provider configured or called" toneColor="var(--text-muted)" />
        <KpiCard label="Local Sources" value={sourceRows.filter(row => row.status !== 'future').length} sub="Available or partial context domains" toneColor="var(--status-online)" />
        <KpiCard label="Active Alerts" value={activeAlerts.length} sub="Eligible for future explanation" toneColor="var(--status-critical)" />
        <KpiCard label="Open Incidents" value={openIncidents.length} sub="Eligible for future summaries" toneColor="var(--brand-primary)" />
        <KpiCard label="External Calls" value="0" sub="No AI provider call path exposed here" toneColor="var(--status-online)" />
      </KpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: 18, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <PrivacyProviderPanel />

          <section className="card" style={panelStyle}>
            <SectionHeader title={<><HardDrive size={18} /> AI-Ready Data Sources</>} />
            <p style={panelCopy}>Availability reflects current local frontend API sources. Future provider use would still require operator approval and prompt preview.</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {sourceRows.map(row => <DataSourceItem key={row.name} row={row} />)}
            </div>
          </section>

          <section className="card" style={panelStyle}>
            <SectionHeader title={<><TerminalSquare size={18} /> Local Troubleshooting Workspaces</>} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {buildTroubleshootingCards({ activeAlerts, openIncidents, logs: loadedLogs, measurements: measurements.data || [], radios: radios.data || [], assets: assets.data || [] }).map(card => (
                <TroubleshootingCard key={card.title} card={card} />
              ))}
            </div>
          </section>

          <section className="card" style={panelStyle}>
            <SectionHeader title={<><ShieldCheck size={18} /> Prompt Safety / Redaction Policy</>} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
              {[
                ['Data minimization', 'Send only the selected context needed for the operator question.'],
                ['Secret redaction', 'Tokens, passwords, API keys, credentials, and authorization headers must be removed.'],
                ['Human approval', 'Future external provider use and remediation suggestions require explicit operator consent.'],
                ['Evidence first', 'Future AI responses must cite internal records and identify uncertainty.'],
              ].map(([label, value]) => <MetricCard key={label} label={label} value={<span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{value}</span>} />)}
            </div>
          </section>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <DeterministicSummaryPanel summary={localSummary} />
          <ContextSelectionPanel />
          <section className="card" style={panelStyle}>
            <SectionHeader title={<><CheckCircle2 size={18} /> Current Local Context</>} />
            <DetailsLine label="Loaded syslog/log events" value={logs.data?.total ?? loadedLogs.length} />
            <DetailsLine label="Wireless measurements" value={measurements.data?.length ?? 0} />
            <DetailsLine label="Radio metric snapshots" value={`${radioMetrics}/${radios.data?.length ?? 0}`} />
            <DetailsLine label="Polled assets" value={`${polledAssets}/${assets.data?.length ?? 0}`} />
            <DetailsLine label="Appliance health" value={health.data ? health.data.backend.status : 'Not available yet'} />
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function PrivacyProviderPanel() {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Lock size={18} /> Privacy & Provider Status</>} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <TinyHeading>Current state</TinyHeading>
          {[
            'No provider is configured.',
            'No external AI calls are made from this workspace.',
            'No operational data leaves the appliance by default.',
            'Operator approval is required before any future provider use.',
            'Secrets, tokens, passwords, and credential fields must be scrubbed before prompt creation.',
            'Local deterministic summaries may be displayed when existing records provide evidence.',
          ].map(item => <EvidenceText key={item}>{item}</EvidenceText>)}
        </div>
        <div>
          <TinyHeading>Future provider options</TinyHeading>
          {['Claude provider future', 'OpenAI provider future', 'Local model provider future', 'Custom enterprise endpoint future'].map(item => (
            <div key={item} style={rowStyle}><span>{item}</span><LiveStatusPill label="future" state="planned" /></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DataSourceItem({ row }: { row: DataSourceRow }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'rgba(0,0,0,0.16)' }}>
      <div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 5 }}>
          <strong>{row.name}</strong>
          <SourceBadge status={row.status} />
          <span style={{ color: row.risk === 'High' ? 'var(--status-critical)' : row.risk === 'Medium' ? 'var(--status-warning)' : 'var(--status-online)', fontSize: '0.74rem', fontWeight: 800 }}>{row.risk} privacy risk</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.45 }}>{row.detail}</div>
      </div>
      <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
        <div>{row.approval}</div>
        {row.href && <PanelLink href={row.href}>Open source</PanelLink>}
      </div>
    </div>
  );
}

function TroubleshootingCard({ card }: { card: ReturnType<typeof buildTroubleshootingCards>[number] }) {
  const Icon = card.icon;
  return (
    <div style={{ padding: 14, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'rgba(0,0,0,0.16)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={17} color={card.color} />
        <strong>{card.title}</strong>
      </div>
      <DetailsLine label="Helps with" value={card.helps} />
      <DetailsLine label="Needs" value={card.needs} />
      <DetailsLine label="Current status" value={card.status} />
      <EvidenceText>{card.privacy}</EvidenceText>
      <PanelLink href={card.href}>Open module</PanelLink>
    </div>
  );
}

function DeterministicSummaryPanel({ summary }: { summary: LocalSummary }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><BrainCircuit size={18} /> Rule-Based Summary</>} />
      <p style={panelCopy}>Local deterministic context only. This is not AI-generated and no provider is called.</p>
      {!summary.items.length ? (
        <EmptyState title="No eligible local context selected yet" message="Alerts, incidents, field measurements, logs, or polled assets will appear here when available." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {summary.items.map(item => (
            <div key={item.title} style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'rgba(0,0,0,0.16)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <strong>{item.title}</strong>
                {item.severity && <SeverityBadge severity={item.severity} />}
              </div>
              {item.score != null && <div style={{ marginBottom: 10 }}><HealthScoreGauge score={item.score} /></div>}
              {item.lines.map(line => <EvidenceText key={line}>{line}</EvidenceText>)}
              {item.href && <PanelLink href={item.href}>Review evidence</PanelLink>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ContextSelectionPanel() {
  const contexts = ['Selected alert', 'Selected incident', 'Selected wireless link', 'Selected asset', 'Selected log event'];
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><FileText size={18} /> Context Selection Design</>} />
      <p style={panelCopy}>Future prompt context will be operator-selected, previewed, redacted, and audited before provider use.</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {contexts.map(context => (
          <div key={context} style={rowStyle}>
            <span>{context}</span>
            <button disabled style={{ ...disabledButtonStyle }}>Provider configuration required</button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <button disabled style={{ ...disabledButtonStyle, width: '100%', justifyContent: 'center' }}>External prompt sending disabled</button>
      </div>
    </section>
  );
}

function buildDataSources(input: {
  alerts?: Alert[];
  incidents?: Incident[];
  logs?: PaginatedLogs;
  measurements?: FieldMeasurement[];
  radios?: RadioDevice[];
  assets?: Asset[];
  health?: ApplianceHealth;
}): DataSourceRow[] {
  const radiosWithMetrics = (input.radios || []).filter(radio => radio.latest_wireless_metrics && Object.keys(radio.latest_wireless_metrics).length > 0).length;
  const polledAssets = (input.assets || []).filter(asset => asset.last_polled_at || asset.last_poll_status).length;
  return [
    source('Alerts', input.alerts, 'Real alert records can support future evidence-based explanation.', '/alerts', 'Medium'),
    source('Incidents', input.incidents, 'Incident tasks, timeline entries, notes, and status can support future local summaries.', '/incidents', 'Medium'),
    {
      name: 'Syslog logs',
      status: input.logs ? (input.logs.total || input.logs.items.length ? 'available' : 'partial') : 'partial',
      detail: input.logs ? `${input.logs.total || input.logs.items.length} loaded/known log records from the logs endpoint.` : 'Logs endpoint not loaded yet.',
      risk: 'High',
      approval: 'Approval required before external provider use',
      href: '/logs',
    },
    source('Wireless measurements', input.measurements, 'Field measurements include deterministic wireless diagnosis when present.', '/field-measurements', 'Medium'),
    {
      name: 'Radio device metrics',
      status: radiosWithMetrics > 0 ? 'available' : input.radios ? 'partial' : 'partial',
      detail: `${radiosWithMetrics}/${input.radios?.length || 0} radio devices currently expose metric snapshots.`,
      risk: 'Medium',
      approval: 'Approval required before external provider use',
      href: '/radio-devices',
    },
    source('Network assets', input.assets, 'Inventory and polling status can support reachability troubleshooting.', '/assets', 'Medium'),
    {
      name: 'Polling status',
      status: polledAssets > 0 ? 'available' : input.assets ? 'partial' : 'partial',
      detail: `${polledAssets}/${input.assets?.length || 0} assets include polling metadata.`,
      risk: 'Low',
      approval: 'Local summaries allowed; external provider requires approval',
      href: '/network',
    },
    {
      name: 'Cloud/Hybrid findings',
      status: 'future',
      detail: 'Cloud connectors and VPN findings are roadmap-only. No cloud credentials are configured by default.',
      risk: 'High',
      approval: 'Do not send; no provider or connector configured',
      href: '/cloud-hybrid',
    },
    {
      name: 'Appliance health',
      status: input.health ? 'available' : 'partial',
      detail: input.health ? `Backend ${input.health.backend.status}, database ${input.health.database.status}, Redis ${input.health.redis.status}.` : 'Appliance health has not loaded yet.',
      risk: 'Low',
      approval: 'Local summaries allowed; external provider requires approval',
      href: '/admin/appliance',
    },
  ];
}

function source(name: string, rows: unknown[] | undefined, detail: string, href: string, risk: DataSourceRow['risk']): DataSourceRow {
  return {
    name,
    status: rows ? (rows.length > 0 ? 'available' : 'partial') : 'partial',
    detail: rows ? (rows.length > 0 ? `${rows.length} local records available. ${detail}` : `No records yet. ${detail}`) : 'Endpoint not loaded yet.',
    risk,
    approval: risk === 'Low' ? 'Local summaries allowed; external provider requires approval' : 'Approval required before external provider use',
    href,
  };
}

function buildTroubleshootingCards(input: { activeAlerts: Alert[]; openIncidents: Incident[]; logs: LogEntry[]; measurements: FieldMeasurement[]; radios: RadioDevice[]; assets: Asset[] }) {
  const poorMeasurements = input.measurements.filter(measurement => ['Poor', 'Critical', 'Degraded'].includes(measurement.diagnosis?.status));
  const polledAssets = input.assets.filter(asset => asset.last_polled_at || asset.last_poll_status);
  return [
    {
      title: 'Alert Explanation',
      icon: AlertTriangle,
      color: 'var(--status-critical)',
      helps: 'Explain alert severity, source, and evidence.',
      needs: 'Selected alert with evidence or metadata.',
      status: input.activeAlerts.length ? `${input.activeAlerts.length} active alerts available` : 'Awaiting real alerts',
      privacy: 'Alert metadata may contain sensitive infrastructure details; external use requires explicit approval.',
      href: '/alerts',
    },
    {
      title: 'Incident Summary',
      icon: FileText,
      color: 'var(--brand-primary)',
      helps: 'Summarize status, timeline, tasks, and unresolved work.',
      needs: 'Selected incident with timeline/tasks/notes.',
      status: input.openIncidents.length ? `${input.openIncidents.length} open incidents available` : 'Awaiting incident context',
      privacy: 'Incident notes can contain internal names, systems, and remediation details.',
      href: '/incidents',
    },
    {
      title: 'Wireless Link Troubleshooting',
      icon: Wifi,
      color: 'var(--brand-cyan)',
      helps: 'Explain RSSI, SNR, noise, CCQ, latency, packet loss, and capacity issues.',
      needs: 'Field measurement or adapter metrics.',
      status: poorMeasurements.length ? `${poorMeasurements.length} degraded/poor measurements available` : input.measurements.length ? 'Measurements available' : 'Manual RF measurement required',
      privacy: 'RF measurements stay local in this phase; rule-based diagnosis is displayed without provider calls.',
      href: '/wireless',
    },
    {
      title: 'Network Reachability Troubleshooting',
      icon: Network,
      color: 'var(--status-online)',
      helps: 'Review polling status, offline assets, latency, packet loss, and last-seen timestamps.',
      needs: 'Asset inventory and polling metadata.',
      status: polledAssets.length ? `${polledAssets.length} assets include polling metadata` : 'Awaiting asset polling',
      privacy: 'IP addresses and hostnames should be minimized before any future external prompt.',
      href: '/network',
    },
    {
      title: 'Syslog/Fortinet Event Interpretation',
      icon: ScrollText,
      color: 'var(--status-warning)',
      helps: 'Interpret normalized category, action, source/destination, user, and firewall profile fields.',
      needs: 'Ingested syslog records.',
      status: input.logs.length ? `${input.logs.length} loaded log events` : 'Awaiting syslog data',
      privacy: 'Logs are high-risk context and must be redacted and approved before external provider use.',
      href: '/security',
    },
    {
      title: 'Cloud/VPN Troubleshooting Future',
      icon: Cloud,
      color: 'var(--text-muted)',
      helps: 'Future cloud inventory, VPN tunnel health, exposure, and hybrid topology triage.',
      needs: 'Future connector model and credential policy.',
      status: 'Roadmap only; no credentials configured',
      privacy: 'No cloud data is collected or sent in this phase.',
      href: '/cloud-hybrid',
    },
  ];
}

type LocalSummary = {
  items: Array<{ title: string; lines: string[]; severity?: string; score?: number; href?: string }>;
};

function buildLocalSummary(input: { alerts: Alert[]; incidents: Incident[]; logs: LogEntry[]; measurements: FieldMeasurement[]; assets: Asset[] }): LocalSummary {
  const items: LocalSummary['items'] = [];
  const alert = highestPriorityAlert(input.alerts.filter(item => ['open', 'acknowledged', 'escalated'].includes(item.status)));
  if (alert) {
    const evidence = arrayFrom(alert.source_metadata?.evidence).map(renderEvidence).slice(0, 2);
    items.push({
      title: `Alert context: ${alert.title}`,
      severity: alert.severity,
      href: '/alerts',
      lines: [
        `Status: ${alert.status}; source: ${alert.source || 'unknown'}; rule: ${alert.rule_name || 'not attached'}.`,
        ...(evidence.length ? evidence : ['No structured alert evidence is attached yet.']),
      ],
    });
  }

  const measurement = latest(input.measurements, item => item.created_at);
  if (measurement?.diagnosis) {
    items.push({
      title: `Wireless context: ${measurement.link_name || 'field measurement'}`,
      severity: measurement.diagnosis.severity,
      score: measurement.diagnosis.health_score,
      href: '/field-measurements',
      lines: [
        `Rule-based status: ${measurement.diagnosis.status}; likely root cause: ${measurement.diagnosis.likely_root_cause}.`,
        ...(measurement.diagnosis.recommended_actions || []).slice(0, 2).map(action => `Recommended action: ${action}`),
      ],
    });
  }

  const incident = latest(input.incidents.filter(item => !['resolved', 'closed'].includes(item.status)), item => item.updated_at);
  if (incident) {
    items.push({
      title: `Incident context: ${incident.title}`,
      severity: incident.severity,
      href: '/incidents',
      lines: [
        `Status: ${incident.status}; owner: ${incident.assigned_to || 'unassigned'}; updated: ${formatDate(incident.updated_at)}.`,
        `${incident.tasks?.length || 0} task(s), ${incident.timeline_events?.length || 0} timeline event(s), ${incident.notes?.length || 0} note(s) recorded.`,
      ],
    });
  }

  const log = latest(input.logs, item => item.timestamp);
  if (log) {
    const meta = log.metadata_json || {};
    const normalized = asRecord(meta.normalized);
    const parsed = asRecord(normalized.parsed);
    const classification = asRecord(normalized.classification);
    items.push({
      title: `Log context: ${classification.summary || log.message}`,
      severity: log.level,
      href: '/logs',
      lines: [
        `Source: ${log.source}; category: ${String(meta.category || classification.category || 'unknown')}; timestamp: ${formatDate(log.timestamp)}.`,
        `Flow/action: ${String(parsed.srcip || meta.source_ip || '-')} -> ${String(parsed.dstip || '-')} / ${String(parsed.action || '-')}.`,
      ],
    });
  }

  const asset = latest(input.assets.filter(item => item.last_poll_status || item.status === 'offline' || item.status === 'degraded'), item => item.last_polled_at || item.updated_at);
  if (asset) {
    items.push({
      title: `Network context: ${asset.hostname}`,
      severity: asset.status === 'offline' ? 'critical' : asset.status === 'degraded' ? 'medium' : 'info',
      href: '/network',
      lines: [
        `Status: ${asset.status}; risk: ${asset.risk_level || 'unknown'}; last poll: ${asset.last_poll_status || 'not available'}.`,
        `Latency/loss: ${asset.last_poll_latency_ms ?? '-'} ms / ${asset.last_poll_packet_loss_percent ?? '-'}%.`,
      ],
    });
  }

  return { items: items.slice(0, 5) };
}

function highestPriorityAlert(alerts: Alert[]) {
  const order = new Map([['critical', 5], ['high', 4], ['medium', 3], ['low', 2], ['info', 1]]);
  return alerts.slice().sort((a, b) => (order.get(b.severity) || 0) - (order.get(a.severity) || 0) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
}

function latest<T>(items: T[], dateFn: (item: T) => string | null | undefined) {
  return items.slice().sort((a, b) => new Date(dateFn(b) || 0).getTime() - new Date(dateFn(a) || 0).getTime())[0];
}

function SourceBadge({ status }: { status: SourceStatus }) {
  const color = status === 'available' ? 'var(--status-online)' : status === 'partial' ? 'var(--status-warning)' : 'var(--text-muted)';
  return <span style={{ color, border: `1px solid ${color}55`, background: `${color}18`, borderRadius: 999, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>{status}</span>;
}

function DetailsLine({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={rowStyle}><span style={{ color: 'var(--text-muted)' }}>{label}</span><span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>{value}</span></div>;
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ color: 'var(--brand-cyan)', fontWeight: 800, fontSize: '0.78rem' }}>{children}</Link>;
}

function TinyHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>;
}

function EvidenceText({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: 7 }}>{children}</div>;
}

function arrayFrom(value: unknown): unknown[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function renderEvidence(item: unknown) {
  if (typeof item === 'string') return item;
  const record = asRecord(item);
  return String(record.message || record.event_type || record.summary || JSON.stringify(item));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const panelCopy: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.55, margin: '0 0 12px' };
const disabledButtonStyle: React.CSSProperties = {
  padding: '7px 9px',
  border: '1px solid rgba(148,163,184,0.28)',
  color: 'var(--text-muted)',
  background: 'rgba(148,163,184,0.08)',
  borderRadius: 6,
  fontSize: '0.72rem',
  fontWeight: 800,
  cursor: 'not-allowed',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
