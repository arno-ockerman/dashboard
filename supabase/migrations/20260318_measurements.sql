-- Client Body Measurements Tracker
-- Created: 2026-03-18 — Nightly Feature Build

CREATE TABLE IF NOT EXISTS measurements (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name   TEXT         NOT NULL,
  client_id     UUID         REFERENCES clients(id) ON DELETE SET NULL,
  date          DATE         NOT NULL DEFAULT CURRENT_DATE,
  weight_kg     DECIMAL(5,2),
  body_fat_pct  DECIMAL(4,1),
  waist_cm      DECIMAL(5,1),
  hip_cm        DECIMAL(5,1),
  chest_cm      DECIMAL(5,1),
  notes         TEXT,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_measurements_client_name ON measurements(client_name);
CREATE INDEX IF NOT EXISTS idx_measurements_date       ON measurements(date DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_client_id  ON measurements(client_id);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON measurements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_measurements_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER measurements_updated_at
  BEFORE UPDATE ON measurements
  FOR EACH ROW EXECUTE FUNCTION update_measurements_updated_at();
