// ============================================================
// backend/src/controllers/admin.controller.ts
// ============================================================
import { Request, Response } from 'express';
import { pool } from '../index';
import { getIO } from '../socket';

// Postgres unique-violation (23505) errors come through as raw messages like
// `duplicate key value violates unique constraint "centres_contact_email_key"`
// with the actual conflicting value in err.detail. This turns that into
// something an admin can actually act on instead of a stack-trace fragment.
function friendlyDbError(err: any): { status: number; message: string } {
  if (err?.code === '23505') {
    // err.detail looks like: Key (contact_email)=(foo@bar.com) already exists.
    const match = /Key \(([^)]+)\)=\(([^)]+)\)/.exec(err.detail || '');
    const field = match?.[1]?.replace(/_/g, ' ') || 'value';
    const value = match?.[2] || '';
    return { status: 409, message: `That ${field} (${value}) is already in use by another record.` };
  }
  return { status: 500, message: err?.message || 'Something went wrong' };
}

// ── Stats ──────────────────────────────────────────────────
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [sellers, centres, buyers, donations, orders] = await Promise.all([
      pool.query('SELECT verification_status, total_earned FROM sellers'),
      pool.query('SELECT status FROM centres'),
      pool.query(`
        SELECT email FROM buyers
        UNION
        SELECT DISTINCT buyer_email AS email FROM orders WHERE buyer_email IS NOT NULL
      `),
      pool.query('SELECT amount FROM donations'),
      pool.query('SELECT id, total FROM orders'),
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
      totalOrders:         orders.rows.length,
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

// ── View / edit a single seller's full profile from the admin dashboard ──
// hidden_pin_hash is deliberately never selected — it's a credential, not
// profile data, and has no business leaving the database.
const SELLER_SAFE_COLUMNS = `
  sellers.id, sellers.alias, sellers.public_bio, sellers.real_name, sellers.real_surname,
  sellers.id_number, sellers.email, sellers.phone, sellers.centre_id, centres.centre_name,
  sellers.product_categories, sellers.skills_experience, sellers.payout_method,
  sellers.bank_details, sellers.cash_pickup_note, sellers.is_verified,
  sellers.verification_status, sellers.total_sales, sellers.total_earned,
  sellers.created_at, sellers.updated_at
`;

export const getSellerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT ${SELLER_SAFE_COLUMNS}
       FROM sellers LEFT JOIN centres ON centres.id = sellers.centre_id
       WHERE sellers.id = $1`,
      [req.params['id']]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Seller not found' }); return; }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Verification status stays on the dedicated approve/reject/delete
// endpoints above so there's one source of truth for that transition —
// everything else about the seller's profile is editable here.
const sellerEditableFields: { body: string; column: string }[] = [
  { body: 'alias',              column: 'alias' },
  { body: 'real_name',          column: 'real_name' },
  { body: 'real_surname',       column: 'real_surname' },
  { body: 'email',              column: 'email' },
  { body: 'phone',              column: 'phone' },
  { body: 'public_bio',         column: 'public_bio' },
  { body: 'skills_experience',  column: 'skills_experience' },
  { body: 'product_categories', column: 'product_categories' },
  { body: 'payout_method',      column: 'payout_method' },
  { body: 'cash_pickup_note',   column: 'cash_pickup_note' },
];

export const updateSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const setClauses: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const field of sellerEditableFields) {
      if (body[field.body] === undefined) continue;
      setClauses.push(`${field.column} = $${i}`);
      values.push(body[field.body]);
      i++;
    }
    // bank_details is JSONB — needs an explicit cast rather than a plain
    // string bind, so it's handled separately from the simple fields above.
    if (body.bank_details !== undefined) {
      setClauses.push(`bank_details = $${i}::jsonb`);
      values.push(JSON.stringify(body.bank_details));
      i++;
    }
    if (setClauses.length === 0) { res.status(400).json({ error: 'No editable fields were provided' }); return; }

    setClauses.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE sellers SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING id`,
      values
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Seller not found' }); return; }

    const fresh = await pool.query(
      `SELECT ${SELLER_SAFE_COLUMNS}
       FROM sellers LEFT JOIN centres ON centres.id = sellers.centre_id
       WHERE sellers.id = $1`,
      [id]
    );
    res.json(fresh.rows[0]);
  } catch (err: any) {
    console.error('[Admin] updateSeller error:', err);
    const { status, message } = friendlyDbError(err);
    res.status(status).json({ error: message });
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

// ── View / edit a single centre's full profile from the admin dashboard ──
export const getCentreById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT centres.*, COUNT(sellers.id) AS seller_count
       FROM centres
       LEFT JOIN sellers ON sellers.centre_id = centres.id
       WHERE centres.id = $1
       GROUP BY centres.id`,
      [req.params['id']]
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Centre not found' }); return; }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Admin can edit more than a centre can edit about itself (contact person,
// address, registration numbers, etc.) — approval status is deliberately
// kept out of this and stays on the dedicated approve/reject endpoints.
const adminEditableCentreFields: { body: string; column: string }[] = [
  { body: 'centre_name',          column: 'centre_name' },
  { body: 'contact_person_name',  column: 'contact_person_name' },
  { body: 'contact_person_role',  column: 'contact_person_role' },
  { body: 'contact_email',        column: 'contact_email' },
  { body: 'contact_phone',        column: 'contact_phone' },
  { body: 'whatsapp_number',      column: 'whatsapp_number' },
  { body: 'website_url',          column: 'website_url' },
  { body: 'physical_address',     column: 'physical_address' },
  { body: 'suburb',               column: 'suburb' },
  { body: 'city',                 column: 'city' },
  { body: 'province',             column: 'province' },
  { body: 'postal_code',          column: 'postal_code' },
  { body: 'npo_number',           column: 'npo_number' },
  { body: 'description',          column: 'description' },
  { body: 'mission_statement',    column: 'mission_statement' },
  { body: 'accepts_goods',        column: 'accepts_goods' },
  { body: 'section18a',           column: 'section18a' },
  { body: 'marketplace_active',   column: 'marketplace_active' },
];

export const updateCentre = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const setClauses: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const field of adminEditableCentreFields) {
      if (body[field.body] === undefined) continue;
      setClauses.push(`${field.column} = $${i}`);
      values.push(body[field.body]);
      i++;
    }
    if (setClauses.length === 0) { res.status(400).json({ error: 'No editable fields were provided' }); return; }

    setClauses.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE centres SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows.length) { res.status(404).json({ error: 'Centre not found' }); return; }

    const io = getIO();
    if (io) io.to(`centre:${id}`).emit('centre:updated', result.rows[0]);

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[Admin] updateCentre error:', err);
    const { status, message } = friendlyDbError(err);
    res.status(status).json({ error: message });
  }
};

// ── Buyers ────────────────────────────────────────────────
// Buyer registration is now persisted to the `buyers` table (see
// registerBuyer in marketplace.controller.ts) instead of living only in
// the browser's localStorage. This merges that table with guest-checkout
// order history (buyer_email on orders, for anyone who checked out without
// registering) so admin sees every buyer, registered or guest, in one list.
export const getBuyers = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT
         COALESCE(b.id::text, MIN(o.id::text)) AS id,
         COALESCE(b.email, o.buyer_email)       AS email,
         COALESCE(b.name, MAX(o.buyer_name))    AS name,
         COALESCE(SUM(o.total), 0)              AS total_spent,
         COUNT(o.id)::int                       AS order_count,
         COALESCE(MIN(b.created_at), MIN(o.created_at)) AS created_at
       FROM buyers b
       FULL OUTER JOIN orders o
         ON o.buyer_email = b.email AND o.buyer_email IS NOT NULL AND o.buyer_email <> ''
       WHERE b.email IS NOT NULL OR (o.buyer_email IS NOT NULL AND o.buyer_email <> '')
       GROUP BY b.id, b.email, b.name, o.buyer_email
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('[Admin] buyers error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Deletes the registered-buyer row (if any) as well as their guest order
// history — order_items cascade via the FK, so a single DELETE on each is
// enough to fully remove the buyer.
export const deleteBuyer = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = decodeURIComponent(req.params['email'] as string);
    const [buyerResult, orderResult] = await Promise.all([
      pool.query(`DELETE FROM buyers WHERE email = $1`, [email]),
      pool.query(`DELETE FROM orders WHERE buyer_email = $1`, [email]),
    ]);
    res.json({ ok: true, buyerDeleted: (buyerResult.rowCount ?? 0) > 0, ordersDeleted: orderResult.rowCount });
  } catch (err: any) {
    console.error('[Admin] deleteBuyer error:', err);
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