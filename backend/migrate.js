require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// All migrations (add new ones at the bottom)
const migrations = [
  // ==================== EXTENSIONS & FUNCTIONS ====================
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  `
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $$ LANGUAGE plpgsql;
  `,

  // ==================== ENUMS ====================
  `DO $$ BEGIN CREATE TYPE centre_type AS ENUM ('gbv_centre', 'orphanage', 'old_age_home'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE centre_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'suspended'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE document_type AS ENUM ('npo_certificate', 'dsd_registration', 'id_document', 'proof_of_address', 'bank_statement', 'site_photos', 'reference_letter', 'annual_report', 'constitution', 'tax_exemption'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,

  // ==================== SELLERS ====================
  `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS hidden_layer_granted BOOLEAN DEFAULT FALSE;`,

  // ==================== PRODUCTS (all columns) ====================
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_alias VARCHAR(100);`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS story TEXT;`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[];`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) DEFAULT 5.0;`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0;`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS survivor_pct INTEGER DEFAULT 70;`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS centre_pct INTEGER DEFAULT 28;`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS platform_pct INTEGER DEFAULT 2;`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_type VARCHAR(20) DEFAULT 'survivor';`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES centres(id);`,

  // Backfill centre_id and seller_alias from linked seller
  `UPDATE products p SET centre_id = s.centre_id FROM sellers s WHERE p.seller_id = s.id AND p.centre_id IS NULL;`,
  `UPDATE products p SET seller_alias = s.alias FROM sellers s WHERE p.seller_id = s.id AND p.seller_alias IS NULL;`,

  // ==================== CART ====================
  `
  CREATE TABLE IF NOT EXISTS carts (
    session_id VARCHAR(255) PRIMARY KEY,
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id);`,

  // ==================== ORDERS ====================
  `
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
    hub_centre_id UUID,
    subtotal DECIMAL(10,2),
    platform_fee_total DECIMAL(10,2),
    total DECIMAL(10,2),
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending'
  );
  `,

  // ==================== ORDER ITEMS ====================
  `
  CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    product_id UUID,
    centre_id UUID,
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    survivor_amount DECIMAL(10,2),
    centre_amount DECIMAL(10,2),
    platform_amount DECIMAL(10,2),
    product_title VARCHAR(255),
    product_thumbnail VARCHAR(500),
    seller_alias VARCHAR(100),
    centre_name VARCHAR(255)
  );
  `,

  // ==================== IMPACT RECEIPTS ====================
  `
  CREATE TABLE IF NOT EXISTS impact_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    total_paid DECIMAL(10,2),
    total_survivor_income DECIMAL(10,2),
    total_centre_funding DECIMAL(10,2),
    total_platform DECIMAL(10,2),
    counselling_minutes INTEGER,
    work_hours_created INTEGER,
    shareable_code VARCHAR(20),
    generated_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,

  // ==================== PRODUCT REVIEWS ====================
  `
  CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    buyer_name VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,

  // ==================== INDEXES ====================
  `CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);`,
  `CREATE INDEX IF NOT EXISTS idx_products_centre_id ON products(centre_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sellers_centre_id ON sellers(centre_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);`,
  `CREATE INDEX IF NOT EXISTS idx_sellers_alias ON sellers(alias);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_buyer_email ON orders(buyer_email);`,

  // ==================== TRIGGERS ====================
  `DROP TRIGGER IF EXISTS products_updated_at ON products;`,
  `CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();`,
  `DROP TRIGGER IF EXISTS sellers_updated_at ON sellers;`,
  `CREATE TRIGGER sellers_updated_at BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE FUNCTION update_updated_at();`,
  `DROP TRIGGER IF EXISTS carts_updated_at ON carts;`,
  `CREATE TRIGGER carts_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_updated_at();`,
];

async function migrate() {
  const client = await pool.connect();
  try {
    for (const sql of migrations) {
      console.log(`Applying: ${sql.substring(0, 80)}...`);
      await client.query(sql);
    }
    console.log('✅ All migrations applied successfully.');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();