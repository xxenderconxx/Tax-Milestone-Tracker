import React from 'react';
import Button from '../ui/Button';
import styles from './ClientHeader.module.css';

export default function ClientHeader({ client, currentUser, onArchiveToggle, onExportCSV, onRemoveClient, onApproveClient, onRejectClient, onEditClient }) {
  if (!client) return null;

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className={styles.headerCard}>
      <div className={styles.infoGroup}>
        <div className={styles.titleRow}>
          <h1 className={styles.clientName}>{client.name}</h1>
          {client.is_archived ? (
            <span className={`${styles.badge} ${styles.archived}`}>Archived</span>
          ) : client.approval_status === 'PENDING' ? (
            <span className={`${styles.badge} ${styles.archived}`} style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              Pending Admin Approval
            </span>
          ) : client.approval_status === 'REJECTED' ? (
            <span className={`${styles.badge} ${styles.archived}`} style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
              Rejected
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.active}`}>Active</span>
          )}
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
        <Button variant="outline" size="md" onClick={onEditClient}>
          ✏️ Edit Info
        </Button>

        <Button variant="secondary" size="md" onClick={onExportCSV}>
          📥 Export Client CSV
        </Button>

        {isAdmin && client.approval_status === 'PENDING' && (
          <>
            <Button variant="primary" size="md" onClick={onApproveClient}>
              ✓ Approve Client
            </Button>
            <Button variant="danger" size="md" onClick={onRejectClient}>
              ✕ Reject Client
            </Button>
          </>
        )}

        <Button
          variant={client.is_archived ? 'secondary' : 'outline'}
          size="md"
          onClick={onArchiveToggle}
        >
          {client.is_archived ? 'Unarchive Client' : 'Archive Client'}
        </Button>

        {isAdmin && (
          <Button variant="danger" size="md" onClick={onRemoveClient}>
            🗑️ Remove Client
          </Button>
        )}
      </div>
    </div>
  );
}

