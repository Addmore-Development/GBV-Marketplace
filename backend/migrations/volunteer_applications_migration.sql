-- Migration: volunteer_applications table — a person applying to volunteer
-- at a centre from the public Centres page. Mirrors the donations table so
-- it can be surfaced the same way on the centre dashboard and admin panel.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS volunteer_applications (
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

CREATE INDEX IF NOT EXISTS idx_volunteer_applications_centre  ON volunteer_applications(centre_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_created ON volunteer_applications(created_at DESC);