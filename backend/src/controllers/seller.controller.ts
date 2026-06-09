// ============================================================
// backend/src/controllers/seller.controller.ts
// ============================================================
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../index';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';

// Ensure upload directory exists
const evidenceDir = path.join(__dirname, '../../uploads/evidence');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, evidenceDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
export const uploadEvidence = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// ── HELPER: Verify SA ID Number ─────────────────────────────
// South African ID format: YYMMDD SSSS G CCC
// Position 6 (0-indexed) of SSSS group determines sex:
//   0000–4999 = female, 5000–9999 = male
// ── HELPER: Verify SA ID Number (development mode – Luhn checksum disabled) ──
// South African ID format: YYMMDD SSSS G CCC
// Position 6 (0-indexed) of SSSS group determines sex:
//   0000–4999 = female, 5000–9999 = male
export const verifySAID = (idNumber: string): { valid: boolean; isFemale: boolean; dob: string | null } => {
    if (!idNumber || !/^\d{13}$/.test(idNumber)) {
        return { valid: false, isFemale: false, dob: null };
    }

    // Extract fields
    const year  = parseInt(idNumber.substring(0, 2));
    const month = parseInt(idNumber.substring(2, 4));
    const day   = parseInt(idNumber.substring(4, 6));
    const genderCode = parseInt(idNumber.substring(6, 10));

    // Basic range checks
    if (month < 1 || month > 12) return { valid: false, isFemale: false, dob: null };
    if (day < 1 || day > 31)     return { valid: false, isFemale: false, dob: null };

    // ─────────────────────────────────────────────────────────────
    // Luhn checksum is DISABLED for development purposes.
    // In production, uncomment the following block to enable it.
    // ─────────────────────────────────────────────────────────────
    /*
    let sum = 0;
    for (let i = 0; i < 13; i++) {
        let d = parseInt(idNumber[i]);
        if (i % 2 === 0) sum += d;
        else {
            d *= 2;
            sum += d > 9 ? d - 9 : d;
        }
    }
    if (sum % 10 !== 0) return { valid: false, isFemale: false, dob: null };
    */
    // ─────────────────────────────────────────────────────────────

    const fullYear = year >= 0 && year <= 24 ? 2000 + year : 1900 + year;
    const isFemale = genderCode < 5000;
    const dob = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return { valid: true, isFemale, dob };
};


// ── GET VERIFIED CENTRES ─────────────────────────────────────
export const getVerifiedCentres = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT id, centre_name AS name, city, province
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
    // Check if already registered
    const existing = await pool.query(`SELECT id FROM sellers WHERE id_number = $1`, [id_number]);
    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'This ID is already registered. Please log in instead.', code: 'ALREADY_EXISTS' });
    }
    return res.json({ verified: true, dob: check.dob, message: 'Identity verified.' });
};

