import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import styles from './AddClientModal.module.css';

export default function AddClientModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [name, setName] = useState('');
  const [tin, setTin] = useState('');
  const [businessType, setBusinessType] = useState('Corporation');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Business name is required.');
      return;
    }
    if (!tin.trim()) {
      setError('TIN number is required.');
      return;
    }

    onSubmit({ name, tin, businessType });
  };

  const handleClose = () => {
    setName('');
    setTin('');
    setBusinessType('Corporation');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} title="Add New Business Client" onClose={handleClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.errorAlert}>{error}</div>}

        <Input
          label="Business Name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Business Solutions Inc."
          required
        />

        <Input
          label="Philippine TIN (Tax Identification Number)"
          name="tin"
          value={tin}
          onChange={(e) => setTin(e.target.value)}
          placeholder="000-000-000-0000"
          required
        />

        <div className={styles.selectWrapper}>
          <label htmlFor="businessType" className={styles.label}>
            Business Entity Type
          </label>
          <select
            id="businessType"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className={styles.select}
          >
            <option value="Corporation">Corporation</option>
            <option value="Sole Proprietorship">Sole Proprietorship</option>
            <option value="Partnership">Partnership</option>
            <option value="OPC (One Person Corporation)">OPC (One Person Corporation)</option>
          </select>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Create Client
          </Button>
        </div>
      </form>
    </Modal>
  );
}

