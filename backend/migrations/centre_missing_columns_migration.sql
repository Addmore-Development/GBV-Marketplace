-- Migration: columns referenced by centre.controller.ts that were never
-- added by setup-db.js or migrate.js (they only existed in create-db.js).
-- Safe to run multiple times.

ALTER TABLE centres ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE centres ADD COLUMN IF NOT EXISTS accepts_goods BOOLEAN DEFAULT true;
ALTER TABLE centres ADD COLUMN IF NOT EXISTS section18a BOOLEAN DEFAULT false;
ALTER TABLE centres ADD COLUMN IF NOT EXISTS marketplace_active BOOLEAN DEFAULT false;