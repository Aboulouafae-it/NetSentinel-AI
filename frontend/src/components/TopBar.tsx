'use client';

import { LogOut, Search, User } from 'lucide-react';
import styles from './TopBar.module.css';
import { useAuth } from './AuthShell';

export default function TopBar() {
  const { user, logout } = useAuth();
  return (
    <header className={styles.topbar}>
      <div className={styles.search}>
        <Search size={18} className={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Search assets, alerts, or IP addresses..." 
          className={styles.searchInput}
        />
      </div>
      
      <div className={styles.actions}>
        <div className={styles.organization}>{user?.organization_name || 'No organization'}</div>
        <div className={styles.divider}></div>
        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            <User size={18} />
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.full_name}</span>
            <span className={styles.userRole}>{user?.role}</span>
          </div>
        </div>
        <button className={styles.iconButton} aria-label="Logout" onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
