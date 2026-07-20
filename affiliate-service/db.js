const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function query(text, params) {
  return pool.query(text, params);
}

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliates (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      ref_code      TEXT NOT NULL UNIQUE,
      report_token  TEXT NOT NULL UNIQUE,
      email         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS clicks (
      id            SERIAL PRIMARY KEY,
      affiliate_id  INTEGER NOT NULL REFERENCES affiliates(id),
      landing_page  TEXT,
      referrer      TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS conversions (
      id                 SERIAL PRIMARY KEY,
      affiliate_id       INTEGER REFERENCES affiliates(id),
      stripe_session_id  TEXT NOT NULL UNIQUE,
      product_type       TEXT NOT NULL,
      amount_total_cents INTEGER NOT NULL,
      commission_cents   INTEGER NOT NULL,
      customer_email     TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id            SERIAL PRIMARY KEY,
      affiliate_id  INTEGER NOT NULL REFERENCES affiliates(id),
      amount_cents  INTEGER NOT NULL,
      note          TEXT,
      paid_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_clicks_affiliate_id      ON clicks (affiliate_id);
    CREATE INDEX IF NOT EXISTS idx_conversions_affiliate_id ON conversions (affiliate_id);
    CREATE INDEX IF NOT EXISTS idx_payouts_affiliate_id     ON payouts (affiliate_id);
  `);
}

module.exports = { query, runMigrations };
