'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Server, ShieldAlert, Settings, MessageSquareWarning, Radio, ScrollText, Shield, Zap, Radar, Stethoscope, Router } from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Discovery', href: '/discovery', icon: Radar },
  { name: 'Assets', href: '/assets', icon: Server },
  { name: 'Radio Devices', href: '/radio-devices', icon: Router },
  { name: 'Field Measurements', href: '/field-measurements', icon: Radio },
  { name: 'Diagnostics', href: '/diagnostics', icon: Stethoscope },
  { name: 'Alerts', href: '/alerts', icon: ShieldAlert },
  { name: 'Incidents', href: '/incidents', icon: MessageSquareWarning },
  { name: 'Security', href: '/security', icon: Shield },
  { name: 'Logs', href: '/logs', icon: ScrollText },
  { name: 'Automation', href: '/automation', icon: Zap },
  { name: 'Settings', href: '#', icon: Settings, disabled: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/logo.png" alt="NetSentinel AI" className={styles.logoIcon} />
        <span className={styles.logoText}>NetSentinel AI</span>
      </div>
      
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          if (item.disabled) {
            return (
              <div key={item.name} className={`${styles.navItem} ${styles.disabled}`}>
                <Icon size={20} />
                <span>{item.name}</span>
              </div>
            );
          }
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
              {isActive && <div className={styles.activeIndicator} />}
            </Link>
          );
        })}
      </nav>
      
      <div className={styles.footer}>
        <div className={styles.version}>v1.0.0 (Real Ops)</div>
      </div>
    </aside>
  );
}
