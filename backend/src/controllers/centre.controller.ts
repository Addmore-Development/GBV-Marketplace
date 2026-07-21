// ============================================================
// backend/src/controllers/centre.controller.ts
// ============================================================
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../index';
import { logActivity, getClientIp } from '../utils/activityLog';

// ─── REGISTER A CENTRE ──────────────────────────────────────
export const registerCentre = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Required document check
    const requiredDocs = ['npo_certificate', 'id_document', 'proof_of_address'];
    for (const doc of requiredDocs) {
      if (!files[doc]?.length) {
        return res.status(400).json({
          error: `Missing required document: ${doc.replace(/_/g, ' ')}`,
        });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Parse array fields sent as JSON strings from FormData
    const parseArr = (val: string | string[]) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return [val]; }
    };

    await client.query('BEGIN');

    // Insert centre
    const centreResult = await client.query(
      `INSERT INTO centres (
        centre_type, centre_name, registration_number, npo_number, dsd_number,
        tax_exemption_number, year_established,
        contact_person_name, contact_person_role, contact_email, contact_phone,
        whatsapp_number, website_url,
        physical_address, suburb, city, province, postal_code,
        gps_latitude, gps_longitude, is_address_public,
        description, mission_statement, vision_statement, core_values,
        services_offered, target_population, languages_spoken,
        capacity_total, is_24_hour, operating_hours,
        referral_process, intake_process,
        has_trained_staff, staff_training_description,
        has_security_measures, security_description,
        emergency_protocol, confidentiality_policy,
        has_shelter, shelter_capacity,
        provides_legal_support, provides_medical_support,
        provides_counselling, provides_court_support,
        law_enforcement_partnership,
        age_range_min, age_range_max, education_programs,
        care_level, medical_facilities,
        success_stories, awards_recognition, key_partnerships,
        annual_beneficiaries, password_hash
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,
        $35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,
        $51,$52,$53,$54,$55,$56,$57
      ) RETURNING id, centre_name, status`,
      [
        body.centre_type, body.centre_name, body.registration_number || null,
        body.npo_number || null, body.dsd_number || null,
        body.tax_exemption_number || null,
        body.year_established ? parseInt(body.year_established) : null,
        body.contact_person_name, body.contact_person_role,
        body.contact_email, body.contact_phone,
        body.whatsapp_number || null, body.website_url || null,
        body.physical_address, body.suburb, body.city, body.province, body.postal_code,
        body.gps_latitude || null, body.gps_longitude || null,
        body.is_address_public !== 'false',
        body.description, body.mission_statement,
        body.vision_statement || null, body.core_values || null,
        parseArr(body.services_offered),
        parseArr(body.target_population),
        parseArr(body.languages_spoken),
        body.capacity_total ? parseInt(body.capacity_total) : null,
        body.is_24_hour === 'true',
        body.operating_hours ? JSON.parse(body.operating_hours) : null,
        body.referral_process || null, body.intake_process || null,
        body.has_trained_staff === 'true',
        body.staff_training_description || null,
        body.has_security_measures === 'true',
        body.security_description || null,
        body.emergency_protocol || null, body.confidentiality_policy || null,
        body.has_shelter === 'true',
        body.shelter_capacity ? parseInt(body.shelter_capacity) : null,
        body.provides_legal_support === 'true',
        body.provides_medical_support === 'true',
        body.provides_counselling === 'true',
        body.provides_court_support === 'true',
        body.law_enforcement_partnership || null,
        body.age_range_min ? parseInt(body.age_range_min) : null,
        body.age_range_max ? parseInt(body.age_range_max) : null,
        body.education_programs || null,
        body.care_level || null, body.medical_facilities || null,
        body.success_stories || null, body.awards_recognition || null,
        body.key_partnerships || null,
        body.annual_beneficiaries ? parseInt(body.annual_beneficiaries) : null,
        passwordHash,
      ]
    );

    const centre = centreResult.rows[0];

    // Insert documents
    for (const [fieldName, fileArray] of Object.entries(files)) {
      for (const file of fileArray) {
        await client.query(
          `INSERT INTO centre_documents (centre_id, document_type, file_name, file_path, file_size, mime_type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [centre.id, fieldName, file.originalname, file.path, file.size, file.mimetype]
        );
      }
    }

    // Audit log
    await client.query(
      `INSERT INTO centre_audit_log (centre_id, action, performed_by_type, details)
       VALUES ($1, 'registered', 'centre', $2)`,
      [centre.id, JSON.stringify({ ip: req.ip })]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Registration submitted successfully. Your application is under review.',
      centre_id: centre.id,
      centre_name: centre.centre_name,
      status: centre.status,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A centre with this email is already registered.' });
    }
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    client.release();
  }
};

// ─── GET STATUS ─────────────────────────────────────────────
export const getCentreStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, centre_name, status, rejection_reason, created_at, approved_at
       FROM centres WHERE id = $1`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Centre not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── ADMIN: GET PENDING ──────────────────────────────────────
export const adminGetPending = async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const result = await pool.query(
      `SELECT c.id, c.centre_name, c.centre_type, c.contact_email,
              c.city, c.province, c.status, c.created_at,
              COUNT(cd.id) as document_count
       FROM centres c
       LEFT JOIN centre_documents cd ON cd.centre_id = c.id
       WHERE c.status = $1
       GROUP BY c.id
       ORDER BY c.created_at ASC`,
      [status]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── ADMIN: APPROVE / REJECT ─────────────────────────────────
export const adminReviewCentre = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { action, rejection_reason, admin_notes } = req.body;
    const adminId = (req as any).admin?.id;

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approved or rejected' });
    }

    await client.query('BEGIN');

    await client.query(
      `UPDATE centres SET
        status = $1,
        rejection_reason = $2,
        admin_notes = $3,
        reviewed_by = $4,
        reviewed_at = NOW(),
        approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END
       WHERE id = $5`,
      [action, rejection_reason || null, admin_notes || null, adminId, id]
    );

    await client.query(
      `INSERT INTO centre_audit_log (centre_id, action, performed_by, performed_by_type, details)
       VALUES ($1, $2, $3, 'admin', $4)`,
      [id, action, adminId, JSON.stringify({ rejection_reason, admin_notes })]
    );

    await client.query('COMMIT');
    return res.json({ message: `Centre ${action} successfully` });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};
// ─── LOGIN ────────────────────────────────────────────────────
export const loginCentre = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const result = await pool.query(
      `SELECT id, centre_name, centre_type, contact_email, contact_person_name,
              city, province, contact_phone, npo_number, password_hash, status
       FROM centres WHERE contact_email = $1`,
      [email]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid email or password' });
    const centre = result.rows[0];
    const isValid = await bcrypt.compare(password, centre.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

    await logActivity('centre', centre.id, centre.centre_name, centre.contact_email, 'login', getClientIp(req));

    return res.json({
      centre_id: centre.id,
      centre_name: centre.centre_name,
      centre_type: centre.centre_type,
      contact_email: centre.contact_email,
      contact_person_name: centre.contact_person_name,
      city: centre.city,
      province: centre.province,
      contact_phone: centre.contact_phone,
      npo_number: centre.npo_number,
      status: centre.status,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────
export const logoutCentre = async (req: Request, res: Response) => {
  const { centre_id, centre_name, contact_email } = req.body || {};
  if (!centre_id) return res.status(400).json({ error: 'centre_id required' });
  await logActivity('centre', centre_id, centre_name || null, contact_email || null, 'logout', getClientIp(req));
  return res.json({ ok: true });
};

// ─── GET ALL CENTRES (public listing) ────────────────────────
export const getAllCentres = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        COALESCE(centre_name, '')       AS name,
        COALESCE(centre_type::text, '') AS type,
        COALESCE(city, '')              AS city,
        COALESCE(province, '')          AS province,
        COALESCE(suburb, city, '')      AS suburb,
        COALESCE(description, '')       AS description,
        COALESCE(mission_statement, '') AS mission,
        COALESCE(services_offered, '{}') AS services,
        COALESCE(languages_spoken, '{}') AS languages,
        COALESCE(is_24_hour, false)          AS is_24_hour,
        COALESCE(has_shelter, false)         AS has_shelter,
        COALESCE(provides_counselling, false) AS provides_counselling,
        COALESCE(provides_legal_support, false) AS provides_legal_support,
        COALESCE(capacity_total, 0)     AS capacity,
        COALESCE(contact_email, '')     AS contact_email,
        COALESCE(contact_phone, '')     AS contact_phone,
        COALESCE(whatsapp_number, '')   AS whatsapp,
        COALESCE(website_url, '')       AS website,
        COALESCE(year_established, 0)   AS year_established,
        COALESCE(annual_beneficiaries, 0) AS beneficiaries_per_year,
        status::text                    AS status,
        (status = 'approved')           AS verified
       FROM centres
       WHERE status IN ('approved', 'pending', 'under_review')
       ORDER BY centre_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getAllCentres error:', err);
    res.status(500).json({ error: 'Failed to fetch centres' });
  }
};