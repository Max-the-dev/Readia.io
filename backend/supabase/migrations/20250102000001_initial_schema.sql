-- ============================================
-- Penny.io Initial Database Schema Migration
-- SQLite → PostgreSQL
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================
-- AUTHORS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS authors (
  address TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Lifetime metrics (NEVER decremented - see CLAUDE.md)
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  total_articles INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0
);

-- Index for author lookups
CREATE INDEX IF NOT EXISTS idx_authors_created ON authors(created_at DESC);

COMMENT ON TABLE authors IS 'Writer profiles with lifetime achievement metrics';
COMMENT ON COLUMN authors.total_earnings IS 'Lifetime earnings - never decremented on article deletion';
COMMENT ON COLUMN authors.total_articles IS 'Lifetime article count - never decremented';

-- ============================================
-- ARTICLES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  preview TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0.01 AND price <= 1.00),

  author_address TEXT NOT NULL REFERENCES authors(address) ON DELETE CASCADE,

  publish_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Engagement metrics
  views INTEGER DEFAULT 0 CHECK (views >= 0),
  purchases INTEGER DEFAULT 0 CHECK (purchases >= 0),
  earnings DECIMAL(10, 2) DEFAULT 0 CHECK (earnings >= 0),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),

  -- Metadata
  read_time TEXT NOT NULL,
  categories JSONB DEFAULT '[]'::jsonb,

  -- Popularity scoring (see backend/src/popularityScorer.ts)
  popularity_score DECIMAL(10, 2) DEFAULT 0
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_address);
CREATE INDEX IF NOT EXISTS idx_articles_popularity ON articles(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_publish_date ON articles(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_at DESC);

-- JSONB index for category filtering (GIN index for fast containment checks)
CREATE INDEX IF NOT EXISTS idx_articles_categories ON articles USING GIN(categories);

COMMENT ON TABLE articles IS 'Published articles with x402 micropayment integration';
COMMENT ON COLUMN articles.categories IS 'JSON array of category strings (16 predefined categories)';
COMMENT ON COLUMN articles.popularity_score IS 'Composite score: (views + likes*10 + purchases*50) * time_decay';
COMMENT ON COLUMN articles.price IS 'Article price in USD (0.01 to 1.00)';

-- ============================================
-- USER LIKES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_likes (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate likes from same wallet
  UNIQUE(article_id, user_address)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_likes_article ON user_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_user ON user_likes(user_address);
CREATE INDEX IF NOT EXISTS idx_user_likes_created ON user_likes(created_at DESC);

COMMENT ON TABLE user_likes IS 'Wallet-based article likes with deduplication';
COMMENT ON CONSTRAINT user_likes_article_id_user_address_key ON user_likes IS 'Prevents same wallet from liking article multiple times';

-- ============================================
-- DRAFTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS drafts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0.01 AND price <= 1.00),

  author_address TEXT NOT NULL REFERENCES authors(address) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Auto-save tracking
  CONSTRAINT draft_expiration_check CHECK (expires_at > created_at)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_drafts_author ON drafts(author_address);
CREATE INDEX IF NOT EXISTS idx_drafts_expires ON drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts(updated_at DESC);

COMMENT ON TABLE drafts IS 'Auto-saved article drafts with 7-day expiration';
COMMENT ON COLUMN drafts.expires_at IS 'Drafts auto-deleted after 7 days (see cron job)';

-- ============================================
-- PAYMENTS TABLE (NEW - replaces in-memory Map)
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,

  -- Payment details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  transaction_hash TEXT,
  payment_verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One payment per user per article
  UNIQUE(article_id, user_address)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_payments_article ON payments(article_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_address);
CREATE INDEX IF NOT EXISTS idx_payments_verified ON payments(payment_verified);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

COMMENT ON TABLE payments IS 'x402 payment tracking - replaces in-memory paymentTracker Map';
COMMENT ON COLUMN payments.transaction_hash IS 'Blockchain transaction hash for verification';
COMMENT ON COLUMN payments.payment_verified IS 'EIP-712 signature verification status';

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp on articles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column IS 'Auto-updates updated_at timestamp on row modification';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to recalculate article like count from user_likes table
CREATE OR REPLACE FUNCTION recalculate_article_likes(target_article_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE articles
  SET likes = (
    SELECT COUNT(*) FROM user_likes WHERE article_id = target_article_id
  )
  WHERE id = target_article_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_article_likes IS 'Recalculates likes count from user_likes table';

-- Function to recalculate author totals (for data integrity fixes)
CREATE OR REPLACE FUNCTION recalculate_author_totals(target_author_address TEXT)
RETURNS void AS $$
BEGIN
  UPDATE authors
  SET
    total_earnings = COALESCE((SELECT SUM(earnings) FROM articles WHERE author_address = target_author_address), 0),
    total_articles = COALESCE((SELECT COUNT(*) FROM articles WHERE author_address = target_author_address), 0),
    total_views = COALESCE((SELECT SUM(views) FROM articles WHERE author_address = target_author_address), 0),
    total_purchases = COALESCE((SELECT SUM(purchases) FROM articles WHERE author_address = target_author_address), 0)
  WHERE address = target_author_address;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_author_totals IS 'Recalculates author totals from current articles - use for data correction only';

-- ============================================
-- MIGRATION NOTES
-- ============================================

/*
Key changes from SQLite to PostgreSQL:

1. AUTO INCREMENT → SERIAL
   - SQLite: INTEGER PRIMARY KEY AUTOINCREMENT
   - PostgreSQL: SERIAL PRIMARY KEY

2. REAL → DECIMAL(10, 2)
   - Exact decimal precision for money (no floating point errors)

3. TEXT timestamps → TIMESTAMPTZ
   - Proper timezone-aware timestamps
   - SQLite stored ISO strings, PostgreSQL stores actual timestamps

4. JSON storage → JSONB
   - SQLite: TEXT DEFAULT '[]' with JSON.parse() in code
   - PostgreSQL: JSONB DEFAULT '[]'::jsonb with native indexing
   - GIN index enables fast category filtering

5. New payments table
   - Replaces in-memory Map in backend/src/routes.ts:1082
   - Persists across server restarts
   - Enables payment history and analytics

6. CHECK constraints
   - Price validation: 0.01 to 1.00 USD
   - Non-negative metrics

7. Cascading deletes
   - ON DELETE CASCADE for article → likes/payments
   - Maintains referential integrity

Column name mapping (snake_case ↔ camelCase):
- author_address ↔ authorAddress
- publish_date ↔ publishDate
- created_at ↔ createdAt
- updated_at ↔ updatedAt
- read_time ↔ readTime
- popularity_score ↔ popularityScore
- display_name ↔ displayName
*/
