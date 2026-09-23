import React from 'react';
import styles from './OverdueBadge.module.css';

export default function OverdueBadge({ isOverdue, dueDate }) {
  if (!isOverdue) return null;

  return (
    <span className={styles.overdueBadge} title={`Due date: ${dueDate}`}>
      ⚠️ OVERDUE
    </span>
  );
}

