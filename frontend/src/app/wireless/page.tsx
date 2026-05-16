'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import {
  AlertTriangle,
  Compass,
  Radio,
  RadioTower,
  RefreshCw,
  Router,
  ShieldAlert,
  Signal,
  Stethoscope,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import type { Alert, DashboardWirelessHealth, FieldMeasurement, RadioDevice, WirelessLink } from '@/lib/types';
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
  SourceConfidenceBadge,
  StatusBadge,
} from '@/components/ui';

const panelStyle: React.CSSProperties = { padding: 18, minHeight: 220 };
const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 0',
  borderBottom: '1px solid var(--border-subtle)',
  fontSize: '0.86rem',
};

export default function WirelessOverviewPage() {
  const links = useSWR<WirelessLink[]>('/wireless/links', fetcher);
  const radios = useSWR<RadioDevice[]>('/radio-devices/', fetcher);
  const measurements = useSWR<FieldMeasurement[]>('/field-measurements/', fetcher);
  const alerts = useSWR<Alert[]>('/alerts/', fetcher);
  const health = useSWR<DashboardWirelessHealth>('/dashboard/wireless-health', fetcher);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  const refreshAll = useCallback(() => {
    links.mutate();
    radios.mutate();
    measurements.mutate();
    alerts.mutate();
    health.mutate();
    mutate('/dashboard/summary');
  }, [alerts, health, links, measurements, radios]);
  const live = useLiveEvents(refreshAll, ['field_measurement_created', 'radio_polled', 'alert_created', 'alert_updated', 'activity_created']);

  const linkSummaries = useMemo(
    () => (links.data || []).map(link => buildLinkSummary(link, measurements.data || [], radios.data || [], alerts.data || [])),
    [alerts.data, links.data, measurements.data, radios.data],
  );
  const selected = linkSummaries.find(item => item.link.id === selectedLinkId) || linkSummaries[0] || null;
  const wirelessAlerts = useMemo(() => filterWirelessAlerts(alerts.data || []), [alerts.data]);
  const onlineRadios = (radios.data || []).filter(device => device.is_online === true).length;
  const offlineRadios = (radios.data || []).filter(device => device.is_online === false).length;
  const degradedLinks = linkSummaries.filter(item => ['degraded', 'alignment_needed'].includes(item.link.status) || ['Degraded', 'Poor'].includes(item.status)).length;
  const criticalLinks = linkSummaries.filter(item => item.link.status === 'offline' || item.status === 'Critical').length;
  const healthyLinks = linkSummaries.filter(item => ['online'].includes(item.link.status) && ['Excellent', 'Good', 'Measured'].includes(item.status)).length;
  const hasError = links.error || radios.error || measurements.error || alerts.error || health.error;
  const isLoading = links.isLoading || radios.isLoading || measurements.isLoading || alerts.isLoading || health.isLoading;

  return (
    <PageShell>
      <ModuleHeader
        eyebrow="Wireless Diagnostics"
        title="Wireless Diagnostics Pro"
        subtitle="Outdoor links, radio devices, RF health, field measurements, source confidence, and technician guidance from real MVP data."
        icon={<RadioTower size={30} color="var(--brand-cyan)" />}
        actions={<>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          <LiveStatusPill label={measurements.data?.length ? 'Manual RF active' : 'Manual RF required'} state={measurements.data?.length ? 'live' : 'planned'} />
          <ActionButton onClick={refreshAll}><RefreshCw size={16} /> Refresh</ActionButton>
        </>}
      />

      {hasError && <div style={{ marginBottom: 16 }}><ErrorState message="Unable to load one or more wireless diagnostics data sources." /></div>}
      {isLoading && <LoadingSkeleton label="Loading wireless diagnostics workspace..." />}

      <KpiGrid min={165}>
        <KpiCard label="Wireless Links" value={links.data?.length ?? '-'} sub="Configured link records" toneColor="var(--brand-primary)" />
        <KpiCard label="Healthy Links" value={healthyLinks} sub="Online with healthy/latest measured status" toneColor="var(--status-online)" />
        <KpiCard label="Degraded Links" value={degradedLinks} sub="Status or measurements need review" toneColor="var(--status-warning)" />
        <KpiCard label="Critical / Offline" value={criticalLinks} sub="Offline or critical health" toneColor="var(--status-critical)" />
        <KpiCard label="Radio Devices" value={`${onlineRadios}/${radios.data?.length ?? 0}`} sub={`${offlineRadios} offline · unknown not counted online`} toneColor="var(--brand-cyan)" />
        <KpiCard label="Measurements" value={measurements.data?.length ?? health.data?.measurements ?? '-'} sub="Manual field readings" toneColor="var(--status-online)" />
        <KpiCard label="Wireless Alerts" value={wirelessAlerts.length} sub={`${countSeverity(wirelessAlerts, 'critical')} critical · ${countSeverity(wirelessAlerts, 'high')} high`} toneColor="var(--status-critical)" />
      </KpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(380px, 0.9fr)', gap: 18, marginTop: 18 }}>
        <LinkHealthPanel summaries={linkSummaries} selectedId={selected?.link.id || null} onSelect={setSelectedLinkId} />
        <SelectedAnalysisPanel summary={selected} aggregateHealth={health.data} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginTop: 18 }}>
        <RadioDevicesPanel radios={radios.data || []} />
        <FieldMeasurementsPanel measurements={measurements.data || []} />
        <WirelessAlertsPanel alerts={wirelessAlerts} />
      </div>

      <section className="card" style={{ ...panelStyle, marginTop: 18 }}>
        <SectionHeader title={<><Compass size={18} /> Interference & Alignment Field Guidance</>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {GUIDANCE.map(item => (
            <div key={item.title} style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-base)' }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{item.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.5 }}>{item.text}</div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function LinkHealthPanel({ summaries, selectedId, onSelect }: { summaries: LinkSummary[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Signal size={18} /> Link Health Overview</>} action={<PanelLink href="/field-measurements">Create Measurement</PanelLink>} />
      {summaries.length === 0 ? (
        <EmptyState title="No wireless links configured" message="Create wireless links or save manual measurements to start RF health tracking." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {summaries.map(summary => (
            <button
              key={summary.link.id}
              onClick={() => onSelect(summary.link.id)}
              style={{
                textAlign: 'left',
                color: 'var(--text-primary)',
                background: selectedId === summary.link.id ? 'rgba(14,165,233,0.1)' : 'rgba(0,0,0,0.16)',
                border: `1px solid ${selectedId === summary.link.id ? 'rgba(14,165,233,0.35)' : 'var(--border-subtle)'}`,
                borderRadius: 8,
                padding: 14,
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 120px',
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--brand-cyan)' }}>{summary.link.name}</strong>
                  <StatusBadge status={summary.link.status} />
                  <SourceConfidencePill summary={summary} />
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                  Near/Far radios: {summary.nearRadio?.name || 'unassigned'} / {summary.farRadio?.name || 'unassigned'} · Latest: {summary.latestMeasurement ? formatDate(summary.latestMeasurement.created_at) : 'Manual RF data required'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
                  <SmallMetric label="RSSI" value={formatUnit(summary.latestMeasurement?.rssi_dbm, 'dBm')} />
                  <SmallMetric label="SNR" value={formatUnit(summary.latestMeasurement?.snr_db, 'dB')} />
                  <SmallMetric label="Noise" value={formatUnit(summary.latestMeasurement?.noise_floor_dbm, 'dBm')} />
                  <SmallMetric label="CCQ" value={formatUnit(summary.latestMeasurement?.ccq_percent, '%')} />
                  <SmallMetric label="Latency" value={formatUnit(summary.latestMeasurement?.latency_ms, 'ms')} />
                  <SmallMetric label="Loss" value={formatUnit(summary.latestMeasurement?.packet_loss_percent, '%')} />
                </div>
                {summary.missingFields.length > 0 && <div style={{ marginTop: 8, color: 'var(--status-warning)', fontSize: '0.8rem' }}>Missing RF fields: {summary.missingFields.join(', ')}</div>}
              </div>
              <div>
                <HealthScoreGauge score={summary.score} />
                <div style={{ marginTop: 8 }}><SeverityBadge severity={summary.severity} /></div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function SelectedAnalysisPanel({ summary, aggregateHealth }: { summary: LinkSummary | null; aggregateHealth?: DashboardWirelessHealth }) {
  if (!summary) {
    return <section className="card" style={panelStyle}><EmptyState title="Select a wireless link" message="Choose a link to inspect RF source, missing fields, root cause, and recommended actions." /></section>;
  }
  const measurement = summary.latestMeasurement;
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Stethoscope size={18} /> Rule-Based Diagnosis</>} action={<PanelLink href={`/wireless/links/${summary.link.id}`}>Link Detail</PanelLink>} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <StatusBadge status={summary.status.toLowerCase()} />
        <SeverityBadge severity={summary.severity} />
        <SourceConfidencePill summary={summary} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <HealthScoreGauge score={summary.score} label="Latest Field Health Score" />
      </div>
      {measurement ? (
        <>
          <div style={analysisBlock}>
            <TinyHeading>Likely Root Cause</TinyHeading>
            <div>{measurement.diagnosis.likely_root_cause || 'No root cause generated by deterministic rules.'}</div>
          </div>
          <div style={analysisBlock}>
            <TinyHeading>Evidence</TinyHeading>
            {measurement.diagnosis.evidence.length ? measurement.diagnosis.evidence.map(item => <EvidenceLine key={item}>{item}</EvidenceLine>) : <Muted>Diagnosis evidence is not available.</Muted>}
          </div>
          <div style={analysisBlock}>
            <TinyHeading>Recommended Technician Actions</TinyHeading>
            {measurement.diagnosis.recommended_actions.length ? measurement.diagnosis.recommended_actions.map(item => <EvidenceLine key={item}>{item}</EvidenceLine>) : <Muted>No recommended actions available.</Muted>}
          </div>
        </>
      ) : (
        <EmptyState title="Manual RF measurement required" message="No linked field measurement exists for this link. Save RSSI, SNR, noise floor, CCQ, latency, and packet loss to enable deterministic diagnosis." />
      )}
      <div style={analysisBlock}>
        <TinyHeading>Aggregate Wireless Snapshot</TinyHeading>
        <Muted>{aggregateHealth?.measurements ? `${aggregateHealth.measurements} total field measurements across the organization.` : 'No aggregate field measurements available yet.'}</Muted>
      </div>
    </section>
  );
}

function RadioDevicesPanel({ radios }: { radios: RadioDevice[] }) {
  const vendorCounts = countBy(radios, item => item.vendor || 'unknown');
  const missingRf = radios.filter(device => missingRadioMetrics(device).length > 0).length;
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Router size={18} /> Radio Devices</>} action={<PanelLink href="/radio-devices">Radios</PanelLink>} />
      {radios.length === 0 ? (
        <EmptyState title="No radio devices registered" message="Add radio devices to track adapter capability, polling status, and RF metric availability." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MetricCard label="Total" value={radios.length} />
            <MetricCard label="Missing RF Metrics" value={missingRf} />
            <MetricCard label="Online" value={radios.filter(item => item.is_online === true).length} />
            <MetricCard label="Offline" value={radios.filter(item => item.is_online === false).length} />
          </div>
          <TinyHeading>Vendor distribution</TinyHeading>
          {vendorCounts.slice(0, 5).map(([vendor, count]) => <div key={vendor} style={rowStyle}><span>{vendor}</span><strong>{count}</strong></div>)}
          <TinyHeading>Adapter status</TinyHeading>
          {radios.slice(0, 4).map(device => (
            <div key={device.id} style={rowStyle}>
              <span>{device.name}</span>
              <span style={{ color: missingRadioMetrics(device).length ? 'var(--status-warning)' : 'var(--status-online)' }}>{adapterLabel(device)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FieldMeasurementsPanel({ measurements }: { measurements: FieldMeasurement[] }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><Radio size={18} /> Latest Field Measurements</>} action={<PanelLink href="/field-measurements">Measurements</PanelLink>} />
      {measurements.length === 0 ? (
        <EmptyState title="No field measurements recorded" message="Create field measurement to populate RF health, root cause, and technician actions." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {measurements.slice(0, 5).map(measurement => (
            <div key={measurement.id} style={{ padding: 10, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-base)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <strong>{measurement.link_name}</strong>
                <SeverityBadge severity={measurement.diagnosis.severity} />
              </div>
              <HealthScoreGauge score={measurement.diagnosis.health_score} label={`${measurement.diagnosis.status} health`} />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 8 }}>
                RSSI {formatUnit(measurement.rssi_dbm, 'dBm')} · SNR {formatUnit(measurement.snr_db, 'dB')} · CCQ {formatUnit(measurement.ccq_percent, '%')}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4 }}>{formatDate(measurement.created_at)} · {measurement.technician_name || 'technician not recorded'}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WirelessAlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <section className="card" style={panelStyle}>
      <SectionHeader title={<><ShieldAlert size={18} /> Wireless Alerts</>} action={<PanelLink href="/alerts">Alerts</PanelLink>} />
      {alerts.length === 0 ? (
        <EmptyState title="No wireless alerts" message="Poor or critical field measurements and radio-related alert records will appear here when generated." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {alerts.slice(0, 6).map(alert => (
            <div key={alert.id} style={rowStyle}>
              <div>
                <div style={{ fontWeight: 800 }}>{alert.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{alert.source || 'unknown source'} · {formatDate(alert.last_seen || alert.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <SeverityBadge severity={alert.severity} />
                <StatusBadge status={alert.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return <div style={{ minWidth: 0 }}><div style={{ color: 'var(--text-muted)', fontSize: '0.66rem', textTransform: 'uppercase', fontWeight: 800 }}>{label}</div><div style={{ fontFamily: 'monospace', color: value === '-' ? 'var(--text-muted)' : 'var(--text-secondary)', fontSize: '0.8rem' }}>{value}</div></div>;
}

function SourceConfidencePill({ summary }: { summary: LinkSummary }) {
  if (summary.source === 'manual') return <span style={pillStyle('#38bdf8')}>Manual Verified</span>;
  if (summary.source === 'adapter_partial') return <span style={pillStyle('#f59e0b')}>Adapter Partial</span>;
  if (summary.source === 'snmp_basic') return <span style={pillStyle('#0ea5e9')}>SNMP Basic</span>;
  if (summary.source === 'missing') return <span style={pillStyle('#ef4444')}>RF Metrics Missing</span>;
  return <span style={pillStyle('#94a3b8')}>Real Capture Pending</span>;
}

function buildLinkSummary(link: WirelessLink, measurements: FieldMeasurement[], radios: RadioDevice[], alerts: Alert[]): LinkSummary {
  const linkedMeasurements = measurements.filter(item => item.wireless_link_id === link.id || (!item.wireless_link_id && item.link_name === link.name));
  const latestMeasurement = linkedMeasurements[0] || null;
  const nearRadio = radios.find(radio => radio.id === link.near_end_radio_id || (radio.wireless_link_id === link.id && radio.link_side === 'A')) || null;
  const farRadio = radios.find(radio => radio.id === link.far_end_radio_id || (radio.wireless_link_id === link.id && radio.link_side === 'B')) || null;
  const linkAlerts = alerts.filter(alert => alert.wireless_link_id === link.id || (alert.title || '').toLowerCase().includes(link.name.toLowerCase()));
  const missingFields = latestMeasurement ? missingMeasurementFields(latestMeasurement) : ['rssi_dbm', 'snr_db', 'noise_floor_dbm', 'ccq_percent', 'latency_ms', 'packet_loss_percent'];
  const adapterSource = [nearRadio, farRadio].some(radio => radio?.latest_wireless_metrics?.snapshot) ? 'adapter_partial' : [nearRadio, farRadio].some(radio => radio?.adapter_type?.includes('snmp')) ? 'snmp_basic' : null;
  return {
    link,
    nearRadio,
    farRadio,
    alerts: linkAlerts,
    latestMeasurement,
    score: latestMeasurement?.diagnosis.health_score ?? null,
    status: latestMeasurement?.diagnosis.status ?? (link.status === 'online' ? 'Measured' : 'Awaiting Measurements'),
    severity: latestMeasurement?.diagnosis.severity ?? (link.status === 'offline' ? 'critical' : link.status === 'degraded' || link.status === 'alignment_needed' ? 'medium' : 'info'),
    source: latestMeasurement ? 'manual' : adapterSource || 'missing',
    missingFields,
  };
}

function missingMeasurementFields(measurement: FieldMeasurement) {
  return RF_FIELDS.filter(field => measurement[field] == null);
}

function missingRadioMetrics(device: RadioDevice) {
  const snapshot = device.latest_wireless_metrics?.snapshot || {};
  const missing = Array.isArray(snapshot.missing_fields) ? snapshot.missing_fields : [];
  if (!device.adapter_capabilities?.supports_wireless_metrics) return ['automatic_rf_metrics'];
  return missing;
}

function adapterLabel(device: RadioDevice) {
  const missing = missingRadioMetrics(device);
  if (device.adapter_capabilities?.fixture_verified) return 'Fixture Validated';
  if (missing.length) return 'RF metrics missing';
  if (device.adapter_type === 'manual_only') return 'Manual required';
  return device.adapter_type.replaceAll('_', ' ');
}

function filterWirelessAlerts(alerts: Alert[]) {
  return alerts.filter(alert => {
    const combined = `${alert.title} ${alert.description || ''} ${alert.source || ''} ${alert.rule_name || ''}`.toLowerCase();
    return Boolean(alert.wireless_link_id) || combined.includes('wireless') || combined.includes('radio') || combined.includes('fieldmeasurement') || combined.includes('rssi') || combined.includes('snr');
  }).filter(alert => ['open', 'acknowledged', 'escalated'].includes(alert.status));
}

function countSeverity(alerts: Alert[], severity: Alert['severity']) {
  return alerts.filter(alert => alert.severity === severity).length;
}

function countBy<T>(items: T[], keyFn: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ color: 'var(--brand-cyan)', fontWeight: 800, fontSize: '0.78rem' }}>{children}</Link>;
}

function TinyHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>{children}</div>;
}

function EvidenceLine({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: 6 }}>{children}</div>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>{children}</div>;
}

function formatDate(value: string | null) {
  if (!value) return 'not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatUnit(value: number | null | undefined, unit: string) {
  return value == null ? '-' : `${value} ${unit}`;
}

function pillStyle(color: string): React.CSSProperties {
  return { color, border: `1px solid ${color}66`, background: `${color}1f`, borderRadius: 999, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' };
}

type MeasurementField = 'rssi_dbm' | 'snr_db' | 'noise_floor_dbm' | 'ccq_percent' | 'latency_ms' | 'packet_loss_percent';
const RF_FIELDS: MeasurementField[] = ['rssi_dbm', 'snr_db', 'noise_floor_dbm', 'ccq_percent', 'latency_ms', 'packet_loss_percent'];

type LinkSummary = {
  link: WirelessLink;
  nearRadio: RadioDevice | null;
  farRadio: RadioDevice | null;
  alerts: Alert[];
  latestMeasurement: FieldMeasurement | null;
  score: number | null;
  status: string;
  severity: string;
  source: 'manual' | 'adapter_partial' | 'snmp_basic' | 'missing';
  missingFields: string[];
};

const analysisBlock: React.CSSProperties = {
  borderTop: '1px solid var(--border-subtle)',
  paddingTop: 12,
  marginTop: 12,
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
};

const GUIDANCE = [
  { title: 'Weak RSSI', text: 'Weak signal often points to distance, alignment error, antenna obstruction, cable loss, or low transmit power.' },
  { title: 'Poor SNR', text: 'Stable RSSI with poor SNR usually indicates noise or interference rather than alignment alone.' },
  { title: 'High Noise Floor', text: 'A raised noise floor suggests channel congestion, nearby transmitters, or poor frequency planning.' },
  { title: 'Low CCQ', text: 'Low link quality points to retries, interference, hidden-node effects, or unstable modulation.' },
  { title: 'Loss + Latency', text: 'Packet loss with rising latency usually indicates link instability or saturated/contended RF conditions.' },
  { title: 'Missing RF Fields', text: 'If adapters do not expose RF data, collect a manual field measurement before making alignment decisions.' },
];
