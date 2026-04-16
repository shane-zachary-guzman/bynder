-- 005_collected_cards.sql
-- Junction table between collections and card repo tables.
-- Represents a user's specific physical copy (or copies) of a card.
--
-- game:       discriminator for future multi-game support (default 'lorcana')
-- repo_card_id: FK to lorcana_repo.id (enforced via FK constraint while single-game)
-- condition:  physical condition of this copy (mint, near_mint, lightly_played,
--             moderately_played, heavily_played, damaged)
-- treatment:  card printing treatment (normal, foil, serialized, enchanted, promo, etc.)
-- quantity:   number of copies with this exact condition + treatment
-- estimated_value: user's estimated value of a single copy in USD

CREATE TABLE IF NOT EXISTS collected_cards (
  id               SERIAL          PRIMARY KEY,
  collection_id    INT             NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  game             VARCHAR(50)     NOT NULL DEFAULT 'lorcana',
  repo_card_id     INT             NOT NULL REFERENCES lorcana_repo (id),
  condition        VARCHAR(50)     NOT NULL,
  treatment        VARCHAR(50)     NOT NULL DEFAULT 'normal',
  quantity         SMALLINT        NOT NULL DEFAULT 1 CHECK (quantity > 0),
  estimated_value  DECIMAL(10, 2),
  notes            TEXT,
  created_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Prevent duplicate entries for the same card + condition + treatment in a collection
CREATE UNIQUE INDEX IF NOT EXISTS idx_collected_cards_unique
  ON collected_cards (collection_id, game, repo_card_id, condition, treatment);

CREATE INDEX IF NOT EXISTS idx_collected_cards_collection_id ON collected_cards (collection_id);
CREATE INDEX IF NOT EXISTS idx_collected_cards_repo_card_id  ON collected_cards (repo_card_id);
