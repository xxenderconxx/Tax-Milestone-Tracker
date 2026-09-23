const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Helper function to escape CSV values safely
function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// 1. GET /api/export/dashboard - Compliance summary report
router.get('/dashboard', async (req, res, next) => {
  try {
    const clientsRes = await db.query('SELECT COUNT(*) FROM clients WHERE is_archived = FALSE');
    const totalClients = clientsRes.rows[0].count;

    const overdueTaxRes = await db.query(
      `SELECT COUNT(*) FROM tax_obligations t JOIN clients c ON t.client_id = c.id WHERE c.is_archived = FALSE AND t.due_date < CURRENT_DATE AND t.status != 'VERIFIED'`
    );
    const overdueMilestoneRes = await db.query(
      `SELECT COUNT(*) FROM payment_milestones m JOIN clients c ON m.client_id = c.id WHERE c.is_archived = FALSE AND m.due_date < CURRENT_DATE AND m.status != 'VERIFIED'`
    );
    const totalOverdue = parseInt(overdueTaxRes.rows[0].count, 10) + parseInt(overdueMilestoneRes.rows[0].count, 10);

    const pendingReceiptsRes = await db.query(`SELECT COUNT(*) FROM receipts WHERE status = 'PENDING'`);
    const pendingReceipts = pendingReceiptsRes.rows[0].count;

    const verifiedThisMonthRes = await db.query(
      `SELECT COUNT(*) FROM receipts WHERE status = 'VERIFIED' AND created_at >= date_trunc('month', CURRENT_DATE)`
    );
    const verifiedThisMonth = verifiedThisMonthRes.rows[0].count;

    let csv = 'Metric,Value\n';
    csv += `${escapeCSV('Total Active Clients')},${escapeCSV(totalClients)}\n`;
    csv += `${escapeCSV('Total Overdue Items')},${escapeCSV(totalOverdue)}\n`;
    csv += `${escapeCSV('Pending Receipts for Review')},${escapeCSV(pendingReceipts)}\n`;
    csv += `${escapeCSV('Verified Receipts This Month')},${escapeCSV(verifiedThisMonth)}\n`;
    csv += `${escapeCSV('Report Generated At')},${escapeCSV(new Date().toISOString())}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tmt-compliance-summary.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/export/obligations - Tax obligations export for client / date range
router.get('/obligations', async (req, res, next) => {
  try {
    const { clientId, from, to } = req.query;

    let queryText = `
      SELECT t.id, c.name as client_name, c.tin, t.tax_type, t.due_date, t.amount, t.status,
             (t.due_date < CURRENT_DATE AND t.status != 'VERIFIED') AS is_overdue
      FROM tax_obligations t
      JOIN clients c ON t.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (clientId) {
      params.push(clientId);
      queryText += ` AND t.client_id = $${params.length}`;
    }
    if (from) {
      params.push(from);
      queryText += ` AND t.due_date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      queryText += ` AND t.due_date <= $${params.length}`;
    }

    queryText += ' ORDER BY t.due_date ASC';

    const result = await db.query(queryText, params);

    let csv = 'Client Name,TIN,Tax Type,Due Date,Amount,Status,Is Overdue\n';
    for (const row of result.rows) {
      csv += `${escapeCSV(row.client_name)},${escapeCSV(row.tin)},${escapeCSV(row.tax_type)},${escapeCSV(row.due_date)},${escapeCSV(row.amount)},${escapeCSV(row.status)},${escapeCSV(row.is_overdue ? 'YES' : 'NO')}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tax-obligations-export.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/export/audit-logs - Audit trail export (Admin only)
router.get('/audit-logs', requireAdmin, async (req, res, next) => {
  try {
    const { from, to } = req.query;

    let queryText = `
      SELECT a.id, a.created_at, u.email as actor_email, a.action, a.target_type, a.target_id, a.metadata
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (from) {
      params.push(from);
      queryText += ` AND a.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      queryText += ` AND a.created_at <= $${params.length}`;
    }

    queryText += ' ORDER BY a.created_at DESC';

    const result = await db.query(queryText, params);

    let csv = 'Log ID,Timestamp,Actor Email,Action,Target Type,Target ID,Metadata\n';
    for (const row of result.rows) {
      csv += `${escapeCSV(row.id)},${escapeCSV(row.created_at)},${escapeCSV(row.actor_email || 'System')},${escapeCSV(row.action)},${escapeCSV(row.target_type)},${escapeCSV(row.target_id)},${escapeCSV(JSON.stringify(row.metadata))}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs-export.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

