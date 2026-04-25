'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/api';
import { Router, Plus, X, Wifi, WifiOff, Loader2, Zap } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface RadioDevice {
  id: string; name: string; ip_address: string; mac_address: string | null;
  vendor: string; device_model: string | null; firmware_version: string | null;
  role: string; frequency_mhz: number | null; channel_width_mhz: number | null;
  site_name: string | null; link_name: string | null; link_side: string | null;
  adapter_type: string; is_monitored: boolean; notes: string | null; created_at: string;
}

interface PingResult {
  device_id: string; device_name: string; ip_address: string;
  is_reachable: boolean; response_time_ms: number | null;
}

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
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
  const [pingingAll, setPingingAll] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', ip_address: '', mac_address: '', vendor: 'ubiquiti', device_model: '',
    firmware_version: '', role: 'station', frequency_mhz: '', channel_width_mhz: '',
    site_name: '', link_name: '', link_side: 'A', notes: '',
  });
  const updateField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.ip_address.trim()) return;
    setSubmitting(true);
    const payload: Record<string, any> = { name: form.name, ip_address: form.ip_address, vendor: form.vendor, role: form.role };
    for (const f of ['mac_address','device_model','firmware_version','site_name','link_name','link_side','notes']) {
      const v = (form as any)[f]; if (v?.trim()) payload[f] = v.trim();
    }
    for (const f of ['frequency_mhz','channel_width_mhz']) {
      const v = (form as any)[f]; if (v?.trim()) payload[f] = parseInt(v);
    }
    try {
      const res = await fetch(`${API_BASE}/radio-devices/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        setForm({ name:'',ip_address:'',mac_address:'',vendor:'ubiquiti',device_model:'',firmware_version:'',role:'station',frequency_mhz:'',channel_width_mhz:'',site_name:'',link_name:'',link_side:'A',notes:'' });
        setShowForm(false); mutate('/radio-devices/');
      }
    } finally { setSubmitting(false); }
  };

  const pingDevice = async (deviceId: string) => {
    setPingingId(deviceId);
    try {
      const res = await fetch(`${API_BASE}/radio-devices/${deviceId}/ping`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setPingResults(prev => ({ ...prev, [deviceId]: result }));
      }
    } finally { setPingingId(null); }
  };

  const pingAllDevices = async () => {
    setPingingAll(true);
    try {
      const res = await fetch(`${API_BASE}/radio-devices/ping-all`, { method: 'POST' });
      if (res.ok) {
        const results: PingResult[] = await res.json();
        const map: Record<string, PingResult> = {};
        results.forEach(r => { map[r.device_id] = r; });
        setPingResults(map);
      }
    } finally { setPingingAll(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Router size={32} color="var(--status-warning)" />
            <h1>Radio Devices</h1>
          </div>
          <p className="page-subtitle">Managed wireless radios with real ICMP reachability checks.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {devices && devices.length > 0 && (
            <button onClick={pingAllDevices} disabled={pingingAll} style={{
              padding: '10px 18px', backgroundColor: 'rgba(16,185,129,0.15)',
              color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px',
              fontWeight: 600, cursor: pingingAll ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {pingingAll ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Pinging...</> : <><Zap size={16} /> Ping All</>}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: '10px 20px', backgroundColor: showForm ? 'rgba(239,68,68,0.2)' : 'var(--brand-primary)',
            color: '#fff', border: showForm ? '1px solid rgba(239,68,68,0.4)' : 'none',
            borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            {showForm ? <><X size={18}/> Cancel</> : <><Plus size={18}/> Add Device</>}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(245,158,11,0.3)', background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(24,24,27,0.6) 100%)' }}>
          <h3 style={{ margin: '0 0 16px', fontWeight: 600 }}>Register Radio Device</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>Device Name *</label><input style={inputStyle} placeholder="e.g. Tower-A AP" value={form.name} onChange={e => updateField('name', e.target.value)} /></div>
            <div><label style={labelStyle}>IP Address *</label><input style={inputStyle} placeholder="192.168.1.1" value={form.ip_address} onChange={e => updateField('ip_address', e.target.value)} /></div>
            <div><label style={labelStyle}>MAC Address</label><input style={inputStyle} placeholder="AA:BB:CC:DD:EE:FF" value={form.mac_address} onChange={e => updateField('mac_address', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>Vendor</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.vendor} onChange={e => updateField('vendor', e.target.value)}>
                <option value="ubiquiti">Ubiquiti</option><option value="mikrotik">MikroTik</option>
                <option value="tplink">TP-Link</option><option value="cambium">Cambium</option><option value="other">Other</option>
              </select>
            </div>
            <div><label style={labelStyle}>Model</label><input style={inputStyle} placeholder="e.g. PowerBeam 5AC" value={form.device_model} onChange={e => updateField('device_model', e.target.value)} /></div>
            <div><label style={labelStyle}>Role</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.role} onChange={e => updateField('role', e.target.value)}>
                <option value="access_point">Access Point</option><option value="station">Station</option>
                <option value="bridge">Bridge</option><option value="repeater">Repeater</option><option value="unknown">Unknown</option>
              </select>
            </div>
            <div><label style={labelStyle}>Firmware</label><input style={inputStyle} placeholder="v6.49.10" value={form.firmware_version} onChange={e => updateField('firmware_version', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>Frequency (MHz)</label><input style={inputStyle} type="number" placeholder="5800" value={form.frequency_mhz} onChange={e => updateField('frequency_mhz', e.target.value)} /></div>
            <div><label style={labelStyle}>Ch Width (MHz)</label><input style={inputStyle} type="number" placeholder="40" value={form.channel_width_mhz} onChange={e => updateField('channel_width_mhz', e.target.value)} /></div>
            <div><label style={labelStyle}>Site</label><input style={inputStyle} placeholder="Tower HQ" value={form.site_name} onChange={e => updateField('site_name', e.target.value)} /></div>
            <div><label style={labelStyle}>Link Name</label><input style={inputStyle} placeholder="HQ ↔ B3" value={form.link_name} onChange={e => updateField('link_name', e.target.value)} /></div>
          </div>
          <button onClick={handleSubmit} disabled={submitting} style={{
            padding: '12px 24px', backgroundColor: 'var(--status-warning)', color: '#000',
            border: 'none', borderRadius: '8px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
          }}>{submitting ? 'Saving...' : 'Register Device'}</button>
        </div>
      )}

      {/* Devices Grid */}
      {devices && devices.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {devices.map(d => {
            const ping = pingResults[d.id];
            const isPinging = pingingId === d.id;
            return (
              <div key={d.id} className="card" style={{ padding: '20px', borderLeft: `4px solid ${vendorColors[d.vendor] || '#64748b'}`, position: 'relative' }}>
                {/* Ping status indicator */}
                {ping && (
                  <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                    backgroundColor: ping.is_reachable ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: ping.is_reachable ? '#10b981' : '#ef4444',
                    border: `1px solid ${ping.is_reachable ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    {ping.is_reachable ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {ping.is_reachable ? `${ping.response_time_ms?.toFixed(1)} ms` : 'Unreachable'}
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--brand-primary)' }}>{d.name}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{d.ip_address}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Vendor:</span> <span style={{ color: vendorColors[d.vendor], fontWeight: 600 }}>{d.vendor}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Model:</span> {d.device_model || '—'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Role:</span> {d.role.replace('_',' ')}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Freq:</span> {d.frequency_mhz ? `${d.frequency_mhz} MHz` : '—'}</div>
                  {d.site_name && <div><span style={{ color: 'var(--text-muted)' }}>Site:</span> {d.site_name}</div>}
                  {d.link_name && <div><span style={{ color: 'var(--text-muted)' }}>Link:</span> {d.link_name}</div>}
                </div>

                <button onClick={() => pingDevice(d.id)} disabled={isPinging} style={{
                  width: '100%', padding: '8px', backgroundColor: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px',
                  color: '#10b981', fontWeight: 600, fontSize: '0.85rem', cursor: isPinging ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                  {isPinging ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Pinging...</> : <><Zap size={14} /> Ping Device</>}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Router size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>No radio devices registered</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click "Add Device" to register your first wireless radio.</p>
        </div>
      )}

      <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
