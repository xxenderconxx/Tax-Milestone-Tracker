const {
  authRateLimiter,
  loginRateLimiter,
  sensitiveAuthRateLimiter
} = require('../middleware/rateLimiter');

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
  requireAuth,
  requireAdmin
} = require('../middleware/auth');

const router = express.Router();
router.use(authRateLimiter);

// 1. POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Normalize email
    const normalizedEmail = email?.toLowerCase().trim();

    // Validate input
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        error: 'Email and password are required.'
      });
    }

    // Check recent failed login attempts
    const attemptResult = await db.query(
      `SELECT COUNT(*) AS count
       FROM login_attempts
       WHERE email = $1
         AND successful = FALSE
         AND created_at > NOW() - INTERVAL '15 minutes'`,
      [normalizedEmail]
    );

    const failedAttempts = parseInt(attemptResult.rows[0].count, 10);

    // Block account after 5 failed attempts
    if (failedAttempts >= 5) {
      return res.status(429).json({
        error: 'Too many failed login attempts. Please try again later.'
      });
    }

    // Find user
    const userResult = await db.query(
      'SELECT id, email, password_hash, role, is_active, failed_login_attempts, lockout_until FROM users WHERE email = $1',
      [normalizedEmail]
    );

    const user = userResult.rows[0];

    // Account lockout check
    if (user.lockout_until && new Date() < user.lockout_until) {
      return res.status(403).json({ error: 'Account locked due to too many failed attempts. Try again later.' });
    }

    // Invalid or inactive account
    if (!user || !user.is_active) {
      await db.query(
        `INSERT INTO login_attempts
          (email, ip_address, successful)
         VALUES ($1, $2, FALSE)`,
        [normalizedEmail, req.ip]
      );

      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    // Account has no password yet
    if (!user.password_hash) {
      await db.query(
        `INSERT INTO login_attempts
          (email, ip_address, successful)
         VALUES ($1, $2, FALSE)`,
        [normalizedEmail, req.ip]
      );

      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
    await db.query(
      `INSERT INTO login_attempts
        (email, ip_address, successful)
       VALUES ($1, $2, FALSE)`,
      [normalizedEmail, req.ip]
    );
    // Increment failed attempts and set lockout if threshold reached (5 attempts -> 15 min)
    await db.query(
      `UPDATE users
       SET failed_login_attempts = failed_login_attempts + 1,
           lockout_until = CASE
             WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
             ELSE lockout_until
           END
       WHERE id = $1`,
      [user.id]
    );
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    // Record successful login
    await db.query(
      `INSERT INTO login_attempts
        (email, ip_address, successful)
       VALUES ($1, $2, TRUE)`,
      [normalizedEmail, req.ip]
    );

    // Issue tokens
    const accessToken = generateAccessToken(user);
    const {
      token: refreshToken,
      tokenHash,
      expiresAt
    } = generateRefreshToken();

    // Store refresh token
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    setRefreshTokenCookie(res, refreshToken);

    // Audit log entry
    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [
        user.id,
        'LOGIN',
        'USER',
        user.id,
        JSON.stringify({
          ip: req.ip,
          userAgent: req.headers['user-agent']
        })
      ]
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

    return res.json({
      accessToken: newAccessToken,
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

// 5. POST /api/auth/forgot-password (Creates a pending password reset request for Admin approval)
router.post('/forgot-password',sensitiveAuthRateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const userResult = await db.query('SELECT id, role FROM users WHERE email = $1 AND is_active = TRUE', [cleanEmail]);
    const user = userResult.rows[0];

    if (user) {
      // Create pending password reset request
      await db.query(
        `INSERT INTO password_resets (email, status)
         VALUES ($1, 'PENDING')`,
        [cleanEmail]
      );

      await db.query(
        'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
        [user.id, 'REQUEST_PASSWORD_RESET', 'USER', user.id, JSON.stringify({ email: cleanEmail })]
      );
    }

    return res.json({ message: 'If that account exists, a password reset request has been submitted to the Admin for approval.' });
  } catch (err) {
    next(err);
  }
});

// 5b. GET /api/auth/password-resets/pending - List pending password resets (Admin only)
router.get('/password-resets/pending', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, status, reset_link, created_at
       FROM password_resets
       WHERE status = 'PENDING'
       ORDER BY created_at ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// 5c. PATCH /api/auth/password-resets/:id/approve - Approve password reset & generate reset link (Admin only)
router.patch('/password-resets/:id/approve', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const reqResult = await db.query('SELECT * FROM password_resets WHERE id = $1 AND status = \'PENDING\'', [id]);
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pending password reset request not found.' });
    }

    const resetReq = reqResult.rows[0];

    const userResult = await db.query('SELECT role FROM users WHERE email = $1', [resetReq.email]);
    const userRole = userResult.rows[0]?.role || 'STAFF';

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Insert into user_invites so user can redeem via token
    await db.query(
      'INSERT INTO user_invites (email, token_hash, role, expires_at) VALUES ($1, $2, $3, $4)',
      [resetReq.email, tokenHash, userRole, expiresAt]
    );

    const resetLink = `http://localhost:5173/redeem-invite?token=${resetToken}`;

    await db.query(
      `UPDATE password_resets
       SET status = 'APPROVED', reset_token = $1, reset_link = $2, updated_at = NOW()
       WHERE id = $3`,
      [resetToken, resetLink, id]
    );

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'APPROVE_PASSWORD_RESET', 'PASSWORD_RESET', id, JSON.stringify({ email: resetReq.email, resetLink })]
    );

    return res.json({
      message: 'Password reset approved! Send the generated reset link manually to the staff member.',
      resetLink
    });
  } catch (err) {
    next(err);
  }
});

// 5d. PATCH /api/auth/password-resets/:id/reject - Reject password reset request (Admin only)
router.patch('/password-resets/:id/reject', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const reqResult = await db.query('SELECT * FROM password_resets WHERE id = $1 AND status = \'PENDING\'', [id]);
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pending password reset request not found.' });
    }

    await db.query('UPDATE password_resets SET status = \'REJECTED\', updated_at = NOW() WHERE id = $1', [id]);

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'REJECT_PASSWORD_RESET', 'PASSWORD_RESET', id, JSON.stringify({ email: reqResult.rows[0].email })]
    );

    return res.json({ message: 'Password reset request rejected.' });
  } catch (err) {
    next(err);
  }
});

// 6. POST /api/auth/reset-password
router.post('/reset-password',sensitiveAuthRateLimiter, async (req, res, next) => {
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
router.post('/redeem-invite',sensitiveAuthRateLimiter, async (req, res, next) => {
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

