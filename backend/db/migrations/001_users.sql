-- 001_users.sql
-- Creates the users table.

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL        PRIMARY KEY,
  email          VARCHAR(255)  NOT NULL UNIQUE,
  password_hash  VARCHAR(255),
  google_id      VARCHAR(255),
  name           VARCHAR(255),
  avatar_url     VARCHAR(500),
  created_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
