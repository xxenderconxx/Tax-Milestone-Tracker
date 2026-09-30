import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientDirectoryPage from './pages/ClientDirectoryPage';
import ClientDetailPage from './pages/ClientDetailPage';
import ApprovalsPage from './pages/ApprovalsPage';
import SettingsPage from './pages/SettingsPage';
import RedeemInvitePage from './pages/RedeemInvitePage';

function RequireAuth({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdmin({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'ADMIN') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>403 - Forbidden</h2>
        <p>You do not have administrative privileges to view this workspace.</p>
      </div>
    );
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState('');

  const [isInitializing, setIsInitializing] = useState(true);

  // Check auth session on load via refresh token cookie & local storage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setUser(data.user);
        }
      } catch (err) {
        console.log('Refresh check failed.');
        setUser(null);
        setAccessToken('');
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (loggedInUser, token) => {
    setUser(loggedInUser);
    setAccessToken(token);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAccessToken('');
    }
  };

  if (isInitializing) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-secondary)'
      }}>
        Loading Tax & Milestone Tracker...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />
          }
        />

        <Route path="/redeem-invite" element={<RedeemInvitePage />} />

        <Route
          path="/"
          element={
            <RequireAuth user={user}>
              <AppShell user={user} onLogout={handleLogout}>
                <DashboardPage accessToken={accessToken} user={user} />
              </AppShell>
            </RequireAuth>
          }
        />

        <Route
          path="/clients"
          element={
            <RequireAuth user={user}>
              <AppShell user={user} onLogout={handleLogout}>
                <ClientDirectoryPage accessToken={accessToken} />
              </AppShell>
            </RequireAuth>
          }
        />

        <Route
          path="/clients/:id"
          element={
            <RequireAuth user={user}>
              <AppShell user={user} onLogout={handleLogout}>
                <ClientDetailPage accessToken={accessToken} currentUser={user} />
              </AppShell>
            </RequireAuth>
          }
        />

        <Route
          path="/approvals"
          element={
            <RequireAdmin user={user}>
              <AppShell user={user} onLogout={handleLogout}>
                <ApprovalsPage accessToken={accessToken} />
              </AppShell>
            </RequireAdmin>
          }
        />

        <Route
          path="/settings"
          element={
            <RequireAdmin user={user}>
              <AppShell user={user} onLogout={handleLogout}>
                <SettingsPage accessToken={accessToken} currentUser={user} />
              </AppShell>
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
