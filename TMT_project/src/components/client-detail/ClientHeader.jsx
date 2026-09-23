import React from 'react';
import Button from '../ui/Button';
import styles from './ClientHeader.module.css';

export default function ClientHeader({ client, onArchiveToggle, onExportCSV }) {
  if (!client) return null;

  return (
    <div className={styles.headerCard}>
      <div className={styles.infoGroup}>
        <div className={styles.titleRow}>
          <h1 className={styles.clientName}>{client.name}</h1>
          <span className={`${styles.badge} ${client.is_archived ? styles.archived : styles.active}`}>
            {client.is_archived ? 'Archived' : 'Active'}
          </span>
        </div>

        <div className={styles.detailsRow}>
          <span className={styles.meta}>
            TIN: <code className={styles.tin}>{client.tin}</code>
          </span>
          <span className={styles.bullet}>•</span>
          <span className={styles.meta}>Entity: {client.business_type}</span>
          <span className={styles.bullet}>•</span>
          <span className={styles.meta}>Added: {new Date(client.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className={styles.actionGroup}>
        <Button variant="secondary" size="md" onClick={onExportCSV}>
          📥 Export Client CSV
        </Button>

        <Button
          variant={client.is_archived ? 'secondary' : 'danger'}
          size="md"
          onClick={onArchiveToggle}
        >
          {client.is_archived ? 'Unarchive Client' : 'Archive Client'}
        </Button>
      </div>
    </div>
  );
}

