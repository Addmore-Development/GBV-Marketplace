-- Migration: volunteer_signups table — a member of the public applying to
-- volunteer at a centre from the public Centres page "Volunteer Your Skills"
-- form. This is distinct from the existing volunteer_applications table
-- (which tracks sellers applying to a centre's posted volunteer
-- opportunities, keyed by seller_id/opportunity_id). Mirrors the donations
-- table so it can be surfaced the same way on the centre dashboard and
-- admin panel. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS volunteer_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  centre_id UUID REFERENCES centres(id),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  skills TEXT,
  availability VARCHAR(255),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_signups_centre  ON volunteer_signups(centre_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_signups_created ON volunteer_signups(created_at DESC);