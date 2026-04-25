'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { DetectionRule, IndicatorOfCompromise } from '@/lib/types';
import { Shield, Plus, Target, AlertTriangle } from 'lucide-react';
import styles from './page.module.css';

export default function SecurityPage() {
  const { data: rules, error: rulesError } = useSWR<DetectionRule[]>('/security/rules', fetcher);
  const { data: iocs, error: iocsError } = useSWR<IndicatorOfCompromise[]>('/security/iocs', fetcher);

  const getSeverityBadge = (sev: string) => {
    const cls = styles[`badge_${sev.toLowerCase()}`] || styles.badge_low;
    return <span className={`${styles.badge} ${cls}`}>{sev}</span>;
  };

  return (
    <div className={styles.container}>
      <div className="page-title">
        <h1>Security & Threat Detection</h1>
      </div>
      <p className="page-subtitle">
        Manage active detection rules and indicators of compromise (IOCs) used by the Threat Engine.
      </p>

      <div className={styles.grid}>
        {/* Detection Rules Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <Shield size={20} className="text-brand" />
              Detection Rules
            </div>
            <button className={styles.addButton}>
              <Plus size={16} /> New Rule
            </button>
          </div>
          
          <div className={styles.list}>
            {!rules && !rulesError && <div className="text-muted">Loading rules...</div>}
            {rules?.length === 0 && <div className="text-muted">No rules configured.</div>}
            
            {rules?.map((rule) => (
              <div key={rule.id} className={styles.listItem}>
                <div className={styles.itemHeader}>
                  <div className={styles.itemName}>
                    {rule.name}
                    {!rule.is_active && <span className="text-muted" style={{fontSize: '0.8em', marginLeft: '8px'}}>(Inactive)</span>}
                  </div>
                  {getSeverityBadge(rule.severity)}
                </div>
                <div className={styles.itemDesc}>{rule.description}</div>
                <div className={styles.ruleDetails}>
                  <span><strong>Field:</strong> {rule.target_field}</span>
                  <span><strong>Condition:</strong> {rule.condition}</span>
                  <span><strong>Pattern:</strong> {rule.pattern}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IOCs Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <Target size={20} className="text-critical" />
              Indicators of Compromise
            </div>
            <button className={styles.addButton}>
              <Plus size={16} /> Add IOC
            </button>
          </div>
          
          <div className={styles.list}>
            {!iocs && !iocsError && <div className="text-muted">Loading IOCs...</div>}
            {iocs?.length === 0 && <div className="text-muted">No active IOCs.</div>}
            
            {iocs?.map((ioc) => (
              <div key={ioc.id} className={styles.listItem}>
                <div className={styles.itemHeader}>
                  <div className={styles.itemName} style={{ fontFamily: 'monospace' }}>
                    {ioc.value}
                  </div>
                  <span className={styles.badge} style={{ backgroundColor: 'var(--surface-color)' }}>
                    {ioc.ioc_type.toUpperCase()}
                  </span>
                </div>
                <div className={styles.itemDesc}>{ioc.description || 'No description provided.'}</div>
                <div className={styles.iocDetails}>
                  <AlertTriangle size={14} className="text-critical" />
                  <span style={{ fontSize: '0.8rem' }}>Confidence: {ioc.confidence}%</span>
                  <div className={styles.confidenceBar}>
                    <div className={styles.confidenceFill} style={{ width: `${ioc.confidence}%` }}></div>
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
