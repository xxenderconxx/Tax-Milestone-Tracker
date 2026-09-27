import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';
import styles from './LoginPage.module.css';

export default function RedeemInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Invitation token is missing from URL.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/redeem-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to redeem invitation.');
      }

      setToastMessage('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
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
          <h1 className={styles.brandTitle}>Accept Staff Invitation</h1>
          <span className={styles.tagline}>Set your password to activate your TMT account</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ background: '#fde8e8', color: '#9b1c1c', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>{error}</div>}

          <Input
            label="Set Account Password *"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            required
          />

          <Input
            label="Confirm Password *"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            required
          />

          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Activating Account...' : 'Activate Account & Sign In'}
          </Button>

          <Button type="button" variant="outline" onClick={() => navigate('/login')}>
            Back to Sign In
          </Button>
        </form>
      </div>

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage('')} />
      )}
    </div>
  );
}
