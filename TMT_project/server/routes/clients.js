const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// 1. GET /api/clients - Search, filter & list clients
router.get('/', async (req, res, next) => {
  try {
    const { search, isArchived, approvalStatus, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const showArchived = isArchived === 'true';

    let queryText = 'SELECT id, name, tin, business_type, approval_status, is_archived, created_at FROM clients WHERE is_archived = $1';
    const queryParams = [showArchived];

    if (approvalStatus) {
      queryParams.push(approvalStatus);
      queryText += ` AND approval_status = $${queryParams.length}`;
    }

    if (search && search.trim() !== '') {
      queryParams.push(`%${search.trim().toLowerCase()}%`);
      queryText += ` AND (LOWER(name) LIKE $${queryParams.length} OR LOWER(tin) LIKE $${queryParams.length})`;
    }

    // Count total query
    const countQueryText = queryText.replace('SELECT id, name, tin, business_type, approval_status, is_archived, created_at', 'SELECT COUNT(*)');
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
          r.id AS receipt_id,
          r.storage_path AS receipt_path,
          r.status AS receipt_status,
          r.rejection_reason,
          r.created_at AS receipt_created_at
      FROM tax_obligations t
      LEFT JOIN LATERAL (
        SELECT r.*
        FROM receipts r
        WHERE r.tax_obligation_id = t.id
        ORDER BY r.created_at DESC
        LIMIT 1
      ) r ON true
      WHERE t.client_id = $1
      ORDER BY t.due_date ASC`,
      [id]
    );

    // Fetch payment milestones
    const milestonesResult = await db.query(
      `SELECT m.*,
          (m.due_date < CURRENT_DATE AND m.status != 'VERIFIED') AS is_overdue,
          r.id AS receipt_id,
          r.storage_path AS receipt_path,
          r.status AS receipt_status,
          r.rejection_reason,
          r.created_at AS receipt_created_at
      FROM payment_milestones m
      LEFT JOIN LATERAL (
        SELECT r.*
        FROM receipts r
        WHERE r.milestone_id = m.id
        ORDER BY r.created_at DESC
        LIMIT 1
      ) r ON true
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

// 3. POST /api/clients - Create new client (Staff addition requires Admin confirmation)
router.post('/', async (req, res, next) => {
  try {
    const { name, tin, businessType } = req.body;

    if (!name || !tin || !businessType) {
      return res.status(400).json({ error: 'Name, TIN, and businessType are required.' });
    }

    const isAdmin = req.user.role === 'ADMIN';
    const approvalStatus = isAdmin ? 'APPROVED' : 'PENDING';

    const result = await db.query(
      `INSERT INTO clients (name, tin, business_type, approval_status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), tin.trim(), businessType.trim(), approvalStatus]
    );

    const newClient = result.rows[0];

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [
        req.user.id,
        isAdmin ? 'CREATE_CLIENT' : 'REQUEST_CLIENT_CREATE',
        'CLIENT',
        newClient.id,
        JSON.stringify({ name: newClient.name, tin: newClient.tin, approvalStatus })
      ]
    );

    return res.status(201).json({
      ...newClient,
      message: isAdmin
        ? 'Client created successfully.'
        : 'Client registration submitted and pending Admin approval.'
    });
  } catch (err) {
    next(err);
  }
});

// 3b. GET /api/clients/pending/list - List pending client registration requests (Admin only)
router.get('/pending/list', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, tin, business_type, approval_status, created_at
       FROM clients
       WHERE approval_status = 'PENDING' AND is_archived = FALSE
       ORDER BY created_at ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// 3c. PATCH /api/clients/:id/approve - Approve pending client (Admin only)
router.patch('/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE clients SET approval_status = 'APPROVED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const client = result.rows[0];

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'APPROVE_CLIENT', 'CLIENT', id, JSON.stringify({ name: client.name })]
    );

    return res.json({ message: 'Client approved successfully.', client });
  } catch (err) {
    next(err);
  }
});

// 3d. PATCH /api/clients/:id/reject - Reject pending client (Admin only)
router.patch('/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE clients SET approval_status = 'REJECTED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const client = result.rows[0];

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'REJECT_CLIENT', 'CLIENT', id, JSON.stringify({ name: client.name })]
    );

    return res.json({ message: 'Client rejected successfully.', client });
  } catch (err) {
    next(err);
  }
});

// 3e. DELETE /api/clients/:id - Remove / Delete client (Admin only)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const clientRes = await db.query('SELECT name FROM clients WHERE id = $1', [id]);
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }
    const clientName = clientRes.rows[0].name;

    await db.query('DELETE FROM clients WHERE id = $1', [id]);

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'DELETE_CLIENT', 'CLIENT', id, JSON.stringify({ name: clientName })]
    );

    return res.json({ message: `Client "${clientName}" removed successfully.` });
  } catch (err) {
    next(err);
  }
});

// 4. PATCH /api/clients/:id - Edit client info (Admin updates immediately; Staff creates pending request)
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, tin, businessType } = req.body;

    const isAdmin = req.user.role === 'ADMIN';

    if (isAdmin) {
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

      const updated = result.rows[0];

      await db.query(
        'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'EDIT_CLIENT', 'CLIENT', id, JSON.stringify({ name: updated.name, tin: updated.tin })]
      );

      return res.json({ message: 'Client profile updated successfully.', client: updated });
    } else {
      // Staff request -> create edit_request
      const proposed = {};
      if (name) proposed.name = name.trim();
      if (tin) proposed.tin = tin.trim();
      if (businessType) proposed.businessType = businessType.trim();

      const editReq = await db.query(
        `INSERT INTO edit_requests (target_type, target_id, client_id, requested_by, proposed_changes)
         VALUES ('CLIENT', $1, $1, $2, $3)
         RETURNING *`,
        [id, req.user.id, JSON.stringify(proposed)]
      );

      await db.query(
        'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'REQUEST_EDIT_CLIENT', 'EDIT_REQUEST', editReq.rows[0].id, JSON.stringify({ clientId: id, proposed })]
      );

      return res.json({
        message: 'Client edit submitted and pending Admin approval.',
        isPendingApproval: true
      });
    }
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

// 8. PATCH /api/clients/obligations/:obligationId - Edit Tax Obligation
router.patch('/obligations/:obligationId', async (req, res, next) => {
  try {
    const { obligationId } = req.params;
    const { taxType, dueDate, amount } = req.body;

    const isAdmin = req.user.role === 'ADMIN';

    if (isAdmin) {
      const result = await db.query(
        `UPDATE tax_obligations
         SET tax_type = COALESCE($1, tax_type),
             due_date = COALESCE($2, due_date),
             amount = COALESCE($3, amount),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [taxType ? taxType.trim() : null, dueDate || null, amount !== undefined ? amount : null, obligationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tax obligation not found.' });
      }

      const updated = result.rows[0];

      await db.query(
        'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'EDIT_TAX_OBLIGATION', 'TAX_OBLIGATION', obligationId, JSON.stringify({ taxType: updated.tax_type, amount: updated.amount, dueDate: updated.due_date })]
      );

      return res.json({ message: 'Tax obligation updated successfully.', obligation: updated });
    } else {
      const obRes = await db.query('SELECT client_id FROM tax_obligations WHERE id = $1', [obligationId]);
      if (obRes.rows.length === 0) {
        return res.status(404).json({ error: 'Tax obligation not found.' });
      }
      const clientId = obRes.rows[0].client_id;

      const proposed = {};
      if (taxType) proposed.taxType = taxType.trim();
      if (dueDate) proposed.dueDate = dueDate;
      if (amount !== undefined) proposed.amount = amount;

      const editReq = await db.query(
        `INSERT INTO edit_requests (target_type, target_id, client_id, requested_by, proposed_changes)
         VALUES ('TAX_OBLIGATION', $1, $2, $3, $4)
         RETURNING *`,
        [obligationId, clientId, req.user.id, JSON.stringify(proposed)]
      );

      await db.query(
        'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'REQUEST_EDIT_OBLIGATION', 'EDIT_REQUEST', editReq.rows[0].id, JSON.stringify({ obligationId, proposed })]
      );

      return res.json({
        message: 'Tax obligation edit submitted and pending Admin approval.',
        isPendingApproval: true
      });
    }
  } catch (err) {
    next(err);
  }
});

// 9. DELETE /api/clients/obligations/:obligationId - Delete Tax Obligation (Admin only)
router.delete('/obligations/:obligationId', requireAdmin, async (req, res, next) => {
  try {
    const { obligationId } = req.params;

    const existing = await db.query('SELECT tax_type FROM tax_obligations WHERE id = $1', [obligationId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Tax obligation not found.' });
    }

    await db.query('DELETE FROM tax_obligations WHERE id = $1', [obligationId]);

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'DELETE_TAX_OBLIGATION', 'TAX_OBLIGATION', obligationId, JSON.stringify({ taxType: existing.rows[0].tax_type })]
    );

    return res.json({ message: 'Tax obligation removed successfully.' });
  } catch (err) {
    next(err);
  }
});

// 10. PATCH /api/clients/milestones/:milestoneId - Edit Payment Milestone
router.patch('/milestones/:milestoneId', async (req, res, next) => {
  try {
    const { milestoneId } = req.params;
    const { title, dueDate, amount } = req.body;

    const isAdmin = req.user.role === 'ADMIN';

    if (isAdmin) {
      const result = await db.query(
        `UPDATE payment_milestones
         SET title = COALESCE($1, title),
             due_date = COALESCE($2, due_date),
             amount = COALESCE($3, amount),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [title ? title.trim() : null, dueDate || null, amount !== undefined ? amount : null, milestoneId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment milestone not found.' });
      }

      const updated = result.rows[0];

      await db.query(
        'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'EDIT_MILESTONE', 'MILESTONE', milestoneId, JSON.stringify({ title: updated.title, amount: updated.amount, dueDate: updated.due_date })]
      );

      return res.json({ message: 'Payment milestone updated successfully.', milestone: updated });
    } else {
      const msRes = await db.query('SELECT client_id FROM payment_milestones WHERE id = $1', [milestoneId]);
      if (msRes.rows.length === 0) {
        return res.status(404).json({ error: 'Payment milestone not found.' });
      }
      const clientId = msRes.rows[0].client_id;

      const proposed = {};
      if (title) proposed.title = title.trim();
      if (dueDate) proposed.dueDate = dueDate;
      if (amount !== undefined) proposed.amount = amount;

      const editReq = await db.query(
        `INSERT INTO edit_requests (target_type, target_id, client_id, requested_by, proposed_changes)
         VALUES ('MILESTONE', $1, $2, $3, $4)
         RETURNING *`,
        [milestoneId, clientId, req.user.id, JSON.stringify(proposed)]
      );

      await db.query(
        'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'REQUEST_EDIT_MILESTONE', 'EDIT_REQUEST', editReq.rows[0].id, JSON.stringify({ milestoneId, proposed })]
      );

      return res.json({
        message: 'Payment milestone edit submitted and pending Admin approval.',
        isPendingApproval: true
      });
    }
  } catch (err) {
    next(err);
  }
});

// 11. DELETE /api/clients/milestones/:milestoneId - Delete Payment Milestone (Admin only)
router.delete('/milestones/:milestoneId', requireAdmin, async (req, res, next) => {
  try {
    const { milestoneId } = req.params;

    const existing = await db.query('SELECT title FROM payment_milestones WHERE id = $1', [milestoneId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment milestone not found.' });
    }

    await db.query('DELETE FROM payment_milestones WHERE id = $1', [milestoneId]);

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'DELETE_MILESTONE', 'MILESTONE', milestoneId, JSON.stringify({ title: existing.rows[0].title })]
    );

    return res.json({ message: 'Payment milestone removed successfully.' });
  } catch (err) {
    next(err);
  }
});

// 12. GET /api/clients/edit-requests/pending - List pending edit requests (Admin only)
router.get('/edit-requests/pending', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT er.id, er.target_type, er.target_id, er.client_id, er.proposed_changes, er.created_at,
              u.email AS requested_by_email,
              c.name AS client_name
       FROM edit_requests er
       JOIN users u ON er.requested_by = u.id
       LEFT JOIN clients c ON er.client_id = c.id
       WHERE er.status = 'PENDING'
       ORDER BY er.created_at ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// 13. PATCH /api/clients/edit-requests/:id/approve - Approve pending edit request (Admin only)
router.patch('/edit-requests/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const reqResult = await db.query('SELECT * FROM edit_requests WHERE id = $1 AND status = \'PENDING\'', [id]);
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pending edit request not found.' });
    }

    const editReq = reqResult.rows[0];
    const changes = editReq.proposed_changes;

    if (editReq.target_type === 'CLIENT') {
      await db.query(
        `UPDATE clients
         SET name = COALESCE($1, name),
             tin = COALESCE($2, tin),
             business_type = COALESCE($3, business_type),
             updated_at = NOW()
         WHERE id = $4`,
        [changes.name || null, changes.tin || null, changes.businessType || null, editReq.target_id]
      );
    } else if (editReq.target_type === 'TAX_OBLIGATION') {
      await db.query(
        `UPDATE tax_obligations
         SET tax_type = COALESCE($1, tax_type),
             due_date = COALESCE($2, due_date),
             amount = COALESCE($3, amount),
             updated_at = NOW()
         WHERE id = $4`,
        [changes.taxType || null, changes.dueDate || null, changes.amount !== undefined ? changes.amount : null, editReq.target_id]
      );
    } else if (editReq.target_type === 'MILESTONE') {
      await db.query(
        `UPDATE payment_milestones
         SET title = COALESCE($1, title),
             due_date = COALESCE($2, due_date),
             amount = COALESCE($3, amount),
             updated_at = NOW()
         WHERE id = $4`,
        [changes.title || null, changes.dueDate || null, changes.amount !== undefined ? changes.amount : null, editReq.target_id]
      );
    }

    await db.query('UPDATE edit_requests SET status = \'APPROVED\', updated_at = NOW() WHERE id = $1', [id]);

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'APPROVE_EDIT_REQUEST', 'EDIT_REQUEST', id, JSON.stringify({ targetType: editReq.target_type, targetId: editReq.target_id, changes })]
    );

    return res.json({ message: 'Edit request approved and applied successfully.' });
  } catch (err) {
    next(err);
  }
});

// 14. PATCH /api/clients/edit-requests/:id/reject - Reject pending edit request (Admin only)
router.patch('/edit-requests/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const reqResult = await db.query('SELECT * FROM edit_requests WHERE id = $1 AND status = \'PENDING\'', [id]);
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pending edit request not found.' });
    }

    await db.query('UPDATE edit_requests SET status = \'REJECTED\', updated_at = NOW() WHERE id = $1', [id]);

    await db.query(
      'INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'REJECT_EDIT_REQUEST', 'EDIT_REQUEST', id, JSON.stringify({ targetType: reqResult.rows[0].target_type, targetId: reqResult.rows[0].target_id })]
    );

    return res.json({ message: 'Edit request rejected.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

