-- ============================================================
-- AMANI MARKETPLACE — Seed: 8 Sample Products
-- ============================================================
-- Notes:
--   * products.centre_id is a real FK -> centres(id)
--   * products.seller_alias is a TEXT field (NOT a FK) matched
--     against sellers.alias — the schema keeps sellers anonymous
--     on-platform, so there is no seller_id column on products.
--   * To keep this accurate, centre_id is pulled from the seller's
--     OWN row in `sellers` (s.centre_id), not typed out by hand,
--     so a product can never end up linked to the wrong centre.
--   * Only APPROVED sellers are seeded here (hudson, lopez,
--     jessica, thando). jayden (pending) and joy (rejected) are
--     skipped — they can't have live products yet.
--   * status is set to 'active' for dev seeding. Change to
--     'pending_approval' if you want to test the approval flow.
-- ============================================================

INSERT INTO products (
  centre_id, seller_alias, seller_type, title, description,
  category, tags, story, price, stock_quantity, status, thumbnail
)
SELECT
  s.centre_id,
  v.seller_alias,
  v.seller_type::seller_type,
  v.title,
  v.description,
  v.category::product_category,
  v.tags,
  v.story,
  v.price,
  v.stock_quantity,
  v.status::product_status,
  v.thumbnail
FROM (
  VALUES
    -- hudson — Sunrise Children's Haven
    ('hudson', 'youth',
     'Rainbow Beaded Friendship Bracelets',
     'Set of 3 handmade beaded bracelets in bright rainbow colours, adjustable knot closure.',
     'jewellery', ARRAY['bracelet','beaded','handmade']::text[],
     'Made by the young makers at Sunrise Children''s Haven as part of their weekly craft programme.',
     45.00, 30, 'active',
     'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&q=80'),

    ('hudson', 'youth',
     'Hand-Painted Ceramic Plant Pot',
     'Small terracotta plant pot, hand-painted with a floral pattern. Drainage hole included.',
     'home_decor', ARRAY['ceramic','pottery','home']::text[],
     'Painted by hand at Sunrise Children''s Haven''s ceramics workshop.',
     120.00, 15, 'active',
     'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80'),

    -- lopez — Ubuntu Bay Recovery Centre
    ('lopez', 'survivor',
     'Woven Raffia Market Tote',
     'Sturdy hand-woven raffia tote bag with leather-look handles. Great for groceries or the beach.',
     'clothing_textiles', ARRAY['bag','woven','raffia']::text[],
     'Handwoven by a resident of Ubuntu Bay Recovery Centre learning traditional weaving skills.',
     240.00, 10, 'active',
     'https://images.unsplash.com/photo-1455669175216-9017c9b02fc6?w=600&q=80'),

    ('lopez', 'survivor',
     'Lavender & Oat Soap Bar Set (3-pack)',
     'Three handmade cold-process soap bars with lavender oil and ground oats for gentle exfoliation.',
     'skincare_wellness', ARRAY['soap','natural','skincare']::text[],
     'Made in small batches at Ubuntu Bay Recovery Centre''s soap-making programme.',
     85.00, 25, 'active',
     'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80'),

    -- jessica — New Dawn Support Network
    ('jessica', 'survivor',
     'Hand-Stitched Journal Cover',
     'Fabric-bound journal cover with hand embroidery, fits standard A5 notebooks (notebook included).',
     'stationery', ARRAY['journal','embroidery','stationery']::text[],
     'Hand-stitched by a member of New Dawn Support Network''s textile group.',
     95.00, 18, 'active',
     'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80'),

    ('jessica', 'survivor',
     'Recycled Fabric Scrunchie 3-Pack',
     'Set of 3 scrunchies made from upcycled offcut fabric, mixed prints.',
     'clothing_textiles', ARRAY['scrunchie','recycled','accessories']::text[],
     'Made from fabric offcuts by New Dawn Support Network sewers, reducing waste while building income.',
     60.00, 40, 'active',
     'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80'),

    -- thando — Khanya Golden Years
    ('thando', 'elderly_resident',
     'Rooibos & Apricot Preserve Jar',
     '350g jar of homemade rooibos-infused apricot preserve. No artificial preservatives.',
     'food_preserves', ARRAY['jam','preserve','food']::text[],
     'A family recipe made by a resident at Khanya Golden Years.',
     75.00, 22, 'active',
     'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600&q=80'),

    ('thando', 'elderly_resident',
     'Hand-Crocheted Baby Blanket',
     'Soft acrylic baby blanket, hand-crocheted in a shell stitch pattern. Machine washable.',
     'toys_gifts', ARRAY['crochet','baby','blanket']::text[],
     'Crocheted by a resident at Khanya Golden Years, a skill passed down over decades.',
     350.00, 6, 'active',
     'https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=600&q=80')

) AS v(seller_alias, seller_type, title, description, category, tags, story, price, stock_quantity, status, thumbnail)
JOIN sellers s ON s.alias = v.seller_alias;

-- ============================================================
-- Sanity check: confirm all 8 inserted with correct centre link
-- ============================================================
SELECT p.title, p.seller_alias, p.seller_type, c.centre_name, p.price, p.status
FROM products p
JOIN centres c ON c.id = p.centre_id
WHERE p.seller_alias IN ('hudson','lopez','jessica','thando')
ORDER BY p.seller_alias, p.title;