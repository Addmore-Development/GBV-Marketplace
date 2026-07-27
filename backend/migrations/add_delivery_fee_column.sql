-- Fixes: "[Admin] sales error: column o.delivery_fee does not exist"
-- The orders table in marketplace-schema.sql already defines delivery_fee,
-- but it looks like the production database was created before that column
-- was added and never had it backfilled. This adds it if missing.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0;