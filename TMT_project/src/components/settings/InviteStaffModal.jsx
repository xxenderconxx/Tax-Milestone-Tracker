import React, { useState } from 'react';
import styles from './InviteStaffModal.module.css';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function InviteStaffModal({ onClose, onSubmit, isSubmitting }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    onSubmit({ email, role });
  };

  return (
    <Modal title="Invite New Team Member" onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <p className={styles.subtitle}>
          Generate an invitation token for a new accounting staff member or administrator.
        </p>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <Input
          label="Email Address *"
          type="email"
          placeholder="staff.member@accountingfirm.ph"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          required
        />

        <div className={styles.field}>
          <label className={styles.label}>Assign System Role *</label>
          <select
            className={styles.select}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="STAFF">STAFF (Can view clients, upload receipts, submit payments)</option>
            <option value="ADMIN">ADMIN (Full access: approve receipts, invite staff, view audit logs)</option>
          </select>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
