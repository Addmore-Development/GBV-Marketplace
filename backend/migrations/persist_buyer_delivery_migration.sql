-- ============================================================
-- AMANI — Persist Buyer Delivery Details
-- ============================================================
-- Adds delivery-address columns to `buyers` so a signed-in buyer's
-- details get saved once and reused on every future checkout,
-- instead of being re-typed every time.
--
-- Safe to run against the live DB: every column uses
-- ADD COLUMN IF NOT EXISTS, so this is a no-op if already applied,
-- and it never touches existing data.
-- ============================================================

ALTER TABLE buyers ADD COLUMN IF NOT EXISTS delivery_address  TEXT;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS delivery_suburb   VARCHAR(100);
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS delivery_city     VARCHAR(100);
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS delivery_province VARCHAR(100);
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS delivery_postal   VARCHAR(10);
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();