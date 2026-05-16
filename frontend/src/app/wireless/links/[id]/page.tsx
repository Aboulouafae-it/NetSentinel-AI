'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { FieldMeasurement, RadioDevice, WirelessLink, WirelessMetric } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { HealthScoreGauge, SourceConfidenceBadge } from '@/components/ui';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Stethoscope } from 'lucide-react';

export default function WirelessLinkDashboard() {
  const params = useParams();
  const linkId = params.id as string;

  const { data: link, error: linkError } = useSWR<WirelessLink>(`/wireless/links/${linkId}`, fetcher);
  const { data: metrics, error: metricsError } = useSWR<WirelessMetric[]>(`/wireless/links/${linkId}/metrics?limit=50`, fetcher, { refreshInterval: 5000 });
  const { data: measurements } = useSWR<FieldMeasurement[]>(`/wireless/links/${linkId}/measurements`, fetcher);
  const { data: radios } = useSWR<RadioDevice[]>('/radio-devices/', fetcher);
  
  if (!link) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading link dashboard...</div>;

  const latestMetric = metrics && metrics.length > 0 ? metrics[0] : null;
  const nearRadio = radios?.find(r => r.id === link.near_end_radio_id || r.wireless_link_id === link.id && r.link_side === 'A');
  const farRadio = radios?.find(r => r.id === link.far_end_radio_id || r.wireless_link_id === link.id && r.link_side === 'B');
  const latestMeasurement = measurements?.[0];
  const chartData = metrics ? [...metrics].reverse() : [];

  // Calculate Deltas for Diagnostics
  const rssiDelta = latestMetric && link.expected_rssi_dbm ? latestMetric.rssi! - link.expected_rssi_dbm : null;

  return (
    <div>
      <div className="page-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {link.name} <StatusBadge status={link.status} type="asset" />
          </h1>
          <p className="page-subtitle" style={{ marginTop: '8px' }}>
            {link.link_type.toUpperCase()} Link • Org: {link.organization_id.slice(0, 8)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Theoretical Max Capacity</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{link.theoretical_max_capacity_mbps || '--'} Mbps</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* RSSI Card */}
        <div className="card" style={{ padding: '24px', borderTop: '3px solid var(--brand-primary)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Current RSSI</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: latestMetric?.rssi && latestMetric.rssi < -75 ? 'var(--status-critical)' : 'var(--brand-primary)' }}>
            {latestMetric?.rssi || '--'} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>dBm</span>
          </div>
          {link.expected_rssi_dbm && (
             <div style={{ marginTop: '8px', fontSize: '0.85rem', color: rssiDelta && rssiDelta < -5 ? 'var(--status-warning)' : 'var(--text-secondary)' }}>
                Expected: {link.expected_rssi_dbm} dBm 
                {rssiDelta !== null && <span> (Δ {rssiDelta > 0 ? '+' : ''}{rssiDelta.toFixed(1)} dB)</span>}
             </div>
          )}
        </div>

        {/* SNR Card */}
        <div className="card" style={{ padding: '24px', borderTop: '3px solid var(--status-online)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Signal-to-Noise (SNR)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: latestMetric?.snr && latestMetric.snr < 20 ? 'var(--status-warning)' : 'var(--status-online)' }}>
            {latestMetric?.snr?.toFixed(1) || '--'} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>dB</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
             Noise Floor: {latestMetric?.noise_floor || '--'} dBm
          </div>
        </div>

        {/* CCQ Card */}
        <div className="card" style={{ padding: '24px', borderTop: '3px solid var(--status-warning)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Client Connection Quality</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: latestMetric?.ccq && latestMetric.ccq < 90 ? 'var(--status-warning)' : 'var(--brand-primary)' }}>
            {latestMetric?.ccq || '--'} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>%</span>
          </div>
        </div>

        {/* Capacity Card */}
        <div className="card" style={{ padding: '24px', borderTop: '3px solid var(--brand-secondary)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Live Capacity (Tx/Rx)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {latestMetric?.tx_capacity || '--'}<span style={{ color: 'var(--text-secondary)' }}>/</span>{latestMetric?.rx_capacity || '--'}
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}> Mbps</span>
          </div>
        </div>

      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Field Measurement History</h3>
        {measurements && measurements.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Date', 'Health', 'RSSI', 'SNR', 'CCQ', 'Loss', 'Technician'].map(header => (
                    <th key={header} style={{ padding: '10px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {measurements.map(measurement => (
                  <tr key={measurement.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{new Date(measurement.created_at).toLocaleString()}</td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>{measurement.diagnosis.status} ({measurement.diagnosis.health_score}/100)</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace' }}>{measurement.rssi_dbm ?? '--'}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace' }}>{measurement.snr_db ?? '--'}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace' }}>{measurement.ccq_percent ?? '--'}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace' }}>{measurement.packet_loss_percent ?? '--'}</td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{measurement.technician_name || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No field measurements linked to this wireless link yet.</div>
        )}
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '1.05rem' }}>Linked Radio Devices</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <RadioSummary title="Near End" radio={nearRadio} />
          <RadioSummary title="Far End" radio={farRadio} />
          <div style={{ padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>Latest Measurement</div>
            <div style={{ fontWeight: 800, marginTop: '6px' }}>{latestMeasurement ? `${latestMeasurement.diagnosis.health_score}/100 ${latestMeasurement.diagnosis.status}` : 'No linked measurements'}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{latestMeasurement ? `Manual · ${new Date(latestMeasurement.created_at).toLocaleString()}` : 'Select this link when saving field readings.'}</div>
            <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Auto metrics: {nearRadio?.latest_wireless_metrics?.diagnosis?.status || farRadio?.latest_wireless_metrics?.diagnosis?.status || 'No SNMP/vendor RF snapshot yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Charts */}
      <div className="card" style={{ padding: '24px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>Telemetry Time-Series: RSSI & Noise Floor</h3>
        {metrics && metrics.length > 0 ? (
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorRssi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNoise" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={['dataMin - 5', 'dataMax + 5']} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(8px)' }} />
                <Area type="monotone" dataKey="rssi" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRssi)" name="RSSI (dBm)" isAnimationActive={false} />
                <Area type="monotone" dataKey="noise_floor" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorNoise)" name="Noise Floor (dBm)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Waiting for edge agent telemetry...
          </div>
        )}
      </div>
      
      <div className="card" style={{ padding: '24px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>Telemetry Time-Series: Connection Quality (CCQ)</h3>
        {metrics && metrics.length > 0 ? (
          <div style={{ width: '100%', height: '200px' }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorCcq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(8px)' }} />
                <Area type="monotone" dataKey="ccq" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorCcq)" name="CCQ (%)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Waiting for edge agent telemetry...
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '24px', border: '1px solid rgba(14,165,233,0.28)', background: 'rgba(14,165,233,0.05)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Stethoscope size={22} color="var(--brand-cyan)" />
          Rule-Based Field Brief
        </h3>
        {latestMeasurement ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <div>
              <div style={briefLabel}>Likely Root Cause</div>
              <div style={briefText}>{latestMeasurement.diagnosis.likely_root_cause}</div>
              <div style={{ marginTop: 12 }}><HealthScoreGauge score={latestMeasurement.diagnosis.health_score} /></div>
            </div>
            <div>
              <div style={briefLabel}>Recommended Actions</div>
              {latestMeasurement.diagnosis.recommended_actions.map(action => (
                <div key={action} style={briefText}>{action}</div>
              ))}
            </div>
            <div>
              <div style={briefLabel}>Evidence</div>
              {latestMeasurement.diagnosis.evidence.length ? latestMeasurement.diagnosis.evidence.map(item => (
                <div key={item} style={briefText}>{item}</div>
              )) : <div style={briefText}>No deterministic evidence list returned.</div>}
            </div>
            <div>
              <div style={briefLabel}>Source</div>
              <div style={briefText}>Manual field measurement · {new Date(latestMeasurement.created_at).toLocaleString()}</div>
              <div style={briefText}>This is deterministic rule output, not AI-generated analysis.</div>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No field measurement is linked to this wireless link yet. Save a manual measurement to generate deterministic root cause and recommended actions.
          </div>
        )}
      </div>

    </div>
  );
}

const briefLabel: React.CSSProperties = { color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6 };
const briefText: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55, marginBottom: 6 };

function RadioSummary({ title, radio }: { title: string; radio?: RadioDevice }) {
  const capabilities = radio?.adapter_capabilities;
  const snapshot = radio?.latest_wireless_metrics?.snapshot;
  const diagnosis = radio?.latest_wireless_metrics?.diagnosis;
  const outdoor = radio?.latest_wireless_metrics?.outdoor_profile;
  const supportStatus = capabilities?.support_status || (radio?.adapter_type === 'manual_only' ? 'manual' : 'unknown');
  const supportLabel = capabilities?.fixture_verified
    ? 'Verified by fixture'
    : supportStatus === 'placeholder'
      ? 'Placeholder only'
      : supportStatus === 'partial'
        ? 'Partial support'
        : supportStatus === 'manual'
          ? 'Manual measurement required'
          : 'Support unverified';
  return (
    <div style={{ padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>{title}</div>
      <div style={{ fontWeight: 800, marginTop: '6px' }}>{radio?.name || 'Not linked'}</div>
      <div style={{ color: radio?.is_online ? '#10b981' : radio?.is_online === false ? '#ef4444' : 'var(--text-secondary)', fontSize: '0.82rem' }}>
        {radio ? `${radio.ip_address} · ${radio.is_online === true ? 'online' : radio.is_online === false ? 'offline' : 'unknown'}` : 'Assign near/far radio IDs on the wireless link.'}
      </div>
      {radio && (
        <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          <div>Adapter: {radio.last_poll_source || radio.adapter_type}</div>
          <div><span style={{ color: supportStatus === 'placeholder' ? '#94a3b8' : supportStatus === 'manual' ? '#38bdf8' : '#f59e0b', fontWeight: 800 }}>{supportLabel}</span></div>
          <div>Role: {outdoor?.link_role || radio.role} · {outdoor?.frequency_band || 'band unknown'}</div>
          <div>Capabilities: {capabilities?.configured ? 'live adapter configured' : capabilities?.reason || 'not polled'}</div>
          <div>Health source: {snapshot?.source || 'manual/none'} · confidence {snapshot?.confidence ?? '—'} {diagnosis?.health_score != null ? `· ${diagnosis.health_score}/100` : ''}</div>
          <HealthScoreGauge score={diagnosis?.health_score} />
          <div style={{ marginTop: 6 }}><SourceConfidenceBadge confidence={snapshot?.confidence} source={snapshot?.source} /></div>
          <div>airMAX/Link: capacity {snapshot?.airmax_capacity_percent ?? '—'}% · distance {snapshot?.link_distance_km ?? '—'} km</div>
          {snapshot?.missing_fields?.length > 0 && <div style={{ color: '#f59e0b' }}>Missing: {snapshot.missing_fields.slice(0, 4).join(', ')}</div>}
        </div>
      )}
    </div>
  );
}
