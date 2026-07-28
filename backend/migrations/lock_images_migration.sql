-- ============================================================
-- AMANI — Lock In Images Once Set
-- ============================================================
-- Purpose: belt-and-suspenders on top of the app-level protection
-- already in place (COALESCE on product image updates, no route
-- that can touch centre profile_picture_url without a real file).
--
-- These triggers make it impossible — even via a future bug, a
-- stray manual UPDATE, or a different code path entirely — to
-- null out or blank an image that has already been set.
--
-- Behaviour:
--   * If a row currently HAS an image, and an UPDATE tries to set
--     it to NULL or '', the trigger silently keeps the old value
--     instead. Everything else in the UPDATE still goes through.
--   * If a row does NOT have an image yet, it can still be set for
--     the first time as normal.
--   * Setting a NEW real (non-null, non-empty) image always works
--     — this only blocks wiping, not replacing.
-- ============================================================

-- ─── PRODUCTS.image_url ───────────────────────────────────────
CREATE OR REPLACE FUNCTION protect_product_image()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.image_url IS NOT NULL
     AND OLD.image_url <> ''
     AND (NEW.image_url IS NULL OR NEW.image_url = '') THEN
    NEW.image_url := OLD.image_url;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_product_image ON products;

CREATE TRIGGER trg_protect_product_image
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION protect_product_image();

-- ─── CENTRES.profile_picture_url ──────────────────────────────
CREATE OR REPLACE FUNCTION protect_centre_profile_picture()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.profile_picture_url IS NOT NULL
     AND OLD.profile_picture_url <> ''
     AND (NEW.profile_picture_url IS NULL OR NEW.profile_picture_url = '') THEN
    NEW.profile_picture_url := OLD.profile_picture_url;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_centre_profile_picture ON centres;

CREATE TRIGGER trg_protect_centre_profile_picture
BEFORE UPDATE ON centres
FOR EACH ROW
EXECUTE FUNCTION protect_centre_profile_picture();

-- ============================================================
-- Sanity check: try to null out an existing image and confirm
-- the trigger keeps the old value instead.
-- Safe to run — it updates and immediately shows you the result,
-- it does not permanently break anything (it's a no-op by design).
-- ============================================================
-- Example (uncomment and swap in a real id to test manually):
-- UPDATE products SET image_url = NULL WHERE id = '<some-product-id>';
-- SELECT id, name, image_url FROM products WHERE id = '<some-product-id>';
-- -> image_url should still show the original value, not NULL.