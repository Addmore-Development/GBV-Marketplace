-- ============================================================
-- AMANI PLATFORM — Centre Registration Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE centre_type AS ENUM ('gbv_centre', 'orphanage', 'old_age_home');
CREATE TYPE centre_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'suspended');
CREATE TYPE document_type AS ENUM (
  'npo_certificate',
  'dsd_registration',
  'id_document',
  'proof_of_address',
  'bank_statement',
  'site_photos',
  'reference_letter',
  'annual_report',
  'constitution',
  'tax_exemption'
);

-- ============================================================
-- CENTRES TABLE
-- ============================================================
CREATE TABLE centres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic Identity
  centre_type centre_type NOT NULL,
  centre_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  npo_number VARCHAR(100),
  dsd_number VARCHAR(100),
  tax_exemption_number VARCHAR(100),
  year_established INTEGER,

  -- Contact
  contact_person_name VARCHAR(255) NOT NULL,
  contact_person_role VARCHAR(100) NOT NULL,
  contact_email VARCHAR(255) NOT NULL UNIQUE,
  contact_phone VARCHAR(20) NOT NULL,
  whatsapp_number VARCHAR(20),
  website_url VARCHAR(500),

  -- Location
  physical_address TEXT NOT NULL,
  suburb VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  is_address_public BOOLEAN DEFAULT true,

  -- About the Centre
  description TEXT NOT NULL,
  mission_statement TEXT NOT NULL,
  vision_statement TEXT,
  core_values TEXT,

  -- Services & Support
  services_offered TEXT[] NOT NULL,         -- e.g. ['counselling', 'legal_aid', 'shelter']
  target_population TEXT[] NOT NULL,        -- e.g. ['women', 'children', 'elderly']
  languages_spoken TEXT[] NOT NULL,
  capacity_total INTEGER,
  capacity_available INTEGER,
  is_24_hour BOOLEAN DEFAULT false,
  operating_hours JSONB,                    -- { mon: "08:00-17:00", ... }
  referral_process TEXT,
  intake_process TEXT,

  -- Safety & Trust Signals
  has_trained_staff BOOLEAN DEFAULT false,
  staff_training_description TEXT,
  has_security_measures BOOLEAN DEFAULT false,
  security_description TEXT,
  emergency_protocol TEXT,
  confidentiality_policy TEXT,

  -- For GBV Centres specifically
  has_shelter BOOLEAN DEFAULT false,
  shelter_capacity INTEGER,
  provides_legal_support BOOLEAN DEFAULT false,
  provides_medical_support BOOLEAN DEFAULT false,
  provides_counselling BOOLEAN DEFAULT false,
  provides_court_support BOOLEAN DEFAULT false,
  law_enforcement_partnership TEXT,

  -- For Orphanages
  age_range_min INTEGER,
  age_range_max INTEGER,
  education_programs TEXT,

  -- For Old Age Homes
  care_level VARCHAR(50),  -- 'independent', 'assisted', 'full_care'
  medical_facilities TEXT,

  -- Social Proof
  success_stories TEXT,
  awards_recognition TEXT,
  key_partnerships TEXT,
  annual_beneficiaries INTEGER,

  -- Admin
  status centre_status DEFAULT 'pending',
  rejection_reason TEXT,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  verification_site_visit_date DATE,
  approved_at TIMESTAMPTZ,

  -- Auth
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CENTRE DOCUMENTS TABLE
-- ============================================================
CREATE TABLE centre_documents (
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

-- ============================================================
-- ADMIN USERS TABLE
-- ============================================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE centre_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  performed_by UUID,
  performed_by_type VARCHAR(20) DEFAULT 'admin', -- 'admin' | 'centre'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_centres_status ON centres(status);
CREATE INDEX idx_centres_type ON centres(centre_type);
CREATE INDEX idx_centres_province ON centres(province);
CREATE INDEX idx_centre_docs_centre_id ON centre_documents(centre_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER centres_updated_at
  BEFORE UPDATE ON centres
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

  -- ============================================================
-- SELLERS (Victims/Survivors) TABLE
-- ============================================================
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
    bank_details JSONB,  -- { bank_name, account_holder, account_number, branch_code }
    cash_pickup_note TEXT,
    hidden_pin_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sellers_email ON sellers(email);
CREATE INDEX idx_sellers_centre_id ON sellers(centre_id);
CREATE INDEX idx_sellers_alias ON sellers(alias);

CREATE TRIGGER sellers_updated_at
    BEFORE UPDATE ON sellers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();