import React, { useState, useEffect } from 'react';
import styles from './SettingsPage.module.css';
import StaffTable from '../components/settings/StaffTable';
import InviteStaffModal from '../components/settings/InviteStaffModal';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';

export default function SettingsPage({ accessToken, currentUser }) {
  const [users, setUsers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users);
      setPendingInvites(data.pendingInvites);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async ({ email, role }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ email, role })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send invite');
      }

      setShowInviteModal(false);
      setToast({ type: 'success', message: `Invitation sent to ${email} (${role})!` });
      fetchUsers();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId, newStatus) => {
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ isActive: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update user status');
      }

      setToast({
        type: 'success',
        message: `User status updated to ${newStatus ? 'Active' : 'Deactivated'}.`
      });
      fetchUsers();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Staff & Settings Workspace</h1>
          <p className={styles.subtitle}>
            Manage team member access, active user accounts, and pending invitations.
          </p>
        </div>

        <Button variant="primary" onClick={() => setShowInviteModal(true)}>
          ➕ Invite New Staff
        </Button>
      </header>

      <div className={styles.content}>
        <StaffTable
          users={users}
          pendingInvites={pendingInvites}
          onToggleStatus={handleToggleStatus}
          currentUser={currentUser}
        />
      </div>

      {showInviteModal && (
        <InviteStaffModal
          onClose={() => setShowInviteModal(false)}
          onSubmit={handleInvite}
          isSubmitting={isSubmitting}
        />
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
