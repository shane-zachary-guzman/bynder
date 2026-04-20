-- 003_collections.sql
-- Creates the collections table.
-- Free users are capped at 1 collection; Pro users are unlimited.
-- Limit is enforced in application middleware, not the DB.

CREATE TABLE IF NOT EXISTS collections (
  id           SERIAL        PRIMARY KEY,
  user_id      INT           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name         VARCHAR(255)  NOT NULL,
  description  TEXT,
  created_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections (user_id);
