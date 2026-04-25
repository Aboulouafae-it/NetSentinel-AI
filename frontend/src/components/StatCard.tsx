import { LucideIcon } from 'lucide-react';
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  color?: 'primary' | 'critical' | 'high' | 'online';
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle,
  color = 'primary'
}: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <div className={`${styles.iconWrapper} ${styles[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.value}>{value}</div>
        {trend && (
          <div className={`${styles.trend} ${trend.isPositive ? styles.positive : styles.negative}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </div>
  );
}
