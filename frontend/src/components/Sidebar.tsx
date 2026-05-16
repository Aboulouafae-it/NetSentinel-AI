'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BrainCircuit, Cloud, FileText, LayoutDashboard, Network, Server, ShieldAlert, Settings, MessageSquareWarning, Radio, ScrollText, Shield, Zap, Radar, Stethoscope, Router, Wifi } from 'lucide-react';
import styles from './Sidebar.module.css';

const navGroups = [
  {
    label: 'Control Center',
    items: [
      { name: 'Overview', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Network Operations',
    items: [
      { name: 'Network Overview', href: '/network', icon: Network },
      { name: 'Discovery', href: '/discovery', icon: Radar },
      { name: 'Assets', href: '/assets', icon: Server },
      { name: 'Edge Agents', href: '/agents', icon: Activity },
      { name: 'Logs', href: '/logs', icon: ScrollText },
    ],
  },
  {
    label: 'Wireless Diagnostics',
    items: [
      { name: 'Wireless', href: '/wireless', icon: Wifi },
      { name: 'Radio Devices', href: '/radio-devices', icon: Router },
      { name: 'Field Measurements', href: '/field-measurements', icon: Radio },
      { name: 'Diagnostics', href: '/diagnostics', icon: Stethoscope },
    ],
  },
  {
    label: 'Security Operations',
    items: [
      { name: 'Alerts', href: '/alerts', icon: ShieldAlert },
      { name: 'Incidents', href: '/incidents', icon: MessageSquareWarning },
      { name: 'Security', href: '/security', icon: Shield },
      { name: 'Automation', href: '/automation', icon: Zap },
    ],
  },
  {
    label: 'Cloud & Hybrid',
    items: [
      { name: 'Cloud & Hybrid', href: '/cloud-hybrid', icon: Cloud },
    ],
  },
  {
    label: 'AI Copilot',
    items: [
      { name: 'AI Copilot', href: '/ai-copilot', icon: BrainCircuit },
    ],
  },
  {
    label: 'Reports',
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
    ],
  },
  {
    label: 'System / Appliance',
    items: [
      { name: 'Appliance', href: '/admin/appliance', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/logo.svg" alt="NetSentinel AI" className={styles.logoIcon} />
        <span className={styles.logoText}>NetSentinel AI</span>
      </div>
      
      <nav className={styles.nav}>
        {navGroups.map((group) => (
          <div key={group.label} className={styles.navGroup}>
            <div className={styles.groupLabel}>{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
              
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                  {isActive && <div className={styles.activeIndicator} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      
      <div className={styles.footer}>
        <div className={styles.version}>v3.0 foundation · MVP</div>
      </div>
    </aside>
  );
}
