-- ============================================================
-- AMANI MARKETPLACE SCHEMA
-- Products, Orders, Impact Receipts
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE product_category AS ENUM (
  'jewellery', 'clothing_textiles', 'food_preserves', 'art_crafts',
  'home_decor', 'skincare_wellness', 'stationery', 'toys_gifts'
);

CREATE TYPE product_status AS ENUM ('active', 'out_of_stock', 'pending_approval', 'rejected', 'archived');
CREATE TYPE order_status   AS ENUM ('pending', 'confirmed', 'at_hub', 'dispatched', 'delivered', 'cancelled', 'refunded');
CREATE TYPE seller_type    AS ENUM ('survivor', 'youth', 'elderly_resident');

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  centre_id           UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,

  -- Seller (anonymous alias — never real name)
  seller_alias        VARCHAR(100) NOT NULL,   -- e.g. "Maker #47", "Thandi B."
  seller_type         seller_type NOT NULL,

  -- Product Info
  title               VARCHAR(255) NOT NULL,
  description         TEXT NOT NULL,
  category            product_category NOT NULL,
  tags                TEXT[],
  story               TEXT,                    -- survivor's story behind the product (optional)

  -- Pricing
  price               NUMERIC(10,2) NOT NULL,
  currency            VARCHAR(3) DEFAULT 'ZAR',

  -- Impact Split (based on price)
  -- survivor_income = price * 0.70 (centre sellers) OR price * 0.98 (direct survivors)
  -- centre_fee      = price * 0.30 (or 0.03)
  -- platform_fee    = price * 0.02 (always)
  survivor_pct        NUMERIC(5,2) DEFAULT 70.00,
  centre_pct          NUMERIC(5,2) DEFAULT 28.00,
  platform_pct        NUMERIC(5,2) DEFAULT 2.00,

  -- Stock
  stock_quantity      INTEGER NOT NULL DEFAULT 0,
  status              product_status DEFAULT 'pending_approval',

  -- Images (stored paths)
  images              TEXT[],
  thumbnail           TEXT,

  -- Logistics
  weight_grams        INTEGER,
  dimensions_cm       JSONB,                   -- {l, w, h}
  ships_from_hub      BOOLEAN DEFAULT true,    -- always true for anonymity
  processing_days     INTEGER DEFAULT 3,

  -- Stats
  total_sold          INTEGER DEFAULT 0,
  rating_avg          NUMERIC(3,2) DEFAULT 0,
  rating_count        INTEGER DEFAULT 0,

  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_primary  BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Buyer (anonymous to seller — only hub sees delivery address)
  buyer_email         VARCHAR(255) NOT NULL,
  buyer_name          VARCHAR(255) NOT NULL,
  buyer_phone         VARCHAR(20),

  -- Delivery (only shared with courier — NOT with seller/centre)
  delivery_address    TEXT NOT NULL,
  delivery_suburb     VARCHAR(100) NOT NULL,
  delivery_city       VARCHAR(100) NOT NULL,
  delivery_province   VARCHAR(100) NOT NULL,
  delivery_postal     VARCHAR(10) NOT NULL,

  -- Routing (hub's address is what seller/survivor sees)
  hub_centre_id       UUID REFERENCES centres(id),

  -- Totals
  subtotal            NUMERIC(10,2) NOT NULL,
  platform_fee_total  NUMERIC(10,2) NOT NULL,
  delivery_fee        NUMERIC(10,2) DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,

  -- Payment
  payment_method      VARCHAR(50),             -- 'snapscan', 'eft', 'card'
  payment_reference   VARCHAR(100),
  payment_confirmed   BOOLEAN DEFAULT false,
  payment_at          TIMESTAMPTZ,

  status              order_status DEFAULT 'pending',
  tracking_number     VARCHAR(100),
  notes               TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),

  quantity            INTEGER NOT NULL DEFAULT 1,
  unit_price          NUMERIC(10,2) NOT NULL,
  total_price         NUMERIC(10,2) NOT NULL,

  -- Impact split per item
  survivor_amount     NUMERIC(10,2) NOT NULL,
  centre_amount       NUMERIC(10,2) NOT NULL,
  platform_amount     NUMERIC(10,2) NOT NULL,

  -- Snapshot of product at time of purchase
  product_title       VARCHAR(255) NOT NULL,
  product_thumbnail   TEXT,
  seller_alias        VARCHAR(100) NOT NULL,
  centre_name         VARCHAR(255) NOT NULL
);

-- ============================================================
-- IMPACT RECEIPTS (auto-generated per order)
-- ============================================================
CREATE TABLE impact_receipts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL UNIQUE REFERENCES orders(id),

  total_paid            NUMERIC(10,2) NOT NULL,
  total_survivor_income NUMERIC(10,2) NOT NULL,
  total_centre_funding  NUMERIC(10,2) NOT NULL,
  total_platform        NUMERIC(10,2) NOT NULL,

  -- Human-readable impact
  counselling_minutes   INTEGER,               -- R30 = 20 mins counselling
  work_hours_created    INTEGER,               -- R80 survivor income = 3hrs dignified work
  shareable_code        VARCHAR(20) UNIQUE,    -- short code for social sharing

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT REVIEWS
-- ============================================================
CREATE TABLE product_reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id),
  buyer_name  VARCHAR(100) NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CART (server-side, linked by session)
-- ============================================================
CREATE TABLE carts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  VARCHAR(100) NOT NULL UNIQUE,
  items       JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_centre    ON products(centre_id);
CREATE INDEX idx_products_category  ON products(category);
CREATE INDEX idx_products_status    ON products(status);
CREATE INDEX idx_order_items_order  ON order_items(order_id);
CREATE INDEX idx_order_items_centre ON order_items(centre_id);

-- Auto update timestamps
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();