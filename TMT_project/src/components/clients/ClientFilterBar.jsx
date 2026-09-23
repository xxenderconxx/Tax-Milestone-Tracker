import React from 'react';
import SearchBar from '../ui/SearchBar';
import Button from '../ui/Button';
import styles from './ClientFilterBar.module.css';

export default function ClientFilterBar({
  search,
  onSearchChange,
  isArchived,
  onToggleArchived,
  onAddClient
}) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.searchSection}>
        <SearchBar value={search} onChange={(e) => onSearchChange(e.target.value)} />
      </div>

      <div className={styles.actionSection}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${isArchived ? styles.activeToggle : ''}`}
          onClick={onToggleArchived}
        >
          {isArchived ? '📦 Showing Archived' : '📁 Active Clients'}
        </button>

        {onAddClient && (
          <Button variant="primary" size="md" onClick={onAddClient}>
            + Add New Client
          </Button>
        )}
      </div>
    </div>
  );
}

