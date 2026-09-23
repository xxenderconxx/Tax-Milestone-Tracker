import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge';
import OverdueBadge from '../ui/OverdueBadge';
import styles from './DeadlineAlertsList.module.css';

export default function DeadlineAlertsList({ alerts = [] }) {
  if (alerts.length === 0) {
    return <div className={styles.empty}>No upcoming or overdue deadlines. All tax obligations up to date! 🎉</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {alerts.map((item) => (
          <div key={`${item.item_type}-${item.id}`} className={styles.itemRow}>
            <div className={styles.itemInfo}>
              <div className={styles.titleRow}>
                <Link to={`/clients/${item.client_id}`} className={styles.itemTitle}>
                  {item.title}
                </Link>
                {item.isOverdue && <OverdueBadge isOverdue={true} dueDate={item.due_date} />}
              </div>
              <span className={styles.clientName}>Client: {item.client_name}</span>
            </div>

            <div className={styles.metaRow}>
              <div className={styles.dateAmount}>
                <span className={styles.dueDate}>Due: {new Date(item.due_date).toLocaleDateString()}</span>
                <span className={styles.amount}>₱{Number(item.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <StatusBadge status={item.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

