// ============================================================
// backend/src/controllers/admin.controller.ts
// ============================================================
import { Request, Response } from 'express';
import { pool } from '../index';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ── Stats ──────────────────────────────────────────────────
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [sellers, centres, buyers, donations, orders] = await Promise.all([
      pool.query('SELECT verification_status, total_earned FROM sellers'),
      pool.query('SELECT status FROM centres'),
      pool.query("SELECT id FROM users WHERE role = $1", ['buyer']),
      pool.query('SELECT amount FROM donations'),
      pool.query('SELECT id FROM orders'),
    ]);

    const totalDonationAmount = (donations.rows as { amount: string }[])
      .reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0);
    const totalSalesAmount = (sellers.rows as { total_earned: string }[])
      .reduce((sum, s) => sum + parseFloat(s.total_earned || '0'), 0);

    res.json({
      totalSellers:        sellers.rows.length,
      pendingSellers:      sellers.rows.filter((s: any) => s.verification_status === 'pending').length,
      approvedSellers:     sellers.rows.filter((s: any) => s.verification_status === 'approved').length,
      totalCentres:        centres.rows.length,
      pendingCentres:      centres.rows.filter((c: any) => c.status === 'pending').length,
      approvedCentres:     centres.rows.filter((c: any) => c.status === 'approved').length,
      totalBuyers:         buyers.rows.length,
      totalDonations:      donations.rows.length,
      totalDonationAmount,
      totalSalesAmount,
      totalOrders:         0,
    });
  } catch (err: any) {
    console.error('[Admin] stats error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── Sellers ───────────────────────────────────────────────
export const getSellers = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT sellers.*, centres.centre_name FROM sellers LEFT JOIN centres ON sellers.centre_id = centres.id ORDER BY sellers.created_at DESC'
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const approveSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      "UPDATE sellers SET verification_status = $1 WHERE id = $2",
      ['approved', req.params['id']]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const rejectSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      "UPDATE sellers SET verification_status = $1 WHERE id = $2",
      ['rejected', req.params['id']]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query('DELETE FROM sellers WHERE id = $1', [req.params['id']]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── Centres ───────────────────────────────────────────────
export const getCentres = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT centres.*, COUNT(sellers.id) AS seller_count FROM centres LEFT JOIN sellers ON sellers.centre_id = centres.id GROUP BY centres.id ORDER BY centres.created_at DESC'
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const approveCentre = async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      "UPDATE centres SET status = $1 WHERE id = $2",
      ['approved', req.params['id']]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const rejectCentre = async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      "UPDATE centres SET status = $1 WHERE id = $2",
      ['rejected', req.params['id']]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCentre = async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query('DELETE FROM centres WHERE id = $1', [req.params['id']]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── Buyers ────────────────────────────────────────────────
export const getBuyers = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT users.*, COALESCE(SUM(orders.total), 0) AS total_spent, COUNT(orders.id) AS order_count FROM users LEFT JOIN orders ON orders.buyer_id = users.id WHERE users.role = $1 GROUP BY users.id ORDER BY users.created_at DESC",
      ['buyer']
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createBuyer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body as { name: string; email: string; password: string };
    if (!name || !email || !password) {
      res.status(400).json({ error: 'All fields required' });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, created_at",
      [uuidv4(), name, email, hash, 'buyer']
    );
    res.json({ ...result.rows[0], total_spent: 0, order_count: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteBuyer = async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1 AND role = $2", [req.params['id'], 'buyer']);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── Messages ──────────────────────────────────────────────
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM admin_messages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const markMessageRead = async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query('UPDATE admin_messages SET read = true WHERE id = $1', [req.params['id']]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const replyToMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reply } = req.body as { reply: string };
    await pool.query('UPDATE admin_messages SET reply = $1 WHERE id = $2', [reply, req.params['id']]);
    // TODO: trigger email via nodemailer/SendGrid
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── Donations ─────────────────────────────────────────────
export const getDonations = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT donations.*, centres.centre_name FROM donations LEFT JOIN centres ON donations.centre_id = centres.id ORDER BY donations.created_at DESC'
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── Login / Logout Activity ──────────────────────────────────
// Every centre & seller login/logout, most recent first, so admin
// can see who is signing in/out of the platform and when.
export const getLoginActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt((req.query['limit'] as string) || '200', 10) || 200, 500);
    const result = await pool.query(
      `SELECT id, user_type, user_id, display_name, email, action, ip_address, created_at
       FROM login_activity
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('[Admin] login activity error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── Sales / Orders ────────────────────────────────────────────
// Every sale made on the marketplace, with per-order line items
// so admin can see exactly what sold, to whom, and the impact split.
export const getSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await pool.query(
      `SELECT o.id, o.buyer_name, o.buyer_email, o.subtotal, o.platform_fee_total,
              o.delivery_fee, o.total, o.payment_method, o.payment_confirmed,
              o.status, o.created_at,
              COALESCE(json_agg(
                json_build_object(
                  'product_title', oi.product_title,
                  'seller_alias', oi.seller_alias,
                  'centre_name', oi.centre_name,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'total_price', oi.total_price,
                  'survivor_amount', oi.survivor_amount,
                  'centre_amount', oi.centre_amount,
                  'platform_amount', oi.platform_amount
                )
              ) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 500`
    );
    res.json(orders.rows);
  } catch (err: any) {
    console.error('[Admin] sales error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── Emergency / SOS alerts ──────────────────────────────────
// Platform-wide view of every silent alarm ("Checkout Suppliers")
// a seller has triggered, across all centres — so admin can see the
// same alert + recording the centre sees, and confirm the feature
// is actually firing and capturing location/audio in practice.
export const getEmergencyAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT ea.id, ea.seller_id, ea.centre_id, ea.location_hint,
              ea.recording_path, ea.recording_uploaded_at, ea.created_at,
              s.alias AS seller_alias, s.email AS seller_email,
              c.centre_name
       FROM emergency_alerts ea
       LEFT JOIN sellers s ON s.id = ea.seller_id
       LEFT JOIN centres c ON c.id = ea.centre_id
       ORDER BY ea.created_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('[Admin] emergency alerts error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Summary stats: how often the panic button is used, and whether
// the pipeline (location + 1-minute recording) is actually completing.
export const getEmergencyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [totals, byCentre] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE recording_path IS NOT NULL)::int AS with_recording,
           COUNT(*) FILTER (WHERE location_hint IS NOT NULL AND location_hint <> '')::int AS with_location,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last_7_days,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30_days,
           AVG(EXTRACT(EPOCH FROM (recording_uploaded_at - created_at)))
             FILTER (WHERE recording_uploaded_at IS NOT NULL) AS avg_upload_seconds
         FROM emergency_alerts`
      ),
      pool.query(
        `SELECT c.centre_name, COUNT(ea.id)::int AS count
         FROM emergency_alerts ea
         LEFT JOIN centres c ON c.id = ea.centre_id
         GROUP BY c.centre_name
         ORDER BY count DESC`
      ),
    ]);

    const t = totals.rows[0];
    const total = t.total || 0;
    res.json({
      totalAlerts: total,
      alertsWithRecording: t.with_recording || 0,
      alertsWithLocation: t.with_location || 0,
      recordingSuccessRate: total > 0 ? Math.round((t.with_recording / total) * 100) : 0,
      locationSuccessRate: total > 0 ? Math.round((t.with_location / total) * 100) : 0,
      alertsLast7Days: t.last_7_days || 0,
      alertsLast30Days: t.last_30_days || 0,
      avgUploadSeconds: t.avg_upload_seconds ? Math.round(t.avg_upload_seconds) : null,
      byCentre: byCentre.rows.map((r: any) => ({ centreName: r.centre_name || 'Unassigned', count: r.count })),
    });
  } catch (err: any) {
    console.error('[Admin] emergency stats error:', err);
    res.status(500).json({ error: err.message });
  }
};