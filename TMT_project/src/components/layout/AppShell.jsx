import React, { useState } from 'react';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import styles from './AppShell.module.css';

export default function AppShell({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={styles.mainWrapper}>
        <TopNav
          user={user}
          onLogout={onLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

