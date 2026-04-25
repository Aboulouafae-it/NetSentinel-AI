import { AlertCircle, CheckCircle2, AlertTriangle, Info, HelpCircle } from 'lucide-react';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: string;
  type?: 'alert' | 'asset' | 'incident';
}

export default function StatusBadge({ status, type = 'asset' }: StatusBadgeProps) {
  let icon = null;
  const statusLower = status.toLowerCase();

  if (type === 'asset') {
    if (statusLower === 'online') icon = <CheckCircle2 size={14} />;
    if (statusLower === 'offline') icon = <AlertCircle size={14} />;
    if (statusLower === 'degraded') icon = <AlertTriangle size={14} />;
    if (statusLower === 'unknown') icon = <HelpCircle size={14} />;
  } else if (type === 'alert') {
    if (statusLower === 'critical') icon = <AlertCircle size={14} />;
    if (statusLower === 'high') icon = <AlertTriangle size={14} />;
    if (statusLower === 'medium') icon = <AlertTriangle size={14} />;
    if (statusLower === 'low') icon = <Info size={14} />;
    if (statusLower === 'info') icon = <Info size={14} />;
  }

  return (
    <span className={`${styles.badge} ${styles[statusLower] || styles.default}`}>
      {icon}
      <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </span>
  );
}
