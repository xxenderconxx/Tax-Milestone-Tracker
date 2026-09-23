import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

export default function Sidebar({ user, isOpen, onClose }) {
  const isAdmin = user && user.role === 'ADMIN';

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.brand}>
          <span className={styles.logoIcon}>⚖️</span>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>TMT</span>
            <span className={styles.brandSub}>Tax & Milestone</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            onClick={onClose}
          >
            <span className={styles.navIcon}>📊</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/clients"
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            onClick={onClose}
          >
            <span className={styles.navIcon}>🏢</span>
            <span>Client Directory</span>
          </NavLink>

          {/* Role-gated links: Only visible to ADMIN */}
          {isAdmin && (
            <>
              <div className={styles.sectionHeader}>ADMIN WORKSPACE</div>

              <NavLink
                to="/approvals"
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={onClose}
              >
                <span className={styles.navIcon}>🔍</span>
                <span>Verification & Audit</span>
              </NavLink>

              <NavLink
                to="/settings"
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={onClose}
              >
                <span className={styles.navIcon}>⚙️</span>
                <span>Staff & Settings</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className={styles.userFooter}>
          <div className={styles.userBadge}>
            <span className={styles.userRoleTag}>{user?.role || 'STAFF'}</span>
            <span className={styles.userEmail}>{user?.email}</span>
          </div>
        </div>
      </aside>
    </>
  );
}

