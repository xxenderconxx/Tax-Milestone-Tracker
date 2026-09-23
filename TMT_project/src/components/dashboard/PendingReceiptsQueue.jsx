import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge';
import styles from './PendingReceiptsQueue.module.css';

export default function PendingReceiptsQueue({ queue = [], user }) {
  const isAdmin = user?.role === 'ADMIN';

  if (queue.length === 0) {
    return <div className={styles.empty}>No pending receipts in queue. Excellent job!</div>;
  }

  return (
    <div className={styles.queueList}>
      {queue.map((item) => (
        <div key={item.id} className={styles.queueRow}>
          <div className={styles.itemMeta}>
            <span className={styles.clientTitle}>{item.client_name}</span>
            <span className={styles.itemTitle}>{item.item_title}</span>
            <span className={styles.uploader}>Uploaded by: {item.uploaded_by_email}</span>
          </div>

          <div className={styles.actionGroup}>
            <StatusBadge status={item.status} />
            {isAdmin && (
              <Link to="/approvals" className={styles.reviewBtn}>
                Review Receipt →
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

