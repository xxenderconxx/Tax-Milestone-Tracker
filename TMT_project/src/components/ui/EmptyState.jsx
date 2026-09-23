import React from 'react';
import styles from './EmptyState.module.css';

export default function EmptyState({
  title = 'No items found',
  description = 'There is currently no data to display here.',
  action
}) {
  return (
    <div className={styles.emptyContainer}>
      <div className={styles.icon}>📭</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

