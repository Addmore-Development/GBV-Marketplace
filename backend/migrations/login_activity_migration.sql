-- ============================================================
-- LOGIN ACTIVITY LOG
-- Tracks every login/logout event for centres and sellers so the
-- admin dashboard can show who is signing in/out and when.
-- ============================================================
CREATE TABLE IF NOT EXISTS login_activity (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_type     VARCHAR(20) NOT NULL,   -- 'centre' | 'seller'
  user_id       UUID NOT NULL,
  display_name  VARCHAR(255),
  email         VARCHAR(255),
  action        VARCHAR(10) NOT NULL,   -- 'login' | 'logout'
  ip_address    VARCHAR(64),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_activity_user    ON login_activity(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_created ON login_activity(created_at DESC);