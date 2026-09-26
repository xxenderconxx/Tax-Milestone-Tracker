import React from 'react';
import styles from './ApprovalQueueList.module.css';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';

export default function ApprovalQueueList({ pendingReceipts, onSelectReceipt, selectedReceiptId }) {
  if (!pendingReceipts || pendingReceipts.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <span className={styles.emptyIcon}>🎉</span>
        <p className={styles.emptyTitle}>All Clear!</p>
        <p className={styles.emptySub}>There are no pending receipts waiting for verification.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Pending Approvals ({pendingReceipts.length})</h3>
      <div className={styles.list}>
        {pendingReceipts.map((item) => {
          const isSelected = selectedReceiptId === item.id;
          return (
            <div
              key={item.id}
              className={`${styles.card} ${isSelected ? styles.selectedCard : ''}`}
              onClick={() => onSelectReceipt(item)}
            >
              <div className={styles.cardHeader}>
                <span className={styles.clientName}>{item.client_name}</span>
                <StatusBadge status={item.status} />
              </div>
              <div className={styles.cardDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Item:</span>
                  <span className={styles.value}>{item.item_title}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Amount:</span>
                  <span className={styles.amount}>₱{Number(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Uploaded By:</span>
                  <span className={styles.subText}>{item.uploaded_by_email}</span>
                </div>
              </div>
              <Button
                variant={isSelected ? 'primary' : 'outline'}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectReceipt(item);
                }}
              >
                {isSelected ? 'Reviewing' : 'Review Document'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
