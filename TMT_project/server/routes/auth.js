const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  requireAuth
} = require('../middleware/auth');

const router = express.Router();

// 1. POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userResult = await db.query(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const user = userResult.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Account is pending invitation redemption.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Issue tokens
    const accessToken = generateAccessToken(user);
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

    // Store refresh token
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    setRefreshTokenCookie(res, refreshToken);

    // Audit log entry
    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [user.id, 'LOGIN', 'USER', user.id, JSON.stringify({ ip: req.ip, userAgent: req.headers['user-agent'] })]
    );

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies.refreshToken;
    if (!rawRefreshToken) {
      return res.status(401).json({ error: 'Refresh token missing.' });
    }

    const tokenHash = hashToken(rawRefreshToken);

    const tokenResult = await db.query(
      `SELECT rt.id, rt.user_id, u.email, u.role, u.is_active 
       FROM refresh_tokens rt 
       JOIN users u ON rt.user_id = u.id 
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    const record = tokenResult.rows[0];
    if (!record || !record.is_active) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    // Revoke current refresh token (Sliding window rotation)
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [record.id]
    );

    // Issue new tokens
    const user = { id: record.user_id, email: record.email, role: record.role };
    const newAccessToken = generateAccessToken(user);
    const { token: newRefreshToken, tokenHash: newHash, expiresAt } = generateRefreshToken();

    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, newHash, expiresAt]
    );

    setRefreshTokenCookie(res, newRefreshToken);

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies.refreshToken;
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await db.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
        [tokenHash]
      );
    }

    clearRefreshTokenCookie(res);
    return res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// 4. GET /api/auth/me (Get current session)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userResult = await db.query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User account inactive or not found.' });
    }

    return res.json({ user });
  } catch (err) {
    next(err);
  }
});

// 5. POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const userResult = await db.query('SELECT id, role FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = userResult.rows[0];

    // Always respond with success to prevent user enumeration
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.query(
        'INSERT INTO user_invites (email, token_hash, role, expires_at) VALUES ($1, $2, $3, $4)',
        [email.toLowerCase().trim(), tokenHash, user.role, expiresAt]
      );

      console.log(`\n========================================`);
      console.log(`[LOCAL DEV] Password Reset Token for ${email}:`);
      console.log(`TOKEN: ${resetToken}`);
      console.log(`========================================\n`);
    }

    return res.json({ message: 'If that email exists in our system, reset instructions have been generated.' });
  } catch (err) {
    next(err);
  }
});

// 6. POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const tokenHash = hashToken(token);
    const inviteResult = await db.query(
      'SELECT id, email FROM user_invites WHERE token_hash = $1 AND redeemed_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );

    const invite = inviteResult.rows[0];
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    const userUpdate = await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id',
      [passwordHash, invite.email]
    );

    const userId = userUpdate.rows[0]?.id;

    // Mark invite record redeemed
    await db.query('UPDATE user_invites SET redeemed_at = NOW() WHERE id = $1', [invite.id]);

    if (userId) {
      await db.query(
        'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'RESET_PASSWORD', 'USER', userId, JSON.stringify({ email: invite.email })]
      );
    }

    return res.json({ message: 'Password reset successful. You may now log in.' });
  } catch (err) {
    next(err);
  }
});

// 7. POST /api/auth/redeem-invite
router.post('/redeem-invite', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Invite token and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const tokenHash = hashToken(token);
    const inviteResult = await db.query(
      'SELECT id, email, role FROM user_invites WHERE token_hash = $1 AND redeemed_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );

    const invite = inviteResult.rows[0];
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invitation token.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Update or insert user
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, role, is_active, email_verified_at)
       VALUES ($1, $2, $3, TRUE, NOW())
       ON CONFLICT (email) 
       DO UPDATE SET password_hash = $2, is_active = TRUE, email_verified_at = NOW(), updated_at = NOW()
       RETURNING id`,
      [invite.email, passwordHash, invite.role]
    );

    const userId = userResult.rows[0].id;

    // Mark invite redeemed
    await db.query('UPDATE user_invites SET redeemed_at = NOW() WHERE id = $1', [invite.id]);

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'REDEEM_INVITE', 'USER', userId, JSON.stringify({ email: invite.email, role: invite.role })]
    );

    return res.json({ message: 'Invitation accepted successfully. You may now log in.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

