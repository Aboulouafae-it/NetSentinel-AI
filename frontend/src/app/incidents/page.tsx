'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, fetcher } from '@/lib/api';
import type { Alert, Incident } from '@/lib/types';
import { CheckSquare, Clock, MessageSquareWarning, Plus, User, X } from 'lucide-react';
import { ActionButton, DetailsDrawer, EmptyState, FilterBar, LiveIndicator, PageHeader, SeverityBadge, StatusBadge } from '@/components/ui';
import { useLiveEvents } from '@/lib/useLiveEvents';

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
  const { data: incidents } = useSWR<Incident[]>('/incidents/', fetcher);
  const { data: alerts } = useSWR<Alert[]>('/alerts/', fetcher);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium', assigned_to: '' });
  const [owner, setOwner] = useState('');
  const [note, setNote] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [resolution, setResolution] = useState('');
  const [linkAlertId, setLinkAlertId] = useState('');

  const filtered = useMemo(() => {
    return (incidents || []).filter(incident => statusFilter === 'all' || incident.status === statusFilter);
  }, [incidents, statusFilter]);
  const selected = filtered.find(incident => incident.id === selectedId) || filtered[0] || null;
  const { data: details } = useSWR(selected ? `/incidents/${selected.id}/details` : null, fetcher);
  const detailIncident: Incident | null = details?.incident || selected;
  const linkedAlerts: Alert[] = details?.alerts || [];

  const refresh = useCallback(() => {
    mutate('/incidents/');
    if (selected) mutate(`/incidents/${selected.id}/details`);
    mutate('/alerts/');
  }, [selected]);
  const live = useLiveEvents(refresh, ['incident_created', 'incident_updated', 'alert_updated']);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, any> = { title: form.title, severity: form.severity };
      if (form.description.trim()) payload.description = form.description;
      if (form.assigned_to.trim()) payload.assigned_to = form.assigned_to;
      const created = await api.incidents.create(payload);
      setSelectedId(created.id);
      setForm({ title: '', description: '', severity: 'medium', assigned_to: '' });
      setShowForm(false);
      refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0;
  const unlinkedAlerts = (alerts || []).filter(alert => !alert.incident_id && alert.status !== 'resolved');

  return (
    <div>
      <PageHeader
        title="Incidents"
        subtitle="Manage ownership, notes, timeline, linked alerts, tasks, and resolution."
        icon={<MessageSquareWarning size={30} color="var(--brand-primary)" />}
        actions={<>
          <LiveIndicator state={live.state} lastUpdated={live.lastUpdated} />
          <ActionButton onClick={() => setShowForm(!showForm)} color={showForm ? '#ef4444' : 'var(--brand-primary)'}>
            {showForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> New Incident</>}
          </ActionButton>
        </>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '18px' }}>
        <Stat label="Total" value={incidents?.length ?? '—'} color="var(--brand-primary)" />
        <Stat label="Active" value={openCount} color={openCount > 0 ? '#ef4444' : '#10b981'} />
        <Stat label="Resolved" value={(incidents?.length || 0) - openCount} color="#10b981" />
      </div>

      {showForm && (
        <div className="card" style={{ padding: '24px', marginBottom: '18px', border: '1px solid rgba(16,185,129,0.3)' }}>
          <h3 style={{ margin: '0 0 16px', fontWeight: 600 }}>Create Incident</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <Field label="Title *"><input style={inputStyle} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Field>
            <Field label="Severity"><select style={inputStyle} value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field>
            <Field label="Owner"><input style={inputStyle} value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} /></Field>
          </div>
          <Field label="Description"><textarea style={{ ...inputStyle, minHeight: '78px' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Field>
          <button onClick={handleSubmit} disabled={submitting} style={{ ...buttonSolid('var(--brand-primary)'), marginTop: '14px' }}>{submitting ? 'Creating...' : 'Create Incident'}</button>
        </div>
      )}

      <FilterBar>
        <select style={inputStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.keys(statusColors).map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </FilterBar>

      {incidents && incidents.length === 0 && (
        <EmptyState title="No incidents yet" message="Create one manually or promote an alert into an incident." />
      )}

      {incidents && incidents.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '18px', alignItems: 'start' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-hover)' }}>
                  {['Severity', 'Status', 'Incident', 'Owner', 'SLA', 'Updated'].map(header => (
                    <th key={header} style={{ padding: '12px', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(incident => (
                  <tr key={incident.id} onClick={() => setSelectedId(incident.id)} style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    backgroundColor: detailIncident?.id === incident.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                  }}>
                    <td style={{ padding: '12px' }}><SeverityBadge severity={incident.severity} /></td>
                    <td style={{ padding: '12px' }}><StatusBadge status={incident.status} /></td>
                    <td style={{ padding: '12px' }}><div style={{ fontWeight: 700 }}>{incident.title}</div><div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{incident.description || 'No description'}</div></td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{incident.assigned_to || 'Unassigned'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>MVP</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(incident.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DetailsDrawer>
            {detailIncident ? (
              <>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: severityColors[detailIncident.severity], fontWeight: 800 }}>{detailIncident.severity.toUpperCase()}</span>
                  <span style={{ color: statusColors[detailIncident.status], fontWeight: 800 }}>{detailIncident.status}</span>
                </div>
                <h2 style={{ fontSize: '1.12rem', margin: '0 0 8px' }}>{detailIncident.title}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.5 }}>{detailIncident.description || 'No description provided.'}</p>

                <PanelSection title="Owner">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input style={inputStyle} placeholder={detailIncident.assigned_to || 'Assign owner'} value={owner} onChange={e => setOwner(e.target.value)} />
                    <button style={buttonOutline('#3b82f6')} onClick={async () => { if (owner.trim()) { await api.incidents.assign(detailIncident.id, owner); setOwner(''); refresh(); } }}>Assign</button>
                  </div>
                </PanelSection>

                <PanelSection title="Linked Alerts">
                  {linkedAlerts.length > 0 ? linkedAlerts.map(alert => <div key={alert.id} style={rowStyle}>{alert.title}</div>) : <div style={mutedStyle}>No linked alerts.</div>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <select style={inputStyle} value={linkAlertId} onChange={e => setLinkAlertId(e.target.value)}>
                      <option value="">Link alert...</option>
                      {unlinkedAlerts.map(alert => <option key={alert.id} value={alert.id}>{alert.title}</option>)}
                    </select>
                    <button style={buttonOutline('#8b5cf6')} onClick={async () => { if (linkAlertId) { await api.incidents.linkAlert(detailIncident.id, linkAlertId); setLinkAlertId(''); refresh(); } }}>Link</button>
                  </div>
                </PanelSection>

                <PanelSection title="Notes">
                  {(detailIncident.notes || []).slice(-3).map((item: any) => <div key={item.id} style={rowStyle}>{item.note}</div>)}
                  <textarea style={{ ...inputStyle, minHeight: '64px', marginTop: '8px' }} placeholder="Add note..." value={note} onChange={e => setNote(e.target.value)} />
                  <button style={{ ...buttonOutline('#10b981'), marginTop: '8px' }} onClick={async () => { if (note.trim()) { await api.incidents.addNote(detailIncident.id, note); setNote(''); refresh(); } }}>Add Note</button>
                </PanelSection>

                <PanelSection title="Tasks Checklist">
                  {(detailIncident.tasks || []).map(task => (
                    <label key={task.id} style={{ ...rowStyle, display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" checked={task.completed} onChange={async e => { await api.incidents.updateTask(detailIncident.id, task.id, e.target.checked); refresh(); }} />
                      <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</span>
                    </label>
                  ))}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input style={inputStyle} placeholder="New task..." value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
                    <button style={buttonOutline('#f59e0b')} onClick={async () => { if (taskTitle.trim()) { await api.incidents.addTask(detailIncident.id, taskTitle); setTaskTitle(''); refresh(); } }}>Add</button>
                  </div>
                </PanelSection>

                <PanelSection title="Impacted Services">
                  {(detailIncident.impacted_services || []).length > 0 ? detailIncident.impacted_services?.map(service => <div key={service} style={rowStyle}>{service}</div>) : <div style={mutedStyle}>Placeholder: service mapping will land after CMDB/service inventory.</div>}
                </PanelSection>

                <PanelSection title="Timeline">
                  {(detailIncident.timeline_events || []).slice().reverse().slice(0, 6).map((event: any) => (
                    <div key={event.id || event.timestamp} style={{ ...rowStyle, display: 'flex', gap: '8px' }}>
                      <Clock size={13} />
                      <span>{event.message || event.event_type}</span>
                    </div>
                  ))}
                </PanelSection>

                <PanelSection title="Resolve">
                  <textarea style={{ ...inputStyle, minHeight: '64px' }} placeholder="Resolution notes..." value={resolution} onChange={e => setResolution(e.target.value)} />
                  <button style={{ ...buttonOutline('#10b981'), marginTop: '8px' }} onClick={async () => { if (resolution.trim()) { await api.incidents.resolve(detailIncident.id, resolution); setResolution(''); refresh(); } }}>Resolve Incident</button>
                </PanelSection>
              </>
            ) : <EmptyState title="Select an incident" message="Inspect timeline, notes, tasks, linked alerts, and resolution state." />}
          </DetailsDrawer>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="card" style={{ padding: '18px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{label}</label>{children}</div>;
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={{ marginTop: '18px' }}><div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '8px' }}>{title}</div>{children}</section>;
}

function buttonSolid(backgroundColor: string): React.CSSProperties {
  return { padding: '10px 16px', backgroundColor, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
}

function buttonOutline(color: string): React.CSSProperties {
  return { padding: '8px 10px', backgroundColor: `${color}22`, border: `1px solid ${color}66`, color, borderRadius: '6px', fontWeight: 800, cursor: 'pointer' };
}

const rowStyle: React.CSSProperties = { padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.83rem' };
const mutedStyle: React.CSSProperties = { color: 'var(--text-muted)', fontSize: '0.83rem' };
