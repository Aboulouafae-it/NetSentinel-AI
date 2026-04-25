'use client';

import { Bell, Search, User } from 'lucide-react';
import styles from './TopBar.module.css';

export default function TopBar() {
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
        <div className={styles.organization}>Acme Corp</div>
        <button className={styles.iconButton} aria-label="Notifications">
          <Bell size={20} />
          <span className={styles.badge}>3</span>
        </button>
        <div className={styles.divider}></div>
        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            <User size={18} />
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>System Admin</span>
            <span className={styles.userRole}>Superadmin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
