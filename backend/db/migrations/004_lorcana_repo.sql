-- 004_lorcana_repo.sql
-- Seeded reference table for Lorcana cards.
-- This table is read-only at runtime; populated via seed scripts.
--
-- Dedicated columns (filterable/searchable):
--   ink_color, card_type, rarity, lore_value
--
-- All remaining game-specific fields (ink_cost, strength, willpower,
-- subtypes, flavor_text, etc.) are stored in metadata JSONB.

CREATE TABLE IF NOT EXISTS lorcana_repo (
  id          SERIAL        PRIMARY KEY,
  set_code    TEXT          NOT NULL,
  set_name    TEXT          NOT NULL,
  card_number TEXT          NOT NULL,
  name        VARCHAR(255)  NOT NULL,
  ink_color   VARCHAR(50),
  card_type   VARCHAR(50),
  rarity      VARCHAR(50),
  lore_value  SMALLINT,
  image_url   VARCHAR(500),
  metadata    JSONB         NOT NULL DEFAULT '{}'
);

-- Prevent duplicate seeds
CREATE UNIQUE INDEX IF NOT EXISTS idx_lorcana_repo_set_card ON lorcana_repo (set_code, card_number);

-- Filterable columns
CREATE INDEX IF NOT EXISTS idx_lorcana_repo_ink_color  ON lorcana_repo (ink_color);
CREATE INDEX IF NOT EXISTS idx_lorcana_repo_card_type  ON lorcana_repo (card_type);
CREATE INDEX IF NOT EXISTS idx_lorcana_repo_rarity     ON lorcana_repo (rarity);
CREATE INDEX IF NOT EXISTS idx_lorcana_repo_set_code   ON lorcana_repo (set_code);

-- Full metadata search
CREATE INDEX IF NOT EXISTS idx_lorcana_repo_metadata   ON lorcana_repo USING GIN (metadata);
