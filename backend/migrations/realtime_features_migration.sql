-- Migration: needs board (persisted, was frontend-only) + buyer registrations
-- (persisted, was localStorage-only) — both needed so the admin dashboard and
-- the public centres page can reflect these in real time via Socket.IO.
-- Run this against your existing PostgreSQL database.

-- ── Needs board ─────────────────────────────────────────────
-- A centre posts a need (e.g. "Winter blankets for 20 residents"). Shown on
-- that centre's dashboard AND on the public Centres page noticeboard.
CREATE TABLE IF NOT EXISTS needs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id   UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  category    VARCHAR(20) NOT NULL DEFAULT 'goods', -- goods | money | volunteer | skill
  urgency     VARCHAR(20) NOT NULL DEFAULT 'moderate', -- critical | moderate | stable
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_needs_centre  ON needs(centre_id);
CREATE INDEX IF NOT EXISTS idx_needs_active  ON needs(active);
CREATE INDEX IF NOT EXISTS idx_needs_created ON needs(created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER trg_needs_updated_at
  BEFORE UPDATE ON needs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Buyer registrations ─────────────────────────────────────
-- Previously buyer "registration" only wrote to the browser's localStorage,
-- so admin had no way to see new buyers until their first order. This
-- persists the registration itself so it shows up immediately.
CREATE TABLE IF NOT EXISTS buyers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(200) NOT NULL,
  email      VARCHAR(200) UNIQUE NOT NULL,
  phone      VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_buyers_created ON buyers(created_at DESC);
