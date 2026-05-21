import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../index';

// GET verified centres for dropdown
export const getVerifiedCentres = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT id, centre_name AS name, city
             FROM centres
             WHERE status = 'approved'
             ORDER BY centre_name ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch centres' });
    }
};

// Register a new seller (victim/survivor)
export const registerSeller = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const {
            alias,
            public_bio,
            real_name,
            real_surname,
            id_number,
            email,
            phone,
            centre_id,
            product_categories,
            skills_experience,
            payout_method,
            bank_details,
            cash_pickup_note,
            hidden_pin,
            accepted_terms,
            accepted_popia,
            safety_acknowledged,
        } = req.body;

        // Validation
        if (!alias || !public_bio || !real_name || !real_surname || !id_number || !email || !phone || !centre_id ||
            !product_categories?.length || !skills_experience || !payout_method || !hidden_pin) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!accepted_terms || !accepted_popia || !safety_acknowledged) {
            return res.status(400).json({ error: 'You must accept all terms and consent agreements' });
        }
        if (payout_method === 'eft' && (!bank_details?.bank_name || !bank_details?.account_holder ||
            !bank_details?.account_number || !bank_details?.branch_code)) {
            return res.status(400).json({ error: 'Bank details required for EFT payout' });
        }
        if (!/^\d{4,6}$/.test(hidden_pin)) {
            return res.status(400).json({ error: 'PIN must be 4-6 digits' });
        }

        await client.query('BEGIN');

        // 1. Verify centre exists and is approved
        const centreCheck = await client.query(
            `SELECT id FROM centres WHERE id = $1 AND status = 'approved'`,
            [centre_id]
        );
        if (centreCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Centre not found or not yet verified' });
        }

        // 2. Check if email or alias already used
        const existing = await client.query(
            `SELECT id FROM sellers WHERE email = $1 OR alias = $2`,
            [email, alias]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email or alias already registered' });
        }

        // 3. Hash the hidden PIN
        const pinHash = await bcrypt.hash(hidden_pin, 12);

        // 4. Insert seller
        const result = await client.query(
            `INSERT INTO sellers
                (alias, public_bio, real_name, real_surname, id_number, email, phone,
                 centre_id, product_categories, skills_experience, payout_method,
                 bank_details, cash_pickup_note, hidden_pin_hash, verification_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
             RETURNING id, alias, email, centre_id, created_at`,
            [
                alias,
                public_bio,
                real_name,
                real_surname,
                id_number,
                email,
                phone,
                centre_id,
                product_categories,
                skills_experience,
                payout_method,
                payout_method === 'eft' ? JSON.stringify(bank_details) : null,
                payout_method === 'cash' ? (cash_pickup_note || 'Will collect at centre') : null,
                pinHash,
            ]
        );

        // Optional: Add audit log for seller registration
        await client.query(
            `INSERT INTO centre_audit_log (centre_id, action, performed_by_type, details)
             VALUES ($1, 'seller_registered', 'seller', $2)`,
            [centre_id, JSON.stringify({ alias, email, seller_id: result.rows[0].id })]
        );

        await client.query('COMMIT');

        const newSeller = result.rows[0];
        res.status(201).json({
            message: 'Seller registration successful. Awaiting centre verification.',
            seller_id: newSeller.id,
            alias: newSeller.alias,
            email: newSeller.email,
            centre_id: newSeller.centre_id,
            created_at: newSeller.created_at,
        });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Seller registration error:', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Email or alias already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

// Get seller profile (for dashboard)
export const getSellerProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, alias, email, product_categories, payout_method, verification_status
             FROM sellers
             WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Seller not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get seller's products
export const getSellerProducts = async (req: Request, res: Response) => {
    const { sellerId } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, name, description, price, category, status
             FROM products
             WHERE seller_id = $1
             ORDER BY created_at DESC`,
            [sellerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Optional: Delete a product
export const deleteProduct = async (req: Request, res: Response) => {
    const { productId } = req.params;
    try {
        const result = await pool.query(
            `DELETE FROM products WHERE id = $1 RETURNING id`,
            [productId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get seller public profile (by alias) – for marketplace display
export const getSellerPublicProfile = async (req: Request, res: Response) => {
    const { alias } = req.params;
    try {
        const result = await pool.query(
            `SELECT s.alias, s.public_bio, s.product_categories,
                    c.centre_name as centre_name, c.city
             FROM sellers s
             JOIN centres c ON s.centre_id = c.id
             WHERE s.alias = $1 AND s.verification_status = 'approved'`,
            [alias]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Seller not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal error' });
    }
};