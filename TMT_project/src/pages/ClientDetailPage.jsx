import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientHeader from '../components/client-detail/ClientHeader';
import ObligationMilestoneTabs from '../components/client-detail/ObligationMilestoneTabs';
import ObligationCard from '../components/client-detail/ObligationCard';
import MilestoneCard from '../components/client-detail/MilestoneCard';
import ReceiptUploadModal from '../components/client-detail/ReceiptUploadModal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import styles from './ClientDetailPage.module.css';

export default function ClientDetailPage({ accessToken }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState({ client: null, taxObligations: [], paymentMilestones: [] });
  const [activeTab, setActiveTab] = useState('obligations');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Upload modal state
  const [uploadItem, setUploadItem] = useState(null);
  const [uploadType, setUploadType] = useState('obligation');

  // Add Obligation modal state
  const [isAddObligationOpen, setIsAddObligationOpen] = useState(false);
  const [newTaxType, setNewTaxType] = useState('BIR Form 2551Q');
  const [newObligationDueDate, setNewObligationDueDate] = useState('');
  const [newObligationAmount, setNewObligationAmount] = useState('');

  // Add Milestone modal state
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [newMilestoneAmount, setNewMilestoneAmount] = useState('');

  const fetchClientData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Client record not found.');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setToastMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id, accessToken]);

  const handleArchiveToggle = async () => {
    try {
      const res = await fetch(`/api/clients/${id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ isArchived: !data.client.is_archived })
      });
      if (!res.ok) throw new Error('Failed to update archive status.');
      const updated = await res.json();
      setData((prev) => ({ ...prev, client: updated }));
      setToastMessage(`Client status changed to ${updated.is_archived ? 'Archived' : 'Active'}.`);
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  const handleExportClientCSV = async () => {
    try {
      const res = await fetch(`/api/export/obligations?clientId=${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to export client CSV.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.client.name.replace(/\s+/g, '_')}_tax_summary.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setToastMessage('Client CSV summary downloaded!');
    } catch (err) {
      setToastMessage(`Export error: ${err.message}`);
    }
  };

  const handleAddObligation = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/clients/${id}/obligations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          taxType: newTaxType,
          dueDate: newObligationDueDate,
          amount: parseFloat(newObligationAmount)
        })
      });
      if (!res.ok) throw new Error('Failed to add tax obligation.');
      setToastMessage('Tax obligation added successfully!');
      setIsAddObligationOpen(false);
      fetchClientData();
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/clients/${id}/milestones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title: newMilestoneTitle,
          dueDate: newMilestoneDueDate,
          amount: parseFloat(newMilestoneAmount)
        })
      });
      if (!res.ok) throw new Error('Failed to add milestone.');
      setToastMessage('Payment milestone added successfully!');
      setIsAddMilestoneOpen(false);
      fetchClientData();
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading client record...</div>;
  }

  if (!data.client) {
    return <div className={styles.error}>Client record not found.</div>;
  }

  return (
    <div className={styles.page}>
      <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className={styles.backBtn}>
        ← Back to Client Directory
      </Button>

      <ClientHeader
        client={data.client}
        onArchiveToggle={handleArchiveToggle}
        onExportCSV={handleExportClientCSV}
      />

      <div className={styles.sectionHeader}>
        <ObligationMilestoneTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            obligations: data.taxObligations.length,
            milestones: data.paymentMilestones.length
          }}
        />

        {activeTab === 'obligations' ? (
          <Button variant="primary" size="sm" onClick={() => setIsAddObligationOpen(true)}>
            + Add Tax Obligation
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={() => setIsAddMilestoneOpen(true)}>
            + Add Milestone
          </Button>
        )}
      </div>

      {activeTab === 'obligations' && (
        <div className={styles.cardsGrid}>
          {data.taxObligations.length === 0 ? (
            <div className={styles.empty}>No tax obligations logged for this client yet.</div>
          ) : (
            data.taxObligations.map((item) => (
              <ObligationCard
                key={item.id}
                item={item}
                onUploadClick={(target, type) => {
                  setUploadItem(target);
                  setUploadType(type);
                }}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className={styles.cardsGrid}>
          {data.paymentMilestones.length === 0 ? (
            <div className={styles.empty}>No payment milestones logged for this client yet.</div>
          ) : (
            data.paymentMilestones.map((item) => (
              <MilestoneCard
                key={item.id}
                item={item}
                onUploadClick={(target, type) => {
                  setUploadItem(target);
                  setUploadType(type);
                }}
              />
            ))
          )}
        </div>
      )}

      {/* Upload Modal */}
      {uploadItem && (
        <ReceiptUploadModal
          item={uploadItem}
          type={uploadType}
          isOpen={Boolean(uploadItem)}
          onClose={() => setUploadItem(null)}
          onUploadSuccess={() => {
            setToastMessage('Receipt proof uploaded! Status changed to Under Review.');
            fetchClientData();
          }}
          accessToken={accessToken}
        />
      )}

      {/* Add Obligation Modal */}
      <Modal isOpen={isAddObligationOpen} title="Add Tax Obligation" onClose={() => setIsAddObligationOpen(false)}>
        <form onSubmit={handleAddObligation} className={styles.modalForm}>
          <div className={styles.field}>
            <label className={styles.label}>Tax Type / BIR Form</label>
            <select
              value={newTaxType}
              onChange={(e) => setNewTaxType(e.target.value)}
              className={styles.select}
            >
              <option value="BIR Form 2551Q (Quarterly Percentage Tax)">BIR Form 2551Q (Quarterly Percentage Tax)</option>
              <option value="BIR Form 1701Q (Quarterly Income Tax)">BIR Form 1701Q (Quarterly Income Tax)</option>
              <option value="BIR Form 0605 (Annual Registration Fee)">BIR Form 0605 (Annual Registration Fee)</option>
              <option value="BIR Form 1601-EQ (Withholding Tax)">BIR Form 1601-EQ (Withholding Tax)</option>
            </select>
          </div>
          <Input
            label="Due Date"
            type="date"
            value={newObligationDueDate}
            onChange={(e) => setNewObligationDueDate(e.target.value)}
            required
          />
          <Input
            label="Amount (PHP ₱)"
            type="number"
            step="0.01"
            value={newObligationAmount}
            onChange={(e) => setNewObligationAmount(e.target.value)}
            placeholder="e.g. 12500.00"
            required
          />
          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={() => setIsAddObligationOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Obligation</Button>
          </div>
        </form>
      </Modal>

      {/* Add Milestone Modal */}
      <Modal isOpen={isAddMilestoneOpen} title="Add Payment Milestone" onClose={() => setIsAddMilestoneOpen(false)}>
        <form onSubmit={handleAddMilestone} className={styles.modalForm}>
          <Input
            label="Milestone Title"
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
            placeholder="e.g. Q2 Retainer Fee"
            required
          />
          <Input
            label="Due Date"
            type="date"
            value={newMilestoneDueDate}
            onChange={(e) => setNewMilestoneDueDate(e.target.value)}
            required
          />
          <Input
            label="Amount (PHP ₱)"
            type="number"
            step="0.01"
            value={newMilestoneAmount}
            onChange={(e) => setNewMilestoneAmount(e.target.value)}
            placeholder="e.g. 25000.00"
            required
          />
          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={() => setIsAddMilestoneOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Milestone</Button>
          </div>
        </form>
      </Modal>

      <Toast message={toastMessage} type="info" onClose={() => setToastMessage('')} />
    </div>
  );
}

