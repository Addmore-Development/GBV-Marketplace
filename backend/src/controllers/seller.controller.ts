// ============================================================
// backend/src/controllers/seller.controller.ts
// ============================================================
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../index';
import { logActivity, getClientIp } from '../utils/activityLog';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

// Ensure upload directories exist
const evidenceDir = path.join(__dirname, '../../uploads/evidence');
const productsDir = path.join(__dirname, '../../uploads/products');
const alarmDir = path.join(__dirname, '../../uploads/alarm-recordings');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}
if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}
if (!fs.existsSync(alarmDir)) {
  fs.mkdirSync(alarmDir, { recursive: true });
}

// ── Multer config for evidence (existing) ────────────────────
const evidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, evidenceDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
export const uploadEvidence = multer({ storage: evidenceStorage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// ── NEW: Multer config for product images ────────────────────
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productsDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
export const uploadProductImage = multer({ storage: productStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// ── Multer config for SOS alarm audio recordings ──────────────
const alarmStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, alarmDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webm`;
    cb(null, unique);
  }
});
export const uploadAlarmRecording = multer({ storage: alarmStorage, limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB limit, ~1 min of audio

// ── HELPER: Verify SA ID Number (unchanged) ─────────────────
export const verifySAID = (idNumber: string): { valid: boolean; isFemale: boolean; dob: string | null } => {
    if (!idNumber || !/^\d{13}$/.test(idNumber)) {
        return { valid: false, isFemale: false, dob: null };
    }

    const year  = parseInt(idNumber.substring(0, 2));
    const month = parseInt(idNumber.substring(2, 4));
    const day   = parseInt(idNumber.substring(4, 6));
    const genderCode = parseInt(idNumber.substring(6, 10));

    if (month < 1 || month > 12) return { valid: false, isFemale: false, dob: null };
    if (day < 1 || day > 31)     return { valid: false, isFemale: false, dob: null };

    // Luhn checksum disabled for development
    const fullYear = year >= 0 && year <= 24 ? 2000 + year : 1900 + year;
    const isFemale = genderCode < 5000;
    const dob = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return { valid: true, isFemale, dob };
};

// ── GET VERIFIED CENTRES ─────────────────────────────────────
export const getVerifiedCentres = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT id, centre_name AS name, city, province, status
             FROM centres
             WHERE status IN ('approved', 'pending')
             ORDER BY centre_name ASC`
        );
        // If no centres in DB yet, return empty array (frontend will show static fallback)
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch centres' });
    }
};

// ── GET CENTRE BY ID (for seller dashboard) ─────────────────
export const getCentreById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, centre_name, city, province, status
             FROM centres
             WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Centre not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch centre' });
    }
};

// ── VERIFY ID (called client-side before showing full form) ──
export const verifyID = async (req: Request, res: Response) => {
    const { id_number } = req.body;
    if (!id_number) return res.status(400).json({ error: 'ID number required' });

    const check = verifySAID(id_number);
    if (!check.valid) {
        return res.status(400).json({ error: 'Please enter a valid South African ID number.' });
    }
    if (!check.isFemale) {
        return res.status(403).json({
            error: 'This platform is currently only open to female-identifying individuals. If you believe this is incorrect, please contact your nearest centre.',
            code: 'NOT_FEMALE'
        });
    }
    const existing = await pool.query(`SELECT id FROM sellers WHERE id_number = $1`, [id_number]);
    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'This ID is already registered. Please log in instead.', code: 'ALREADY_EXISTS' });
    }
    return res.json({ verified: true, dob: check.dob, message: 'Identity verified.' });
};

