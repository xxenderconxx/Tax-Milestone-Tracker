import React from 'react';
import styles from './StatusBadge.module.css';

export default function StatusBadge({ status = 'PENDING', size = 'sm' }) {
  const normalizedStatus = status.toUpperCase();

  const labels = {
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
    VERIFIED: 'Verified',
    REJECTED: 'Rejected'
  };

  const statusClass = styles[normalizedStatus] || styles.PENDING;

  return (
    <span className={`${styles.badge} ${statusClass} ${styles[size]}`}>
      {labels[normalizedStatus] || normalizedStatus}
    </span>
  );
}

