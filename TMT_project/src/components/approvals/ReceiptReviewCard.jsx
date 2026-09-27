import React, { useState } from 'react';
import styles from './ReceiptReviewCard.module.css';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import RejectionReasonInput from './RejectionReasonInput';

export default function ReceiptReviewCard({ receipt, onApprove, onReject, isSubmitting, accessToken }) {
  const [showRejectModal, setShowRejectModal] = useState(false);

  if (!receipt) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderIcon}>👈</span>
        <p>Select a pending receipt submission from the queue to inspect and verify.</p>
      </div>
    );
  }

  const streamUrl = `/api/receipts/${receipt.id}/stream${accessToken ? `?token=${accessToken}` : ''}`;
  const isPdf = receipt.storage_path?.toLowerCase().endsWith('.pdf');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.clientName}>{receipt.client_name}</h2>
          <p className={styles.metaInfo}>TIN: {receipt.client_tin || 'N/A'}</p>
        </div>
        <StatusBadge status={receipt.status} />
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.detailCard}>
          <span className={styles.detailLabel}>Target Item</span>
          <span className={styles.detailValue}>{receipt.item_title}</span>
        </div>
        <div className={styles.detailCard}>
          <span className={styles.detailLabel}>Amount</span>
          <span className={styles.detailValueAmount}>
            ₱{Number(receipt.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className={styles.detailCard}>
          <span className={styles.detailLabel}>Due Date</span>
          <span className={styles.detailValue}>
            {receipt.due_date ? new Date(receipt.due_date).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        <div className={styles.detailCard}>
          <span className={styles.detailLabel}>Submitted By</span>
          <span className={styles.detailValue}>{receipt.uploaded_by_email}</span>
        </div>
      </div>

      <div className={styles.viewerContainer}>
        <h4 className={styles.viewerTitle}>Uploaded Proof of Payment</h4>
        <div className={styles.previewBox}>
          {isPdf ? (
            <iframe
              src={streamUrl}
              title="Receipt Document PDF"
              className={styles.pdfFrame}
            />
          ) : (
            <img
              src={streamUrl}
              alt="Receipt Attachment"
              className={styles.imagePreview}
            />
          )}
        </div>
      </div>

      <div className={styles.actionRow}>
        <Button
          variant="danger"
          onClick={() => setShowRejectModal(true)}
          disabled={isSubmitting}
        >
          ❌ Reject Submission
        </Button>
        <Button
          variant="primary"
          onClick={() => onApprove(receipt.id)}
          disabled={isSubmitting}
        >
          ✅ Approve & Verify Payment
        </Button>
      </div>

      {showRejectModal && (
        <RejectionReasonInput
          onClose={() => setShowRejectModal(false)}
          onSubmit={(reason) => {
            setShowRejectModal(false);
            onReject(receipt.id, reason);
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
