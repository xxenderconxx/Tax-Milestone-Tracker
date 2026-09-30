import React from 'react';
import StatusBadge from '../ui/StatusBadge';
import OverdueBadge from '../ui/OverdueBadge';
import Button from '../ui/Button';
import styles from './ItemCard.module.css';

export default function ObligationCard({ item, onUploadClick, onEditClick, onDeleteClick, currentUser }) {
  const isVerified = item.status === 'VERIFIED';
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>{item.tax_type}</h3>
          {item.isOverdue && <OverdueBadge isOverdue={true} dueDate={item.due_date} />}
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className={styles.body}>
        <div className={styles.row}>
          <span className={styles.label}>Due Date:</span>
          <span className={styles.val}>{new Date(item.due_date).toLocaleDateString()}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Amount Due:</span>
          <span className={styles.amount}>₱{Number(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
        </div>

        {item.status === 'REJECTED' && item.rejection_reason && (
          <div className={styles.rejectionBox}>
            <strong>Rejection Reason:</strong> {item.rejection_reason}
          </div>
        )}
      </div>

      <div className={styles.footer} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {!isVerified && (
          <Button variant="primary" size="sm" onClick={() => onUploadClick(item, 'obligation')}>
            {item.receipt_id ? 'Re-upload Receipt' : 'Upload Receipt'}
          </Button>
        )}
        {isVerified && <span className={styles.verifiedText}>✅ Compliance Verified</span>}

        <Button variant="outline" size="sm" onClick={() => onEditClick(item)}>
          ✏️ Edit
        </Button>
        {isAdmin && (
          <Button variant="danger" size="sm" onClick={() => onDeleteClick(item)}>
            🗑️ Delete
          </Button>
        )}
      </div>
    </div>
  );
}

