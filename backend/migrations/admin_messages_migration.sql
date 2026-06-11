-- Migration: add admin_messages table
-- Run this against your existing Supabase/PostgreSQL database.

CREATE TABLE IF NOT EXISTS admin_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_type   VARCHAR(20) NOT NULL CHECK (sender_type IN ('seller', 'centre')),
  sender_id     UUID,
  sender_name   VARCHAR(255) NOT NULL,
  sender_email  VARCHAR(255) NOT NULL,
  subject       VARCHAR(500) NOT NULL,
  body          TEXT NOT NULL,
  read          BOOLEAN DEFAULT FALSE,
  reply         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unread count query
CREATE INDEX IF NOT EXISTS idx_admin_messages_read ON admin_messages(read);

-- Allow sellers to insert messages to admin
-- (add a POST /api/sellers/message-admin endpoint in your sellers router)
-- INSERT INTO admin_messages (sender_type, sender_id, sender_name, sender_email, subject, body)
-- VALUES ('seller', $1, $2, $3, $4, $5)

-- Allow centres to insert messages to admin
-- INSERT INTO admin_messages (sender_type, sender_id, sender_name, sender_email, subject, body)
-- VALUES ('centre', $1, $2, $3, $4, $5)
