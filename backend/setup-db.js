require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setup() {
  console.log('🚀 Setting up Amani database...');
  try {
    // 1. Enable UUID extension
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    console.log('✅ UUID extension enabled');

    // 2. Create update_updated_at function (used by triggers)
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ update_updated_at() function ready');

    // 3. Create ENUM types
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE centre_type AS ENUM ('gbv_centre', 'orphanage', 'old_age_home');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE centre_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'suspended');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE document_type AS ENUM (
          'npo_certificate', 'dsd_registration', 'id_document', 'proof_of_address',
          'bank_statement', 'site_photos', 'reference_letter', 'annual_report',
          'constitution', 'tax_exemption'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ ENUM types created');

    // 4. Create CENTRES table
    await pool.query(`
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
    console.log('✅ Centres table ready');

    // 5. Create CENTRE_DOCUMENTS table
    await pool.query(`
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

    // 6. Create ADMIN_USERS table
    await pool.query(`
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

    // 7. Create CENTRE_AUDIT_LOG table
    await pool.query(`
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

    // 8. Create SELLERS table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sellers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        alias VARCHAR(100) NOT NULL UNIQUE,
        public_bio TEXT NOT NULL,
        real_name VARCHAR(100) NOT NULL,
        real_surname VARCHAR(100) NOT NULL,
        id_number VARCHAR(13) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
        product_categories TEXT[] NOT NULL,
        skills_experience TEXT NOT NULL,
        payout_method VARCHAR(20) NOT NULL CHECK (payout_method IN ('eft', 'cash')),
        bank_details JSONB,
        cash_pickup_note TEXT,
        hidden_pin_hash VARCHAR(255) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        verification_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Sellers table ready');

    // 8.5. Create PRODUCTS table (NEW)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        status VARCHAR(20) DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Products table ready');

    // 9. Add indexes and triggers (including for products)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_centres_status ON centres(status);
      CREATE INDEX IF NOT EXISTS idx_centres_type ON centres(centre_type);
      CREATE INDEX IF NOT EXISTS idx_centres_province ON centres(province);
      CREATE INDEX IF NOT EXISTS idx_centre_docs_centre_id ON centre_documents(centre_id);
      CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);
      CREATE INDEX IF NOT EXISTS idx_sellers_centre_id ON sellers(centre_id);
      CREATE INDEX IF NOT EXISTS idx_sellers_alias ON sellers(alias);
      CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
      
      DROP TRIGGER IF EXISTS centres_updated_at ON centres;
      CREATE TRIGGER centres_updated_at
        BEFORE UPDATE ON centres
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        
      DROP TRIGGER IF EXISTS sellers_updated_at ON sellers;
      CREATE TRIGGER sellers_updated_at
        BEFORE UPDATE ON sellers
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        
      DROP TRIGGER IF EXISTS products_updated_at ON products;
      CREATE TRIGGER products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
    console.log('✅ Indexes and triggers added');

    // 10. Insert a test approved centre (if none exists)
    const centreCount = await pool.query(`SELECT COUNT(*) FROM centres`);
    if (parseInt(centreCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO centres (
          id, centre_type, centre_name, contact_person_name, contact_person_role,
          contact_email, contact_phone, physical_address, suburb, city,
          province, postal_code, description, mission_statement,
          services_offered, target_population, languages_spoken,
          emergency_protocol, confidentiality_policy, status, password_hash
        ) VALUES (
          uuid_generate_v4(), 'gbv_centre', 'Thistle House GBV Centre', 'Nomsa Dlamini',
          'Manager', 'info@thistlehouse.org.za', '0211234567', '14 Hope Street',
          'Khayelitsha', 'Cape Town', 'Western Cape', '7784',
          'We provide safe shelter and support for GBV survivors.',
          'To restore dignity and safety for every survivor.',
          ARRAY['Emergency Shelter', 'Counselling', 'Legal Aid'],
          ARRAY['Women', 'Children'],
          ARRAY['English', 'Xhosa'],
          'Call 10111 for immediate danger, then contact our 24/7 hotline.',
          'All survivor information is strictly confidential.',
          'approved',
          'temporary_hash_replace_later'
        );
      `);
      console.log('✅ Test approved centre inserted');
    } else {
      console.log('✅ Centres already exist, skipping test insert');
    }

    console.log('🎉 Database setup complete! Restart your backend.');
  } catch (err) {
    console.error('❌ Setup error:', err);
  } finally {
    pool.end();
  }
}

setup();