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

export default function ClientDetailPage({ accessToken, currentUser }) {
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

  // Edit Client modal state
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editClientTin, setEditClientTin] = useState('');
  const [editClientBusinessType, setEditClientBusinessType] = useState('');

  // Edit Obligation modal state
  const [editObligation, setEditObligation] = useState(null);
  const [editObligationTaxType, setEditObligationTaxType] = useState('');
  const [editObligationDueDate, setEditObligationDueDate] = useState('');
  const [editObligationAmount, setEditObligationAmount] = useState('');

  // Edit Milestone modal state
  const [editMilestone, setEditMilestone] = useState(null);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState('');
  const [editMilestoneDueDate, setEditMilestoneDueDate] = useState('');
  const [editMilestoneAmount, setEditMilestoneAmount] = useState('');

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

  const openEditClientModal = () => {
    if (data.client) {
      setEditClientName(data.client.name);
      setEditClientTin(data.client.tin);
      setEditClientBusinessType(data.client.business_type);
      setIsEditClientOpen(true);
    }
  };

  const handleSaveClientEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: editClientName,
          tin: editClientTin,
          businessType: editClientBusinessType
        })
      });
      if (!res.ok) throw new Error('Failed to update client info.');
      const updated = await res.json();
      setData((prev) => ({ ...prev, client: updated }));
      setToastMessage('Client profile updated successfully!');
      setIsEditClientOpen(false);
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  const openEditObligationModal = (item) => {
    setEditObligation(item);
    setEditObligationTaxType(item.tax_type);
    setEditObligationDueDate(item.due_date ? item.due_date.substring(0, 10) : '');
    setEditObligationAmount(item.amount);
  };

  const handleSaveObligationEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/clients/obligations/${editObligation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          taxType: editObligationTaxType,
          dueDate: editObligationDueDate,
          amount: parseFloat(editObligationAmount)
        })
      });
      if (!res.ok) throw new Error('Failed to update tax obligation.');
      setToastMessage('Tax obligation updated successfully!');
      setEditObligation(null);
      fetchClientData();
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteObligation = async (item) => {
    if (!window.confirm(`Are you sure you want to delete obligation "${item.tax_type}"?`)) return;
    try {
      const res = await fetch(`/api/clients/obligations/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to delete obligation.');
      setToastMessage('Tax obligation removed.');
      fetchClientData();
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  const openEditMilestoneModal = (item) => {
    setEditMilestone(item);
    setEditMilestoneTitle(item.title);
    setEditMilestoneDueDate(item.due_date ? item.due_date.substring(0, 10) : '');
    setEditMilestoneAmount(item.amount);
  };

  const handleSaveMilestoneEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/clients/milestones/${editMilestone.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title: editMilestoneTitle,
          dueDate: editMilestoneDueDate,
          amount: parseFloat(editMilestoneAmount)
        })
      });
      if (!res.ok) throw new Error('Failed to update payment milestone.');
      setToastMessage('Payment milestone updated successfully!');
      setEditMilestone(null);
      fetchClientData();
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteMilestone = async (item) => {
    if (!window.confirm(`Are you sure you want to delete milestone "${item.title}"?`)) return;
    try {
      const res = await fetch(`/api/clients/milestones/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to delete milestone.');
      setToastMessage('Payment milestone removed.');
      fetchClientData();
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

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

  const handleRemoveClient = async () => {
    if (!window.confirm(`Are you sure you want to permanently remove client "${data.client.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to remove client.');
      }
      setToastMessage(`Client "${data.client.name}" removed successfully.`);
      setTimeout(() => navigate('/clients'), 1000);
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  const handleApproveClient = async () => {
    try {
      const res = await fetch(`/api/clients/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to approve client.');
      setToastMessage('Client registration approved!');
      fetchClientData();
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
    }
  };

  const handleRejectClient = async () => {
    try {
      const res = await fetch(`/api/clients/${id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to reject client.');
      setToastMessage('Client registration rejected.');
      fetchClientData();
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
        currentUser={currentUser}
        onArchiveToggle={handleArchiveToggle}
        onExportCSV={handleExportClientCSV}
        onRemoveClient={handleRemoveClient}
        onApproveClient={handleApproveClient}
        onRejectClient={handleRejectClient}
        onEditClient={openEditClientModal}
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
                currentUser={currentUser}
                onUploadClick={(target, type) => {
                  setUploadItem(target);
                  setUploadType(type);
                }}
                onEditClick={openEditObligationModal}
                onDeleteClick={handleDeleteObligation}
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
                currentUser={currentUser}
                onUploadClick={(target, type) => {
                  setUploadItem(target);
                  setUploadType(type);
                }}
                onEditClick={openEditMilestoneModal}
                onDeleteClick={handleDeleteMilestone}
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

      {/* Edit Client Info Modal */}
      <Modal isOpen={isEditClientOpen} title="Edit Client Information" onClose={() => setIsEditClientOpen(false)}>
        <form onSubmit={handleSaveClientEdit} className={styles.modalForm}>
          <Input
            label="Business Name"
            value={editClientName}
            onChange={(e) => setEditClientName(e.target.value)}
            required
          />
          <Input
            label="TIN Number"
            value={editClientTin}
            onChange={(e) => setEditClientTin(e.target.value)}
            placeholder="000-000-000-000"
            required
          />
          <Input
            label="Business Entity Type"
            value={editClientBusinessType}
            onChange={(e) => setEditClientBusinessType(e.target.value)}
            placeholder="Sole Proprietorship / Corporation"
            required
          />
          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={() => setIsEditClientOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Update Client Info</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Obligation Modal */}
      {editObligation && (
        <Modal isOpen={Boolean(editObligation)} title="Edit Tax Obligation" onClose={() => setEditObligation(null)}>
          <form onSubmit={handleSaveObligationEdit} className={styles.modalForm}>
            <Input
              label="Tax Type / BIR Form"
              value={editObligationTaxType}
              onChange={(e) => setEditObligationTaxType(e.target.value)}
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={editObligationDueDate}
              onChange={(e) => setEditObligationDueDate(e.target.value)}
              required
            />
            <Input
              label="Amount (PHP ₱)"
              type="number"
              step="0.01"
              value={editObligationAmount}
              onChange={(e) => setEditObligationAmount(e.target.value)}
              required
            />
            <div className={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={() => setEditObligation(null)}>Cancel</Button>
              <Button type="submit" variant="primary">Update Obligation</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Milestone Modal */}
      {editMilestone && (
        <Modal isOpen={Boolean(editMilestone)} title="Edit Payment Milestone" onClose={() => setEditMilestone(null)}>
          <form onSubmit={handleSaveMilestoneEdit} className={styles.modalForm}>
            <Input
              label="Milestone Title"
              value={editMilestoneTitle}
              onChange={(e) => setEditMilestoneTitle(e.target.value)}
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={editMilestoneDueDate}
              onChange={(e) => setEditMilestoneDueDate(e.target.value)}
              required
            />
            <Input
              label="Amount (PHP ₱)"
              type="number"
              step="0.01"
              value={editMilestoneAmount}
              onChange={(e) => setEditMilestoneAmount(e.target.value)}
              required
            />
            <div className={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={() => setEditMilestone(null)}>Cancel</Button>
              <Button type="submit" variant="primary">Update Milestone</Button>
            </div>
          </form>
        </Modal>
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

