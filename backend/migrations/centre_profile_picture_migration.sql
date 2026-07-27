-- Migration: add profile_picture_url to centres
-- Run this against your existing PostgreSQL database.
ALTER TABLE centres ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;