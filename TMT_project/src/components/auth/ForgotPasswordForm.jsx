import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import styles from './LoginForm.module.css';

export default function ForgotPasswordForm({ onSubmit, onBackToLogin, isLoading, successMessage, error }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    onSubmit(email);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>Reset Password</h2>
        <p className={styles.subtitle}>Enter your account email to receive recovery instructions</p>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}
      {successMessage && (
        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--teal-soft)', color: 'var(--teal)', border: '1px solid var(--teal)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
          {successMessage}
        </div>
      )}

      <Input
        label="Email Address"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your-email@tmtfirm.ph"
        required
      />

      <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className={styles.submitBtn}>
        Send Recovery Code
      </Button>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
        <button type="button" className={styles.forgotBtn} onClick={onBackToLogin}>
          ← Back to Sign In
        </button>
      </div>
    </form>
  );
}

