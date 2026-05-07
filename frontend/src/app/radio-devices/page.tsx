'use client';

import { useCallback, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, fetcher } from '@/lib/api';
import type { RadioDevice } from '@/lib/types';
import { Loader2, Plus, Router, Wifi, WifiOff, X, Zap } from 'lucide-react';
import { EmptyState, LiveIndicator } from '@/components/ui';
import { useLiveEvents } from '@/lib/useLiveEvents';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', backgroundColor: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
  color: 'var(--text-primary)', fontSize: '0.9rem',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)',
  textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600,
};
const vendorColors: Record<string, string> = {
  ubiquiti: '#0559C9', mikrotik: '#E22A27', tplink: '#4CAF50', cambium: '#FF9800', other: '#64748b',
};

export default function RadioDevicesPage() {
  const { data: devices } = useSWR<RadioDevice[]>('/radio-devices/', fetcher);
  const refresh = useCallback(() => {
    mutate('/radio-devices/');
    mutate('/dashboard/summary');
  }, []);
  const live = useLiveEvents(refresh, ['radio_polled', 'activity_created']);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pollingAll, setPollingAll] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', ip_address: '', mac_address: '', vendor: 'ubiquiti', adapter_type: 'manual_only', device_model: '',
    firmware_version: '', role: 'station', frequency_mhz: '', channel_width_mhz: '',
    site_name: '', link_name: '', link_side: 'A', notes: '',
  });

  const updateField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.ip_address.trim()) return;
    setSubmitting(true);
    const payload: Record<string, any> = { name: form.name, ip_address: form.ip_address, vendor: form.vendor, role: form.role, adapter_type: form.adapter_type };
    for (const f of ['mac_address','device_model','firmware_version','site_name','link_name','link_side','notes']) {
      const v = (form as any)[f]; if (v?.trim()) payload[f] = v.trim();
    }
    for (const f of ['frequency_mhz','channel_width_mhz']) {
      const v = (form as any)[f]; if (v?.trim()) payload[f] = parseInt(v, 10);
    }
    try {
      await api.radioDevices.create(payload);
      setForm({ name:'',ip_address:'',mac_address:'',vendor:'ubiquiti',adapter_type:'manual_only',device_model:'',firmware_version:'',role:'station',frequency_mhz:'',channel_width_mhz:'',site_name:'',link_name:'',link_side:'A',notes:'' });
      setShowForm(false);
      mutate('/radio-devices/');
    } finally {
      setSubmitting(false);
    }
  };

  const pollDevice = async (deviceId: string) => {
    setPollingId(deviceId);
    try {
      await api.radioDevices.poll(deviceId);
      mutate('/radio-devices/');
      mutate('/dashboard/summary');
    } finally {
      setPollingId(null);
    }
  };

  const pollAll = async () => {
    setPollingAll(true);
    try {
      const targets = (devices || []).slice(0, 25);
      for (const device of targets) await api.radioDevices.poll(device.id);
      mutate('/radio-devices/');
      mutate('/dashboard/summary');
    } finally {
      setPollingAll(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Router size={32} color="var(--status-warning)" />
            <h1>Radio Devices</h1>
          </div>
          <p className="page-subtitle">Generic reachability and SNMP-ready radio health monitoring.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          {!!devices?.length && (
            <button onClick={pollAll} disabled={pollingAll} style={buttonStyle('#10b981')}>
              {pollingAll ? <><Loader2 size={16} /> Polling...</> : <><Zap size={16} /> Poll Visible</>}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} style={buttonStyle(showForm ? '#ef4444' : 'var(--brand-primary)')}>
            {showForm ? <><X size={18}/> Cancel</> : <><Plus size={18}/> Add Device</>}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(245,158,11,0.3)' }}>
          <h3 style={{ margin: '0 0 16px', fontWeight: 600 }}>Register Radio Device</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <Field label="Device Name *"><input style={inputStyle} value={form.name} onChange={e => updateField('name', e.target.value)} /></Field>
            <Field label="IP Address *"><input style={inputStyle} value={form.ip_address} onChange={e => updateField('ip_address', e.target.value)} /></Field>
            <Field label="MAC Address"><input style={inputStyle} value={form.mac_address} onChange={e => updateField('mac_address', e.target.value)} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <Field label="Vendor"><select style={inputStyle} value={form.vendor} onChange={e => updateField('vendor', e.target.value)}><option value="ubiquiti">Ubiquiti</option><option value="mikrotik">MikroTik</option><option value="tplink">TP-Link</option><option value="cambium">Cambium</option><option value="other">Other</option></select></Field>
            <Field label="Adapter"><select style={inputStyle} value={form.adapter_type} onChange={e => updateField('adapter_type', e.target.value)}><option value="manual_only">Manual only</option><option value="snmp_v2c">Generic SNMP</option><option value="mikrotik_routeros">MikroTik RouterOS</option><option value="tplink_cpe">TP-Link CPE</option><option value="ubiquiti_airmax">Ubiquiti airMAX</option><option value="uisp_api">UISP API placeholder</option></select></Field>
            <Field label="Model"><input style={inputStyle} value={form.device_model} onChange={e => updateField('device_model', e.target.value)} /></Field>
            <Field label="Role"><select style={inputStyle} value={form.role} onChange={e => updateField('role', e.target.value)}><option value="access_point">Access Point</option><option value="station">Station</option><option value="bridge">Bridge</option><option value="repeater">Repeater</option><option value="unknown">Unknown</option></select></Field>
            <Field label="Firmware"><input style={inputStyle} value={form.firmware_version} onChange={e => updateField('firmware_version', e.target.value)} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <Field label="Frequency"><input style={inputStyle} type="number" value={form.frequency_mhz} onChange={e => updateField('frequency_mhz', e.target.value)} /></Field>
            <Field label="Channel Width"><input style={inputStyle} type="number" value={form.channel_width_mhz} onChange={e => updateField('channel_width_mhz', e.target.value)} /></Field>
            <Field label="Site"><input style={inputStyle} value={form.site_name} onChange={e => updateField('site_name', e.target.value)} /></Field>
            <Field label="Link Name"><input style={inputStyle} value={form.link_name} onChange={e => updateField('link_name', e.target.value)} /></Field>
          </div>
          <button onClick={handleSubmit} disabled={submitting} style={buttonStyle('#f59e0b')}>{submitting ? 'Saving...' : 'Register Device'}</button>
        </div>
      )}

      {devices && devices.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {devices.map(d => {
            const isPinging = pollingId === d.id;
            const online = d.is_online;
            return (
              <div key={d.id} className="card" style={{ padding: '20px', borderLeft: `4px solid ${vendorColors[d.vendor] || '#64748b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--brand-primary)' }}>{d.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{d.ip_address}</div>
                  </div>
                  <div style={{ color: online === true ? '#10b981' : online === false ? '#ef4444' : 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', fontWeight: 800 }}>
                    {online === true ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {online === true ? 'Online' : online === false ? 'Offline' : 'Unknown'}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Vendor:</span> <span style={{ color: vendorColors[d.vendor], fontWeight: 600 }}>{d.vendor}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Model:</span> {d.device_model || '—'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Latency:</span> {d.last_poll_latency_ms != null ? `${d.last_poll_latency_ms} ms` : '—'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Last seen:</span> {d.last_seen ? new Date(d.last_seen).toLocaleString() : '—'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Adapter:</span> {d.adapter_type}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Source:</span> {d.last_poll_source || '—'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Link:</span> {d.link_name || d.wireless_link_id || '—'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>SNMP:</span> {d.snmp_info?.sysName || '—'}</div>
                </div>
                <AdapterPanel device={d} />
                {d.last_poll_error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '10px' }}>{d.last_poll_error}</div>}
                <button onClick={() => pollDevice(d.id)} disabled={isPinging} style={{ ...buttonStyle('#10b981'), width: '100%', justifyContent: 'center' }}>
                  {isPinging ? <><Loader2 size={14} /> Polling...</> : <><Zap size={14} /> Poll Now</>}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No radio devices registered" message="Add a wireless radio to start reachability and SNMP-ready health monitoring." />
      )}
    </div>
  );
}

function AdapterPanel({ device }: { device: RadioDevice }) {
  const capabilities = device.adapter_capabilities || {};
  const info = device.latest_device_info || {};
  const health = info.health || {};
  const healthMeta = health.metadata || {};
  const metrics = device.latest_wireless_metrics?.snapshot || {};
  const diagnosis = device.latest_wireless_metrics?.diagnosis || {};
  const outdoor = device.latest_wireless_metrics?.outdoor_profile || {};
  const missing = Array.isArray(metrics.missing_fields) ? metrics.missing_fields : [];
  const interfaces = device.latest_interface_status?.interfaces || [];
  const downCount = Array.isArray(interfaces) ? interfaces.filter((item: any) => item.oper_status === 'down').length : 0;
  const supportStatus = capabilities.support_status || (capabilities.configured ? 'partial' : device.adapter_type === 'manual_only' ? 'manual' : 'unknown');
  const supportLabel = capabilities.fixture_verified
    ? 'Verified by fixture'
    : supportStatus === 'placeholder'
      ? 'Placeholder only'
      : supportStatus === 'partial'
        ? 'Partial support'
        : supportStatus === 'manual'
          ? 'Manual measurement required'
          : 'Support unverified';
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginBottom: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
      <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Adapter Intelligence</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
        <span style={supportPillStyle(supportStatus)}>{supportLabel}</span>
        {!capabilities.supports_wireless_metrics && <span style={supportPillStyle('manual')}>Manual RF required</span>}
      </div>
      <div>Capabilities: {capabilities.configured ? 'configured' : capabilities.reason || 'not polled yet'}</div>
      <div>RF mode: {capabilities.supports_wireless_metrics ? 'automatic RF metrics' : 'manual RF measurement required'}</div>
      <div>Identity: {info.name || '—'} · Version: {info.firmware || '—'} · Model: {info.model || '—'}</div>
      <div>Health: CPU {healthMeta.cpu_load_percent ?? '—'}% · Memory {healthMeta.memory_used_percent ?? '—'}% · Uptime {healthMeta.uptime || info.uptime || '—'}</div>
      <div>Interfaces: {Array.isArray(interfaces) ? interfaces.length : 0} total · {downCount} down</div>
      <div>Wireless health: {diagnosis.status || 'Partial'} {diagnosis.health_score != null ? `(${diagnosis.health_score}/100)` : ''}</div>
      <div>Outdoor role: {outdoor.link_role || device.role} · {outdoor.frequency_band || 'band unknown'} · Confidence {metrics.confidence ?? '—'}</div>
      <div>RF metrics: RSSI {metrics.rssi_dbm ?? '—'}, SNR {metrics.snr_db ?? '—'}, Noise {metrics.noise_floor_dbm ?? '—'}, CCQ {metrics.ccq_percent ?? '—'}</div>
      <div>airMAX: capacity {metrics.airmax_capacity_percent ?? '—'}% · distance {metrics.link_distance_km ?? '—'} km</div>
      {missing.length > 0 && <div style={{ color: '#f59e0b' }}>Missing metrics: {missing.slice(0, 5).join(', ')}{missing.length > 5 ? '...' : ''}</div>}
    </div>
  );
}

function supportPillStyle(status: string): React.CSSProperties {
  const color = status === 'placeholder' ? '#94a3b8' : status === 'partial' ? '#f59e0b' : status === 'manual' ? '#38bdf8' : '#10b981';
  return {
    border: `1px solid ${color}66`,
    background: `${color}1f`,
    color,
    borderRadius: '999px',
    padding: '3px 8px',
    fontSize: '0.7rem',
    fontWeight: 800,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={labelStyle}>{label}</label>{children}</div>;
}

function buttonStyle(color: string): React.CSSProperties {
  return {
    padding: '10px 16px',
    backgroundColor: `${color}22`,
    color,
    border: `1px solid ${color}66`,
    borderRadius: '8px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };
}
