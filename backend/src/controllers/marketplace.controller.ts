// ============================================================
// backend/src/controllers/marketplace.controller.ts
// ============================================================
import { Request, Response } from 'express';
import { pool } from '../index';
import { v4 as uuidv4 } from 'uuid';

// ─── HELPER: Calculate Impact Split ─────────────────────────
const calculateImpact = (price: number, survivorPct: number, centrePct: number, platformPct: number) => ({
  survivor: parseFloat((price * survivorPct / 100).toFixed(2)),
  centre:   parseFloat((price * centrePct   / 100).toFixed(2)),
  platform: parseFloat((price * platformPct / 100).toFixed(2)),
});

// ─── GET ALL PRODUCTS (public listing) ──────────────────────
export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      category, search, centre_id,
      min_price, max_price,
      sort = 'created_at',
      order = 'DESC',
      page = '1', limit = '12'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const params: any[] = ['active'];
    let where = `WHERE p.status = $1`;
    let idx = 2;

    if (category) {
      where += ` AND p.category = $${idx++}`;
      params.push(category);
    }
    if (search) {
      where += ` AND (p.name ILIKE $${idx} OR p.description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (centre_id) {
      // Use seller's centre_id because products may not have direct centre_id
      where += ` AND s.centre_id = $${idx++}`;
      params.push(centre_id);
    }
    if (min_price) {
      where += ` AND p.price >= $${idx++}`;
      params.push(parseFloat(min_price as string));
    }
    if (max_price) {
      where += ` AND p.price <= $${idx++}`;
      params.push(parseFloat(max_price as string));
    }

    const allowedSort  = ['created_at', 'price', 'total_sold', 'rating_avg'];
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort  = allowedSort.includes(sort as string)  ? sort  : 'created_at';
    const safeOrder = allowedOrder.includes((order as string).toUpperCase()) ? order : 'DESC';

    // Count query (no need to join for count)
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p ${where}`,
      params
    );

    // Main query with joins and correct field aliasing
    const result = await pool.query(
      `SELECT
        p.id,
        p.name AS title,
        p.description,
        p.category,
        COALESCE(p.story, p.description) AS story,
        p.price,
        COALESCE(p.stock, 0) AS stock,
        COALESCE(p.image_url, 'https://placehold.co/600x400?text=No+Image') AS img,
        p.seller_alias,
        COALESCE(p.seller_type, 'survivor') AS seller_type,
        COALESCE(p.rating_avg, 5.0) AS rating,
        COALESCE(p.rating_count, 0) AS reviews,
        COALESCE(p.total_sold, 0) AS sold,
        c.centre_name,
        c.city,
        ROUND(p.price * COALESCE(p.survivor_pct, 70) / 100, 2) AS survivor_income,
        ROUND(p.price * COALESCE(p.centre_pct, 28) / 100, 2) AS centre_funding,
        ROUND(p.price * COALESCE(p.platform_pct, 2) / 100, 2) AS platform_fee,
        CASE WHEN COALESCE(p.stock, 0) = 0 THEN 'out-of-stock'
             WHEN COALESCE(p.stock, 0) <= 5 THEN 'low-stock'
             ELSE NULL END AS badge
       FROM products p
       JOIN sellers s ON s.id = p.seller_id
       JOIN centres c ON c.id = s.centre_id
       ${where}
       ORDER BY p.${safeSort} ${safeOrder}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit as string), offset]
    );

    // Return products directly – fields already match frontend interface
    return res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page as string),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit as string)),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET SINGLE PRODUCT ──────────────────────────────────────
export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT
        p.*,
        c.centre_name, c.city, c.province, c.contact_phone,
        c.services_offered, c.languages_spoken,
        c.provides_counselling, c.provides_legal_support,
        c.has_shelter, c.is_24_hour,
        ROUND(p.price * p.survivor_pct / 100, 2) as survivor_income,
        ROUND(p.price * p.centre_pct   / 100, 2) as centre_funding,
        ROUND(p.price * p.platform_pct / 100, 2) as platform_fee
       FROM products p
       JOIN sellers s ON s.id = p.seller_id
       JOIN centres c ON c.id = s.centre_id
       WHERE p.id = $1 AND p.status = 'active'`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });

    // Get reviews
    const reviews = await pool.query(
      `SELECT buyer_name, rating, comment, created_at
       FROM product_reviews WHERE product_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [id]
    );

    return res.json({ ...result.rows[0], reviews: reviews.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET CATEGORIES WITH COUNTS ─────────────────────────────
export const getCategories = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) as count, MIN(price) as min_price, MAX(price) as max_price
       FROM products WHERE status = 'active'
       GROUP BY category ORDER BY count DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── CART: GET ───────────────────────────────────────────────
export const getCart = async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    if (!sessionId) return res.json({ items: [], subtotal: 0 });

    const result = await pool.query(
      `SELECT items FROM carts WHERE session_id = $1`, [sessionId]
    );

    if (!result.rows.length) return res.json({ items: [], subtotal: 0 });

    const items = result.rows[0].items || [];
    const subtotal = items.reduce((sum: number, item: any) =>
      sum + (item.price * item.quantity), 0);

    return res.json({ items, subtotal: parseFloat(subtotal.toFixed(2)) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── CART: ADD / UPDATE ──────────────────────────────────────
export const updateCart = async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers['x-session-id'] as string || uuidv4();
    const { product_id, quantity } = req.body;

    if (!product_id || quantity < 0) {
      return res.status(400).json({ error: 'Invalid product or quantity' });
    }

    // Fetch product
    const prod = await pool.query(
      `SELECT p.id, p.name AS title, p.price, COALESCE(p.image_url, '') AS thumbnail,
              p.seller_alias, p.currency, p.survivor_pct, p.centre_pct, p.platform_pct,
              COALESCE(p.stock, 0) AS stock_quantity,
              c.centre_name
       FROM products p
       JOIN sellers s ON s.id = p.seller_id
       JOIN centres c ON c.id = s.centre_id
       WHERE p.id = $1 AND p.status = 'active'`,
      [product_id]
    );
    if (!prod.rows.length) return res.status(404).json({ error: 'Product not found' });

    const p = prod.rows[0];
    if (quantity > p.stock_quantity) {
      return res.status(400).json({ error: `Only ${p.stock_quantity} in stock` });
    }

    // Get or create cart
    let cart = await pool.query(
      `SELECT items FROM carts WHERE session_id = $1`, [sessionId]
    );

    let items: any[] = cart.rows.length ? (cart.rows[0].items || []) : [];

    if (quantity === 0) {
      items = items.filter((i: any) => i.product_id !== product_id);
    } else {
      const idx = items.findIndex((i: any) => i.product_id === product_id);
      const impact = calculateImpact(p.price, p.survivor_pct, p.centre_pct, p.platform_pct);
      const cartItem = {
        product_id, quantity,
        title: p.title, price: p.price,
        thumbnail: p.thumbnail,
        seller_alias: p.seller_alias,
        centre_name: p.centre_name,
        currency: p.currency,
        survivor_income: impact.survivor,
        centre_funding: impact.centre,
        platform_fee: impact.platform,
      };
      if (idx > -1) items[idx] = cartItem;
      else items.push(cartItem);
    }

    // Upsert cart
    await pool.query(
      `INSERT INTO carts (session_id, items) VALUES ($1, $2)
       ON CONFLICT (session_id) DO UPDATE SET items = $2, updated_at = NOW()`,
      [sessionId, JSON.stringify(items)]
    );

    const subtotal = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    return res.json({ session_id: sessionId, items, subtotal: parseFloat(subtotal.toFixed(2)) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── PLACE ORDER ─────────────────────────────────────────────
export const placeOrder = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const {
      buyer_name, buyer_email, buyer_phone,
      delivery_address, delivery_suburb, delivery_city,
      delivery_province, delivery_postal,
      payment_method, notes,
    } = req.body;

    // Get cart
    const cartResult = await client.query(
      `SELECT items FROM carts WHERE session_id = $1`, [sessionId]
    );
    if (!cartResult.rows.length || !cartResult.rows[0].items?.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const items = cartResult.rows[0].items;

    // Find nearest hub centre (simplified: use seller's centre of first item)
    const hubCentreId = items[0] ? await client.query(
      `SELECT s.centre_id
       FROM products p
       JOIN sellers s ON s.id = p.seller_id
       WHERE p.id = $1`,
      [items[0].product_id]
    ).then(r => r.rows[0]?.centre_id) : null;

    await client.query('BEGIN');

    // Calculate totals
    let subtotal = 0;
    let platformFeeTotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const prod = await client.query(
        `SELECT p.id, p.name AS title, p.price, p.survivor_pct, p.centre_pct, p.platform_pct,
                COALESCE(p.stock, 0) AS stock_quantity, p.seller_alias,
                c.centre_name, s.centre_id
         FROM products p
         JOIN sellers s ON s.id = p.seller_id
         JOIN centres c ON c.id = s.centre_id
         WHERE p.id = $1 AND p.status = 'active' FOR UPDATE`,
        [item.product_id]
      );

      if (!prod.rows.length) throw new Error(`Product ${item.product_id} unavailable`);
      const p = prod.rows[0];

      if (p.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for: ${p.title}`);
      }

      const lineTotal = p.price * item.quantity;
      const impact = calculateImpact(p.price, p.survivor_pct, p.centre_pct, p.platform_pct);

      subtotal += lineTotal;
      platformFeeTotal += impact.platform * item.quantity;

      orderItems.push({
        product_id: p.id,
        centre_id: p.centre_id,
        quantity: item.quantity,
        unit_price: p.price,
        total_price: lineTotal,
        survivor_amount: impact.survivor * item.quantity,
        centre_amount: impact.centre * item.quantity,
        platform_amount: impact.platform * item.quantity,
        product_title: p.title,
        product_thumbnail: p.thumbnail,
        seller_alias: p.seller_alias,
        centre_name: p.centre_name,
      });

      // Decrement stock
      await client.query(
        `UPDATE products SET stock = stock - $1, total_sold = total_sold + $1 WHERE id = $2`,
        [item.quantity, p.id]
      );
    }

    const total = subtotal; // delivery fee calculated separately

    // Insert order
    const orderResult = await client.query(
      `INSERT INTO orders (
        buyer_email, buyer_name, buyer_phone,
        delivery_address, delivery_suburb, delivery_city,
        delivery_province, delivery_postal,
        hub_centre_id, subtotal, platform_fee_total, total,
        payment_method, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        buyer_email, buyer_name, buyer_phone || null,
        delivery_address, delivery_suburb, delivery_city,
        delivery_province, delivery_postal,
        hubCentreId, subtotal, platformFeeTotal, total,
        payment_method || null, notes || null,
      ]
    );
    const orderId = orderResult.rows[0].id;

    // Insert order items
    for (const oi of orderItems) {
      await client.query(
        `INSERT INTO order_items (
          order_id, product_id, centre_id, quantity, unit_price, total_price,
          survivor_amount, centre_amount, platform_amount,
          product_title, product_thumbnail, seller_alias, centre_name
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          orderId, oi.product_id, oi.centre_id, oi.quantity,
          oi.unit_price, oi.total_price,
          oi.survivor_amount, oi.centre_amount, oi.platform_amount,
          oi.product_title, oi.product_thumbnail, oi.seller_alias, oi.centre_name,
        ]
      );
    }

    // Generate Impact Receipt
    const totalSurvivor = orderItems.reduce((s, i) => s + i.survivor_amount, 0);
    const totalCentre   = orderItems.reduce((s, i) => s + i.centre_amount, 0);
    const counsellingMins = Math.round((totalCentre / 30) * 20);
    const workHours = Math.round(totalSurvivor / 80 * 3);
    const shareCode = `AMN-${Math.random().toString(36).substr(2,6).toUpperCase()}`;

    await client.query(
      `INSERT INTO impact_receipts (
        order_id, total_paid, total_survivor_income,
        total_centre_funding, total_platform,
        counselling_minutes, work_hours_created, shareable_code
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        orderId, total, parseFloat(totalSurvivor.toFixed(2)),
        parseFloat(totalCentre.toFixed(2)), parseFloat(platformFeeTotal.toFixed(2)),
        counsellingMins, workHours, shareCode,
      ]
    );

    // Clear cart
    await client.query(`DELETE FROM carts WHERE session_id = $1`, [sessionId]);

    await client.query('COMMIT');

    return res.status(201).json({
      order_id: orderId,
      share_code: shareCode,
      total,
      message: 'Order placed. Your Impact Receipt has been generated.',
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(400).json({ error: err.message || 'Order failed' });
  } finally {
    client.release();
  }
};

// ─── GET IMPACT RECEIPT ──────────────────────────────────────
export const getImpactReceipt = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const result = await pool.query(
      `SELECT ir.*, o.buyer_name, o.total, o.created_at as order_date,
              json_agg(json_build_object(
                'title', oi.product_title,
                'quantity', oi.quantity,
                'total', oi.total_price,
                'survivor_amount', oi.survivor_amount,
                'centre_amount', oi.centre_amount,
                'centre_name', oi.centre_name,
                'seller_alias', oi.seller_alias
              )) as items
       FROM impact_receipts ir
       JOIN orders o ON o.id = ir.order_id
       JOIN order_items oi ON oi.order_id = o.id
       WHERE ir.order_id = $1
       GROUP BY ir.id, o.buyer_name, o.total, o.created_at`,
      [orderId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Receipt not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── CENTRE: ADD PRODUCT ─────────────────────────────────────
export const addProduct = async (req: Request, res: Response) => {
  try {
    const centreId = (req as any).centre?.id;
    const body = req.body;
    const files = req.files as { [f: string]: Express.Multer.File[] };

    const images = files?.images?.map(f => f.path) || [];
    const thumbnail = images[0] || null;

    // Ensure required fields exist
    if (!body.title || !body.price || !body.stock_quantity) {
      return res.status(400).json({ error: 'Missing required fields: title, price, stock_quantity' });
    }

    const result = await pool.query(
      `INSERT INTO products (
        centre_id, seller_alias, seller_type, name, description,
        category, tags, story, price, survivor_pct, centre_pct, platform_pct,
        stock, images, image_url, weight_grams, processing_days, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id, name, status`,
      [
        centreId, body.seller_alias, body.seller_type,
        body.title, body.description, body.category,
        body.tags ? JSON.parse(body.tags) : [],
        body.story || null, parseFloat(body.price),
        parseFloat(body.survivor_pct || '70'),
        parseFloat(body.centre_pct  || '28'),
        parseFloat(body.platform_pct || '2'),
        parseInt(body.stock_quantity),
        images, thumbnail || null,
        body.weight_grams ? parseInt(body.weight_grams) : null,
        parseInt(body.processing_days || '3'),
        'pending' // needs admin approval
      ]
    );

    return res.status(201).json({
      message: 'Product submitted for approval',
      product: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to add product' });
  }
};

// ─── ADMIN: APPROVE PRODUCT ──────────────────────────────────
export const approveProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'active' | 'rejected'
    await pool.query(
      `UPDATE products SET status = $1, approved_at = CASE WHEN $1 = 'active' THEN NOW() ELSE NULL END
       WHERE id = $2`,
      [action, id]
    );
    return res.json({ message: `Product ${action}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};