-- 002_subscriptions.sql
-- Creates the subscriptions table.
-- One subscription row per user, created atomically with the user record.

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       SERIAL        PRIMARY KEY,
  user_id                  INT           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan                     VARCHAR(50)   NOT NULL DEFAULT 'free',
  stripe_customer_id       VARCHAR(255),
  stripe_subscription_id   VARCHAR(255),
  status                   VARCHAR(50)   NOT NULL DEFAULT 'active',
  current_period_end       TIMESTAMP,
  created_at               TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id         ON subscriptions (user_id);
CREATE INDEX        IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions (stripe_customer_id);
