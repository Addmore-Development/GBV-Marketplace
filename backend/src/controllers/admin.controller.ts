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
    const [sellers, centres, buyers, donations] = await Promise.all([
      pool.query('SELECT verification_status, total_earned FROM sellers'),
      pool.query('SELECT status FROM centres'),
      pool.query("SELECT id FROM users WHERE role = $1", ['buyer']),
      pool.query('SELECT amount FROM donations'),
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
