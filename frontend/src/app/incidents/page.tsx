'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/api';
import type { Incident } from '@/lib/types';
import { MessageSquareWarning, Plus, X, AlertTriangle, Clock, User } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const severityColors: Record<string, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#64748b',
};
const statusColors: Record<string, string> = {
  open: '#ef4444', investigating: '#f59e0b', mitigated: '#3b82f6', resolved: '#10b981', closed: '#64748b',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', backgroundColor: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
  color: 'var(--text-primary)', fontSize: '0.9rem',
};

export default function IncidentsPage() {
  const { data: incidents, error } = useSWR<Incident[]>('/incidents/', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium', assigned_to: '' });

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, any> = { title: form.title, severity: form.severity };
      if (form.description.trim()) payload.description = form.description;
      if (form.assigned_to.trim()) payload.assigned_to = form.assigned_to;
      const res = await fetch(`${API_BASE}/incidents/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setForm({ title: '', description: '', severity: 'medium', assigned_to: '' });
        setShowForm(false);
        mutate('/incidents/');
      }
    } finally { setSubmitting(false); }
  };

  const openCount = incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MessageSquareWarning size={32} color="var(--brand-primary)" />
            <h1>Incidents</h1>
          </div>
          <p className="page-subtitle">Track and manage real incidents across your infrastructure.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '10px 20px', backgroundColor: showForm ? 'rgba(239,68,68,0.2)' : 'var(--brand-primary)',
          color: '#fff', border: showForm ? '1px solid rgba(239,68,68,0.4)' : 'none',
          borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px',
        }}>
          {showForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> New Incident</>}
        </button>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '18px', borderTop: '3px solid var(--brand-primary)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Total</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{incidents?.length ?? '—'}</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Active</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: openCount > 0 ? '#ef4444' : '#10b981' }}>{openCount}</div>
        </div>
        <div className="card" style={{ padding: '18px', borderTop: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Resolved</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{(incidents?.length || 0) - openCount}</div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(16,185,129,0.3)' }}>
          <h3 style={{ margin: '0 0 16px', fontWeight: 600 }}>Create Incident</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Title *</label>
              <input style={inputStyle} placeholder="e.g. Link Tower-A degraded" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Severity</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                <option value="critical">Critical</option><option value="high">High</option>
                <option value="medium">Medium</option><option value="low">Low</option>
              </select></div>
            <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Assigned To</label>
              <input style={inputStyle} placeholder="Tech name" value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Incident details..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <button onClick={handleSubmit} disabled={submitting} style={{
            padding: '12px 24px', backgroundColor: 'var(--brand-primary)', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
          }}>{submitting ? 'Creating...' : 'Create Incident'}</button>
        </div>
      )}

      {/* Incidents List */}
      {incidents && incidents.length === 0 && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <MessageSquareWarning size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>No incidents</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create your first incident to start tracking.</p>
        </div>
      )}

      {incidents && incidents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {incidents.map(inc => (
            <div key={inc.id} className="card" style={{
              padding: '18px 20px',
              borderLeft: `4px solid ${severityColors[inc.severity] || '#64748b'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800,
                      backgroundColor: `${severityColors[inc.severity]}22`, color: severityColors[inc.severity],
                    }}>{inc.severity?.toUpperCase()}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                      backgroundColor: 'rgba(255,255,255,0.05)', color: statusColors[inc.status] || '#64748b',
                    }}>{inc.status}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '4px' }}>{inc.title}</div>
                  {inc.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{inc.description}</div>}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {inc.assigned_to && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {inc.assigned_to}</span>}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {new Date(inc.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
