require('dotenv').config();
const { Client } = require('pg');

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;

const adminClient = new Client({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: 'postgres',
});

// Helper to safely create an index only if the column exists
async function safeCreateIndex(client, indexName, tableName, columnName) {
  const checkCol = await client.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
  `, [tableName, columnName]);
  if (checkCol.rows.length === 0) {
    console.log(`⚠️  Skipping index ${indexName} – column ${columnName} does not exist in ${tableName}`);
    return;
  }
  try {
    await client.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnName})`);
    console.log(`✅ Index ${indexName} created`);
  } catch (err) {
    console.log(`⚠️  Could not create index ${indexName}: ${err.message}`);
  }
}

async function initDatabase() {
  try {
    await adminClient.connect();
    try {
      await adminClient.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`✅ Database "${DB_NAME}" created`);
    } catch (err) {
      if (err.code === '42P04') {
        console.log(`⚠️  Database "${DB_NAME}" already exists — continuing`);
      } else {
        throw err;
      }
    }
    await adminClient.end();

    const dbClient = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });
    await dbClient.connect();

    // ── Extensions ─────────────────────────────────────────────────────────
    await dbClient.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    console.log('✅ UUID extension enabled');

    // ── Shared updated_at trigger function ─────────────────────────────────
    await dbClient.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ update_updated_at() function ready');

    // ── ENUMs ───────────────────────────────────────────────────────────────
    await dbClient.query(`
      DO $$ BEGIN
        CREATE TYPE centre_type AS ENUM ('gbv_centre','orphanage','old_age_home');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE centre_status AS ENUM ('pending','under_review','approved','rejected','suspended');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE document_type AS ENUM (
          'npo_certificate','dsd_registration','id_document','proof_of_address',
          'bank_statement','site_photos','reference_letter','annual_report',
          'constitution','tax_exemption'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    console.log('✅ ENUM types created');

    // ══════════════════════════════════════════════════════════════════════
    // CENTRES
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS centres (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        centre_type centre_type NOT NULL,
        centre_name VARCHAR(255) NOT NULL,
        registration_number VARCHAR(100),
        npo_number VARCHAR(100),
        dsd_number VARCHAR(100),
        tax_exemption_number VARCHAR(100),
        year_established INTEGER,
        contact_person_name VARCHAR(255) NOT NULL,
        contact_person_role VARCHAR(100) NOT NULL,
        contact_email VARCHAR(255) NOT NULL UNIQUE,
        contact_phone VARCHAR(20) NOT NULL,
        whatsapp_number VARCHAR(20),
        website_url VARCHAR(500),
        physical_address TEXT NOT NULL,
        suburb VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        province VARCHAR(100) NOT NULL,
        postal_code VARCHAR(10) NOT NULL,
        gps_latitude DECIMAL(10,8),
        gps_longitude DECIMAL(11,8),
        is_address_public BOOLEAN DEFAULT true,
        description TEXT NOT NULL,
        mission_statement TEXT NOT NULL,
        vision_statement TEXT,
        core_values TEXT,
        services_offered TEXT[] NOT NULL,
        target_population TEXT[] NOT NULL,
        languages_spoken TEXT[] NOT NULL,
        capacity_total INTEGER,
        capacity_available INTEGER,
        is_24_hour BOOLEAN DEFAULT false,
        operating_hours JSONB,
        referral_process TEXT,
        intake_process TEXT,
        has_trained_staff BOOLEAN DEFAULT false,
        staff_training_description TEXT,
        has_security_measures BOOLEAN DEFAULT false,
        security_description TEXT,
        emergency_protocol TEXT,
        confidentiality_policy TEXT,
        has_shelter BOOLEAN DEFAULT false,
        shelter_capacity INTEGER,
        provides_legal_support BOOLEAN DEFAULT false,
        provides_medical_support BOOLEAN DEFAULT false,
        provides_counselling BOOLEAN DEFAULT false,
        provides_court_support BOOLEAN DEFAULT false,
        law_enforcement_partnership TEXT,
        age_range_min INTEGER,
        age_range_max INTEGER,
        education_programs TEXT,
        care_level VARCHAR(50),
        medical_facilities TEXT,
        success_stories TEXT,
        awards_recognition TEXT,
        key_partnerships TEXT,
        annual_beneficiaries INTEGER,
        accepts_goods BOOLEAN DEFAULT true,
        section18a BOOLEAN DEFAULT false,
        marketplace_active BOOLEAN DEFAULT false,
        status centre_status DEFAULT 'pending',
        rejection_reason TEXT,
        admin_notes TEXT,
        reviewed_by UUID,
        reviewed_at TIMESTAMPTZ,
        verification_site_visit_date DATE,
        approved_at TIMESTAMPTZ,
        password_hash VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT false,
        email_verification_token VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Safe column additions for existing installations
    const centreExtras = [
      'accepts_goods BOOLEAN DEFAULT true',
      'section18a BOOLEAN DEFAULT false',
      'marketplace_active BOOLEAN DEFAULT false',
    ];
    for (const col of centreExtras) {
      const name = col.split(' ')[0];
      await dbClient.query(`ALTER TABLE centres ADD COLUMN IF NOT EXISTS ${col};`).catch(() => {});
    }
    console.log('✅ Centres table ready');

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS centre_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
        document_type document_type NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        is_verified BOOLEAN DEFAULT false,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Centre documents table ready');

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Admin users table ready');

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS centre_audit_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        performed_by UUID,
        performed_by_type VARCHAR(20) DEFAULT 'admin',
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Audit log table ready');

    // ══════════════════════════════════════════════════════════════════════
    // SELLERS (makers / survivors)
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS sellers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        alias VARCHAR(100) NOT NULL UNIQUE,
        public_bio TEXT,
        product_categories TEXT[] DEFAULT '{}',
        real_name VARCHAR(100) NOT NULL,
        real_surname VARCHAR(100) NOT NULL,
        id_number VARCHAR(13) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        address TEXT,
        suburb VARCHAR(100),
        city VARCHAR(100),
        province VARCHAR(100),
        centre_id UUID REFERENCES centres(id) ON DELETE RESTRICT,
        skills_experience TEXT,
        craft_story TEXT,
        photo_url VARCHAR(500),
        languages TEXT[] DEFAULT '{}',
        availability VARCHAR(50),
        social_handle VARCHAR(100),
        payout_method VARCHAR(20) CHECK (payout_method IN ('eft','cash')),
        bank_details JSONB,
        cash_pickup_note TEXT,
        hidden_pin_hash VARCHAR(255) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        verification_status VARCHAR(50) DEFAULT 'pending',
        hidden_layer_granted BOOLEAN DEFAULT FALSE,
        profile_complete BOOLEAN DEFAULT FALSE,
        accepted_terms BOOLEAN DEFAULT FALSE,
        accepted_popia BOOLEAN DEFAULT FALSE,
        safety_acknowledged BOOLEAN DEFAULT FALSE,
        total_sales INTEGER DEFAULT 0,
        total_earned DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const sellerCols = [
      'address TEXT', 'suburb VARCHAR(100)', 'city VARCHAR(100)', 'province VARCHAR(100)',
      'profile_complete BOOLEAN DEFAULT FALSE', 'craft_story TEXT', 'photo_url VARCHAR(500)',
      'languages TEXT[]', 'availability VARCHAR(50)', 'social_handle VARCHAR(100)',
      'total_sales INTEGER DEFAULT 0', 'total_earned DECIMAL(10,2) DEFAULT 0',
      'accepted_terms BOOLEAN DEFAULT FALSE', 'accepted_popia BOOLEAN DEFAULT FALSE',
      'safety_acknowledged BOOLEAN DEFAULT FALSE', 'hidden_layer_granted BOOLEAN DEFAULT FALSE',
      'is_verified BOOLEAN DEFAULT FALSE',
    ];
    for (const col of sellerCols) {
      await dbClient.query(`ALTER TABLE sellers ADD COLUMN IF NOT EXISTS ${col};`).catch(() => {});
    }

    // ──────────────────────────────────────────────────────────────────────
    // Fix any existing NOT NULL constraints on columns that should be nullable
    // ──────────────────────────────────────────────────────────────────────
    const nullableTextCols = [
      'public_bio', 'skills_experience', 'craft_story', 'photo_url',
      'languages', 'availability', 'social_handle', 'address', 'suburb', 'city', 'province'
    ];
    for (const col of nullableTextCols) {
      await dbClient.query(`ALTER TABLE sellers ALTER COLUMN ${col} DROP NOT NULL;`).catch(() => {});
    }
    await dbClient.query(`ALTER TABLE sellers ALTER COLUMN centre_id DROP NOT NULL;`).catch(() => {});
    console.log('✅ Ensured nullable columns have no NOT NULL constraints');

    console.log('✅ Sellers table ready');

    // ══════════════════════════════════════════════════════════════════════
    // PRODUCTS
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        seller_alias VARCHAR(100),
        centre_id UUID REFERENCES centres(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        tags TEXT[] DEFAULT '{}',
        story TEXT,
        image_url VARCHAR(500),
        images TEXT[] DEFAULT '{}',
        stock INTEGER DEFAULT 0,
        total_sold INTEGER DEFAULT 0,
        seller_type VARCHAR(50) DEFAULT 'survivor',
        weight_grams INTEGER,
        processing_days INTEGER DEFAULT 3,
        is_available BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'draft'
          CHECK (status IN ('draft','pending','active','rejected','out_of_stock')),
        survivor_pct DECIMAL(5,2) DEFAULT 70,
        centre_pct DECIMAL(5,2) DEFAULT 28,
        platform_pct DECIMAL(5,2) DEFAULT 2,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const productCols = [
      'total_sold INTEGER DEFAULT 0', 'seller_alias VARCHAR(100)',
      'image_url VARCHAR(500)', 'images TEXT[]', 'stock INTEGER DEFAULT 0',
      'story TEXT', 'tags TEXT[]', 'survivor_pct DECIMAL(5,2) DEFAULT 70',
      'centre_pct DECIMAL(5,2) DEFAULT 28', 'platform_pct DECIMAL(5,2) DEFAULT 2',
      'weight_grams INTEGER', 'processing_days INTEGER DEFAULT 3', 'approved_at TIMESTAMPTZ',
    ];
    for (const col of productCols) {
      await dbClient.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS ${col};`).catch(() => {});
    }

    await dbClient.query(`
      CREATE OR REPLACE FUNCTION set_product_seller_info()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.centre_id IS NULL OR NEW.seller_alias IS NULL THEN
          SELECT centre_id, alias INTO NEW.centre_id, NEW.seller_alias
          FROM sellers WHERE id = NEW.seller_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_product_seller_info ON products;
      CREATE TRIGGER trg_product_seller_info
        BEFORE INSERT ON products
        FOR EACH ROW EXECUTE FUNCTION set_product_seller_info();
    `);
    console.log('✅ Products table ready');

    // ══════════════════════════════════════════════════════════════════════
    // CARTS
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id VARCHAR(255),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        items JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    const cartCols = [
      'items JSONB', 'session_id VARCHAR(255)', 'product_id UUID', 'quantity INTEGER DEFAULT 1',
    ];
    for (const col of cartCols) {
      await dbClient.query(`ALTER TABLE carts ADD COLUMN IF NOT EXISTS ${col};`).catch(() => {});
    }
    console.log('✅ Carts table ready');

    // ══════════════════════════════════════════════════════════════════════
    // ORDERS & ORDER ITEMS
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        buyer_email VARCHAR(255),
        buyer_name VARCHAR(255),
        buyer_phone VARCHAR(20),
        delivery_address TEXT,
        delivery_suburb VARCHAR(100),
        delivery_city VARCHAR(100),
        delivery_province VARCHAR(100),
        delivery_postal VARCHAR(10),
        hub_centre_id UUID REFERENCES centres(id),
        subtotal DECIMAL(10,2) DEFAULT 0,
        platform_fee_total DECIMAL(10,2) DEFAULT 0,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2),
        payment_method VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'pending',
        fulfilment_status VARCHAR(50) DEFAULT 'new',
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        centre_id UUID REFERENCES centres(id),
        product_title VARCHAR(255),
        product_thumbnail VARCHAR(500),
        seller_alias VARCHAR(100),
        centre_name VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        survivor_amount DECIMAL(10,2) DEFAULT 0,
        centre_amount DECIMAL(10,2) DEFAULT 0,
        platform_amount DECIMAL(10,2) DEFAULT 0,
        seller_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Orders + order items tables ready');

    // ══════════════════════════════════════════════════════════════════════
    // IMPACT RECEIPTS
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS impact_receipts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        total_paid DECIMAL(10,2),
        total_survivor_income DECIMAL(10,2),
        total_centre_funding DECIMAL(10,2),
        total_platform DECIMAL(10,2),
        counselling_minutes INTEGER,
        work_hours_created INTEGER,
        shareable_code VARCHAR(50) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Impact receipts table ready');

    // ══════════════════════════════════════════════════════════════════════
    // SELLER EARNINGS
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS seller_earnings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending'
          CHECK (status IN ('pending','paid','held')),
        payout_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Seller earnings table ready');

    // ══════════════════════════════════════════════════════════════════════
    // TRAINING
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS training_modules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        duration_mins INTEGER,
        level VARCHAR(20) DEFAULT 'beginner',
        content_url VARCHAR(500),
        thumbnail_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS seller_training_progress (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'not_started'
          CHECK (status IN ('not_started','in_progress','completed')),
        completed_at TIMESTAMPTZ,
        UNIQUE(seller_id, module_id)
      );
    `);
    console.log('✅ Training tables ready');

    // ══════════════════════════════════════════════════════════════════════
    // TRUSTED CONTACTS
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS trusted_contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        relationship VARCHAR(100),
        whatsapp BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Trusted contacts table ready');

    // ══════════════════════════════════════════════════════════════════════
    // EMERGENCY ALERTS LOG
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) DEFAULT 'sos',
        contacts_notified JSONB DEFAULT '[]',
        location_hint TEXT,
        triggered_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Emergency alerts table ready');

    // ══════════════════════════════════════════════════════════════════════
    // HIDDEN LAYER — CASE JOURNEY
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS case_journeys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id UUID UNIQUE NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        medical_done    BOOLEAN DEFAULT FALSE, medical_date    DATE,
        police_done     BOOLEAN DEFAULT FALSE, police_date     DATE,
        protection_done BOOLEAN DEFAULT FALSE, protection_date DATE,
        court_done      BOOLEAN DEFAULT FALSE, court_date      DATE,
        counselling_done BOOLEAN DEFAULT FALSE, counselling_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Case journeys table ready');

    // ══════════════════════════════════════════════════════════════════════
    // HIDDEN LAYER — EVIDENCE VAULT
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS evidence_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL
          CHECK (item_type IN ('photo','voice_note','whatsapp','medical','document','other')),
        filename VARCHAR(255),
        file_url VARCHAR(500),
        description TEXT,
        date_of_incident DATE,
        is_court_ready BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // ──────────────────────────────────────────────────────────────────────
    // Ensure all required columns exist and clean up obsolete ones
    // ──────────────────────────────────────────────────────────────────────
    console.log('✅ Ensuring evidence_items columns are complete...');
    await dbClient.query(`ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS seller_id UUID;`).catch(e => console.log(e.message));
    await dbClient.query(`ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(50);`).catch(e => console.log(e.message));
    await dbClient.query(`ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS filename VARCHAR(255);`).catch(e => console.log(e.message));
    await dbClient.query(`ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS file_url VARCHAR(500);`).catch(e => console.log(e.message));
    await dbClient.query(`ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS description TEXT;`).catch(e => console.log(e.message));
    await dbClient.query(`ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS date_of_incident DATE;`).catch(e => console.log(e.message));
    await dbClient.query(`ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS is_court_ready BOOLEAN DEFAULT FALSE;`).catch(e => console.log(e.message));
    // Remove obsolete columns that cause conflicts
    await dbClient.query(`ALTER TABLE evidence_items DROP COLUMN IF EXISTS case_id;`).catch(e => console.log(e.message));
    await dbClient.query(`ALTER TABLE evidence_items DROP COLUMN IF EXISTS evidence_type;`).catch(e => console.log(e.message));
    // Add foreign key constraint if missing
    await dbClient.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'evidence_items_seller_id_fkey' 
                       AND table_name = 'evidence_items') THEN
          ALTER TABLE evidence_items ADD CONSTRAINT evidence_items_seller_id_fkey 
            FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `).catch(e => console.log(e.message));
    // Set NOT NULL constraints (safe)
    await dbClient.query(`ALTER TABLE evidence_items ALTER COLUMN item_type SET NOT NULL;`).catch(e => console.log(e.message));
    await dbClient.query(`ALTER TABLE evidence_items ALTER COLUMN seller_id SET NOT NULL;`).catch(e => console.log(e.message));
    console.log('✅ Evidence items table ready with all columns');

    // ══════════════════════════════════════════════════════════════════════
    // HIDDEN LAYER — SUPPORT REQUESTS
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS support_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        request_type VARCHAR(50) NOT NULL
          CHECK (request_type IN ('companion','legal','counselling','medical','emergency')),
        message TEXT,
        status VARCHAR(50) DEFAULT 'open'
          CHECK (status IN ('open','matched','closed')),
        matched_to VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Support requests table ready');

    // ══════════════════════════════════════════════════════════════════════
    // PRO BONO PROFESSIONALS
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS professionals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        professional_type VARCHAR(50) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        professional_registration VARCHAR(100),
        nrso_clearance BOOLEAN DEFAULT false,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Professionals table ready');

    // ══════════════════════════════════════════════════════════════════════
    // DONATIONS
    // ══════════════════════════════════════════════════════════════════════
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        centre_id UUID REFERENCES centres(id),
        donor_name VARCHAR(255),
        donor_email VARCHAR(255),
        amount DECIMAL(10,2),
        donation_type VARCHAR(20) DEFAULT 'money'
          CHECK (donation_type IN ('money','goods')),
        goods_list TEXT[],
        recurring BOOLEAN DEFAULT FALSE,
        s18a_issued BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Donations table ready');

    // ── VOLUNTEERS ──────────────────────────────────────────────────────
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS volunteers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        centre_id UUID REFERENCES centres(id),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        skill VARCHAR(255),
        saps_cleared BOOLEAN DEFAULT FALSE,
        nrso_cleared BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'pending'
          CHECK (status IN ('pending','active','completed','suspended')),
        hours_logged INTEGER DEFAULT 0,
        joined_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Volunteers table ready');

    // ── CENTRE NEEDS BOARD ──────────────────────────────────────────────
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS centre_needs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        centre_id UUID REFERENCES centres(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) CHECK (category IN ('goods','money','volunteer','skill')),
        urgency VARCHAR(20) DEFAULT 'moderate'
          CHECK (urgency IN ('critical','moderate','stable')),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Centre needs table ready');

    // ══════════════════════════════════════════════════════════════════════
    // INDEXES (safe creation)
    // ══════════════════════════════════════════════════════════════════════
    await safeCreateIndex(dbClient, 'idx_centres_status', 'centres', 'status');
    await safeCreateIndex(dbClient, 'idx_centres_type', 'centres', 'centre_type');
    await safeCreateIndex(dbClient, 'idx_centres_province', 'centres', 'province');
    await safeCreateIndex(dbClient, 'idx_centres_city', 'centres', 'city');
    await safeCreateIndex(dbClient, 'idx_centre_docs_centre_id', 'centre_documents', 'centre_id');

    await safeCreateIndex(dbClient, 'idx_sellers_email', 'sellers', 'email');
    await safeCreateIndex(dbClient, 'idx_sellers_centre_id', 'sellers', 'centre_id');
    await safeCreateIndex(dbClient, 'idx_sellers_alias', 'sellers', 'alias');
    await safeCreateIndex(dbClient, 'idx_sellers_id_number', 'sellers', 'id_number');

    await safeCreateIndex(dbClient, 'idx_products_seller_id', 'products', 'seller_id');
    await safeCreateIndex(dbClient, 'idx_products_centre_id', 'products', 'centre_id');
    await safeCreateIndex(dbClient, 'idx_products_status', 'products', 'status');
    await safeCreateIndex(dbClient, 'idx_products_category', 'products', 'category');

    await safeCreateIndex(dbClient, 'idx_carts_session_id', 'carts', 'session_id');
    await safeCreateIndex(dbClient, 'idx_carts_product_id', 'carts', 'product_id');

    await safeCreateIndex(dbClient, 'idx_orders_status', 'orders', 'status');
    await safeCreateIndex(dbClient, 'idx_orders_buyer_email', 'orders', 'buyer_email');
    await safeCreateIndex(dbClient, 'idx_order_items_order_id', 'order_items', 'order_id');

    await safeCreateIndex(dbClient, 'idx_earnings_seller_id', 'seller_earnings', 'seller_id');
    await safeCreateIndex(dbClient, 'idx_training_prog_seller', 'seller_training_progress', 'seller_id');
    await safeCreateIndex(dbClient, 'idx_contacts_seller_id', 'trusted_contacts', 'seller_id');
    await safeCreateIndex(dbClient, 'idx_alerts_seller_id', 'emergency_alerts', 'seller_id');
    await safeCreateIndex(dbClient, 'idx_journey_seller_id', 'case_journeys', 'seller_id');
    await safeCreateIndex(dbClient, 'idx_evidence_seller_id', 'evidence_items', 'seller_id');
    await safeCreateIndex(dbClient, 'idx_support_seller_id', 'support_requests', 'seller_id');

    console.log('✅ Indexes created');

    // ══════════════════════════════════════════════════════════════════════
    // UPDATED_AT TRIGGERS
    // ══════════════════════════════════════════════════════════════════════
    const triggeredTables = [
      'centres','sellers','products','carts','orders',
      'case_journeys','evidence_items','support_requests',
    ];
    for (const tbl of triggeredTables) {
      await dbClient.query(`
        DROP TRIGGER IF EXISTS ${tbl}_updated_at ON ${tbl};
        CREATE TRIGGER ${tbl}_updated_at
          BEFORE UPDATE ON ${tbl}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      `);
    }
    console.log('✅ updated_at triggers set');

    // ══════════════════════════════════════════════════════════════════════
    // SEED: TRAINING MODULES
    // ══════════════════════════════════════════════════════════════════════
    const moduleCount = await dbClient.query(`SELECT COUNT(*) FROM training_modules`);
    if (parseInt(moduleCount.rows[0].count) === 0) {
      await dbClient.query(`
        INSERT INTO training_modules (title, category, description, duration_mins, level) VALUES
        ('Beading Basics for Beginners', 'craft', 'Learn the foundational techniques of South African beadwork — patterns, colours, and threading.', 45, 'beginner'),
        ('Pricing Your Craft', 'business', 'How to calculate material costs, set fair prices, and communicate your value to buyers.', 30, 'beginner'),
        ('Your Rights Under the DVA', 'legal', 'A plain-language guide to the Domestic Violence Act — what protection orders mean and how to get one.', 40, 'beginner'),
        ('WhatsApp Marketing for Makers', 'business', 'Use WhatsApp status and broadcast lists to reach buyers without needing a website.', 25, 'beginner'),
        ('Mindful Crafting — Healing Through Making', 'wellness', 'How creative work supports trauma recovery. Techniques to use your craft as a mindfulness practice.', 35, 'beginner'),
        ('Sewing Foundations', 'craft', 'Hand-sewing and basic machine techniques for bags, cushions, and garments.', 60, 'beginner'),
        ('Opening a Bank Account', 'financial', 'Step-by-step guide to opening a Capitec or PostBank account with minimal documentation.', 20, 'beginner'),
        ('Photography on a Phone', 'business', 'Take product photos that sell using only natural light and your smartphone.', 30, 'intermediate'),
        ('Wire Art and Sculpture', 'craft', 'South African wire art traditions — tools, materials, and signature pieces.', 50, 'intermediate'),
        ('Understanding Your Payout', 'financial', 'How Amani calculates your 70% share, when you get paid, and how to track earnings.', 15, 'beginner');
      `);
      console.log('✅ Training modules seeded');
    } else {
      console.log('✅ Training modules already exist — skipping seed');
    }

    // ══════════════════════════════════════════════════════════════════════
    // SEED: VERIFIED CENTRES
    // ══════════════════════════════════════════════════════════════════════
    const centreCount = await dbClient.query(`SELECT COUNT(*) FROM centres`);
    if (parseInt(centreCount.rows[0].count) === 0) {
      await dbClient.query(`
        INSERT INTO centres (
          centre_type, centre_name, contact_person_name, contact_person_role,
          contact_email, contact_phone, physical_address, suburb, city,
          province, postal_code, gps_latitude, gps_longitude,
          description, mission_statement, services_offered, target_population,
          languages_spoken, emergency_protocol, confidentiality_policy,
          accepts_goods, section18a, marketplace_active,
          status, approved_at, password_hash
        ) VALUES
        (
          'gbv_centre', 'Thistle House', 'Nomsa Khumalo', 'Centre Manager',
          'info@thistlehouse.co.za', '021 555 0123', '14 Buitenkant Street', 'Gardens', 'Cape Town',
          'Western Cape', '8001', -33.9258, 18.4232,
          'Thistle House provides 24/7 emergency shelter, trauma counselling, legal advocacy, and economic empowerment for GBV survivors in Cape Town.',
          'To restore dignity and safety for every survivor who walks through our door.',
          ARRAY['Emergency Shelter','Trauma Counselling','Legal Advocacy','Marketplace Skills'],
          ARRAY['Women','GBV Survivors'],
          ARRAY['English','Xhosa','Afrikaans'],
          'Call 10111 for immediate danger, then contact our 24/7 line on 021 555 0123.',
          'All survivor information is strictly confidential. Files are not shared without written consent.',
          true, true, true, 'approved', NOW(), 'seeded_replace_with_real_hash'
        ),
        (
          'gbv_centre', 'Women of Worth', 'Dr. Fatima Dlamini', 'Director',
          'contact@womenofworth.co.za', '031 702 5555', '22 Old Fort Road', 'Berea', 'Durban',
          'KwaZulu-Natal', '4001', -29.8579, 31.0292,
          'Women of Worth runs safe house accommodation, court accompaniment, and a thriving craft economy for GBV survivors in Durban.',
          'Restoring dignity — one woman at a time.',
          ARRAY['Safe House','Court Accompaniment','Craft Training','Marketplace'],
          ARRAY['Women','Children'],
          ARRAY['English','Zulu','Xhosa'],
          'Emergency protocol via 031 702 5555. SAPS contact on speed dial.',
          'Strict confidentiality policy aligned with the DVA and POPIA.',
          true, true, true, 'approved', NOW(), 'seeded_replace_with_real_hash'
        ),
        (
          'gbv_centre', 'Ikhaya Labantu', 'Zodwa Ntuli', 'Programme Manager',
          'support@ikhayalabantu.org.za', '011 333 4567', '88 Goch Street', 'Newtown', 'Johannesburg',
          'Gauteng', '2001', -26.2041, 28.0473,
          'Ikhaya Labantu offers emergency GBV shelter, trauma counselling, and marketplace integration in Johannesburg.',
          'Home — where healing begins.',
          ARRAY['Emergency Shelter','Counselling','Legal Support','Economic Empowerment'],
          ARRAY['Women','Youth'],
          ARRAY['English','Zulu','Sotho','Tswana'],
          'Call 10111 first. Our 24/7 line is 011 333 4567.',
          'Survivor information is never shared without explicit consent.',
          true, true, true, 'approved', NOW(), 'seeded_replace_with_real_hash'
        ),
        (
          'gbv_centre', 'Sivuyile Community Hub', 'Nokuthula Plaatjies', 'Manager',
          'sivuyile@community.co.za', '041 365 9900', '15 Main Road', 'KwaNoxolo', 'Gqeberha',
          'Eastern Cape', '6200', -33.9584, 25.6022,
          'Sivuyile runs a 24-hour GBV crisis line, shelter, and craft co-operative for survivors in Gqeberha.',
          'Together we rise.',
          ARRAY['Crisis Line','Emergency Shelter','Craft Co-operative'],
          ARRAY['Women','Children'],
          ARRAY['English','Xhosa'],
          'Call 10111. Our crisis line is 041 365 9900.',
          'All personal information kept strictly private.',
          true, true, true, 'approved', NOW(), 'seeded_replace_with_real_hash'
        ),
        (
          'gbv_centre', 'Ubuntu Care Centre', 'Lerato Mokoena', 'Director',
          'info@ubuntucare.co.za', '051 444 2222', '30 St Andrew Street', 'Westdene', 'Bloemfontein',
          'Free State', '9300', -29.1162, 26.2150,
          'Ubuntu Care provides survivor housing, legal support, and economic reintegration in Bloemfontein.',
          'I am because we are.',
          ARRAY['Housing','Legal Support','Economic Reintegration'],
          ARRAY['Women'],
          ARRAY['English','Sotho','Afrikaans'],
          'Emergency: 10111. Our line: 051 444 2222.',
          'POPIA compliant. Zero data sharing without consent.',
          true, false, true, 'approved', NOW(), 'seeded_replace_with_real_hash'
        ),
        (
          'orphanage', 'Empilweni Centre', 'Sipho Ndlovu', 'Director',
          'admin@empilweni.org.za', '011 880 1234', '45 Commissioner Street', 'Khayelitsha', 'Cape Town',
          'Western Cape', '7784', -34.0390, 18.6732,
          'Empilweni Centre supports youth and children with education, skills training, and a safe space to grow.',
          'Nurturing youth through skills and community.',
          ARRAY['Education','Skills Training','Marketplace Skills'],
          ARRAY['Youth','Children'],
          ARRAY['English','Xhosa'],
          'Call 10111 for emergencies. Centre line: 011 880 1234.',
          'All youth information is confidential.',
          true, false, true, 'approved', NOW(), 'seeded_replace_with_real_hash'
        ),
        (
          'old_age_home', 'The Haven Old Age Home', 'Margaret Botha', 'Manager',
          'admin@thehaven.co.za', '012 555 3333', '100 Church Street', 'Arcadia', 'Pretoria',
          'Gauteng', '0083', -25.7461, 28.1881,
          'The Haven supports elderly residents with income-generating crafts, social connectivity, and wellness programs.',
          'Dignity in every season.',
          ARRAY['Elderly Care','Craft Income','Wellness'],
          ARRAY['Elderly'],
          ARRAY['English','Afrikaans'],
          'Emergency services: 10111. Centre: 012 555 3333.',
          'Resident information is kept private.',
          true, true, true, 'approved', NOW(), 'seeded_replace_with_real_hash'
        );
      `);
      console.log('✅ Verified centres seeded (7 centres across SA)');
    } else {
      console.log('✅ Centres already exist — skipping seed');
    }

    await dbClient.end();
    console.log('');
    console.log('🎉 ══════════════════════════════════════════════════════════');
    console.log('   Amani database is ready!');
    console.log('   Run: cd backend && npm run dev   (or npx ts-node src/index.ts)');
    console.log('══════════════════════════════════════════════════════════════');
  } catch (err) {
    console.error('❌ Initialization failed:', err);
    process.exit(1);
  }
}

initDatabase();