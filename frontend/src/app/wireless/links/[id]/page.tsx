'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { WirelessLink, WirelessMetric } from '@/lib/types';
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bot } from 'lucide-react';

export default function WirelessLinkDashboard() {
  const params = useParams();
  const linkId = params.id as string;

  const { data: link, error: linkError } = useSWR<WirelessLink>(`/wireless/links/${linkId}`, fetcher);
  const { data: metrics, error: metricsError } = useSWR<WirelessMetric[]>(`/wireless/links/${linkId}/metrics?limit=50`, fetcher, { refreshInterval: 5000 });
  
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  const generateAIBrief = async () => {
    setIsGeneratingBrief(true);
    try {
        const data = await fetcher(`/wireless/links/${linkId}/ai-brief`);
        setAiBrief(data.brief);
    } catch (err) {
        console.error("Failed to generate AI brief", err);
        setAiBrief("An error occurred while communicating with NetSentinel Copilot.");
    } finally {
        setIsGeneratingBrief(false);
    }
  };

  if (!link) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading link dashboard...</div>;

  const latestMetric = metrics && metrics.length > 0 ? metrics[0] : null;
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

      {/* AI Copilot Field Brief Section */}
      <div className="card" style={{ 
        padding: '24px', 
        border: '1px solid rgba(139, 92, 246, 0.4)', 
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(24, 24, 27, 0.6) 100%)',
        boxShadow: '0 0 30px rgba(139, 92, 246, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                <Bot size={28} color="var(--brand-secondary)" />
                AI Copilot: Pre-visit Field Brief
            </h3>
            <button 
                onClick={generateAIBrief} 
                disabled={isGeneratingBrief}
                style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--brand-secondary)',
                    backgroundImage: 'linear-gradient(to right, #8b5cf6, #6d28d9)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: isGeneratingBrief ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                    transition: 'all 0.2s',
                    opacity: isGeneratingBrief ? 0.7 : 1
                }}
                onMouseOver={(e) => { if(!isGeneratingBrief) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseOut={(e) => { if(!isGeneratingBrief) e.currentTarget.style.transform = 'translateY(0)' }}
            >
                {isGeneratingBrief ? 'Analyzing Telemetry...' : 'Generate Field Brief'}
            </button>
        </div>
        
        {aiBrief && (
            <div style={{ 
                marginTop: '20px', 
                padding: '24px', 
                backgroundColor: 'rgba(0,0,0,0.2)', 
                borderRadius: '8px',
                borderLeft: '4px solid var(--brand-secondary)',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap'
            }}>
                {aiBrief}
            </div>
        )}
        
        {!aiBrief && !isGeneratingBrief && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                Click "Generate Field Brief" to have the AI Copilot analyze the deterministic baseline deviations and recommend a field action plan.
            </div>
        )}
      </div>

    </div>
  );
}
