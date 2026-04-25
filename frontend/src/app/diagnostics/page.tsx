'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { FieldMeasurement } from '@/lib/types';
import { Stethoscope, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ProbableCause {
  cause: string;
  confidence: number;
  description: string;
  evidence: string[];
  resembles: string[];
  additional_checks: string[];
  recommended_actions: string[];
}

interface DiagnosticReport {
  measurement_id: string;
  link_name: string;
  timestamp: string;
  overall_health: string;
  health_score: number;
  causes: ProbableCause[];
  metric_summary: Record<string, string>;
}

const healthColors: Record<string, string> = {
  healthy: 'var(--status-online)',
  warning: 'var(--status-warning)',
  critical: 'var(--status-critical)',
};

export default function DiagnosticsPage() {
  const searchParams = useSearchParams();
  const { data: measurements } = useSWR<FieldMeasurement[]>('/field-measurements/', fetcher);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedCause, setExpandedCause] = useState<number | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // Auto-trigger diagnosis when navigated with ?id=
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam && !autoTriggered) {
      setAutoTriggered(true);
      runDiagnosis(idParam);
    }
  }, [searchParams, autoTriggered]);

  const runDiagnosis = async (measurementId: string) => {
    setLoading(true);
    setSelectedId(measurementId);
    setExpandedCause(null);
    try {
      const res = await fetch(`${API_BASE}/radio-devices/diagnose/${measurementId}`);
      if (!res.ok) throw new Error('Diagnosis failed');
      const data = await res.json();
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Stethoscope size={32} color="var(--brand-secondary)" />
        <h1>RF Diagnostics</h1>
      </div>
      <p className="page-subtitle" style={{ marginBottom: '24px' }}>
        Root Cause Analysis engine — select a real field measurement to diagnose.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left: Measurement selector */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600 }}>Select Measurement</h3>
          {!measurements || measurements.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No measurements available. Enter field readings first.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
              {measurements.map(m => (
                <button
                  key={m.id}
                  onClick={() => runDiagnosis(m.id)}
                  style={{
                    padding: '12px',
                    backgroundColor: selectedId === m.id ? 'rgba(59,130,246,0.15)' : 'rgba(0,0,0,0.2)',
                    border: selectedId === m.id ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--brand-primary)' }}>{m.link_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {m.origin_site || '?'} → {m.destination_site || '?'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {m.rssi_dbm != null ? `RSSI: ${m.rssi_dbm} dBm` : ''} 
                    {m.snr_db != null ? ` · SNR: ${m.snr_db} dB` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Diagnostic Report */}
        <div>
          {loading && (
            <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Running Root Cause Analysis...
            </div>
          )}

          {!loading && !report && (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <Stethoscope size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 8px' }}>Select a measurement to diagnose</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                The RCA engine will analyze the RF values and identify probable causes.
              </p>
            </div>
          )}

          {!loading && report && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Health Score */}
              <div className="card" style={{
                padding: '24px',
                borderTop: `4px solid ${healthColors[report.overall_health] || 'var(--text-muted)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>{report.link_name}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Diagnostic Report · {new Date(report.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '2.5rem', fontWeight: 700,
                      color: healthColors[report.overall_health],
                    }}>
                      {report.health_score}
                      <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span>
                    </div>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase',
                      color: healthColors[report.overall_health],
                    }}>
                      {report.overall_health}
                    </div>
                  </div>
                </div>

                {/* Metric Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                  {Object.entries(report.metric_summary).map(([key, status]) => (
                    <span key={key} style={{
                      padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: status === 'good' ? 'rgba(16,185,129,0.15)' : status === 'critical' || status === 'elevated' || status === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: status === 'good' ? '#10b981' : status === 'critical' || status === 'elevated' || status === 'high' ? '#ef4444' : '#f59e0b',
                    }}>
                      {key.replace('_', ' ')}: {status}
                    </span>
                  ))}
                </div>
              </div>

              {/* Probable Causes */}
              {report.causes.length === 0 ? (
                <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle2 size={24} color="var(--status-online)" />
                  <div>
                    <div style={{ fontWeight: 600 }}>No issues detected</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>All measured values are within acceptable thresholds.</div>
                  </div>
                </div>
              ) : (
                report.causes.map((cause, idx) => {
                  const isExpanded = expandedCause === idx;
                  return (
                    <div
                      key={idx}
                      className="card"
                      style={{
                        padding: '20px',
                        border: `1px solid ${cause.confidence >= 0.8 ? 'rgba(239,68,68,0.3)' : cause.confidence >= 0.6 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        cursor: 'pointer',
                      }}
                      onClick={() => setExpandedCause(isExpanded ? null : idx)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AlertTriangle size={20} color={cause.confidence >= 0.8 ? '#ef4444' : '#f59e0b'} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{cause.cause}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Confidence: {(cause.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '60px', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${cause.confidence * 100}%`, height: '100%', borderRadius: '3px',
                              backgroundColor: cause.confidence >= 0.8 ? '#ef4444' : '#f59e0b',
                            }} />
                          </div>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{cause.description}</p>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <h4 style={{ margin: '0 0 8px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Evidence</h4>
                              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {cause.evidence.map((e, i) => <li key={i} style={{ marginBottom: '4px' }}>{e}</li>)}
                              </ul>
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 8px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Additional Checks</h4>
                              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {cause.additional_checks.map((c, i) => <li key={i} style={{ marginBottom: '4px' }}>{c}</li>)}
                              </ul>
                            </div>
                          </div>

                          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <h4 style={{ margin: '0 0 6px', fontSize: '0.8rem', textTransform: 'uppercase', color: '#10b981' }}>Recommended Actions</h4>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                              {cause.recommended_actions.map((a, i) => <li key={i} style={{ marginBottom: '4px' }}>{a}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
