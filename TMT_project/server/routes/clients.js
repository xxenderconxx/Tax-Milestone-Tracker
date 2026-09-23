const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// 1. GET /api/clients - Search, filter & list clients
router.get('/', async (req, res, next) => {
  try {
    const { search, isArchived, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const showArchived = isArchived === 'true';

    let queryText = 'SELECT id, name, tin, business_type, is_archived, created_at FROM clients WHERE is_archived = $1';
    const queryParams = [showArchived];

    if (search && search.trim() !== '') {
      queryParams.push(`%${search.trim().toLowerCase()}%`);
      queryText += ` AND (LOWER(name) LIKE $${queryParams.length} OR LOWER(tin) LIKE $${queryParams.length})`;
    }

    // Count total query
    const countQueryText = queryText.replace('SELECT id, name, tin, business_type, is_archived, created_at', 'SELECT COUNT(*)');
    const countResult = await db.query(countQueryText, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    queryText += ` ORDER BY name ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit, 10), offset);

    const clientResult = await db.query(queryText, queryParams);

    return res.json({
      clients: clientResult.rows,
      pagination: {
        totalItems: totalCount,
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(totalCount / parseInt(limit, 10))
      }
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/clients/:id - Get detailed client record with obligations & milestones
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    const client = clientResult.rows[0];

    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    // Fetch tax obligations
    const obligationsResult = await db.query(
      `SELECT t.*, 
              (t.due_date < CURRENT_DATE AND t.status != 'VERIFIED') AS is_overdue,
              r.id AS receipt_id, r.storage_path AS receipt_path, r.status AS receipt_status, r.rejection_reason
       FROM tax_obligations t
       LEFT JOIN receipts r ON r.tax_obligation_id = t.id
       WHERE t.client_id = $1
       ORDER BY t.due_date ASC`,
      [id]
    );

    // Fetch payment milestones
    const milestonesResult = await db.query(
      `SELECT m.*, 
              (m.due_date < CURRENT_DATE AND m.status != 'VERIFIED') AS is_overdue,
              r.id AS receipt_id, r.storage_path AS receipt_path, r.status AS receipt_status, r.rejection_reason
       FROM payment_milestones m
       LEFT JOIN receipts r ON r.milestone_id = m.id
       WHERE m.client_id = $1
       ORDER BY m.due_date ASC`,
      [id]
    );

    return res.json({
      client,
      taxObligations: obligationsResult.rows.map(row => ({
        ...row,
        isOverdue: Boolean(row.is_overdue)
      })),
      paymentMilestones: milestonesResult.rows.map(row => ({
        ...row,
        isOverdue: Boolean(row.is_overdue)
      }))
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/clients - Create new client
router.post('/', async (req, res, next) => {
  try {
    const { name, tin, businessType } = req.body;

    if (!name || !tin || !businessType) {
      return res.status(400).json({ error: 'Name, TIN, and businessType are required.' });
    }

    const result = await db.query(
      `INSERT INTO clients (name, tin, business_type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), tin.trim(), businessType.trim()]
    );

    const newClient = result.rows[0];

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'CREATE_CLIENT', 'CLIENT', newClient.id, JSON.stringify({ name: newClient.name, tin: newClient.tin })]
    );

    return res.status(201).json(newClient);
  } catch (err) {
    next(err);
  }
});

// 4. PATCH /api/clients/:id - Edit client
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, tin, businessType } = req.body;

    const result = await db.query(
      `UPDATE clients 
       SET name = COALESCE($1, name),
           tin = COALESCE($2, tin),
           business_type = COALESCE($3, business_type),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name ? name.trim() : null, tin ? tin.trim() : null, businessType ? businessType.trim() : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// 5. POST /api/clients/:id/archive - Toggle Archive Status
router.post('/:id/archive', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isArchived } = req.body;

    const result = await db.query(
      'UPDATE clients SET is_archived = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [Boolean(isArchived), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const updatedClient = result.rows[0];

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, isArchived ? 'ARCHIVE_CLIENT' : 'UNARCHIVE_CLIENT', 'CLIENT', id, JSON.stringify({ name: updatedClient.name })]
    );

    return res.json(updatedClient);
  } catch (err) {
    next(err);
  }
});

// 6. POST /api/clients/:id/obligations - Add Tax Obligation
router.post('/:id/obligations', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { taxType, dueDate, amount } = req.body;

    if (!taxType || !dueDate || amount === undefined) {
      return res.status(400).json({ error: 'taxType, dueDate, and amount are required.' });
    }

    const result = await db.query(
      `INSERT INTO tax_obligations (client_id, tax_type, due_date, amount, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING *`,
      [id, taxType.trim(), dueDate, amount]
    );

    const obligation = result.rows[0];

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'CREATE_TAX_OBLIGATION', 'TAX_OBLIGATION', obligation.id, JSON.stringify({ clientId: id, taxType, amount })]
    );

    return res.status(201).json(obligation);
  } catch (err) {
    next(err);
  }
});

// 7. POST /api/clients/:id/milestones - Add Payment Milestone
router.post('/:id/milestones', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, dueDate, amount } = req.body;

    if (!title || !dueDate || amount === undefined) {
      return res.status(400).json({ error: 'title, dueDate, and amount are required.' });
    }

    const result = await db.query(
      `INSERT INTO payment_milestones (client_id, title, due_date, amount, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING *`,
      [id, title.trim(), dueDate, amount]
    );

    const milestone = result.rows[0];

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'CREATE_MILESTONE', 'MILESTONE', milestone.id, JSON.stringify({ clientId: id, title, amount })]
    );

    return res.status(201).json(milestone);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

