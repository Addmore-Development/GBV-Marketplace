-- Migration: remaining gaps between create-db.js (never run in prod) and
-- what setup-db.js / migrate.js actually created. Safe to run multiple times.

-- sellers.profile_complete — used by getCentreSellers (centre dashboard)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT FALSE;

-- orders.delivery_fee / payment_confirmed — used by admin getSales
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT FALSE;

-- donations table — used by admin getAdminStats
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