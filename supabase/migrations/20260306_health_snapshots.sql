-- Health Snapshots table
-- Synced from Apple Health via iOS Shortcut → OpenClaw webhook
-- Created: 2026-03-06 (Evening Mission Build)

CREATE TABLE IF NOT EXISTS health_snapshots (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  date            DATE         NOT NULL UNIQUE,

  -- Body composition
  weight_kg       DECIMAL(5,2),
  body_fat_pct    DECIMAL(4,1),
  lean_mass_kg    DECIMAL(5,2),
  fat_mass_kg     DECIMAL(5,2),

  -- Recovery / HRV
  hrv_ms          DECIMAL(6,1),
  resting_hr      INTEGER,
  readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
  recovery_score  DECIMAL(3,1) CHECK (recovery_score BETWEEN 0 AND 10),

  -- Activity
  steps           INTEGER,
  active_calories INTEGER,
  exercise_min    INTEGER,

  -- Sleep
  sleep_hours     DECIMAL(4,1),
  sleep_quality   TEXT CHECK (sleep_quality IN ('poor', 'fair', 'good', 'excellent')),
  sleep_awakenings INTEGER,

  -- Notes
  notes           TEXT,

  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_health_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_health_snapshots_updated_at ON health_snapshots;
CREATE TRIGGER trg_health_snapshots_updated_at
  BEFORE UPDATE ON health_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_health_snapshots_updated_at();

-- RLS: only authenticated users (Jarvis service role bypasses)
ALTER TABLE health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON health_snapshots
  FOR ALL USING (true);  -- supabaseAdmin (service role) can do everything

-- Indexes
CREATE INDEX IF NOT EXISTS health_snapshots_date_idx ON health_snapshots (date DESC);

-- Seed with first imported data (2026-03-06)
INSERT INTO health_snapshots (
  date, weight_kg, body_fat_pct, lean_mass_kg, hrv_ms,
  readiness_score, recovery_score, steps, notes
) VALUES
  ('2026-03-06', 92.1, 16.5, 76.9, 42.2, 50, 5.0, NULL,
   'First complete dataset — iOS Shortcut body composition sync active')
ON CONFLICT (date) DO UPDATE SET
  weight_kg       = EXCLUDED.weight_kg,
  body_fat_pct    = EXCLUDED.body_fat_pct,
  lean_mass_kg    = EXCLUDED.lean_mass_kg,
  hrv_ms          = EXCLUDED.hrv_ms,
  readiness_score = EXCLUDED.readiness_score,
  recovery_score  = EXCLUDED.recovery_score,
  notes           = EXCLUDED.notes,
  updated_at      = NOW();
