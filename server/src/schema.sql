CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  appointment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requirements (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  needs_translation BOOLEAN NOT NULL DEFAULT false,
  is_conditional BOOLEAN NOT NULL DEFAULT false,
  condition_note TEXT NOT NULL DEFAULT '',
  is_optional BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE requirements ADD COLUMN IF NOT EXISTS is_optional BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS responses (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requirement_id INT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  has_item TEXT NOT NULL DEFAULT 'no' CHECK (has_item IN ('yes', 'no', 'na')),
  is_translated BOOLEAN,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, requirement_id)
);
