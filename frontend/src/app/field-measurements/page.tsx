'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetchApi, fetcher } from '@/lib/api';
import type { FieldMeasurement, WirelessLink } from '@/lib/types';
import { Radio, Plus, X, Wifi, WifiOff, AlertTriangle, Wrench, Stethoscope } from 'lucide-react';
import { useRouter } from 'next/navigation';

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  operational: { color: 'var(--status-online)', icon: Wifi, label: 'Operational' },
  degraded: { color: 'var(--status-warning)', icon: AlertTriangle, label: 'Degraded' },
  down: { color: 'var(--status-critical)', icon: WifiOff, label: 'Down' },
  maintenance: { color: 'var(--brand-secondary)', icon: Wrench, label: 'Maintenance' },
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  marginBottom: '6px',
  fontWeight: 600,
  letterSpacing: 0,
};

const numericRules: Record<string, { label: string; min: number; max: number }> = {
  frequency_mhz: { label: 'Frequency', min: 800, max: 80000 },
  channel_width_mhz: { label: 'Channel width', min: 5, max: 160 },
  rssi_dbm: { label: 'RSSI', min: -100, max: 0 },
  snr_db: { label: 'SNR', min: 0, max: 70 },
  noise_floor_dbm: { label: 'Noise floor', min: -120, max: -30 },
  ccq_percent: { label: 'CCQ', min: 0, max: 100 },
  latency_ms: { label: 'Latency', min: 0, max: 10000 },
  packet_loss_percent: { label: 'Packet loss', min: 0, max: 100 },
  tx_capacity_mbps: { label: 'TX capacity', min: 0, max: 100000 },
  rx_capacity_mbps: { label: 'RX capacity', min: 0, max: 100000 },
};

const diagnosisColor: Record<string, string> = {
  Excellent: '#10b981',
  Good: '#22c55e',
  Degraded: '#f59e0b',
  Poor: '#f97316',
  Critical: '#ef4444',
};