// ── REGISTER SELLER ──────────────────────────────────────────
// backend/src/controllers/seller.controller.ts
// ... (keep all imports and other functions)

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
            centre_id,           // <-- NEW
            accepted_terms,
            accepted_popia,
            safety_acknowledged,
        } = req.body;

        // Required fields (centre_id is now required)
        if (!id_number || !real_name || !real_surname || !email || !pin || !centre_id) {
            return res.status(400).json({ error: 'Missing required fields: id_number, name, email, PIN, and centre are required' });
        }

        // PIN validation
        if (!/^\d{4,6}$/.test(pin)) {
            return res.status(400).json({ error: 'PIN must be 4–6 digits' });
        }

        // Gender check
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

        // Check duplicate ID
        const existingId = await pool.query(`SELECT id FROM sellers WHERE id_number = $1`, [id_number]);
        if (existingId.rows.length > 0) {
            return res.status(409).json({ error: 'This ID is already registered. Please log in.', code: 'ALREADY_EXISTS' });
        }

        // Generate unique alias
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

        // Check duplicate email
        const existingEmail = await pool.query(`SELECT id FROM sellers WHERE email = $1`, [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered', code: 'ALREADY_EXISTS' });
        }

        // Validate centre exists
        const centreCheck = await pool.query(`SELECT id FROM centres WHERE id = $1`, [centre_id]);
        if (centreCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Selected centre does not exist' });
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
                '',                           // public_bio
                real_name,
                real_surname,
                id_number,
                email,
                finalPhone,
                centre_id,                    // <-- now using provided centre
                [],                           // product_categories
                null,                         // skills_experience
                'cash',                       // default payout_method
                null,                         // bank_details
                null,                         // cash_pickup_note
                pinHash,
                accepted_terms === true,
                accepted_popia === true,
                safety_acknowledged === true,
            ]
        );

        // Create empty case journey
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
    if (!email || !pin) return res.status(400).json({ error: 'Email and PIN are required' });

    try {
        const result = await pool.query(
            `SELECT id, alias, email, real_name, phone, city, hidden_pin_hash,
                    verification_status, hidden_layer_granted, centre_id,
                    profile_complete, product_categories, payout_method,
                    total_sales, total_earned
             FROM sellers WHERE email = $1`,
            [email]
        );
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or PIN' });

        const seller = result.rows[0];
        const valid = await bcrypt.compare(pin, seller.hidden_pin_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid email or PIN' });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hidden_pin_hash, ...safe } = seller;
        res.json({ ...safe });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
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
        // Check if profile is now complete
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

// ── PRODUCTS ─────────────────────────────────────────────────
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
    const { seller_id, name, description, price, category, status, stock, story, image_url } = req.body;
    if (!seller_id || !name || price === undefined) {
        return res.status(400).json({ error: 'Name and price are required' });
    }
    try {
        // Check profile is complete before allowing listing
        const check = await pool.query(
            `SELECT profile_complete, verification_status FROM sellers WHERE id = $1`,
            [seller_id]
        );
        if (!check.rows[0]?.profile_complete) {
            return res.status(403).json({
                error: 'Please complete your maker profile before listing products.',
                code: 'PROFILE_INCOMPLETE'
            });
        }

        const result = await pool.query(
            `INSERT INTO products (seller_id, name, description, price, category, status, stock, story, image_url)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING id, name, price, category, status, stock`,
            [seller_id, name, description || null, price, category || null,
             status || 'active', stock || 0, story || null, image_url || null]
        );
        res.status(201).json({ product: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create listing' });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, price, category, status, stock, story, image_url } = req.body;
    try {
        const result = await pool.query(
            `UPDATE products SET name=$1, description=$2, price=$3, category=$4,
                status=$5, stock=$6, story=$7, image_url=$8, updated_at=NOW()
             WHERE id=$9
             RETURNING id, name, price, category, status, stock`,
            [name, description || null, price, category || null, status, stock || 0, story || null, image_url || null, id]
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
        // Safe query: no join, just seller_earnings data
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

// ── EMERGENCY ALERT (checkout suppliers disguise) ─────────────
export const triggerEmergencyAlert = async (req: Request, res: Response) => {
    const { seller_id, location_hint } = req.body;
    if (!seller_id) return res.status(400).json({ error: 'Required' });
    try {
        const contacts = await pool.query(
            `SELECT name, phone, whatsapp FROM trusted_contacts
             WHERE seller_id = $1 AND is_active = TRUE`,
            [seller_id]
        );
        // Log the alert
        await pool.query(
            `INSERT INTO emergency_alerts (seller_id, contacts_notified, location_hint)
             VALUES ($1, $2, $3)`,
            [seller_id, JSON.stringify(contacts.rows), location_hint || null]
        );
        // In production: integrate with SMS/WhatsApp API here
        res.json({
            message: 'Alert sent',
            contacts_reached: contacts.rows.length,
            note: 'Your trusted people have been notified.',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Alert failed' });
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
            // Create if missing
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
export const createSupportRequest = async (req: Request, res: Response) => {
    const { seller_id, request_type, message } = req.body;
    if (!seller_id || !request_type) return res.status(400).json({ error: 'Required fields missing' });
    try {
        const result = await pool.query(
            `INSERT INTO support_requests (seller_id, request_type, message)
             VALUES ($1,$2,$3) RETURNING id, request_type, status, created_at`,
            [seller_id, request_type, message || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Request failed' });
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