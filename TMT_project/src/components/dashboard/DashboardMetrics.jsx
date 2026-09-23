import React from 'react';
import Card from '../ui/Card';
import styles from './DashboardMetrics.module.css';

export default function DashboardMetrics({ metrics }) {
  const { totalClients = 0, overdueItems = 0, pendingReceipts = 0 } = metrics || {};

  return (
    <div className={styles.metricsGrid}>
      <Card className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <span className={styles.icon}>🏢</span>
          <span className={styles.label}>Total Active Clients</span>
        </div>
        <div className={styles.value}>{totalClients}</div>
        <span className={styles.subtext}>Registered compliance accounts</span>
      </Card>

      <Card className={`${styles.metricCard} ${overdueItems > 0 ? styles.alertCard : ''}`}>
        <div className={styles.metricHeader}>
          <span className={styles.icon}>⚠️</span>
          <span className={styles.label}>Overdue Items</span>
        </div>
        <div className={`${styles.value} ${overdueItems > 0 ? styles.dangerValue : ''}`}>{overdueItems}</div>
        <span className={styles.subtext}>Obligations past due date</span>
      </Card>

      <Card className={styles.metricCard}>
        <div className={styles.metricHeader}>
          <span className={styles.icon}>📑</span>
          <span className={styles.label}>Pending Receipts</span>
        </div>
        <div className={styles.value}>{pendingReceipts}</div>
        <span className={styles.subtext}>Awaiting admin verification</span>
      </Card>
    </div>
  );
}

