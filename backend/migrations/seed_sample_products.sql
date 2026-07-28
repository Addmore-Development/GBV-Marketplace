-- ============================================================
-- AMANI MARKETPLACE — Seed: 8 Sample Products
-- ============================================================
-- Column names match the LIVE `products` table as actually written
-- by src/controllers/marketplace.controller.ts (addProduct), which
-- differs from src/db/marketplace-schema.sql in this repo:
--   title          -> name
--   stock_quantity -> stock
--   thumbnail      -> image_url
--
--   * products.centre_id is a real FK -> centres(id)
--   * products.seller_alias is TEXT (not a FK) matched against
--     sellers.alias — sellers stay anonymous on-platform, so there
--     is no seller_id column on products.
--   * Each centre_id below is looked up live from the seller's own
--     row in `sellers`, not typed out by hand, so a product can
--     never end up linked to the wrong centre.
--   * Only APPROVED sellers are seeded (hudson, lopez, jessica,
--     thando). jayden (pending) and joy (rejected) are skipped.
--   * Written as plain INSERT ... VALUES per row (not a derived
--     subquery) so Postgres coerces each literal the normal way,
--     whatever the real column types (enum or varchar) turn out
--     to be — same as your app's own parameterized inserts do.
-- ============================================================

-- 1) hudson — Sunrise Children's Haven
INSERT INTO products (centre_id, seller_alias, seller_type, name, description, category, tags, story, price, stock, status, image_url)
VALUES (
  (SELECT centre_id FROM sellers WHERE alias = 'hudson'),
  'hudson', 'youth',
  'Rainbow Beaded Friendship Bracelets',
  'Set of 3 handmade beaded bracelets in bright rainbow colours, adjustable knot closure.',
  'jewellery', ARRAY['bracelet','beaded','handmade'],
  'Made by the young makers at Sunrise Children''s Haven as part of their weekly craft programme.',
  45.00, 30, 'active',
  'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&q=80'
);

-- 2) hudson — Sunrise Children's Haven
INSERT INTO products (centre_id, seller_alias, seller_type, name, description, category, tags, story, price, stock, status, image_url)
VALUES (
  (SELECT centre_id FROM sellers WHERE alias = 'hudson'),
  'hudson', 'youth',
  'Hand-Painted Ceramic Plant Pot',
  'Small terracotta plant pot, hand-painted with a floral pattern. Drainage hole included.',
  'home_decor', ARRAY['ceramic','pottery','home'],
  'Painted by hand at Sunrise Children''s Haven''s ceramics workshop.',
  120.00, 15, 'active',
  'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80'
);

-- 3) lopez — Ubuntu Bay Recovery Centre
INSERT INTO products (centre_id, seller_alias, seller_type, name, description, category, tags, story, price, stock, status, image_url)
VALUES (
  (SELECT centre_id FROM sellers WHERE alias = 'lopez'),
  'lopez', 'survivor',
  'Woven Raffia Market Tote',
  'Sturdy hand-woven raffia tote bag with leather-look handles. Great for groceries or the beach.',
  'clothing_textiles', ARRAY['bag','woven','raffia'],
  'Handwoven by a resident of Ubuntu Bay Recovery Centre learning traditional weaving skills.',
  240.00, 10, 'active',
  'https://images.unsplash.com/photo-1455669175216-9017c9b02fc6?w=600&q=80'
);

-- 4) lopez — Ubuntu Bay Recovery Centre
INSERT INTO products (centre_id, seller_alias, seller_type, name, description, category, tags, story, price, stock, status, image_url)
VALUES (
  (SELECT centre_id FROM sellers WHERE alias = 'lopez'),
  'lopez', 'survivor',
  'Lavender & Oat Soap Bar Set (3-pack)',
  'Three handmade cold-process soap bars with lavender oil and ground oats for gentle exfoliation.',
  'skincare_wellness', ARRAY['soap','natural','skincare'],
  'Made in small batches at Ubuntu Bay Recovery Centre''s soap-making programme.',
  85.00, 25, 'active',
  'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80'
);

-- 5) jessica — New Dawn Support Network
INSERT INTO products (centre_id, seller_alias, seller_type, name, description, category, tags, story, price, stock, status, image_url)
VALUES (
  (SELECT centre_id FROM sellers WHERE alias = 'jessica'),
  'jessica', 'survivor',
  'Hand-Stitched Journal Cover',
  'Fabric-bound journal cover with hand embroidery, fits standard A5 notebooks (notebook included).',
  'stationery', ARRAY['journal','embroidery','stationery'],
  'Hand-stitched by a member of New Dawn Support Network''s textile group.',
  95.00, 18, 'active',
  'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80'
);

-- 6) jessica — New Dawn Support Network
INSERT INTO products (centre_id, seller_alias, seller_type, name, description, category, tags, story, price, stock, status, image_url)
VALUES (
  (SELECT centre_id FROM sellers WHERE alias = 'jessica'),
  'jessica', 'survivor',
  'Recycled Fabric Scrunchie 3-Pack',
  'Set of 3 scrunchies made from upcycled offcut fabric, mixed prints.',
  'clothing_textiles', ARRAY['scrunchie','recycled','accessories'],
  'Made from fabric offcuts by New Dawn Support Network sewers, reducing waste while building income.',
  60.00, 40, 'active',
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80'
);

-- 7) thando — Khanya Golden Years
INSERT INTO products (centre_id, seller_alias, seller_type, name, description, category, tags, story, price, stock, status, image_url)
VALUES (
  (SELECT centre_id FROM sellers WHERE alias = 'thando'),
  'thando', 'elderly_resident',
  'Rooibos & Apricot Preserve Jar',
  '350g jar of homemade rooibos-infused apricot preserve. No artificial preservatives.',
  'food_preserves', ARRAY['jam','preserve','food'],
  'A family recipe made by a resident at Khanya Golden Years.',
  75.00, 22, 'active',
  'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600&q=80'
);

-- 8) thando — Khanya Golden Years
INSERT INTO products (centre_id, seller_alias, seller_type, name, description, category, tags, story, price, stock, status, image_url)
VALUES (
  (SELECT centre_id FROM sellers WHERE alias = 'thando'),
  'thando', 'elderly_resident',
  'Hand-Crocheted Baby Blanket',
  'Soft acrylic baby blanket, hand-crocheted in a shell stitch pattern. Machine washable.',
  'toys_gifts', ARRAY['crochet','baby','blanket'],
  'Crocheted by a resident at Khanya Golden Years, a skill passed down over decades.',
  350.00, 6, 'active',
  'https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80'
);

-- ============================================================
-- Sanity check: confirm all 8 inserted with correct centre link
-- ============================================================
SELECT p.name, p.seller_alias, p.seller_type, c.centre_name, p.price, p.status
FROM products p
JOIN centres c ON c.id = p.centre_id
WHERE p.seller_alias IN ('hudson','lopez','jessica','thando')
ORDER BY p.seller_alias, p.name;