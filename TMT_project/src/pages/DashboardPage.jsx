import React, { useEffect, useState } from 'react';
import DashboardMetrics from '../components/dashboard/DashboardMetrics';
import DeadlineAlertsList from '../components/dashboard/DeadlineAlertsList';
import PendingReceiptsQueue from '../components/dashboard/PendingReceiptsQueue';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';
import styles from './DashboardPage.module.css';

export default function DashboardPage({ user, accessToken }) {
  const [data, setData] = useState({ metrics: {}, deadlineAlerts: [], pendingReceiptsQueue: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard/metrics', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load dashboard metrics.');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [accessToken]);

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/export/dashboard', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to export compliance report.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tmt-compliance-summary.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setToastMessage('Compliance summary report downloaded successfully!');
    } catch (err) {
      setToastMessage(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Compliance Dashboard</h1>
          <p className={styles.pageSubtitle}>Real-time tax deadline monitoring & pending receipt review queue</p>
        </div>

        <Button variant="primary" size="md" onClick={handleExportCSV}>
          📥 Export Compliance Summary
        </Button>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <DashboardMetrics metrics={data.metrics} />

      <div className={styles.contentGrid}>
        <Card title="🚨 Urgent Tax & Milestone Deadlines">
          <DeadlineAlertsList alerts={data.deadlineAlerts} />
        </Card>

        <Card title="⏳ Pending Proof-of-Payment Queue">
          <PendingReceiptsQueue queue={data.pendingReceiptsQueue} user={user} />
        </Card>
      </div>

      <Toast message={toastMessage} type="success" onClose={() => setToastMessage('')} />
    </div>
  );
}

