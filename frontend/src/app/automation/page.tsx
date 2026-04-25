'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Zap, PlayCircle, Settings, CheckCircle, XCircle } from 'lucide-react';

export default function AutomationPage() {
  const { data: playbooks, error: playbooksError } = useSWR<any[]>('/automation/playbooks', fetcher);
  const { data: actions, error: actionsError } = useSWR<any[]>('/automation/actions?limit=20', fetcher);

  return (
    <div>
      <div className="page-title">
        <h1>Automation & Playbooks</h1>
      </div>
      <p className="page-subtitle" style={{ marginBottom: '30px' }}>
        Configure and monitor automated response rules that execute when specific alerts trigger.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Playbook Rules Section */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={20} color="var(--brand-secondary)" />
              Active Playbooks
            </h2>
            <button style={{ padding: '6px 12px', background: 'var(--brand-secondary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
              + Create Rule
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!playbooks && !playbooksError && <div style={{ color: 'var(--text-muted)' }}>Loading playbooks...</div>}
            {playbooks?.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No playbooks configured.</div>}
            
            {playbooks?.map((playbook) => (
              <div key={playbook.id} style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: '8px', borderLeft: '4px solid var(--brand-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{playbook.name}</div>
                  <div style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-online)', borderRadius: '12px' }}>
                    {playbook.is_active ? 'Active' : 'Disabled'}
                  </div>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
                  {playbook.description}
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem' }}>
                  <span style={{ padding: '4px 8px', background: 'var(--surface-elevated)', borderRadius: '4px', border: '1px dashed var(--border-subtle)' }}>
                    IF <span style={{ color: 'var(--status-critical)' }}>Severity == {playbook.trigger_on_severity?.toUpperCase()}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>→</span>
                  <span style={{ padding: '4px 8px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--brand-secondary)', borderRadius: '4px', fontWeight: 500 }}>
                    DO {playbook.action_type.toUpperCase().replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution History Section */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PlayCircle size={20} color="var(--brand-primary)" />
              Recent Executions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!actions && !actionsError && <div style={{ color: 'var(--text-muted)' }}>Loading execution history...</div>}
            {actions?.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No recent executions.</div>}

            {actions?.map((action) => (
              <div key={action.id} style={{ display: 'flex', gap: '16px', padding: '16px', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  {action.status === 'executed' ? (
                    <CheckCircle size={20} color="var(--status-online)" />
                  ) : (
                    <XCircle size={20} color="var(--status-critical)" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 500 }}>Playbook Executed</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(action.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', fontFamily: 'monospace' }}>
                    Alert ID: {action.alert_id?.split('-')[0]}...
                  </div>
                  <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.85rem', color: action.status === 'executed' ? 'var(--text-primary)' : 'var(--status-critical)' }}>
                    {action.result_message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
