import React from 'react';
import Button from '../ui/Button';
import styles from './TopNav.module.css';

export default function TopNav({ user, onLogout, onToggleSidebar }) {
  return (
    <header className={styles.topNav}>
      <div className={styles.left}>
        <button
          className={styles.menuToggle}
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
        <span className={styles.routeTag}>TAX & MILESTONE TRACKER</span>
      </div>

      <div className={styles.right}>
        <div className={styles.userInfo}>
          <span className={styles.userRole}>[{user?.role}]</span>
          <span className={styles.userEmail}>{user?.email}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Sign Out
        </Button>
      </div>
    </header>
  );
}