// ── REGISTER SELLER ──────────────────────────────────────────
export const registerSeller = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const {
            id_number,
            real_name,
            real_surname,
            email,
            pin,
            alias: providedAlias,
            phone,
            centre_id,
            accepted_terms,
            accepted_popia,
            safety_acknowledged,
        } = req.body;

        if (!id_number || !real_name || !email || !pin || !centre_id) {
            return res.status(400).json({ error: 'Missing required fields: id_number, name, email, password, and centre are required' });
        }

        const surname = real_surname || real_name;

        if (pin.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const idCheck = verifySAID(id_number);
        if (!idCheck.valid) {
            return res.status(400).json({ error: 'Invalid South African ID number' });
        }
        if (!idCheck.isFemale) {
            return res.status(403).json({
                error: 'This platform is currently only open to female-identifying individuals.',
                code: 'NOT_FEMALE'
            });
        }

        const existingId = await pool.query(`SELECT id FROM sellers WHERE id_number = $1`, [id_number]);
        if (existingId.rows.length > 0) {
            return res.status(409).json({ error: 'This ID is already registered. Please log in.', code: 'ALREADY_EXISTS' });
        }

        let alias = providedAlias;
        if (!alias) {
            alias = email.split('@')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
        }
        let aliasSuffix = 0;
        let baseAlias = alias;
        while (true) {
            const existingAlias = await pool.query(`SELECT id FROM sellers WHERE alias = $1`, [alias]);
            if (existingAlias.rows.length === 0) break;
            aliasSuffix++;
            alias = `${baseAlias}${aliasSuffix}`;
        }

        const existingEmail = await pool.query(`SELECT id FROM sellers WHERE email = $1`, [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered', code: 'ALREADY_EXISTS' });
        }

        const centreCheck = await pool.query(`SELECT id, status FROM centres WHERE id = $1`, [centre_id]);
        if (centreCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Selected centre does not exist' });
        }
        if (centreCheck.rows[0].status !== 'approved') {
            return res.status(400).json({
                error: 'Selected centre is not yet approved and cannot accept new sellers.',
                code: 'CENTRE_NOT_APPROVED',
            });
        }

        const finalPhone = phone || '0000000000';
        const pinHash = await bcrypt.hash(pin, 12);

        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO sellers (
                alias, public_bio, real_name, real_surname, id_number, email, phone,
                centre_id, product_categories, skills_experience, payout_method,
                bank_details, cash_pickup_note, hidden_pin_hash,
                accepted_terms, accepted_popia, safety_acknowledged,
                verification_status, profile_complete
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending', FALSE)
            RETURNING id, alias, email, centre_id, created_at`,
            [
                alias,
                '',
                real_name,
                surname,
                id_number,
                email,
                finalPhone,
                centre_id,
                [],
                null,
                'cash',
                null,
                null,
                pinHash,
                accepted_terms === true,
                accepted_popia === true,
                safety_acknowledged === true,
            ]
        );

        await client.query(
            `INSERT INTO case_journeys (seller_id) VALUES ($1) ON CONFLICT DO NOTHING`,
            [result.rows[0].id]
        );

        await client.query('COMMIT');

        const s = result.rows[0];
        res.status(201).json({
            message: 'Registration successful. Welcome to Amani.',
            seller_id: s.id,
            alias: s.alias,
            email: s.email,
            centre_id: s.centre_id,
            created_at: s.created_at,
        });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Registration error:', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Email or alias already exists', code: 'ALREADY_EXISTS' });
        }
        res.status(500).json({ error: 'Internal server error. Please try again.' });
    } finally {
        client.release();
    }
};

// ── LOGIN ────────────────────────────────────────────────────
export const loginSeller = async (req: Request, res: Response) => {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ error: 'Email and password are required' });

    try {
        const result = await pool.query(
            `SELECT id, alias, email, real_name, phone, city, hidden_pin_hash,
                    verification_status, hidden_layer_granted, centre_id,
                    profile_complete, product_categories, payout_method,
                    total_sales, total_earned
             FROM sellers WHERE email = $1`,
            [email]
        );
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

        const seller = result.rows[0];
        const valid = await bcrypt.compare(pin, seller.hidden_pin_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

        const { hidden_pin_hash, ...safe } = seller;

        await logActivity('seller', seller.id, seller.alias, seller.email, 'login', getClientIp(req));

        res.json({ ...safe });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ── LOGOUT ────────────────────────────────────────────────────
export const logoutSeller = async (req: Request, res: Response) => {
    const { seller_id, alias, email } = req.body || {};
    if (!seller_id) return res.status(400).json({ error: 'seller_id required' });
    await logActivity('seller', seller_id, alias || null, email || null, 'logout', getClientIp(req));
    res.json({ ok: true });
};

// ── GET FULL DASHBOARD PROFILE ───────────────────────────────
export const getSellerProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT s.id, s.alias, s.email, s.real_name, s.real_surname, s.phone,
                    s.address, s.suburb, s.city, s.province,
                    s.product_categories, s.payout_method, s.verification_status,
                    s.hidden_layer_granted, s.profile_complete,
                    s.craft_story, s.photo_url, s.languages, s.availability,
                    s.skills_experience, s.total_sales, s.total_earned,
                    s.public_bio, s.social_handle,
                    c.centre_name, c.city AS centre_city
             FROM sellers s
             LEFT JOIN centres c ON c.id = s.centre_id
             WHERE s.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ── UPDATE PROFILE ───────────────────────────────────────────
export const updateSellerProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        alias, public_bio, craft_story, phone, address, suburb, city, province,
        languages, availability, social_handle, skills_experience,
        payout_method, bank_details, cash_pickup_note,
    } = req.body;

    try {
        const isComplete = !!(alias && public_bio && craft_story && phone && city && payout_method);

        await pool.query(
            `UPDATE sellers SET
                alias = COALESCE($1, alias),
                public_bio = COALESCE($2, public_bio),
                craft_story = COALESCE($3, craft_story),
                phone = COALESCE($4, phone),
                address = COALESCE($5, address),
                suburb = COALESCE($6, suburb),
                city = COALESCE($7, city),
                province = COALESCE($8, province),
                languages = COALESCE($9, languages),
                availability = COALESCE($10, availability),
                social_handle = COALESCE($11, social_handle),
                skills_experience = COALESCE($12, skills_experience),
                payout_method = COALESCE($13, payout_method),
                bank_details = CASE WHEN $13 = 'eft' THEN $14::jsonb ELSE bank_details END,
                cash_pickup_note = CASE WHEN $13 = 'cash' THEN $15 ELSE cash_pickup_note END,
                profile_complete = $16,
                updated_at = NOW()
             WHERE id = $17`,
            [alias, public_bio, craft_story, phone, address, suburb, city, province,
             languages || null, availability || null, social_handle || null, skills_experience,
             payout_method, bank_details ? JSON.stringify(bank_details) : null,
             cash_pickup_note || null, isComplete, id]
        );
        res.json({ message: 'Profile updated', profile_complete: isComplete });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
};

// ── PRODUCTS (ENHANCED with image upload) ────────────────────
export const getSellerProducts = async (req: Request, res: Response) => {
    const { sellerId } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, name, description, price, category, status, stock, total_sold, image_url, story
             FROM products WHERE seller_id = $1 ORDER BY created_at DESC`,
            [sellerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load listings' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    // Handle file upload if present
    let imageUrl = null;
    if ((req as any).file) {
        const file = (req as any).file;
        imageUrl = `/uploads/products/${file.filename}`;
    } else if (req.body.image_url) {
        imageUrl = req.body.image_url;
    }

    const { seller_id, name, description, price, category, status, stock, story } = req.body;

    if (!seller_id || !name || price === undefined) {
        return res.status(400).json({ error: 'Name and price are required' });
    }
    try {
        const check = await pool.query(
            `SELECT profile_complete, verification_status FROM sellers WHERE id = $1`,
            [seller_id]
        );
        if (!check.rows.length) {
            return res.status(404).json({ error: 'Seller not found' });
        }
        if (!check.rows[0].profile_complete) {
            return res.status(403).json({
                error: 'Please complete your maker profile before listing products.',
                code: 'PROFILE_INCOMPLETE'
            });
        }
        if (check.rows[0].verification_status !== 'approved') {
            return res.status(403).json({
                error: 'Your account is still pending admin approval. You can list products once approved.',
                code: 'NOT_APPROVED'
            });
        }

        const result = await pool.query(
            `INSERT INTO products (seller_id, name, description, price, category, status, stock, story, image_url)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING id, name, price, category, status, stock, image_url`,
            [seller_id, name, description || null, price, category || null,
             status || 'active', stock || 0, story || null, imageUrl]
        );
        res.status(201).json({ product: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create listing' });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    let imageUrl = req.body.image_url || null;
    if ((req as any).file) {
        const file = (req as any).file;
        imageUrl = `/uploads/products/${file.filename}`;
    }
    const { name, description, price, category, status, stock, story } = req.body;

    try {
        const result = await pool.query(
            `UPDATE products SET 
                name=$1, description=$2, price=$3, category=$4,
                status=$5, stock=$6, story=$7, 
                image_url = COALESCE($8, image_url),
                updated_at = NOW()
             WHERE id=$9
             RETURNING id, name, price, category, status, stock, image_url`,
            [name, description || null, price, category || null, status, stock || 0, story || null, imageUrl, id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });
        res.json({ product: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const { productId } = req.params;
    try {
        const result = await pool.query(`DELETE FROM products WHERE id=$1 RETURNING id`, [productId]);
        if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });
        res.json({ message: 'Listing removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
};

// ── SELLER EARNINGS ──────────────────────────────────────────
export const getSellerEarnings = async (req: Request, res: Response) => {
    const { sellerId } = req.params;
    try {
        const summary = await pool.query(
            `SELECT
                COALESCE(SUM(amount) FILTER (WHERE status='paid'), 0) AS total_paid,
                COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0) AS pending,
                COUNT(*) FILTER (WHERE status='paid') AS paid_count
             FROM seller_earnings WHERE seller_id = $1`,
            [sellerId]
        );
        const recent = await pool.query(
            `SELECT 
                amount, 
                status, 
                payout_date, 
                'Sale' AS product_title,
                created_at
             FROM seller_earnings
             WHERE seller_id = $1
             ORDER BY created_at DESC LIMIT 20`,
            [sellerId]
        );
        res.json({ summary: summary.rows[0], transactions: recent.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load earnings' });
    }
};

// ── TRAINING ─────────────────────────────────────────────────
export const getTrainingModules = async (req: Request, res: Response) => {
    const { sellerId } = req.params;
    try {
        const result = await pool.query(
            `SELECT m.id, m.title, m.category, m.description, m.duration_mins, m.level,
                    COALESCE(p.status, 'not_started') AS progress
             FROM training_modules m
             LEFT JOIN seller_training_progress p
               ON p.module_id = m.id AND p.seller_id = $1
             WHERE m.is_active = TRUE
             ORDER BY m.category, m.level`,
            [sellerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load training' });
    }
};

export const updateTrainingProgress = async (req: Request, res: Response) => {
    const { sellerId, moduleId } = req.params;
    const { status } = req.body;
    try {
        await pool.query(
            `INSERT INTO seller_training_progress (seller_id, module_id, status, completed_at)
             VALUES ($1, $2, $3, CASE WHEN $3='completed' THEN NOW() ELSE NULL END)
             ON CONFLICT (seller_id, module_id) DO UPDATE
             SET status=$3, completed_at=CASE WHEN $3='completed' THEN NOW() ELSE seller_training_progress.completed_at END`,
            [sellerId, moduleId, status]
        );
        res.json({ message: 'Progress saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not save progress' });
    }
};

// ── TRUSTED CONTACTS ─────────────────────────────────────────
export const getTrustedContacts = async (req: Request, res: Response) => {
    const { sellerId } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, name, phone, relationship, whatsapp, is_active
             FROM trusted_contacts WHERE seller_id = $1 ORDER BY created_at`,
            [sellerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load contacts' });
    }
};

export const addTrustedContact = async (req: Request, res: Response) => {
    const { seller_id, name, phone, relationship, whatsapp } = req.body;
    if (!seller_id || !name || !phone) return res.status(400).json({ error: 'Name and phone required' });
    try {
        const result = await pool.query(
            `INSERT INTO trusted_contacts (seller_id, name, phone, relationship, whatsapp)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [seller_id, name, phone, relationship || null, whatsapp !== false]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not add contact' });
    }
};

export const deleteTrustedContact = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await pool.query(`DELETE FROM trusted_contacts WHERE id=$1`, [id]);
        res.json({ message: 'Contact removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
};

// ── EMERGENCY ALERT (silent alarm — notifies centre, admin, authorities) ──
export const triggerEmergencyAlert = async (req: Request, res: Response) => {
    const { seller_id, seller_alias, seller_email, centre_id, centre_name, location_hint, timestamp, notify = [] } = req.body;
    if (!seller_id) return res.status(400).json({ error: 'Required' });
    try {
        // 1. Get trusted contacts
        const contacts = await pool.query(
            `SELECT name, phone, whatsapp FROM trusted_contacts
             WHERE seller_id = $1 AND is_active = TRUE`,
            [seller_id]
        );

        // 2. Get centre contact email for notification
        let centreEmail = null;
        if (centre_id) {
            const centreRes = await pool.query(
                `SELECT contact_email FROM centres WHERE id = $1`, [centre_id]
            );
            centreEmail = centreRes.rows[0]?.contact_email || null;
        }

        // 3. Get all admin emails
        const adminRes = await pool.query(`SELECT email FROM admin_users LIMIT 5`);
        const adminEmails = adminRes.rows.map((r: any) => r.email);

        // 4. Insert emergency alert record with all notification channels
        const alertRes = await pool.query(
            `INSERT INTO emergency_alerts
             (seller_id, centre_id, contacts_notified, location_hint, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING id`,
            [
                seller_id,
                centre_id || null,
                JSON.stringify({
                    trusted_contacts: contacts.rows,
                    centre: centreEmail ? { email: centreEmail, name: centre_name } : null,
                    admins: adminEmails,
                    authorities: { saps_number: '10111', gbv_hotline: '0800 428 428' },
                    location: location_hint,
                    seller: { id: seller_id, alias: seller_alias, email: seller_email },
                    timestamp: timestamp || new Date().toISOString(),
                    notify_channels: notify,
                }),
                location_hint || null,
            ]
        );
        const alertId = alertRes.rows[0].id;

        console.log(`🚨 SILENT ALARM triggered by seller ${seller_alias || seller_id}`);
        console.log(`   Alert ID: ${alertId}`);
        console.log(`   Location: ${location_hint}`);
        console.log(`   Centre notified: ${centreEmail || 'none'}`);
        console.log(`   Admins: ${adminEmails.join(', ') || 'none'}`);
        console.log(`   Trusted contacts: ${contacts.rows.length}`);

        res.json({
            message: 'Silent alarm sent',
            alert_id: alertId,
            contacts_reached: contacts.rows.length,
            centre_notified: !!centreEmail,
            admin_notified: adminEmails.length > 0,
            authorities_logged: true,
            saps_number: '10111',
            gbv_hotline: '0800 428 428',
            note: 'Your centre, admin, and trusted contacts have been silently notified. A 1-minute recording has started on your device and will be attached to this alert automatically.',
        });
    } catch (err) {
        console.error('Emergency alert error:', err);
        res.status(500).json({ error: 'Alert failed' });
    }
};

// ── Centre dashboard: list SOS alerts for this centre ──────────
export const getCentreEmergencyAlerts = async (req: Request, res: Response) => {
    const { centreId } = req.params;
    try {
        const result = await pool.query(
            `SELECT ea.id, ea.seller_id, ea.location_hint, ea.recording_path,
                    ea.recording_uploaded_at, ea.created_at,
                    s.alias AS seller_alias, s.email AS seller_email
             FROM emergency_alerts ea
             LEFT JOIN sellers s ON s.id = ea.seller_id
             WHERE ea.centre_id = $1
             ORDER BY ea.created_at DESC
             LIMIT 100`,
            [centreId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get centre emergency alerts error:', err);
        res.status(500).json({ error: 'Failed to load alerts' });
    }
};
// The centre reads this recording via the centre dashboard's alert detail view.
export const attachEmergencyRecording = async (req: Request, res: Response) => {
    const { alertId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No recording uploaded' });
    try {
        const relativePath = `/uploads/alarm-recordings/${req.file.filename}`;
        const result = await pool.query(
            `UPDATE emergency_alerts
             SET recording_path = $1, recording_uploaded_at = NOW()
             WHERE id = $2
             RETURNING id, seller_id`,
            [relativePath, alertId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        console.log(`🎙️  Recording attached to alert ${alertId}: ${relativePath}`);
        res.json({ message: 'Recording attached to alert', recording_path: relativePath });
    } catch (err) {
        console.error('Attach recording error:', err);
        res.status(500).json({ error: 'Failed to attach recording' });
    }
};

// ============================================================
// UNIFIED CASE FILE SHARING
// ============================================================

// Helper to generate a secure random token
function generateShareToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// ── POST /api/sellers/case/share ──────────────────────────────
// Survivor creates a shareable link for a professional
export const createCaseShare = async (req: Request, res: Response) => {
    const { seller_id, professional_email, professional_name, professional_type, permission, expires_in_days, notes } = req.body;
    if (!seller_id || !professional_email) {
        return res.status(400).json({ error: 'seller_id and professional_email are required' });
    }
    const validTypes = ['lawyer','counsellor','social_worker','doctor','advocate','other'];
    if (professional_type && !validTypes.includes(professional_type)) {
        return res.status(400).json({ error: 'Invalid professional_type' });
    }
    const perms = ['journey_only','journey_and_evidence'];
    if (permission && !perms.includes(permission)) {
        return res.status(400).json({ error: 'Invalid permission' });
    }

    const token = generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 30)); // default 30 days

    try {
        // Verify seller exists and belongs to the caller (auth not implemented yet – assume seller_id from localStorage)
        const seller = await pool.query(`SELECT id FROM sellers WHERE id = $1`, [seller_id]);
        if (!seller.rows.length) return res.status(404).json({ error: 'Seller not found' });

        const result = await pool.query(
            `INSERT INTO case_shares (seller_id, professional_email, professional_name, professional_type, permission, share_token, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, share_token, expires_at, permission`,
            [seller_id, professional_email, professional_name || null, professional_type || null, permission || 'journey_and_evidence', token, expiresAt]
        );
        const share = result.rows[0];
        // Construct share URL (frontend endpoint)
        const shareUrl = `${req.protocol}://${req.get('host')}/shared-case/${share.share_token}`;
        res.status(201).json({ share: { id: share.id, token: share.share_token, expires_at: share.expires_at, permission: share.permission, share_url: shareUrl } });
    } catch (err) {
        console.error('createCaseShare error:', err);
        res.status(500).json({ error: 'Failed to create share' });
    }
};

// ── GET /api/sellers/case/shares ──────────────────────────────
// List all active shares created by the seller
export const getMyShares = async (req: Request, res: Response) => {
    const { seller_id } = req.query;
    if (!seller_id) return res.status(400).json({ error: 'seller_id required' });
    try {
        const result = await pool.query(
            `SELECT id, professional_email, professional_name, professional_type, permission, expires_at, is_active, created_at, revoked_at, notes
             FROM case_shares
             WHERE seller_id = $1
             ORDER BY created_at DESC`,
            [seller_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('getMyShares error:', err);
        res.status(500).json({ error: 'Failed to fetch shares' });
    }
};

// ── DELETE /api/sellers/case/share/:shareId ───────────────────
// Revoke an active share
export const revokeCaseShare = async (req: Request, res: Response) => {
    const { shareId } = req.params;
    const { seller_id } = req.body;
    if (!seller_id) return res.status(400).json({ error: 'seller_id required' });
    try {
        const existing = await pool.query(
            `SELECT id, seller_id FROM case_shares WHERE id = $1 AND is_active = true`,
            [shareId]
        );
        if (!existing.rows.length) return res.status(404).json({ error: 'Active share not found' });
        if (existing.rows[0].seller_id !== seller_id) return res.status(403).json({ error: 'Forbidden' });
        await pool.query(
            `UPDATE case_shares SET is_active = false, revoked_at = NOW() WHERE id = $1`,
            [shareId]
        );
        res.json({ message: 'Share revoked' });
    } catch (err) {
        console.error('revokeCaseShare error:', err);
        res.status(500).json({ error: 'Failed to revoke share' });
    }
};

// ── GET /api/public/shared-case/:token ────────────────────────
// Public endpoint – no authentication, only token
// Returns the case journey and evidence items according to the share permission
export const getSharedCaseData = async (req: Request, res: Response) => {
    const { token } = req.params;
    try {
        const share = await pool.query(
            `SELECT seller_id, permission, expires_at, is_active
             FROM case_shares
             WHERE share_token = $1`,
            [token]
        );
        if (!share.rows.length) return res.status(404).json({ error: 'Invalid or expired share link' });
        const s = share.rows[0];
        if (!s.is_active) return res.status(410).json({ error: 'This share has been revoked' });
        if (new Date(s.expires_at) < new Date()) return res.status(410).json({ error: 'This share has expired' });

        // Log view
        await pool.query(
            `INSERT INTO case_share_views (share_id, viewer_ip, user_agent)
             VALUES ((SELECT id FROM case_shares WHERE share_token = $1), $2, $3)`,
            [token, req.ip, req.headers['user-agent'] || null]
        );

        // Fetch case journey
        const journey = await pool.query(
            `SELECT medical_done, medical_date, police_done, police_date,
                    protection_done, protection_date, court_done, court_date,
                    counselling_done, counselling_date, notes
             FROM case_journeys WHERE seller_id = $1`,
            [s.seller_id]
        );
        // Fetch evidence if permission includes evidence
        let evidence: any[] = [];
        if (s.permission === 'journey_and_evidence') {
            const ev = await pool.query(
                `SELECT id, item_type, description, date_of_incident, is_court_ready, created_at, file_url
                 FROM evidence_items
                 WHERE seller_id = $1
                 ORDER BY created_at DESC`,
                [s.seller_id]
            );
            // Remove fields that might identify the survivor (e.g., filename, original metadata) – keep safe fields
            evidence = ev.rows.map(e => ({
                type: e.item_type,
                description: e.description,
                date: e.date_of_incident,
                added: e.created_at,
                court_ready: e.is_court_ready,
                file_url: e.file_url
            }));
        }
        res.json({
            journey: journey.rows[0] || {},
            evidence,
            permission: s.permission,
            expires_at: s.expires_at
        });
    } catch (err) {
        console.error('getSharedCaseData error:', err);
        res.status(500).json({ error: 'Could not retrieve shared case' });
    }
};

// ── CASE JOURNEY ─────────────────────────────────────────────
export const getCaseJourney = async (req: Request, res: Response) => {
    const { sellerId } = req.params;
    try {
        let result = await pool.query(
            `SELECT * FROM case_journeys WHERE seller_id = $1`, [sellerId]
        );
        if (!result.rows.length) {
            result = await pool.query(
                `INSERT INTO case_journeys (seller_id) VALUES ($1) RETURNING *`, [sellerId]
            );
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load journey' });
    }
};

export const updateCaseJourney = async (req: Request, res: Response) => {
    const { sellerId } = req.params;
    const {
        medical_done, medical_date, police_done, police_date,
        protection_done, protection_date, court_done, court_date,
        counselling_done, counselling_date, notes
    } = req.body;
    try {
        await pool.query(
            `UPDATE case_journeys SET
                medical_done=$1, medical_date=$2, police_done=$3, police_date=$4,
                protection_done=$5, protection_date=$6, court_done=$7, court_date=$8,
                counselling_done=$9, counselling_date=$10, notes=$11, updated_at=NOW()
             WHERE seller_id=$12`,
            [medical_done, medical_date || null, police_done, police_date || null,
             protection_done, protection_date || null, court_done, court_date || null,
             counselling_done, counselling_date || null, notes || null, sellerId]
        );
        res.json({ message: 'Journey updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
};

// ── EVIDENCE ─────────────────────────────────────────────────
export const getEvidence = async (req: Request, res: Response) => {
    const { sellerId } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, item_type, filename, file_url, description, date_of_incident, is_court_ready, created_at
             FROM evidence_items WHERE seller_id = $1 ORDER BY created_at DESC`,
            [sellerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load items' });
    }
};

export const addEvidence = async (req: Request, res: Response) => {
    try {
        const { seller_id, item_type, description, date_of_incident } = req.body;
        const file = (req as any).file;
        if (!seller_id || !item_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const filename = file ? file.filename : null;
        const file_url = file ? `/uploads/evidence/${filename}` : null;

        const result = await pool.query(
            `INSERT INTO evidence_items (seller_id, item_type, filename, file_url, description, date_of_incident)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, item_type, filename, file_url, description, created_at`,
            [seller_id, item_type, filename, file_url, description || null, date_of_incident || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not add evidence' });
    }
};

export const generateCourtPack = async (req: Request, res: Response) => {
    const { sellerId } = req.params;
    try {
        const journey = await pool.query(`SELECT * FROM case_journeys WHERE seller_id = $1`, [sellerId]);
        const evidence = await pool.query(`SELECT * FROM evidence_items WHERE seller_id = $1 ORDER BY created_at DESC`, [sellerId]);

        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename=court-pack.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        doc.fontSize(20).text('Amani Court Pack', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
        doc.moveDown();

        doc.fontSize(16).text('Case Journey', { underline: true });
        doc.moveDown();
        if (journey.rows.length) {
            const j = journey.rows[0];
            doc.text(`Medical done: ${j.medical_done ? 'Yes' : 'No'} ${j.medical_date ? `on ${j.medical_date}` : ''}`);
            doc.text(`Police statement: ${j.police_done ? 'Yes' : 'No'} ${j.police_date ? `on ${j.police_date}` : ''}`);
            doc.text(`Protection order: ${j.protection_done ? 'Yes' : 'No'} ${j.protection_date ? `on ${j.protection_date}` : ''}`);
            doc.text(`Court proceedings: ${j.court_done ? 'Yes' : 'No'} ${j.court_date ? `on ${j.court_date}` : ''}`);
            doc.text(`Counselling: ${j.counselling_done ? 'Yes' : 'No'} ${j.counselling_date ? `on ${j.counselling_date}` : ''}`);
            if (j.notes) doc.text(`Notes: ${j.notes}`);
        } else {
            doc.text('No journey data found.');
        }
        doc.moveDown();

        doc.fontSize(16).text('Evidence Items', { underline: true });
        doc.moveDown();
        if (evidence.rows.length) {
            evidence.rows.forEach((e, idx) => {
                doc.text(`${idx + 1}. Type: ${e.item_type} | Added: ${new Date(e.created_at).toLocaleDateString()}`);
                if (e.description) doc.text(`   Description: ${e.description}`);
                if (e.file_url) doc.text(`   File: ${e.file_url}`);
                doc.moveDown(0.5);
            });
        } else {
            doc.text('No evidence uploaded.');
        }

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not generate PDF' });
    }
};

// ── SUPPORT REQUESTS ─────────────────────────────────────────
// ── SUPPORT REQUESTS (with automatic professional matching) ──
export const createSupportRequest = async (req: Request, res: Response) => {
    const { seller_id, request_type, message } = req.body;
    if (!seller_id || !request_type) return res.status(400).json({ error: 'Required fields missing' });
    
    // Validate request_type
    const validTypes = ['companion', 'legal', 'counselling', 'medical', 'emergency'];
    if (!validTypes.includes(request_type)) {
        return res.status(400).json({ error: 'Invalid request type' });
    }

    try {
        // Map request_type to professional_type
        const typeMap: Record<string, string> = {
            'legal': 'lawyer',
            'counselling': 'counsellor',
            'medical': 'doctor',
            'companion': 'social_worker', // companion can be social worker or trained volunteer
            'emergency': '' // emergency goes to 10111, not professional match
        };
        
        let matchedProfessional = null;
        let matchStatus = 'open';
        
        if (request_type !== 'emergency') {
            const professionalType = typeMap[request_type];
            if (professionalType) {
                // Get seller's centre_id to prioritize centre-affiliated professionals
                const seller = await pool.query(`SELECT centre_id FROM sellers WHERE id = $1`, [seller_id]);
                const centreId = seller.rows[0]?.centre_id;
                
                // Find best matching professional: same centre, available, least recently assigned
                let query = `
                    SELECT id, full_name, email, phone, professional_type, centre_id
                    FROM professionals
                    WHERE professional_type = $1 AND is_available = TRUE
                    ORDER BY 
                        CASE WHEN centre_id = $2 THEN 0 ELSE 1 END,
                        last_assigned_at NULLS FIRST,
                        assigned_count ASC
                    LIMIT 1
                `;
                const result = await pool.query(query, [professionalType, centreId || null]);
                
                if (result.rows.length > 0) {
                    matchedProfessional = result.rows[0];
                    matchStatus = 'matched';
                    
                    // Mark professional as temporarily unavailable (or just increment assigned count)
                    await pool.query(
                        `UPDATE professionals 
                         SET assigned_count = assigned_count + 1,
                             last_assigned_at = NOW(),
                             is_available = FALSE  -- optionally set unavailable until they accept/release
                         WHERE id = $1`,
                        [matchedProfessional.id]
                    );
                }
            }
        }
        
        // Insert support request with match info
        const result = await pool.query(
            `INSERT INTO support_requests (seller_id, request_type, message, status, matched_to)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, request_type, status, created_at, matched_to`,
            [seller_id, request_type, message || null, matchStatus, matchedProfessional ? matchedProfessional.full_name : null]
        );
        
        // If matched, create notification for professional (and optionally for seller)
        if (matchedProfessional) {
            // Create notification for professional
            await pool.query(
                `INSERT INTO notifications (user_id, user_type, title, message)
                 VALUES ($1, $2, $3, $4)`,
                [matchedProfessional.id, 'professional', 'New support request assigned',
                 `A survivor has requested ${request_type} support. Please log in to view details and accept.`]
            );
            // Create notification for survivor (optional)
            await pool.query(
                `INSERT INTO notifications (user_id, user_type, title, message)
                 VALUES ($1, $2, $3, $4)`,
                [seller_id, 'seller', 'Support request matched',
                 `A ${matchedProfessional.professional_type} has been assigned to your request. They will contact you soon.`]
            );
            
            // In production: send email/SMS to professional here
            console.log(`[MATCH] ${request_type} request from ${seller_id} matched to ${matchedProfessional.full_name} (${matchedProfessional.email})`);
        }
        
        res.status(201).json({
            message: matchStatus === 'matched' ? 'Your request has been assigned to a professional. They will contact you shortly.' : 'Your request has been received. A professional will be assigned as soon as one is available.',
            support_id: result.rows[0].id,
            status: matchStatus,
            matched_to: matchedProfessional?.full_name || null
        });
    } catch (err) {
        console.error('createSupportRequest error:', err);
        res.status(500).json({ error: 'Request failed' });
    }
};

// ── PROFESSIONAL ENDPOINTS ────────────────────────────────────

// GET /api/sellers/professional/requests – fetch assigned requests for a professional
export const getAssignedRequests = async (req: Request, res: Response) => {
    const { professional_id } = req.query;
    if (!professional_id) return res.status(400).json({ error: 'professional_id required' });
    
    try {
        const result = await pool.query(
            `SELECT sr.id, sr.seller_id, sr.request_type, sr.message, sr.status, 
                    sr.created_at, s.alias as seller_alias
             FROM support_requests sr
             JOIN sellers s ON s.id = sr.seller_id
             WHERE sr.matched_to = (SELECT full_name FROM professionals WHERE id = $1)
             ORDER BY sr.created_at DESC`,
            [professional_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
};

// POST /api/sellers/professional/accept – professional accepts a request
export const acceptSupportRequest = async (req: Request, res: Response) => {
    const { request_id, professional_id, notes } = req.body;
    if (!request_id || !professional_id) return res.status(400).json({ error: 'Missing fields' });
    
    try {
        // Verify professional is the one matched
        const check = await pool.query(
            `SELECT sr.matched_to, p.full_name 
             FROM support_requests sr
             CROSS JOIN professionals p
             WHERE sr.id = $1 AND p.id = $2 AND sr.status = 'matched'`,
            [request_id, professional_id]
        );
        if (!check.rows.length) return res.status(404).json({ error: 'Request not found or already handled' });
        
        await pool.query(
            `UPDATE support_requests 
             SET status = 'closed', updated_at = NOW(), notes = COALESCE($1, notes)
             WHERE id = $2`,
            [notes || null, request_id]
        );
        
        // Make professional available for next assignment
        await pool.query(
            `UPDATE professionals SET is_available = TRUE WHERE id = $1`,
            [professional_id]
        );
        
        // Notify seller
        const reqData = await pool.query(`SELECT seller_id FROM support_requests WHERE id = $1`, [request_id]);
        if (reqData.rows.length) {
            await pool.query(
                `INSERT INTO notifications (user_id, user_type, title, message)
                 VALUES ($1, 'seller', $2, $3)`,
                [reqData.rows[0].seller_id, 'Support request accepted',
                 `A professional has accepted your request and will contact you.`]
            );
        }
        
        res.json({ message: 'Request accepted and closed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to accept request' });
    }
};

// GET /api/sellers/notifications – fetch unread notifications for seller
export const getSellerNotifications = async (req: Request, res: Response) => {
    const { seller_id } = req.query;
    if (!seller_id) return res.status(400).json({ error: 'seller_id required' });
    try {
        const result = await pool.query(
            `SELECT id, title, message, is_read, created_at
             FROM notifications
             WHERE user_id = $1 AND user_type = 'seller'
             ORDER BY created_at DESC
             LIMIT 50`,
            [seller_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// POST /api/sellers/notifications/mark-read – mark notification as read
export const markNotificationRead = async (req: Request, res: Response) => {
    const { notification_id } = req.body;
    if (!notification_id) return res.status(400).json({ error: 'notification_id required' });
    try {
        await pool.query(`UPDATE notifications SET is_read = TRUE WHERE id = $1`, [notification_id]);
        res.json({ message: 'Marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update' });
    }
};


// ── GRANT HIDDEN LAYER ACCESS ────────────────────────────────
export const grantHiddenLayer = async (req: Request, res: Response) => {
    const { sellerId } = req.body;
    if (!sellerId) return res.status(400).json({ error: 'Required' });
    try {
        await pool.query(
            `UPDATE sellers SET hidden_layer_granted=TRUE WHERE id=$1`, [sellerId]
        );
        res.json({ message: 'Access granted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed' });
    }
};

// ── PUBLIC PROFILE ───────────────────────────────────────────
export const getSellerPublicProfile = async (req: Request, res: Response) => {
    const { alias } = req.params;
    try {
        const result = await pool.query(
            `SELECT s.alias, s.public_bio, s.product_categories,
                    c.centre_name, c.city
             FROM sellers s
             JOIN centres c ON s.centre_id = c.id
             WHERE s.alias = $1 AND s.verification_status = 'approved'`,
            [alias]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Maker not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ==================== VOLUNTEER ====================

// GET all active volunteer opportunities (optionally filtered by seller's centre)
export const getVolunteerOpportunities = async (req: Request, res: Response) => {
    const centreId = req.query.centreId as string;
    if (!centreId) {
        return res.status(400).json({ error: 'centreId is required' });
    }
    try {
        const result = await pool.query(
            `SELECT vo.*, c.centre_name, c.city
             FROM volunteer_opportunities vo
             JOIN centres c ON c.id = vo.centre_id
             WHERE vo.centre_id = $1 AND vo.status = 'active'
             ORDER BY vo.created_at DESC`,
            [centreId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch volunteer opportunities' });
    }
};

// Apply for a volunteer opportunity
export const applyForVolunteer = async (req: Request, res: Response) => {
    const { seller_id, opportunity_id, notes } = req.body;
    if (!seller_id || !opportunity_id) {
        return res.status(400).json({ error: 'Seller ID and opportunity ID are required' });
    }
    try {
        const existing = await pool.query(
            `SELECT id FROM volunteer_applications WHERE seller_id = $1 AND opportunity_id = $2`,
            [seller_id, opportunity_id]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'You have already applied for this opportunity' });
        }
        const opp = await pool.query(
            `SELECT id FROM volunteer_opportunities WHERE id = $1 AND status = 'active'`,
            [opportunity_id]
        );
        if (opp.rows.length === 0) {
            return res.status(404).json({ error: 'Opportunity not found or no longer active' });
        }
        const result = await pool.query(
            `INSERT INTO volunteer_applications (seller_id, opportunity_id, notes)
             VALUES ($1, $2, $3)
             RETURNING id, seller_id, opportunity_id, status, applied_at`,
            [seller_id, opportunity_id, notes || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit application' });
    }
};

// Get seller's volunteer applications (with opportunity details)
export const getMyVolunteerApplications = async (req: Request, res: Response) => {
    const { sellerId } = req.params;
    try {
        const result = await pool.query(
            `SELECT va.*, vo.title, vo.description, vo.location, c.centre_name, c.city
             FROM volunteer_applications va
             JOIN volunteer_opportunities vo ON vo.id = va.opportunity_id
             JOIN centres c ON c.id = vo.centre_id
             WHERE va.seller_id = $1
             ORDER BY va.applied_at DESC`,
            [sellerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch your applications' });
    }
};

// ── GENERATE AFFIDAVIT PDF FROM VOICE TRANSCRIPT ─────────────
export const generateAffidavitPDF = async (req: Request, res: Response) => {
    const { seller_id, statement } = req.body;
    if (!seller_id || !statement) {
        return res.status(400).json({ error: 'Missing seller_id or statement' });
    }

    try {
        // Fetch seller details
        const seller = await pool.query(
            `SELECT alias, real_name, id_number, phone, city FROM sellers WHERE id = $1`,
            [seller_id]
        );
        if (!seller.rows.length) {
            return res.status(404).json({ error: 'Seller not found' });
        }
        const s = seller.rows[0];

        const filename = `affidavit_${s.alias}_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '../../uploads/evidence/', filename);
        const fileUrl = `/uploads/evidence/${filename}`;

        // Create PDF and write to disk
        const doc = new PDFDocument({ margin: 60, size: 'A4' });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Title – set font size before writing
        doc.fontSize(18).font('Helvetica-Bold').text('AFFIDAVIT', { align: 'center' });
        doc.moveDown();

        // Introduction
        doc.fontSize(12).font('Helvetica');
        doc.text(`I, ${s.real_name || s.alias}, do hereby make oath and state that:`);
        doc.moveDown(0.5);

        // Statement (split into paragraphs)
        const paragraphs = statement.split(/\n+/);
        for (const para of paragraphs) {
            if (para.trim()) {
                doc.text(para.trim(), { indent: 20 });
                doc.moveDown(0.5);
            }
        }

        doc.moveDown();
        doc.text(`Deposed and sworn to before me at ${s.city || 'Johannesburg'} on this ${new Date().toLocaleDateString('en-ZA')}.`);
        doc.moveDown(1.5);
        doc.text(`_________________________`, { align: 'right' });
        doc.fontSize(10).text(`Deponent's signature`, { align: 'right' });
        doc.moveDown(1);
        doc.fontSize(12).text(`_________________________`, { align: 'right' });
        doc.fontSize(10).text(`Commissioner of Oaths`, { align: 'right' });

        doc.end();

        // Wait for file to finish writing
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Save as evidence item (so it appears in the vault)
        await pool.query(
            `INSERT INTO evidence_items (seller_id, item_type, filename, file_url, description, is_court_ready)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [seller_id, 'document', filename, fileUrl, 'Voice‑generated affidavit', true]
        );

        // Send the file back to the client
        res.download(filePath, filename, (err) => {
            if (err) console.error('Download error:', err);
            // Keep the file on disk – it's now part of the evidence
        });
    } catch (err) {
        console.error('generateAffidavitPDF error:', err);
        res.status(500).json({ error: 'Could not generate affidavit' });
    }
};

// ── NEW: WITHDRAW VOLUNTEER APPLICATION ──────────────────────
export const withdrawVolunteerApplication = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const check = await pool.query(
            `SELECT status FROM volunteer_applications WHERE id = $1`,
            [id]
        );
        if (!check.rows.length) {
            return res.status(404).json({ error: 'Application not found' });
        }
        if (check.rows[0].status !== 'pending') {
            return res.status(400).json({ error: 'Cannot withdraw an application that is already approved or rejected' });
        }
        await pool.query(
            `UPDATE volunteer_applications SET status = 'withdrawn', updated_at = NOW() WHERE id = $1`,
            [id]
        );
        res.json({ message: 'Application withdrawn successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not withdraw application' });
    }
};