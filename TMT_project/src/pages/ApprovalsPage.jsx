import React, { useState, useEffect } from 'react';
import styles from './ApprovalsPage.module.css';
import ApprovalQueueList from '../components/approvals/ApprovalQueueList';
import ReceiptReviewCard from '../components/approvals/ReceiptReviewCard';
import AuditLogTable from '../components/approvals/AuditLogTable';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';

export default function ApprovalsPage({ accessToken }) {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'audit'
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Toast notifications state
  const [toast, setToast] = useState(null);

  const fetchPendingQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await fetch('/api/receipts/pending/queue', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load pending queue');
      const data = await res.json();
      setPendingReceipts(data);
      if (data.length > 0 && !selectedReceipt) {
        setSelectedReceipt(data[0]);
      } else if (data.length === 0) {
        setSelectedReceipt(null);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/audit-logs?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load audit logs');
      const data = await res.json();
      setAuditLogs(data.auditLogs);
      setPagination(data.pagination);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchPendingQueue();
    } else if (activeTab === 'audit') {
      fetchAuditLogs(1);
    }
  }, [activeTab]);

  const handleApprove = async (receiptId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/receipts/${receiptId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to approve receipt');
      }
      setToast({ type: 'success', message: 'Receipt approved & obligation verified!' });
      fetchPendingQueue();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (receiptId, rejectionReason) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/receipts/${receiptId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ rejectionReason })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reject receipt');
      }
      setToast({ type: 'success', message: 'Receipt rejected with feedback.' });
      fetchPendingQueue();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportAuditLogs = async () => {
    try {
      const res = await fetch('/api/export/audit-logs', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'Audit log CSV downloaded.' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Verification & Audit Workspace</h1>
          <p className={styles.subtitle}>
            Review pending payment proofs submitted by staff and inspect system activity audit logs.
          </p>
        </div>

        <div className={styles.tabHeader}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'queue' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            📋 Approval Queue ({pendingReceipts.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'audit' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            📜 Audit Logs
          </button>
        </div>
      </header>

      {activeTab === 'queue' && (
        <div className={styles.workspaceGrid}>
          <div className={styles.queueColumn}>
            <ApprovalQueueList
              pendingReceipts={pendingReceipts}
              onSelectReceipt={setSelectedReceipt}
              selectedReceiptId={selectedReceipt?.id}
            />
          </div>
          <div className={styles.reviewColumn}>
            <ReceiptReviewCard
              receipt={selectedReceipt}
              onApprove={handleApprove}
              onReject={handleReject}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className={styles.auditContainer}>
          <div className={styles.auditHeader}>
            <span>Immutable system activity audit records</span>
            <Button variant="outline" size="small" onClick={handleExportAuditLogs}>
              📥 Export Audit CSV
            </Button>
          </div>
          <AuditLogTable
            auditLogs={auditLogs}
            pagination={pagination}
            onPageChange={(page) => fetchAuditLogs(page)}
            isLoading={isLoadingAudit}
          />
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
