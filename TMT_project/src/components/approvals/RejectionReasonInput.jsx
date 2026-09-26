import React, { useState } from 'react';
import styles from './RejectionReasonInput.module.css';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function RejectionReasonInput({ onClose, onSubmit, isSubmitting }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a clear rejection reason for the staff member.');
      return;
    }
    onSubmit(reason.trim());
  };

  return (
    <Modal title="Reject Receipt Submission" onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <p className={styles.description}>
          State the reason why this proof of payment is being rejected. This feedback will be recorded in the audit trail.
        </p>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label}>Rejection Reason / Feedback *</label>
          <textarea
            className={styles.textarea}
            rows={4}
            placeholder="e.g. Invalid bank reference number, illegible receipt image, or incorrect payment amount."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
          />
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={isSubmitting}>
            Confirm Rejection
          </Button>
        </div>
      </form>
    </Modal>
  );
}
