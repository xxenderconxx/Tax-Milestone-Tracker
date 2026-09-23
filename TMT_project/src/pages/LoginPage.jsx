import React, { useState } from 'react';
import LoginForm from '../components/auth/LoginForm';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';
import ResetPasswordForm from '../components/auth/ResetPasswordForm';
import Toast from '../components/ui/Toast';
import styles from './LoginPage.module.css';

export default function LoginPage({ onLoginSuccess }) {
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const handleLoginSubmit = async (credentials) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      onLoginSuccess(data.user, data.accessToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (email) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setToastMessage('Reset token generated! Check server console log for local dev token.');
      setView('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoHeader}>
          <span className={styles.logoIcon}>⚖️</span>
          <h1 className={styles.brandTitle}>Tax & Milestone Tracker</h1>
          <span className={styles.tagline}>Philippine Accounting Firm Compliance System</span>
        </div>

        {view === 'login' && (
          <LoginForm
            onLogin={handleLoginSubmit}
            onForgotPassword={() => { setError(''); setView('forgot'); }}
            isLoading={isLoading}
            error={error}
          />
        )}

        {view === 'forgot' && (
          <ForgotPasswordForm
            onSubmit={handleForgotSubmit}
            onBackToLogin={() => { setError(''); setView('login'); }}
            isLoading={isLoading}
            error={error}
          />
        )}
      </div>

      <Toast message={toastMessage} type="info" onClose={() => setToastMessage('')} />
    </div>
  );
}

