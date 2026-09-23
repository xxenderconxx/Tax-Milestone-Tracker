import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import styles from './LoginForm.module.css';

export default function LoginForm({ onLogin, onForgotPassword, isLoading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    onLogin({ email, password });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h2 className={styles.title}>Sign In</h2>
        <p className={styles.subtitle}>Enter your accounting firm credentials</p>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <Input
        label="Email Address"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="staff@tmtfirm.ph"
        required
      />

      <Input
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />

      <div className={styles.forgotRow}>
        <button type="button" className={styles.forgotBtn} onClick={onForgotPassword}>
          Forgot password?
        </button>
      </div>

      <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className={styles.submitBtn}>
        Sign In to TMT
      </Button>
    </form>
  );
}

