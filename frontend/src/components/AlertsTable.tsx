import { Alert } from '@/lib/types';
import StatusBadge from './StatusBadge';
import styles from './AlertsTable.module.css';

interface AlertsTableProps {
  alerts: Alert[];
  limit?: number;
}

export default function AlertsTable({ alerts, limit }: AlertsTableProps) {
  const displayAlerts = limit ? alerts.slice(0, limit) : alerts;

  if (alerts.length === 0) {
    return (
      <div className={styles.empty}>
        No active alerts found. Your network is healthy.
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Title</th>
            <th>Source</th>
            <th>Status</th>
            <th>Detected</th>
          </tr>
        </thead>
        <tbody>
          {displayAlerts.map((alert) => (
            <tr key={alert.id}>
              <td>
                <StatusBadge status={alert.severity} type="alert" />
              </td>
              <td className={styles.titleCell}>
                <div className={styles.title}>{alert.title}</div>
                {alert.description && (
                  <div className={styles.description}>{alert.description}</div>
                )}
              </td>
              <td>
                <span className={styles.source}>{alert.source || 'System'}</span>
              </td>
              <td>
                <span className={`${styles.status} ${styles[alert.status]}`}>
                  {alert.status}
                </span>
              </td>
              <td className={styles.time}>
                {new Date(alert.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
