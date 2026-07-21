-- Migration: emergency_alerts table + audio recording column
-- Run this against your existing PostgreSQL database.
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id         UUID NOT NULL,
  centre_id         UUID,
  contacts_notified JSONB,
  location_hint     TEXT,
  recording_path    TEXT,
  recording_uploaded_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
-- If the table already existed without these columns, add them
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS centre_id UUID;
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS recording_path TEXT;
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS recording_uploaded_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_seller ON emergency_alerts(seller_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_centre ON emergency_alerts(centre_id);