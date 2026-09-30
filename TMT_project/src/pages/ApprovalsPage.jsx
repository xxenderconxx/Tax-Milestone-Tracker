import React, { useState, useEffect } from 'react';
import styles from './ApprovalsPage.module.css';
import ApprovalQueueList from '../components/approvals/ApprovalQueueList';
import ReceiptReviewCard from '../components/approvals/ReceiptReviewCard';
import AuditLogTable from '../components/approvals/AuditLogTable';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';

export default function ApprovalsPage({ accessToken }) {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'clients' | 'edits' | 'pwresets' | 'audit'
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pending Clients State
  const [pendingClients, setPendingClients] = useState([]);
  const [isLoadingPendingClients, setIsLoadingPendingClients] = useState(false);

  // Pending Edit Requests State
  const [pendingEdits, setPendingEdits] = useState([]);
  const [isLoadingPendingEdits, setIsLoadingPendingEdits] = useState(false);

  // Pending Password Reset Requests State
  const [pendingPwResets, setPendingPwResets] = useState([]);
  const [isLoadingPwResets, setIsLoadingPwResets] = useState(false);

  const fetchPendingPwResets = async () => {
    setIsLoadingPwResets(true);
    try {
      const res = await fetch('/api/auth/password-resets/pending', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load pending password reset requests');
      const data = await res.json();
      setPendingPwResets(data);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsLoadingPwResets(false);
    }
  };
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

  const fetchPendingClients = async () => {
    setIsLoadingPendingClients(true);
    try {
      const res = await fetch('/api/clients/pending/list', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load pending clients');
      const data = await res.json();
      setPendingClients(data);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsLoadingPendingClients(false);
    }
  };

  const fetchPendingEdits = async () => {
    setIsLoadingPendingEdits(true);
    try {
      const res = await fetch('/api/clients/edit-requests/pending', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load pending edit requests');
      const data = await res.json();
      setPendingEdits(data);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsLoadingPendingEdits(false);
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
    fetchPendingQueue();
    fetchPendingClients();
    fetchPendingEdits();
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchPendingQueue();
    } else if (activeTab === 'clients') {
      fetchPendingClients();
    } else if (activeTab === 'edits') {
      fetchPendingEdits();
    } else if (activeTab === 'pwresets') {
      fetchPendingPwResets();
    } else if (activeTab === 'audit') {
      fetchAuditLogs(1);
    }
  }, [activeTab]);

  const handleApproveEdit = async (editId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/edit-requests/${editId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to approve edit request.');
      setToast({ type: 'success', message: 'Edit request approved and applied successfully!' });
      fetchPendingEdits();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectEdit = async (editId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/edit-requests/${editId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to reject edit request.');
      setToast({ type: 'success', message: 'Edit request rejected.' });
      fetchPendingEdits();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Reset Handlers
  const handleApprovePwReset = async (resetId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/auth/password-resets/${resetId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to approve password reset.');
      }
      const data = await res.json();
      // Attempt to copy reset link to clipboard
      try {
        await navigator.clipboard.writeText(data.resetLink);
        setToast({ type: 'success', message: 'Password reset approved! Reset link copied to clipboard.' });
      } catch {
        setToast({ type: 'success', message: `Password reset approved! Reset link: ${data.resetLink}` });
      }
      fetchPendingPwResets();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectPwReset = async (resetId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/auth/password-resets/${resetId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to reject password reset request.');
      setToast({ type: 'success', message: 'Password reset request rejected.' });
      fetchPendingPwResets();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveClient = async (clientId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to approve client.');
      setToast({ type: 'success', message: 'Client approved successfully!' });
      fetchPendingClients();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClient = async (clientId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to reject client.');
      setToast({ type: 'success', message: 'Client registration rejected.' });
      fetchPendingClients();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            📋 Receipt Queue ({pendingReceipts.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'clients' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            🏢 Client Requests ({pendingClients.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'edits' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('edits')}
          >
            ✏️ Edit Requests ({pendingEdits.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'pwresets' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('pwresets')}
          >
            🔑 Password Resets ({pendingPwResets.length})
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
              accessToken={accessToken}
            />
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className={styles.auditContainer}>
          <div className={styles.auditHeader}>
            <span>Pending Client Registration Requests</span>
          </div>
          {isLoadingPendingClients ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading client requests...</div>
          ) : pendingClients.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No pending client registration requests.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem' }}>Business Name</th>
                  <th style={{ padding: '0.75rem' }}>TIN</th>
                  <th style={{ padding: '0.75rem' }}>Entity Type</th>
                  <th style={{ padding: '0.75rem' }}>Submitted Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingClients.map((client) => (
                  <tr key={client.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{client.name}</td>
                    <td style={{ padding: '0.75rem' }}><code>{client.tin}</code></td>
                    <td style={{ padding: '0.75rem' }}>{client.business_type}</td>
                    <td style={{ padding: '0.75rem' }}>{new Date(client.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button
                          variant="primary"
                          size="small"
                          disabled={isSubmitting}
                          onClick={() => handleApproveClient(client.id)}
                        >
                          ✓ Confirm & Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          disabled={isSubmitting}
                          onClick={() => handleRejectClient(client.id)}
                        >
                          ✕ Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'edits' && (
        <div className={styles.auditContainer}>
          <div className={styles.auditHeader}>
            <span>Pending Item & Client Edit Requests</span>
          </div>
          {isLoadingPendingEdits ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading edit requests...</div>
          ) : pendingEdits.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No pending edit requests.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem' }}>Target Type</th>
                  <th style={{ padding: '0.75rem' }}>Associated Client</th>
                  <th style={{ padding: '0.75rem' }}>Requested By</th>
                  <th style={{ padding: '0.75rem' }}>Proposed Changes</th>
                  <th style={{ padding: '0.75rem' }}>Requested Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingEdits.map((reqItem) => (
                  <tr key={reqItem.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{reqItem.target_type}</td>
                    <td style={{ padding: '0.75rem' }}>{reqItem.client_name || 'N/A'}</td>
                    <td style={{ padding: '0.75rem' }}>{reqItem.requested_by_email}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      <pre style={{ margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(reqItem.proposed_changes, null, 2)}
                      </pre>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{new Date(reqItem.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button
                          variant="primary"
                          size="small"
                          disabled={isSubmitting}
                          onClick={() => handleApproveEdit(reqItem.id)}
                        >
                          ✓ Confirm & Apply Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          disabled={isSubmitting}
                          onClick={() => handleRejectEdit(reqItem.id)}
                        >
                          ✕ Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'pwresets' && (
        <div className={styles.auditContainer}>
          <div className={styles.auditHeader}>
            <span>Pending Password Reset Requests</span>
          </div>
          {isLoadingPwResets ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading password reset requests...</div>
          ) : pendingPwResets.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No pending password reset requests.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem' }}>Email</th>
                  <th style={{ padding: '0.75rem' }}>Requested Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPwResets.map((resetReq) => (
                  <tr key={resetReq.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{resetReq.email}</td>
                    <td style={{ padding: '0.75rem' }}>{new Date(resetReq.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button
                          variant="primary"
                          size="small"
                          disabled={isSubmitting}
                          onClick={() => handleApprovePwReset(resetReq.id)}
                        >
                          ✓ Approve & Generate Link
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          disabled={isSubmitting}
                          onClick={() => handleRejectPwReset(resetReq.id)}
                        >
                          ✕ Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
