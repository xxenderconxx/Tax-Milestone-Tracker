import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import styles from './LoginForm.module.css';

export default function ResetPasswordForm({ token, onSubmit, onBackToLogin, isLoading, error }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    onSubmit({ token, newPassword });
  };

  const displayError = validationError || error;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>Set New Password</h2>
        <p className={styles.subtitle}>Enter your new account password below</p>
      </div>

      {displayError && <div className={styles.errorAlert}>{displayError}</div>}

      <Input
        label="New Password"
        name="newPassword"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="••••••••"
        required
      />

      <Input
        label="Confirm New Password"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="••••••••"
        required
      />

      <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className={styles.submitBtn}>
        Update Password
      </Button>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
        <button type="button" className={styles.forgotBtn} onClick={onBackToLogin}>
          ← Back to Sign In
        </button>
      </div>
    </form>
  );
}

