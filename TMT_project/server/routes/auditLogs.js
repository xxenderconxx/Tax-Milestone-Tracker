const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

// GET /api/audit-logs - Immutable audit trail viewer
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const countRes = await db.query('SELECT COUNT(*) FROM audit_logs');
    const totalItems = parseInt(countRes.rows[0].count, 10);

    const result = await db.query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at,
              u.email as actor_email, u.role as actor_role
       FROM audit_logs a
       LEFT JOIN users u ON a.actor_id = u.id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit, 10), offset]
    );

    return res.json({
      auditLogs: result.rows,
      pagination: {
        totalItems,
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(totalItems / parseInt(limit, 10))
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