export default function FieldMeasurementsPage() {
  const { data: measurements, error: loadError, isLoading } = useSWR<FieldMeasurement[]>('/field-measurements/', fetcher);
  const { data: wirelessLinks } = useSWR<WirelessLink[]>('/wireless/links', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  // Form state
  const [form, setForm] = useState({
    link_name: '',
    wireless_link_id: '',
    origin_site: '',
    destination_site: '',
    vendor: '',
    device_model: '',
    frequency_mhz: '',
    channel_width_mhz: '',
    rssi_dbm: '',
    snr_db: '',
    noise_floor_dbm: '',
    ccq_percent: '',
    latency_ms: '',
    packet_loss_percent: '',
    tx_capacity_mbps: '',
    rx_capacity_mbps: '',
    link_status: 'operational',
    technician_name: '',
    notes: '',
  });

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.wireless_link_id && !form.link_name.trim()) {
      setError('Select a wireless link or enter a fallback link name');
      return;
    }
    for (const [key, rule] of Object.entries(numericRules)) {
      const value = (form as any)[key];
      if (!value?.trim()) continue;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        setError(`${rule.label} must be a valid number`);
        return;
      }
      if (parsed < rule.min || parsed > rule.max) {
        setError(`${rule.label} must be between ${rule.min} and ${rule.max}`);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    // Build payload — convert numeric strings to numbers, empty to null
    const payload: Record<string, any> = {
      link_name: form.link_name,
      link_status: form.link_status,
    };
    if (form.wireless_link_id) payload.wireless_link_id = form.wireless_link_id;
    
    const stringFields = ['origin_site', 'destination_site', 'vendor', 'device_model', 'technician_name', 'notes'];
    for (const f of stringFields) {
      const val = (form as any)[f];
      if (val && val.trim()) payload[f] = val.trim();
    }

    const intFields = ['frequency_mhz', 'channel_width_mhz'];
    for (const f of intFields) {
      const val = (form as any)[f];
      if (val && val.trim()) payload[f] = parseInt(val, 10);
    }

    const floatFields = ['rssi_dbm', 'snr_db', 'noise_floor_dbm', 'ccq_percent', 'latency_ms', 'packet_loss_percent', 'tx_capacity_mbps', 'rx_capacity_mbps'];
    for (const f of floatFields) {
      const val = (form as any)[f];
      if (val && val.trim()) payload[f] = parseFloat(val);
    }

    try {
      const created = await fetchApi<FieldMeasurement>('/field-measurements/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Reset form and close
      setForm({
        link_name: '', wireless_link_id: '', origin_site: '', destination_site: '', vendor: '', device_model: '',
        frequency_mhz: '', channel_width_mhz: '', rssi_dbm: '', snr_db: '', noise_floor_dbm: '',
        ccq_percent: '', latency_ms: '', packet_loss_percent: '', tx_capacity_mbps: '', rx_capacity_mbps: '',
        link_status: 'operational', technician_name: '', notes: '',
      });
      setShowForm(false);
      mutate('/field-measurements/', (current?: FieldMeasurement[]) => [created, ...(current || [])], false);
      mutate('/field-measurements/stats');
      mutate('/alerts/');
      if (created.wireless_link_id) mutate(`/wireless/links/${created.wireless_link_id}/measurements`);
      mutate('/alerts/stats');
      setSuccess(
        `Measurement saved. Wireless health: ${created.diagnosis.status} (${created.diagnosis.health_score}/100).`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Radio size={32} color="var(--status-online)" />
            <h1>Wireless Field Measurements</h1>
          </div>
          <p className="page-subtitle">
            Real wireless link data entered manually from field readings. No simulated values.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: showForm ? 'rgba(239,68,68,0.2)' : 'var(--brand-primary)',
            color: '#fff',
            border: showForm ? '1px solid rgba(239,68,68,0.4)' : 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            marginTop: '8px',
          }}
        >
          {showForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> New Measurement</>}
        </button>
      </div>

      {success && (
        <div style={{
          padding: '12px', marginBottom: '16px',
          backgroundColor: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.35)',
          borderRadius: '8px', color: '#10b981', fontSize: '0.9rem',
        }}>{success}</div>
      )}

      {/* Entry Form */}
      {showForm && (
        <div className="card" style={{
          padding: '28px',
          marginBottom: '24px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(24,24,27,0.6) 100%)',
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 600 }}>Record Field Measurement</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Enter real values from equipment readings. Leave fields blank if not measured.
          </p>

          {error && (
            <div style={{
              padding: '12px', marginBottom: '16px',
              backgroundColor: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', color: '#ef4444', fontSize: '0.9rem',
            }}>{error}</div>
          )}

          {/* Link Identity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Wireless Link</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.wireless_link_id}
                onChange={e => {
                  const selected = wirelessLinks?.find(link => link.id === e.target.value);
                  updateField('wireless_link_id', e.target.value);
                  if (selected) updateField('link_name', selected.name);
                }}
              >
                <option value="">Manual fallback</option>
                {wirelessLinks?.map(link => (
                  <option key={link.id} value={link.id}>{link.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Link Name / Fallback</label>
              <input style={inputStyle} placeholder="e.g. Tower-A ↔ Tower-B" value={form.link_name} onChange={e => updateField('link_name', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Origin Site</label>
              <input style={inputStyle} placeholder="Near-end site" value={form.origin_site} onChange={e => updateField('origin_site', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Destination Site</label>
              <input style={inputStyle} placeholder="Far-end site" value={form.destination_site} onChange={e => updateField('destination_site', e.target.value)} />
            </div>
          </div>

          {/* Equipment */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Vendor</label>
              <input style={inputStyle} placeholder="e.g. Ubiquiti" value={form.vendor} onChange={e => updateField('vendor', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Device Model</label>
              <input style={inputStyle} placeholder="e.g. AF60-LR" value={form.device_model} onChange={e => updateField('device_model', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Frequency (MHz)</label>
              <input style={inputStyle} type="number" placeholder="e.g. 5800" value={form.frequency_mhz} onChange={e => updateField('frequency_mhz', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Channel Width (MHz)</label>
              <input style={inputStyle} type="number" placeholder="e.g. 40" value={form.channel_width_mhz} onChange={e => updateField('channel_width_mhz', e.target.value)} />
            </div>
          </div>

          {/* RF Values */}
          <div style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px', letterSpacing: 0 }}>
              📡 Real RF Readings
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div>
                <label style={labelStyle}>RSSI (dBm)</label>
                <input style={inputStyle} type="number" step="0.1" placeholder="-55" value={form.rssi_dbm} onChange={e => updateField('rssi_dbm', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>SNR (dB)</label>
                <input style={inputStyle} type="number" step="0.1" placeholder="35" value={form.snr_db} onChange={e => updateField('snr_db', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Noise Floor (dBm)</label>
                <input style={inputStyle} type="number" step="0.1" placeholder="-95" value={form.noise_floor_dbm} onChange={e => updateField('noise_floor_dbm', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>CCQ (%)</label>
                <input style={inputStyle} type="number" step="0.1" placeholder="98.5" value={form.ccq_percent} onChange={e => updateField('ccq_percent', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Latency (ms)</label>
              <input style={inputStyle} type="number" step="0.1" placeholder="1.2" value={form.latency_ms} onChange={e => updateField('latency_ms', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Packet Loss (%)</label>
              <input style={inputStyle} type="number" step="0.01" placeholder="0.0" value={form.packet_loss_percent} onChange={e => updateField('packet_loss_percent', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>TX Capacity (Mbps)</label>
              <input style={inputStyle} type="number" step="0.1" placeholder="450" value={form.tx_capacity_mbps} onChange={e => updateField('tx_capacity_mbps', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>RX Capacity (Mbps)</label>
              <input style={inputStyle} type="number" step="0.1" placeholder="450" value={form.rx_capacity_mbps} onChange={e => updateField('rx_capacity_mbps', e.target.value)} />
            </div>
          </div>

          {/* Status & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Link Status</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.link_status} onChange={e => updateField('link_status', e.target.value)}>
                <option value="operational">Operational</option>
                <option value="degraded">Degraded</option>
                <option value="down">Down</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Technician Name</label>
              <input style={inputStyle} placeholder="Your name" value={form.technician_name} onChange={e => updateField('technician_name', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Field Notes</label>
              <input style={inputStyle} placeholder="Any observations from site visit..." value={form.notes} onChange={e => updateField('notes', e.target.value)} />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '12px 28px',
              backgroundColor: 'var(--status-online)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              fontSize: '1rem',
            }}
          >
            {submitting ? 'Saving...' : 'Save Measurement'}
          </button>
        </div>
      )}

      {/* Results Table */}
      {loadError && (
        <div className="card" style={{ padding: '24px', border: '1px solid rgba(239,68,68,0.35)', marginBottom: '20px' }}>
          <strong style={{ color: '#ef4444' }}>Unable to load field measurements.</strong>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>{loadError.message}</p>
        </div>
      )}

      {isLoading ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading real field measurements...
        </div>
      ) : measurements && measurements.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              Recorded Measurements ({measurements.length})
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              All values below were manually entered from real equipment readings
            </p>
          </div>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1450px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
                  {['Health', 'Status', 'Link Name', 'Sites', 'Vendor / Model', 'RSSI', 'SNR', 'CCQ', 'Latency', 'Loss', 'Root Cause', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '12px 14px', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {measurements.map((m) => {
                  const sc = statusConfig[m.link_status] || statusConfig.operational;
                  const Icon = sc.icon;
                  return (
                    <tr
                      key={m.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          color: diagnosisColor[m.diagnosis.status] || 'var(--text-secondary)',
                          fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap',
                        }}>
                          {m.diagnosis.health_score}/100 {m.diagnosis.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: sc.color, fontWeight: 600, fontSize: '0.8rem' }}>
                          <Icon size={14} /> {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--brand-primary)' }}>{m.link_name}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {m.origin_site || '?'} → {m.destination_site || '?'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {[m.vendor, m.device_model].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: m.rssi_dbm != null && m.rssi_dbm < -75 ? 'var(--status-critical)' : 'var(--status-online)' }}>
                        {m.rssi_dbm != null ? `${m.rssi_dbm} dBm` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: m.snr_db != null && m.snr_db < 20 ? 'var(--status-warning)' : 'var(--status-online)' }}>
                        {m.snr_db != null ? `${m.snr_db} dB` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>
                        {m.ccq_percent != null ? `${m.ccq_percent}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>
                        {m.latency_ms != null ? `${m.latency_ms} ms` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: m.packet_loss_percent != null && m.packet_loss_percent > 1 ? 'var(--status-critical)' : 'var(--text-secondary)' }}>
                        {m.packet_loss_percent != null ? `${m.packet_loss_percent}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '260px' }}>
                        <div style={{ whiteSpace: 'normal' }}>{m.diagnosis.likely_root_cause}</div>
                        <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                          {m.diagnosis.recommended_actions[0]}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/diagnostics?id=${m.id}`); }}
                          style={{
                            padding: '5px 12px', backgroundColor: 'rgba(139,92,246,0.15)',
                            border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px',
                            color: '#8b5cf6', fontWeight: 600, fontSize: '0.75rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
                          }}
                        >
                          <Stethoscope size={12} /> Diagnose
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Radio size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>No measurements recorded yet</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Click "New Measurement" to enter your first real wireless link reading.
          </p>
        </div>
      )}
    </div>
  );
}
