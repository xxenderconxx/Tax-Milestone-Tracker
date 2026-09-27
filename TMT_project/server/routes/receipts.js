const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads/receipts directory exists
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'receipts');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(requireAuth);

// Helper for magic byte validation
async function validateFileType(filePath) {
  try {
    const fileType = await import('file-type');
    const fn = fileType.fromBuffer || (fileType.default && fileType.default.fromBuffer) || fileType.fileTypeFromBuffer || (fileType.default && fileType.default.fileTypeFromBuffer);
    if (!fn) {
      console.error('file-type fromBuffer function could not be resolved');
      return null;
    }
    const buffer = fs.readFileSync(filePath);
    const result = await fn(buffer);
    return result; // returns { ext, mime } or undefined
  } catch (err) {
    console.error('Magic byte validation error:', err);
    return null;
  }
}

// 1. POST /api/receipts - Upload receipt proof (Staff / Admin)
router.post('/', upload.single('receipt'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Receipt file is required.' });
  }

  const filePath = req.file.path;
  const { taxObligationId, milestoneId } = req.body;

  if (!taxObligationId && !milestoneId) {
    fs.unlinkSync(filePath); // Clean up uploaded file on error
    return res.status(400).json({ error: 'Either taxObligationId or milestoneId must be provided.' });
  }

  try {
    // Magic byte buffer validation
    const detectedType = await validateFileType(filePath);
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

    if (!detectedType || !allowedMimes.includes(detectedType.mime)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: 'Invalid file content. File bytes do not match an allowed image (PNG/JPG) or PDF document.'
      });
    }

    const relativeStoragePath = path.relative(path.join(__dirname, '..', '..'), filePath);

    // Database transaction: Insert receipt & update parent obligation/milestone to UNDER_REVIEW
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let existingReceiptRes;

      if (taxObligationId) {
        existingReceiptRes = await client.query(
          `SELECT id
          FROM receipts
          WHERE tax_obligation_id = $1
            AND status IN ('PENDING', 'UNDER_REVIEW')
          LIMIT 1`,
          [taxObligationId]
        );
      } else {
        existingReceiptRes = await client.query(
          `SELECT id
          FROM receipts
          WHERE milestone_id = $1
            AND status IN ('PENDING', 'UNDER_REVIEW')
          LIMIT 1`,
          [milestoneId]
        );
      }

      if (existingReceiptRes.rows.length > 0) {
        await client.query('ROLLBACK');

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        return res.status(409).json({
          error: 'This item already has a receipt pending review.'
        });
      }

      const receiptRes = await client.query(
        `INSERT INTO receipts (tax_obligation_id, milestone_id, storage_path, status, uploaded_by)
         VALUES ($1, $2, $3, 'PENDING', $4)
         RETURNING *`,
        [taxObligationId || null, milestoneId || null, relativeStoragePath, req.user.id]
      );

      const receipt = receiptRes.rows[0];

      if (taxObligationId) {
        await client.query(
          "UPDATE tax_obligations SET status = 'UNDER_REVIEW', updated_at = NOW() WHERE id = $1",
          [taxObligationId]
        );
      } else if (milestoneId) {
        await client.query(
          "UPDATE payment_milestones SET status = 'UNDER_REVIEW', updated_at = NOW() WHERE id = $1",
          [milestoneId]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
         VALUES ($1, 'UPLOAD_RECEIPT', 'RECEIPT', $2, $3)`,
        [req.user.id, receipt.id, JSON.stringify({ taxObligationId, milestoneId, fileName: req.file.originalname })]
      );

      await client.query('COMMIT');
      return res.status(201).json(receipt);
    } catch (dbErr) {
      await client.query('ROLLBACK');
      fs.unlinkSync(filePath);
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/receipts/:id/stream - Authenticated media streaming
router.get('/:id/stream', async (req, res, next) => {
  try {
    const { id } = req.params;

    const receiptRes = await db.query('SELECT storage_path FROM receipts WHERE id = $1', [id]);
    const receipt = receiptRes.rows[0];

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }

    const fullPath = path.join(__dirname, '..', '..', receipt.storage_path);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Receipt file not found on disk.' });
    }

    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.pdf') contentType = 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/receipts/pending - Pending approval queue (Admin only)
router.get('/pending/queue', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.tax_obligation_id, r.milestone_id, r.storage_path, r.status, r.created_at,
              COALESCE(u.email, 'Unknown User') as uploaded_by_email,
              COALESCE(t.tax_type, m.title) as item_title,
              COALESCE(t.amount, m.amount) as amount,
              COALESCE(t.due_date, m.due_date) as due_date,
              c.name as client_name, c.tin as client_tin
       FROM receipts r
       LEFT JOIN users u ON r.uploaded_by = u.id
       LEFT JOIN tax_obligations t ON r.tax_obligation_id = t.id
       LEFT JOIN payment_milestones m ON r.milestone_id = m.id
       LEFT JOIN clients c ON c.id = COALESCE(t.client_id, m.client_id)
       WHERE r.status IN ('PENDING', 'UNDER_REVIEW')
       ORDER BY r.created_at ASC`
    );

    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// 4. PATCH /api/receipts/:id/approve - Approve receipt submission (Admin only)
router.patch('/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const receiptRes = await db.query('SELECT * FROM receipts WHERE id = $1', [id]);
    const receipt = receiptRes.rows[0];

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        "UPDATE receipts SET status = 'VERIFIED' WHERE id = $1",
        [id]
      );

      if (receipt.tax_obligation_id) {
        await client.query(
          "UPDATE tax_obligations SET status = 'VERIFIED', updated_at = NOW() WHERE id = $1",
          [receipt.tax_obligation_id]
        );
      } else if (receipt.milestone_id) {
        await client.query(
          "UPDATE payment_milestones SET status = 'VERIFIED', updated_at = NOW() WHERE id = $1",
          [receipt.milestone_id]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
         VALUES ($1, 'APPROVE_RECEIPT', 'RECEIPT', $2, $3)`,
        [req.user.id, id, JSON.stringify({ taxObligationId: receipt.tax_obligation_id, milestoneId: receipt.milestone_id })]
      );

      await client.query('COMMIT');
      return res.json({ message: 'Receipt approved and target obligation/milestone set to VERIFIED.' });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// 5. PATCH /api/receipts/:id/reject - Reject receipt submission (Admin only)
router.patch('/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({ error: 'A rejection reason is required.' });
    }

    const receiptRes = await db.query('SELECT * FROM receipts WHERE id = $1', [id]);
    const receipt = receiptRes.rows[0];

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        "UPDATE receipts SET status = 'REJECTED', rejection_reason = $1 WHERE id = $2",
        [rejectionReason.trim(), id]
      );

      if (receipt.tax_obligation_id) {
        await client.query(
          "UPDATE tax_obligations SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
          [receipt.tax_obligation_id]
        );
      } else if (receipt.milestone_id) {
        await client.query(
          "UPDATE payment_milestones SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
          [receipt.milestone_id]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
         VALUES ($1, 'REJECT_RECEIPT', 'RECEIPT', $2, $3)`,
        [req.user.id, id, JSON.stringify({ rejectionReason: rejectionReason.trim(), taxObligationId: receipt.tax_obligation_id, milestoneId: receipt.milestone_id })]
      );

      await client.query('COMMIT');
      return res.json({ message: 'Receipt rejected with feedback.' });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
