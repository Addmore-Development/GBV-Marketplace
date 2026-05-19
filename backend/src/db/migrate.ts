import dotenv from 'dotenv';
dotenv.config();
import { pool } from '../index';

async function runMigration() {
  console.log('Creating sellers table...');
  const sql = `
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
    CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);
    CREATE INDEX IF NOT EXISTS idx_sellers_centre_id ON sellers(centre_id);
    CREATE INDEX IF NOT EXISTS idx_sellers_alias ON sellers(alias);
    DROP TRIGGER IF EXISTS sellers_updated_at ON sellers;
    CREATE TRIGGER sellers_updated_at
      BEFORE UPDATE ON sellers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  `;
  try {
    await pool.query(sql);
    console.log('✅ Sellers table ready');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    process.exit();
  }
}
runMigration();