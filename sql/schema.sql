-- Run this once against the Neon Postgres database referenced by DATABASE_URL.
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  interest TEXT,
  message TEXT,
  source_page TEXT
);
