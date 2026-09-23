const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// 1. GET /api/dashboard/metrics - Overview dashboard data
router.get('/metrics', async (req, res, next) => {
  try {
    const clientsCountRes = await db.query('SELECT COUNT(*) FROM clients WHERE is_archived = FALSE');
    const totalClients = parseInt(clientsCountRes.rows[0].count, 10);

    const overdueTaxRes = await db.query(
      `SELECT COUNT(*) FROM tax_obligations t 
       JOIN clients c ON t.client_id = c.id 
       WHERE c.is_archived = FALSE AND t.due_date < CURRENT_DATE AND t.status != 'VERIFIED'`
    );
    const overdueMilestonesRes = await db.query(
      `SELECT COUNT(*) FROM payment_milestones m 
       JOIN clients c ON m.client_id = c.id 
       WHERE c.is_archived = FALSE AND m.due_date < CURRENT_DATE AND m.status != 'VERIFIED'`
    );

    const overdueItems = parseInt(overdueTaxRes.rows[0].count, 10) + parseInt(overdueMilestonesRes.rows[0].count, 10);

    const pendingReceiptsRes = await db.query(`SELECT COUNT(*) FROM receipts WHERE status = 'PENDING'`);
    const pendingReceipts = parseInt(pendingReceiptsRes.rows[0].count, 10);

    // Urgent deadline alerts (due within 30 days or overdue)
    const deadlineAlertsRes = await db.query(
      `(SELECT t.id, 'TAX_OBLIGATION' as item_type, t.tax_type as title, t.due_date, t.amount, t.status, c.name as client_name, c.id as client_id,
               (t.due_date < CURRENT_DATE AND t.status != 'VERIFIED') AS is_overdue
        FROM tax_obligations t
        JOIN clients c ON t.client_id = c.id
        WHERE c.is_archived = FALSE AND t.status != 'VERIFIED' AND t.due_date <= (CURRENT_DATE + INTERVAL '30 days'))
       UNION ALL
       (SELECT m.id, 'MILESTONE' as item_type, m.title as title, m.due_date, m.amount, m.status, c.name as client_name, c.id as client_id,
               (m.due_date < CURRENT_DATE AND m.status != 'VERIFIED') AS is_overdue
        FROM payment_milestones m
        JOIN clients c ON m.client_id = c.id
        WHERE c.is_archived = FALSE AND m.status != 'VERIFIED' AND m.due_date <= (CURRENT_DATE + INTERVAL '30 days'))
       ORDER BY due_date ASC
       LIMIT 10`
    );

    // Pending Receipts Queue
    const queueRes = await db.query(
      `SELECT r.id, r.storage_path, r.status, r.created_at, u.email as uploaded_by_email,
              COALESCE(t.tax_type, m.title) as item_title,
              COALESCE(t.amount, m.amount) as amount,
              COALESCE(t.due_date, m.due_date) as due_date,
              c.name as client_name
       FROM receipts r
       JOIN users u ON r.uploaded_by = u.id
       LEFT JOIN tax_obligations t ON r.tax_obligation_id = t.id
       LEFT JOIN payment_milestones m ON r.milestone_id = m.id
       LEFT JOIN clients c ON c.id = COALESCE(t.client_id, m.client_id)
       WHERE r.status = 'PENDING'
       ORDER BY r.created_at ASC
       LIMIT 10`
    );

    return res.json({
      metrics: {
        totalClients,
        overdueItems,
        pendingReceipts
      },
      deadlineAlerts: deadlineAlertsRes.rows.map(row => ({
        ...row,
        isOverdue: Boolean(row.is_overdue)
      })),
      pendingReceiptsQueue: queueRes.rows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

