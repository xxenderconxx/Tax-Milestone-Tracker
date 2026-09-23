import React from 'react';
import StatusBadge from '../ui/StatusBadge';
import OverdueBadge from '../ui/OverdueBadge';
import Button from '../ui/Button';
import styles from './ItemCard.module.css';

export default function ObligationCard({ item, onUploadClick }) {
  const isVerified = item.status === 'VERIFIED';

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

      <div className={styles.footer}>
        {!isVerified && (
          <Button variant="primary" size="sm" onClick={() => onUploadClick(item, 'obligation')}>
            {item.receipt_id ? 'Re-upload Receipt' : 'Upload Receipt'}
          </Button>
        )}
        {isVerified && <span className={styles.verifiedText}>✅ Compliance Verified</span>}
      </div>
    </div>
  );
}

