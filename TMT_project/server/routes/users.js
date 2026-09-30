const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requireAdmin, hashToken } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

// 1. GET /api/users - List all users
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, role, is_active, email_verified_at, created_at 
       FROM users 
       ORDER BY role ASC, email ASC`
    );

    const invitesResult = await db.query(
      `SELECT id, email, role, expires_at, redeemed_at, created_at 
       FROM user_invites 
       WHERE redeemed_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`
    );

    return res.json({
      users: result.rows,
      pendingInvites: invitesResult.rows
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/users/invite - Invite new staff or admin user
router.post('/invite', async (req, res, next) => {
  try {
    const { email, role = 'STAFF' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists and is active
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1 AND is_active = TRUE', [cleanEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(inviteToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const inviteResult = await db.query(
      `INSERT INTO user_invites (email, token_hash, role, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, expires_at, created_at`,
      [cleanEmail, tokenHash, role, expiresAt]
    );

    const invite = inviteResult.rows[0];

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'INVITE_USER', 'USER_INVITE', invite.id, JSON.stringify({ email: cleanEmail, role })]
    );

    console.log(`\n========================================`);
    console.log(`[LOCAL DEV] User Invite Token for ${cleanEmail} (${role}):`);
    console.log(`TOKEN: ${inviteToken}`);
    console.log(`INVITE LINK: http://localhost:5173/redeem-invite?token=${inviteToken}`);
    console.log(`========================================\n`);

    return res.status(201).json({
      invite,
      inviteToken // Returned for easy local dev testing
    });
  } catch (err) {
    next(err);
  }
});

// 3. PATCH /api/users/:id/status - Toggle User Active Status (Deactivate / Reactivate)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    const result = await db.query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role, is_active',
      [Boolean(isActive), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updatedUser = result.rows[0];

    // If deactivating user, revoke all active refresh tokens for security
    if (!isActive) {
      await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [id]);
    }

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, isActive ? 'REACTIVATE_USER' : 'DEACTIVATE_USER', 'USER', id, JSON.stringify({ email: updatedUser.email })]
    );

    return res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// 4. DELETE /api/users/:id - Delete Staff Account (Admin only)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const userRes = await db.query('SELECT email FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const email = userRes.rows[0].email;

    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [id]);
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'DELETE_USER', 'USER', id, JSON.stringify({ email })]
    );

    return res.json({ message: `User "${email}" deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

